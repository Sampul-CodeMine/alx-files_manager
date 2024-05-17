#!/usr/bin/node

import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';

class AppController {
  /**
   * Method to get status of redis and db connection
   * @param {object} req
   * @param {object} res
   */
  static getStatus (req, res) {
    const result = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive()
    };
    res.status(200).send(result);
    res.end();
  }

  static async getStats (req, res) {
    const result = {
      users: await dbClient.nbUsers(),
      files: await dbClient.nbFiles()
    };
    res.status(200).send(result);
    res.end();
  }
}

export default AppController;
