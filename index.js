#!/usr/bin/env node
var program = require('commander');
var fs = require('fs');

var gBaseIndex = 1000;
var gServiceId = 1;

var gKmlPath = "";

program
    .version('0.1.0')
    .option('-b, --base-index <baseIndex>', 'base index for region id. default is 1000')
    .option('-s, --service-id <serviceId>', 'GTFS service ID, default is 1')
    .arguments('<path>', 'a gKmlPath contains kml files')
    .action(function (path) {
        gBaseIndex = program.baseIndex ? program.baseIndex : gBaseIndex;
        gServiceId = program.serviceId ? program.serviceId : gServiceId;
        gKmlPath = path;
    })
    .parse(process.argv);


if (!gKmlPath) {
    console.log("Please set the kml gKmlPath gKmlPath");
    process.exit();
}

main();

function main() {

    parseKmlFolder(gKmlPath).then(function (files) {
        Promise.all(files.map(function (file) {
            return readFile(gKmlPath + "/" +file);
        })).then(function (data) {
            var regions = [];
            data.forEach(function (polygon, index) {
                var region = {};
                region.id = gBaseIndex + index;
                region.name = files[index].split(".")[0];
                region.serviceId = gServiceId;
                region.shape = maxArray(polygon);
                regions.push(region);
            });

            createGtfsRegionFile(regions, ".");
            createGtfsRegionShapeFile(regions, ".");
        });
    });
}

function readFile(fileName) {
    return new Promise(function (resolve, reject) {
        fs.readFile(fileName, "utf-8", function(error, data) {
            if (error) reject(error);
            resolve(parsePolygonFromKml(data));
        });
    });
}

function parseKmlFolder(folder) {
    return new Promise(function (resolve, reject) {
        fs.readdir(folder, function (error, files) {
            if (error) reject(error);
            resolve(files);
        });
    });
}

/**
 * Region format
 * {
 *   id: string,
 *   name: string,
 *   shape: [Points],
 *   color: string,
 *   serviceId: string
 * }
 *
 * @param regions
 */
function createGtfsRegionFile(regions, folder) {
    var regionsTxtHeader = "region_id,region_name,region_color,service_id";
    var content = [];
    content.push(regionsTxtHeader);
    regions.forEach(function (region) {
        region.color = region.color || "";
        var line = region.id + "," + region.name + "," + region.color + "," + region.serviceId;
        content.push(line);
    });

    fs.writeFile(folder + "/regions.txt", content.join("\n"), function (error) {
        if (error)
            console.log("Write regions.txt file error");
        else
            console.log("Write shapes.txt success");
    });
}

function createGtfsRegionShapeFile(regions, folder) {
    var regionShapeTxtHeader = "region_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence";
    var content = [];
    content.push(regionShapeTxtHeader);
    regions.forEach(function (region) {
        region.shape.forEach(function (point, i) {
            var line = region.id + "," + point.latitude + "," + point.longitude + "," + i;
            content.push(line);
        });
    });

    fs.writeFile(folder + "/region_shapes.txt", content.join("\n"), function (error) {
        if (error)
            console.log("Write region_shapes.txt file error");
        else
            console.log("Write region_shapes.txt success");

    });
}

function parsePolygonFromKml(content) {
    var regex = /<coordinates>(.*?)<\/coordinates>/g;
    var matches = [];

    var match = regex.exec(content);
    while(match != null) {
        matches.push(match[1]);
        match = regex.exec(content);
    }

    var result = [];
    matches.forEach(function (locationStr) {
        var polygon = [];
        var pointStrArr = locationStr.split(" ");
        pointStrArr.forEach(function (item) {
            var data = item.split(",");
            polygon.push({"longitude": data[0], "latitude": data[1]});
        });
        result.push(polygon);
    });

    return result;
}

// Find longest array from a array
function maxArray(arrs) {
    var max = -Infinity;
    var index = -1;
    arrs.forEach(function (arr, i) {
        if (arr.length > max) {
            max = arr.length;
            index = i;
        }
    });

    return arrs[index];
}