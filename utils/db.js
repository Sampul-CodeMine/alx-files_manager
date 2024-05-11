#!/usr/bin/node

const { MongoClient } = require('mongodb');

/**
 * This is a class that performs operations with the MongoDB
 */
class DBClient {
  constructor() {
    const dbHost = (process.env.DB_HOST) ? process.env.DB_HOST : 'localhost';
    const dbPort = (process.env.DB_PORT) ? process.env.DB_PORT : 27017;
    const dbName = (process.env.DB_DATABASE) ? process.env.DB_DATABASE : 'file_manager';
    const dbURL = `mongodb://${dbHost}:${dbPort}/${dbName}`;

    this.isConnected = false;
    this.dbClient = new MongoClient(dbURL, { useUnifiedTopology: true });
    this.dbClient.connect()
      .then(() => {
        this.isConnected = true;
      })
      .catch((err) => console.log(`Error: ${err.message || err.toString()}`));
  }

  isAlive() {
    return this.isConnected;
  }
}

const dbClient = new DBClient();

export default dbClient;
module.exports = dbClient;
