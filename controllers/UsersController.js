#!/usr/bin/node

import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import sha1 from 'sha1';
import Queue from 'bull';
import { ObjectId } from 'mongodb';
const userQueue = new Queue('userQueue');

class UsersController {
  /**
   * Method to Create a new user using email and password
   */
  static async postNew (req, res) {
    const { email, password } = req.body;

    if (!email) return res.status(400).send({ error: 'Missing email' });
    if (!password) { return res.status(400).send({ error: 'Missing password' }); }

    const isExistingEmail = await (await dbClient.usersCollection.findOne({ email }));

    if (isExistingEmail) { return res.status(400).send({ error: 'Already exist' }); }

    const hashPassword = sha1(password);

    const insertUser = await (await dbClient.usersCollection)
      .insertOne({ email, password: hashPassword });
    const insertedId = insertUser.insertedId.toString();
    userQueue.add({ insertedId });
    const user = {
      id: insertedId,
      email
    };
    return res.status(201).send(user);
  }

  /**
   * This is a method to retrieve the details of an aithenticated user
   */
  static async getMe (req, res) {
    const token = req.header['X-Token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userIds = await (await redisClient.get(`auth_${token}`));
    if (!userIds) return res.status(401).json({ error: 'Unauthorized' });

    const user = await (await dbClient.usersCollection.findOne({ _id: ObjectId(userIds) }));
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    return res.status(200).json({ id: user._id, email: user.email });
  }
}

export default UsersController;
