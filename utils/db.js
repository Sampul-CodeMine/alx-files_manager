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
  constructor() {
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

  isAlive() {
    return Boolean(this.db);
  }

  async nbUsers() {
    const data = await this.usersCollection.countDocuments();
    return data;
  }

  async nbFiles() {
    const data = await this.filesCollection.countDocuments();
    return data;
  }
}

const dbClient = new DBClient();

export default dbClient;
