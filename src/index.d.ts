declare namespace MDB.Database {
  export interface JsonCrudDatabaseOptions {
    baseFolder: string,
    tablesAsFolders?: boolean,
    folderDatabases?: string[],
    fileDatabases?: string[],
    keepDatabasesConnected?: boolean,
    keepConnected?: string[],
    disconnect?: string[],
    options?: Object,
    tableOptions?: {
      [ table: string ]: Object
    }
  }
}
