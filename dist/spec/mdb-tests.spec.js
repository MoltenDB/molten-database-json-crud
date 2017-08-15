"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _1 = require("../");
var molten_storage_1 = require("molten-storage");
var fs = require('fs');
var denodeify = require('denodeify');
var mkdirp = require('mkdirp');
var rmdir = require('rmdir');
var stat = denodeify(fs.stat);
var writeFile = denodeify(fs.writeFile);
var unlink = denodeify(fs.unlink);
var mkdirpp = denodeify(mkdirp);
var rmdirp = denodeify(rmdir);
var Reporter = require('jasmine2-reporter').Jasmine2Reporter;
jasmine.getEnv().addReporter(new Reporter());
describe('MoltenDB json-crud Storage Implementation', function () {
    beforeAll(function () {
        // Check test and badFolder don't already exist
        return Promise.all([
            stat('test').then(function (stat) { return Promise.reject(new Error('`test` already exists')); }, function (error) {
                if (error.code === 'ENOENT') {
                    return Promise.resolve();
                }
                return Promise.reject(error);
            }),
            stat('badFolder').then(function (stat) { return Promise.reject(new Error('`badFolder` already exists')); }, function (error) {
                if (error.code === 'ENOENT') {
                    return Promise.resolve();
                }
                return Promise.reject(error);
            })
        ]).then(function () {
            // Create the tempfile
            return writeFile('badFolder', '');
        }).catch(fail);
    });
    afterAll(function () {
        // Delete the badFolder
        return unlink('badFolder').catch(fail);
    });
    beforeEach(function () {
        // Create test dir
        return mkdirpp('test');
    });
    afterEach(function () {
        return rmdirp('test');
    });
    molten_storage_1.default(_1.default, {
        badOptions: [
            {
                label: 'with a bad baseFolder',
                options: {
                    baseFolder: 'badFolder'
                }
            },
            {
                label: 'with undefined options'
            },
        ],
        goodOptions: [
            {
                label: 'with in-memory only option',
                options: {
                    baseFolder: false
                }
            }
        ],
        testOptions: {
            baseFolder: 'test'
        }
    });
});
