#!/usr/bin/node

const { MongoClient } = require('mongodb');

const dbHost = (process.env.DB_HOST) ? process.env.DB_HOST : 'localhost';
const dbPort = (process.env.DB_PORT) ? process.env.DB_PORT : 27017;
const dbName = (process.env.DB_DATABASE) ? process.env.DB_DATABASE : 'file_manager';
const dbURL = `mongodb://${dbHost}:${dbPort}`;

/**
 * This is a class that performs operations with the MongoDB
 */
class DBClient {
  constructor() {
    this.database = dbName;
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

  async nbUsers() {
    await this.dbClient.connect();
    const data = await this.dbClient.db(this.database).collection('users').countDocuments();
    return data;
  }

  async nbFiles() {
    await this.dbClient.connect();
    const data = await this.dbClient.db(this.database).collection('files').countDocuments();
    return data;
  }
}

const dbClient = new DBClient();

export default dbClient;
module.exports = dbClient;
