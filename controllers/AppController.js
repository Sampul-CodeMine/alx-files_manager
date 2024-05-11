#!/usr/bin/node

const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class AppController {
  static getStatus(req, res) {
    if (redisClient.isAlive() && dbClient.isAlive()) {
      res.json({ redis: true, db: true });
      res.end();
    }
  }

  static async getStats(req, res) {
    const userData = await dbClient.nbUsers();
    const fileData = await dbClient.nbFiles();
    res.json({ userData, fileData });
    res.end();
  }
}

export default AppController;
module.exports = AppController;
