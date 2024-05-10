#!/usr/bin/node

const { createClient } = require('redis');
const { promisify } = require('util');

/**
 * This is a class that performs operations ith the Redis Server
 */
class RedisClient {
  constructor() {
    this.client = createClient();

    // When there is an err
    this.client.on('error', (error) => {
      console.log(`Client not connected to the Redis server: ${error.message || error.toString()}`);
    });

    // When the connection is successful
    this.isConnected = false;
    this.client.on('connect', () => {
      this.isConnected = true;
    });
  }

  /**
   * This is a method to check if the redis client connected successfully to the redis service
   * @returns {bool} true if connected successfully else false.
   */
  isAlive() {
    return this.isConnected;
  }

  /**
   * Asynchronously retrieves the value associated with the specified key in Redis.
   * @param {string} key - The key of the value to retrieve.
   * @returns {Promise<string|null>} A promise that resolves to the value associated with the key,
   * or null if the key does not exist.
   */
  async get(key) {
    const asyncObj = promisify(this.client.get).bind(this.client);
    const result = await asyncObj(key);
    return result;
  }

  /**
   * Asynchronously sets a Redis element with the specified key, value, and expiration duration.
   * @param {string} key - The key of the element to set.
   * @param {string} value - The value to set for the key.
   * @param {number} duration - The duration in seconds until the element expires.
   */
  async set(key, value, duration) {
    const asyncObj = promisify(this.client.set).bind(this.client);
    await asyncObj(key, value, 'EX', duration);
  }

  /**
   * Deletes a Redis element stored with the specified key.
   * @param {string} key - The key of the element to delete.
   */
  async del(key) {
    const asyncObj = promisify(this.client.del).bind(this.client);
    await asyncObj(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
module.exports = redisClient;