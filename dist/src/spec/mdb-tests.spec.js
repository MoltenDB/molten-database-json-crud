"use strict";
var _1 = require("../");
var molten_databases_1 = require("molten-databases");
var fs = require('fs');
var denodeify = require('denodeify');
var mkdirp = require('mkdirp');
var rmdir = require('rmdir');
var stat = denodeify(fs.stat);
var writeFile = denodeify(fs.writeFile);
var unlink = denodeify(fs.unlink);
var mkdirpp = denodeify(mkdirp);
var rmdirp = denodeify(rmdir);
describe('MoltenDB json-crud database', function () {
    beforeAll(function (done) {
        // Check test and testfile don't already exist
        Promise.all([
            stat('test').then(function (stat) { return Promise.reject(new Error('`test` already exists')); }, function (error) {
                if (error.code === 'ENOENT') {
                    return Promise.resolve();
                }
                return Promise.reject(error);
            }),
            stat('testfile').then(function (stat) { return Promise.reject(new Error('`testfile` already exists')); }, function (error) {
                if (error.code === 'ENOENT') {
                    return Promise.resolve();
                }
                return Promise.reject(error);
            })
        ]).then(function () {
            // Create the tempfile
            return writeFile('testfile', '');
        }).then(done, fail);
    });
    afterAll(function (done) {
        // Delete the testfile
        unlink('testfile').then(done, fail);
    });
    beforeEach(function (done) {
        // Create test dir
        mkdirpp('test').then(done, fail);
    });
    afterEach(function (done) {
        rmdirp('test').then(done, fail);
    });
    molten_databases_1.default(_1.default, {
        badOptions: [
            {
                label: '',
                options: {
                    baseFolder: 'testfile'
                }
            },
        ],
        testOptions: {
            baseFolder: 'test'
        }
    });
});
