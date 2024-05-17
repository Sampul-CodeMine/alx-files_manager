#!/usr/bin/node

import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import { ObjectId } from 'mongodb';

class AuthController {
  /**
   * Function to generate new auth_token and sign the user in
   */
  static async getConnect (req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const encodedCredentials = authHeader.split(' ')[1];
    const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');
    const [email, password] = decodedCredentials.split(':');
    const user = await (await dbClient.usersCollection)
      .findOne({ email, password: sha1(password) });

    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const token = uuidv4();

    await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 60 * 60);
    return res.status(200).json({ token });
  }

  /**
   * Function to sign the authenticatetd user out
   */
  static async getDisconnect (req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await (await dbClient.usersCollection.findOne({ _id: ObjectId(userId) }));
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    await redisClient.del(`auth_${token}`);

    return res.status(204).end();
  }
}

export default AuthController;
