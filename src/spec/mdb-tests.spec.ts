import createJsonCrudDatabase from '../';
import makeStorageTests from 'molten-storage';

const fs = require('fs');
const denodeify = require('denodeify');
const mkdirp = require('mkdirp');
const rmdir = require('rmdir');

const stat = denodeify(fs.stat);
const writeFile = denodeify(fs.writeFile);
const unlink = denodeify(fs.unlink);
const mkdirpp = denodeify(mkdirp);
const rmdirp = denodeify(rmdir);


const Reporter = require('jasmine2-reporter').Jasmine2Reporter;
jasmine.getEnv().addReporter(new Reporter());

describe('MoltenDB json-crud Storage Implementation', () => {
  beforeAll(() => {
    // Check test and badFolder don't already exist
    return Promise.all([
      stat('test').then(
          (stat) => Promise.reject(new Error('`test` already exists')),
          (error) => {
            if (error.code === 'ENOENT') {
              return Promise.resolve();
            }

            return Promise.reject(error);
          }),
      stat('badFolder').then(
          (stat) => Promise.reject(new Error('`badFolder` already exists')),
          (error) => {
            if (error.code === 'ENOENT') {
              return Promise.resolve();
            }

            return Promise.reject(error);
          })
    ]).then(() => {
      // Create the tempfile
      return writeFile('badFolder', '');
    }).catch(fail);
  });

  afterAll(() => {
    // Delete the badFolder
    return unlink('badFolder').catch(fail);
  });

  beforeEach(() => {
    // Create test dir
    return mkdirpp('test');
  });

  afterEach(() => {
    return rmdirp('test');
  });

  makeStorageTests(createJsonCrudDatabase, {
    badOptions: [
      {
        label: 'with a bad baseFolder',
        options: <MDB.Database.JsonCrudDatabaseOptions>{
          baseFolder: 'badFolder'
        }
      },
      {
        label: 'with undefined options'
      },
    ],
    testOptions: <MDB.Database.JsonCrudDatabaseOptions>{
      baseFolder: 'test'
    }
  });
});
