"use strict";
var initialisation_spec_1 = require("./tests/initialisation.spec");
var makeDatabaseTests = function (createDatabase, testCreateDatabaseOptions) {
    console.log('makeDatabaseTests called');
    initialisation_spec_1.default(createDatabase, testCreateDatabaseOptions);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = makeDatabaseTests;
