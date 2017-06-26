"use strict";
var createInitialisationTests = function (createDatabase, testCreateDatabaseOptions) {
    describe('MDB.createDatabase', function () {
        describe('should return a Promise that rejects on bad options', function () {
            var makeTestFunction = function (option) { return function (done) {
                createDatabase(option.option).then(function () {
                    fail('Promise resolved');
                }, done);
            }; };
            if (testCreateDatabaseOptions.badOptions instanceof Array) {
                testCreateDatabaseOptions.badOptions.forEach(function (option) {
                    it(option.label, makeTestFunction(option));
                });
            }
            else {
                it('', makeTestFunction(testCreateDatabaseOptions.badOptions));
            }
        });
        describe('should return a Promise MDB.Database interface object when given valid '
            + 'options', function () {
            var makeTestFunction = function (option) { return function (done) {
                createDatabase(option.option).then(function (database) {
                    expect(database).toEqual(jasmine.any(Object));
                    expect(database.create).toEqual(jasmine.any(Function));
                    expect(database.count).toEqual(jasmine.any(Function));
                    expect(database.read).toEqual(jasmine.any(Function));
                    expect(database.update).toEqual(jasmine.any(Function));
                    expect(database.delete).toEqual(jasmine.any(Function));
                    expect(database.close).toEqual(jasmine.any(Function));
                    database.close();
                    done();
                }, fail);
            }; };
            if (testCreateDatabaseOptions.goodOptions) {
                if (testCreateDatabaseOptions.goodOptions instanceof Array) {
                    testCreateDatabaseOptions.goodOptions.forEach(function (option) {
                        it(option.label, makeTestFunction(option));
                    });
                }
                else {
                    it('', makeTestFunction(testCreateDatabaseOptions.goodOptions));
                }
            }
            it('', makeTestFunction(testCreateDatabaseOptions.testOptions));
        });
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createInitialisationTests;
