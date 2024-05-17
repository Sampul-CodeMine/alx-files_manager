#!/usr/bin/node

import { MongoClient } from 'mongodb';

const dbHost = (process.env.DB_HOST) ? process.env.DB_HOST : 'localhost';
const dbPort = (process.env.DB_PORT) ? process.env.DB_PORT : 27017;
const dbName = (process.env.DB_DATABASE) ? process.env.DB_DATABASE : 'files_manager';
const dbURL = `mongodb://${dbHost}:${dbPort}`;

/**
 * This is a class that performs operations with the MongoDB
 */
class DBClient {
  /**
   * This is the constructor to the DBClient to establish connection to MongoDB
   */
  constructor () {
    MongoClient.connect(dbURL, { useUnifiedTopology: true }, (err, databaseClient) => {
      if (err) {
        console.log(err.message);
        this.db = false;
      } else {
        this.db = databaseClient.db(dbName);
        this.usersCollection = this.db.collection('users');
        this.filesCollection = this.db.collection('files');
      }
    });
  }

  /**
   * Function to chcek if the db client is still connected to the DB
   * @returns {boolean} True if the connection is alive else False
   */
  isAlive () {
    return Boolean(this.db);
  }

  /**
   * Method to get the counts of documents in the users collection
   * @returns {number} number of documents for users
   */
  async nbUsers () {
    const data = await this.usersCollection.countDocuments();
    return data;
  }

  /**
   * Method to get the counts of documents in the files collection
   * @returns {number} number of documents for files
   */
  async nbFiles () {
    const data = await this.filesCollection.countDocuments();
    return data;
  }
}

const dbClient = new DBClient();

export default dbClient;
