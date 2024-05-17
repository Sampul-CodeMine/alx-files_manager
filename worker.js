#!/usr/bin/node

import Queue from 'bull';
import { ObjectId } from 'mongodb';
import { promises as fsPromises } from 'fs';
import fileUtils from './utils/fileUtils.js';
import dbClient from './utils/db.js';

const imageThumbnail = require('image-thumbnail');

const fileQueue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');

const isValidId = (id) => {
  try {
    ObjectId(id);
  } catch (err) {
    return false;
  }
  return true;
};

async function getUser (query) {
  const user = await (await dbClient.usersCollection.findOne(query));
  return user;
}

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!userId) {
    console.log('Missing userId');
    throw new Error('Missing userId');
  }

  if (!fileId) {
    console.log('Missing fileId');
    throw new Error('Missing fileId');
  }

  if (!isValidId(fileId) || !isValidId(userId)) throw new Error('File not found');

  const file = await fileUtils.getFile({
    _id: ObjectId(fileId),
    userId: ObjectId(userId)
  });

  if (!file) throw new Error('File not found');

  const { localPath } = file;
  const options = {};
  const widths = [500, 250, 100];

  widths.forEach(async (width) => {
    options.width = width;
    try {
      const thumbnail = await imageThumbnail(localPath, options);
      await fsPromises.writeFile(`${localPath}_${width}`, thumbnail);
      //   console.log(thumbnail);
    } catch (err) {
      console.error(err.message);
    }
  });
});

userQueue.process(async (job) => {
  const { userId } = job.data;

  if (!userId) {
    console.log('Missing userId');
    throw new Error('Missing userId');
  }

  if (!isValidId(userId)) throw new Error('User not found');

  const user = await getUser({
    _id: ObjectId(userId)
  });

  if (!user) throw new Error('User not found');

  console.log(`Welcome ${user.email}!`);
});
