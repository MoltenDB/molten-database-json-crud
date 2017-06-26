"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
//import * as JsonCrud from 'json-crud';
var JsonCrud = require('json-crud');
var fs = require('path');
var path = require('path');
var mkdirp = require('mkdirp');
var denodeify = require('denodeify');
var stat = denodeify(fs.stat);
var access = denodeify(fs.access);
var mkdirpp = denodeify(mkdirp);
var createJsonCrudDatabase = function (options) {
    return stat(options.baseFolder).then(function (stat) {
        if (stat.isDirectory()) {
            // Check access to folder
            return access(options.baseFolder);
        }
        else {
            return Promise.reject(new Error('baseFolder is not a directory'));
        }
    }, function (error) {
        if (error.code = 'ENOENT') {
            // Try creating the directory
            return mkdirpp(options.baseFolder);
        }
        else {
            return Promise.reject(error);
        }
    }).then(function () {
        var databases = [];
        /** @internal
         * Check whether a JsonCrud connection should be kept or not for a table
         *
         * @param table Table to check if the JsonCrud should be kept for
         */
        var keepConnection = function (table) {
            if (options.keepDatabasesConnected) {
                if (!(options.disconnect && options.disconnect.indexOf(table) !== -1)) {
                    return true;
                }
            }
            else {
                if (options.keepConnected && options.keepConnected.indexOf(table) !== -1) {
                    return true;
                }
            }
            return false;
        };
        /** @internal
         * Get the path for the given table
         *
         * @param table Table to get the path for
         */
        var getTablePath = function (table) {
            var tableFile = table;
            // Append .json to filename if it should be stored as a file
            if (!table.endsWith('.json') && !(options.tablesAsFolders
                && !(options.fileDatabases
                    && options.fileDatabases.indexOf(table) !== -1)
                && (options.folderDatabases
                    && options.folderDatabases.indexOf(table) === -1))) {
                tableFile += '.json';
            }
            return path.join(options.baseFolder, tableFile);
        };
        /** @internal
         * Opens/Retrieves the JsonCrud for the given table string
         *
         * @param table Table to get the table for
         *
         * @returns Promise that resolves to the JsonCrud connection
         */
        var getTable = function (table) {
            // Check if the connection is cached
            if (typeof databases[table] !== 'undefined') {
                if (databases[table] instanceof Promise) {
                    return databases[table];
                }
                else {
                    return Promise.resolve(databases[table]);
                }
            }
            var tableOptions = options.tableOptions[table] || options.options || {};
            var keepConnected = keepConnection(table);
            var jsonCrud = JsonCrud(__assign({}, tableOptions, { path: getTablePath(table), id: '_id' })).then(function (database) {
                if (keepConnected) {
                    databases[table] = database;
                }
                return database;
            });
            if (keepConnected) {
                databases[table] = jsonCrud;
            }
            return jsonCrud;
        };
        var create = function (table, data, replace) {
            return getTable(table).then(function (database) {
                return database.create(data, replace);
            });
        };
        var read = function (table, filter) {
            return getTable(table).then(function (database) {
                return database.read(filter);
            });
        };
        var count = function (table, filter) {
            return getTable(table).then(function (database) {
                return database.count(filter);
            });
        };
        var update = function (table, filter) {
            return getTable(table).then(function (database) {
                return database.update(filter);
            });
        };
        var deleteItems = function (table, filter) {
            return getTable(table).then(function (database) {
                return database.delete(filter);
            });
        };
        var createTable = function (table) { };
        var deleteTable = function (table) { };
        var checkTable = function (table) { };
        var close = function () {
        };
        return Promise.resolve({
            create: create,
            read: read,
            count: count,
            update: update,
            delete: deleteItems,
            createTable: createTable,
            deleteTable: deleteTable,
            checkTable: checkTable,
            close: close
        });
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createJsonCrudDatabase;
