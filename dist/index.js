"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
// import * as JsonCrud from 'json-crud';
var JsonCrud = require('json-crud');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var rmdir = require('rmdir');
var denodeify = require('denodeify');
var stat = denodeify(fs.stat);
var access = denodeify(fs.access);
var mkdirpp = denodeify(mkdirp);
var rmdirp = denodeify(rmdir);
var createJsonCrudDatabase = function (options) {
    if (!options) {
        return Promise.reject(new Error('options must be given'));
    }
    else if (!options.baseFolder) {
        return Promise.reject(new Error('baseFolder must be given'));
    }
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
         * Check whether a JsonCrud connection should be kept or not for a store
         *
         * @param store Store to check if the JsonCrud should be kept for
         */
        var checkOption = function (option, store) {
            if (typeof options[option] === 'boolean') {
                return options[option];
            }
            else if (option[option]) {
                if (typeof options[option][store] === 'boolean') {
                    return options[option][store];
                }
                else if (typeof options[option].default === 'boolean') {
                    return options[option].default;
                }
            }
            return false;
        };
        /** @internal
         * Get the path for the given store
         *
         * @param store Store to get the path for
         */
        var getStorePath = function (store) {
            var storeFile = store;
            // Append .json to filename if it should be stored as a file
            if (!store.endsWith('.json') && !checkOption('storesAsFolders', store)) {
                storeFile += '.json';
            }
            return path.join(options.baseFolder, storeFile);
        };
        /** @internal
         * Opens/Retrieves the JsonCrud for the given store string
         *
         * @param store Store to get the store for
         *
         * @returns Promise that resolves to the JsonCrud connection
         */
        var getJsonCrud = function (store, create) {
            // Check if the connection is cached
            if (typeof databases[store] !== 'undefined') {
                if (create) {
                    return Promise.reject(new Error("store " + store.name + " already exists"));
                }
                var connection = databases[store];
                if (connection instanceof Promise) {
                    return connection;
                }
                else {
                    return Promise.resolve(connection);
                }
            }
            // Check for the existence of the store
            var storePath = getStorePath(store.name);
            return stat(storePath).then(function () {
                if (create) {
                    return Promise.reject(new Error("store " + store.name + " already exists"));
                }
            }, function (error) {
                if (error.code === 'ENOENT') {
                    if (!create) {
                        return Promise.reject(new Error('Store does not exist'));
                    }
                }
                else {
                    return Promise.reject(error);
                }
            }).then(function () {
                var storeOptions = options.options || {};
                var keepConnected = checkOption('keepConnected', store.name);
                var jsonCrud = JsonCrud(__assign({}, storeOptions, { path: storePath, id: '_id' })).then(function (database) {
                    if (keepConnected) {
                        databases[store] = database;
                    }
                    return database;
                });
                if (keepConnected) {
                    databases[store] = jsonCrud;
                }
                return jsonCrud;
            });
        };
        var getItemStore = function (store, create) {
            return getJsonCrud(store, create).then(function (jsonCrud) {
                return {
                    create: function (data) {
                        var single = false;
                        if (!(data instanceof Array)) {
                            data = [data];
                            single = true;
                        }
                        var promise = jsonCrud.create(data);
                        if (single) {
                            return promise.then(function (ids) {
                                if (ids[0] instanceof Error) {
                                    return Promise.reject(ids[0]);
                                }
                                else {
                                    return Promise.resolve(ids[0]);
                                }
                            });
                        }
                        else {
                            return promise;
                        }
                    },
                    read: function (filter) {
                        return jsonCrud.read(filter).then(function (results) {
                            return Promise.resolve(Object.keys(results).map(function (key) {
                                return results[key];
                            }));
                        });
                    },
                    count: function (filter) {
                        return jsonCrud.count(filter);
                    },
                    update: function (data, filter) {
                        if (!(data instanceof Array)) {
                            if (typeof data._id !== 'undefined') {
                                data = [data];
                                filter = filter ? true : false;
                            }
                        }
                        else {
                            filter = filter ? true : false;
                        }
                        return jsonCrud.update(data, filter);
                    },
                    delete: function (filter) {
                        return jsonCrud.delete(filter);
                    }
                };
            });
        };
        var getKeyValueStore = function (store, create) {
            return getJsonCrud(store, create).then(function (jsonCrud) {
                return {
                    setItem: function (key, value) {
                        return jsonCrud.update([key, value], true).then(function () {
                            return value;
                        });
                    },
                    getItem: function (key) {
                        return jsonCrud.read(key).then(function (values) {
                            if (typeof values[key] !== 'undefined') {
                                return values[key];
                            }
                            else {
                                return undefined;
                            }
                        });
                    },
                    removeItem: function (key) {
                        return jsonCrud.delete(key);
                    }
                };
            });
        };
        var getStore = function (store, create) {
            switch (store.type) {
                case 'keyValue':
                    return getKeyValueStore(store, create);
                case 'store':
                default:
                    return getItemStore(store, create);
            }
        };
        var deleteStore = function (store) {
            var storePath = getStorePath(store.name);
            // Check if we have a cached connection and remove
            if (typeof databases[store.name] !== 'undefined') {
                delete databases[store.name];
            }
            return stat(storePath).then(function (stat) {
                return rmdirp(storePath);
            });
        };
        var checkStore = function (store) {
            var storePath = getStorePath(store.name);
            return stat(storePath).then(function () { return Promise.resolve(); });
        };
        var close = function () {
            return Promise.resolve();
        };
        return Promise.resolve({
            createStore: function (store) { return getStore(store, true); },
            getStore: function (store) { return getStore(store); },
            deleteStore: deleteStore,
            checkStore: checkStore,
            close: close
        });
    });
};
createJsonCrudDatabase.types = ['string', 'number', 'object', 'array',
    'boolean'];
createJsonCrudDatabase.features = ['keyValue'];
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createJsonCrudDatabase;
