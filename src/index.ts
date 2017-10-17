// import * as JsonCrud from 'json-crud';
const JsonCrud = require('json-crud');

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const rmdir = require('rmdir');
const denodeify = require('denodeify');

const stat = denodeify(fs.stat);
const unlink = denodeify(fs.unlink);
const access = denodeify(fs.access);
const mkdirpp = denodeify(mkdirp);
const rmdirp = denodeify(rmdir);

let createJsonCrudDatabase = (options: MDB.Storage.JsonCrudDatabaseOptions):
    Promise<MDB.Storage.StorageConnection> => {
  if (!options) {
    return Promise.reject(new Error('options must be given'));
  }
  
  let checkPromise;

  if (options.baseFolder === false) {
    options.keepConnected = true;
    checkPromise = Promise.resolve();
  } else {
    if (!options.baseFolder) {
      return Promise.reject(new Error('baseFolder must be given'));
    }

    checkPromise = stat(options.baseFolder).then((stat) => {
      if (stat.isDirectory()) {
        // Check access to folder
        return access(options.baseFolder, fs.R_OK | fs.W_OK);
      } else {
        return Promise.reject(new Error('baseFolder is not a directory'));
      }
    }, (error) => {
      if (error.code = 'ENOENT') {
        // Try creating the directory
        return mkdirpp(options.baseFolder);
      } else {
        return Promise.reject(error);
      }
    });
  }
  return checkPromise.then(() => {
    let databases = [];

    /** @internal
     * Check whether a JsonCrud connection should be kept or not for a store
     *
     * @param store Store to check if the JsonCrud should be kept for
     */
    const checkOption = (option: string, store: string): boolean => {
      if (typeof options[option] === 'boolean') {
        return options[option];
      } else if (option[option]) {
        if (typeof options[option][store] === 'boolean') {
          return options[option][store];
        } else if (typeof options[option].default === 'boolean') {
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
    const getStorePath = (store: string): string | false => {
      if (options.baseFolder === false) {
        return false;
      }

      let storeFile = store;
      // Append .json to filename if it should be stored as a file
      if (!checkOption('storesAsFolders', store)) {
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
    const getJsonCrud = (store: MDB.Storage.StoreOptions, create?: boolean)
    : Promise<JsonDB.JsonDBInstance> => {
      // Check if the connection is cached
      if (typeof databases[store.name] !== 'undefined') {
        if (create) {
          return Promise.reject(new Error(`store ${store.name} already exists`));
        }
        const connection = databases[store.name];
        if (connection instanceof Promise) {
          return connection;
        } else {
          return Promise.resolve(connection);
        }
      }

      // Check for the existence of the store
      const storePath = getStorePath(store.name);

      let checkPromise;

      if (storePath === false) {
        if (!create && typeof databases[store.name] === 'undefined') {
          return Promise.reject('Store does not exist');
        }
        checkPromise = Promise.resolve();
      } else {
        checkPromise = stat(storePath).then(() => {
          if (create) {
            return Promise.reject(new Error(`store ${store.name} already exists`));
          }
        }, (error) => {
          if (error.code === 'ENOENT') {
            if (!create) {
              return Promise.reject(new Error('Store does not exist'));
            }
          } else {
            return Promise.reject(error);
          }
        })
      }

      return checkPromise.then(() => {
        const storeOptions = /*TODO options.storeOptions[store] ||*/ options.options || {};
        const keepConnected = checkOption('keepConnected', store.name);

        const jsonCrud = JsonCrud({
          ...storeOptions,
          path: storePath,
          id: '_id'
        }).then((database) => {
          if (keepConnected) {
            databases[store.name] = database;
          }

          return database;
        });

        if (keepConnected) {
          databases[store.name] = jsonCrud;
        }

        return jsonCrud;
      });
    };

    const getItemStore = (store: MDB.Storage.ItemStoreOptions, create?: boolean) => {
      return getJsonCrud(store, create).then((jsonCrud) => {
        return {
          create: (data: MDB.Storage.Data | MDB.Storage.Data[]): Promise<any[]> => {
            let single = false;
            if (!(data instanceof Array)) {
              data = [data];
              single = true;
            }

            const promise = jsonCrud.create(data);
            if (single) {
              return promise.then((ids) => {
                if (ids[0] instanceof Error) {
                  return Promise.reject(ids[0]);
                } else {
                  return Promise.resolve(ids[0]);
                }
              });
            } else {
              return promise;
            }
          },

          read: (filter: MDB.Storage.Filter, options?: MDB.FilterOptions)
              : Promise<MDB.Storage.Result> => {
            return jsonCrud.read(filter).then((results) => {
              let resultArray = Object.keys(results).map((key) => {
                return results[key];
              });

              if (options instanceof Object) {
                if (options.sort) {
                  const sortFields = Object.keys(options.sort);
                  let i;

                  for (i = 0; i < sortFields.length; i++) {
                    const sortField = sortFields[i];
                    resultArray.sort((a, b) => {
                      if (i != 0) {
                        const previousField = sortFields[i-1];
                        if (a[previousField] !== b[previousField]) {
                          return 0;
                        }
                      }

                      if (options.sort[sortField] === 1) {
                        return a[sortField] > b[sortField];
                      } else if (options.sort[sortField] === -1) {
                        return a[sortField] < b[sortField];
                      }

                      return 0;
                    });
                  }
                }

                if (options.limit) {
                  if (options.limit > 0) {
                    resultArray.splice(options.limit);
                  }
                }
              }

              return Promise.resolve(resultArray);
            });
          },

          count: (filter: MDB.Storage.Filter)
              : Promise<number> => {
            return jsonCrud.read(filter).then((results) => {
              return Promise.resolve(Object.keys(results).length);
            });
          },

          update: (data: MDB.Storage.Data, filter: MDB.Storage.Filter)
              : Promise<number> => {
            if (!(data instanceof Array)) {
              if (typeof data._id !== 'undefined') {
                data = [data];
                filter = filter ? true : false;
              }
            } else {
              filter = filter ? true : false;
            }

            return jsonCrud.update(data, filter);
          },

          delete: (filter: true | MDB.Storage.Filter)
              : Promise<number> => {
            return jsonCrud.delete(filter);
          }
        };
      });
    };

    const getKeyValueStore = (store: MDB.Storage.KeyValueStoreOptions, create?: boolean) => {
      return getJsonCrud(store, create).then((jsonCrud) => {
        return {
          setItem: (key: MDB.Storage.Key, value: any) => {
            return jsonCrud.update([key, value], true).then(() => {
              return value;
            });
          },

          getItem: (key: MDB.Storage.Key) => {
            return jsonCrud.read(key).then((values) => {
              if (typeof values[key] !== 'undefined') {
                return values[key];
              } else {
                return undefined;
              }
            });
          },

          removeItem: (key: MDB.Storage.Key) => {
            return jsonCrud.delete(key);
          }
        };
      });
    };



    const getStore = (store: MDB.Storage.StoreOptions, create?: boolean) => {
      switch (store.type) {
        case 'keyValue':
          return getKeyValueStore(store, create);
        case 'store':
        default:
          return getItemStore(store, create);
      }
    };

    const deleteStore = (store: MDB.Storage.StoreOptions): Promise<undefined | boolean> => {
      if (typeof store !== 'object') {
        return Promise.reject(new Error('Need store options of store to delete'));
      }

      const storePath = getStorePath(store.name);

      if (storePath === false) {
        if (typeof databases[store.name] !== 'undefined') {
          delete databases[store.name];
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      }

      // Check if we have a cached connection and remove
      if (typeof databases[store.name] !== 'undefined') {
        delete databases[store.name];
      }

      return stat(storePath).then((stat) => {
          let promise;
          if (!checkOption('storesAsFolders', store)) {
            promise = unlink(storePath);
          } else {
            promise = rmdirp(storePath);
          }
          return promise.then(() => Promise.resolve(true));
        }, (error) => {
          if (error.code === 'ENOENT') {
            return Promise.resolve(false);
          } else {
            return Promise.reject(error);
          }
        });
    };

    const checkStore = (store: MDB.Storage.StoreOptions): Promise<boolean | undefined> => {
      if (typeof store !== 'object') {
        return Promise.reject(new Error('Need store options of store to delete'));
      }

      const storePath = getStorePath(store.name);

      if (storePath === false) {
        if (typeof databases[store.name] === 'undefined') {
          return Promise.resolve();
        } else {
          return Promise.resolve(true);
        }
      }

      return stat(storePath).then(
        () => Promise.resolve(true),
        (error) => {
          if (error.code === 'ENOENT') {
            return Promise.resolve();
          } else {
            return Promise.reject(error);
          }
        }
      );
    };

    const close = (): Promise<undefined> => {
      return Promise.resolve();
    };

    return Promise.resolve(<MDB.Storage.StorageConnection>{
      createStore: (store: MDB.Storage.StoreOptions) => getStore(store, true),
      getStore: (store: MDB.Storage.StoreOptions) => getStore(store),
      deleteStore,
      checkStore,
      close
    });
  });
};
createJsonCrudDatabase.label = 'JSON CRUD Storage';
createJsonCrudDatabase.description = 'Uses simple JSON files or folders of JSON files to store items';
createJsonCrudDatabase.types = ['string', 'number', 'object', 'array',
    'boolean'];
createJsonCrudDatabase.features = ['keyValue', 'schemaless'];
export default <MDB.Storage.connectStorage>createJsonCrudDatabase;
