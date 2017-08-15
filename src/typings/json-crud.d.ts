declare namespace MDB.Storage {
  export interface JsonCrudDatabaseOptions extends MDB.Storage.StorageOptions {
    /// Folder to store the json-crud databases for each table
    baseFolder: string,
    /// Whether to or what tables to store each table as a json-crud folder database
    tablesAsFolders?: boolean | {
      [table: string]: boolean,
      default?: boolean
    },
    /// Whether or for what tables keep the json-crud instance
    keepConnected?: boolean | {
      [table: string]: boolean,
      default?: boolean
    },
    /// Whether to or what tables to cache the values of the table(s)
    cacheValues?: boolean | {
      [table: string]: boolean,
      default?: boolean
    },
    /// Whether to or what tables to cache the keys of the table(s)
    cacheKeys?: boolean | {
      [table: string]: boolean,
      default?: boolean
    },
    /// Default options to pass to json-crud
    options?: { [option: string]: any },
    /// Store-specific options to send to json-crud
    tableOptions?: {
      [table: string]: { [option: string]: any }
    }
  }
}
