#!/usr/bin/node

import mongoDBCore from 'mongodb/lib/core';
import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';
import { tmpdir } from 'os';
import { promisify } from 'util';
import Queue from 'bull/lib/queue';
import { v4 as uuidv4 } from 'uuid';
import { mkdir, writeFile, stat, existsSync, realpath,} from 'fs';
import { join as joinPath } from 'path';
import { contentType } from 'mime-types';

const { ObjectId } = require('mongodb');

const VALID_FILE_TYPES = {
  folder: 'folder',
  file: 'file',
  image: 'image',
};
const ROOT_FOLDER_ID = 0;
const DEFAULT_ROOT_FOLDER = 'files_manager';
const mkDirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);
const statAsync = promisify(stat);
const realpathAsync = promisify(realpath);
const MAX_FILES_PER_PAGE = 20;
const fileQueue = new Queue('thumbnail generation');
const NULL_ID = Buffer.alloc(24, '0').toString('utf-8');
const isValidId = (id) => {
  const size = 24;
  let i = 0;
  const charRanges = [
    [48, 57], // 0 - 9
    [97, 102], // a - f
    [65, 70], // A - F
  ];
  if (typeof id !== 'string' || id.length !== size) {
    return false;
  }
  while (i < size) {
    const c = id[i];
    const code = c.charCodeAt(0);

    if (!charRanges.some((range) => code >= range[0] && code <= range[1])) {
      return false;
    }
    i += 1;
  }
  return true;
};

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const userIds = await (await redisClient.get(`auth_${token}`));
    const user = await (await dbClient.usersCollection.findOne({ _id: ObjectId(userIds) }));
    const userId = userIds.toString();
    const name = req.body ? req.body.name : null;
    const type = req.body ? req.body.type : null;
    const parentId = req.body && req.body.parentId ? req.body.parentId : ROOT_FOLDER_ID;
    const isPublic = req.body && req.body.isPublic ? req.body.isPublic : false;
    const base64Data = req.body && req.body.data ? req.body.data : '';

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !Object.values(VALID_FILE_TYPES).includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!req.body.data && type !== VALID_FILE_TYPES.folder) {
      return res.status(400).json({ error: 'Missing data' });
    }
    if ((parentId !== ROOT_FOLDER_ID) && (parentId !== ROOT_FOLDER_ID.toString())) {
      const file = await (await dbClient.filesCollection
        .findOne({
          _id: new mongoDBCore.BSON.ObjectId(isValidId(parentId) ? parentId : NULL_ID),
        }));

      if (!file) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (file.type !== VALID_FILE_TYPES.folder) {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    const baseDir = `${process.env.FOLDER_PATH || ''}`.trim().length > 0
      ? process.env.FOLDER_PATH.trim()
      : joinPath(tmpdir(), DEFAULT_ROOT_FOLDER);
    // default baseDir == '/tmp/files_manager'
    // or (on Windows) '%USERPROFILE%/AppData/Local/Temp/files_manager';
    const newFile = {
      userId: new mongoDBCore.BSON.ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: (parentId === ROOT_FOLDER_ID) || (parentId === ROOT_FOLDER_ID.toString())
        ? '0'
        : new mongoDBCore.BSON.ObjectId(parentId),
    };
    await mkDirAsync(baseDir, { recursive: true });
    if (type !== VALID_FILE_TYPES.folder) {
      const localPath = joinPath(baseDir, uuidv4());
      await writeFileAsync(localPath, Buffer.from(base64Data, 'base64'));
      newFile.localPath = localPath;
    }
    const insertionInfo = await (await dbClient.filesCollection.insertOne(newFile));
    const fileId = insertionInfo.insertedId.toString();
    // start thumbnail generation worker
    if (type === VALID_FILE_TYPES.image) {
      const jobName = `Image thumbnail [${userId}-${fileId}]`;
      fileQueue.add({ userId, fileId, name: jobName });
    }
    return res.status(201).json({
      id: fileId,
      userId,
      name,
      type,
      isPublic,
      parentId: (parentId === ROOT_FOLDER_ID) || (parentId === ROOT_FOLDER_ID.toString())
        ? 0
        : parentId,
    });
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    const userIds = await (await redisClient.get(`auth_${token}`));
    const user = await (await dbClient.usersCollection.findOne({ _id: ObjectId(userIds) }));
    const userId = userIds.toString();
    const id = req.params ? req.params.id : NULL_ID;
    const file = await (await dbClient.filesCollection
      .findOne({
        _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
        userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
      }));
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId === ROOT_FOLDER_ID.toString()
        ? 0
        : file.parentId.toString(),
    });
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const userIds = await (await redisClient.get(`auth_${token}`));
    const user = await (await dbClient.usersCollection.findOne({ _id: ObjectId(userIds) }));
    const userId = userIds.toString();
    const parentId = req.query.parentId || ROOT_FOLDER_ID.toString();
    const page = /\d+/.test((req.query.page || '').toString())
      ? Number.parseInt(req.query.page, 10)
      : 0;
    const filesFilter = {
      userId: user._id,
      parentId: parentId === ROOT_FOLDER_ID.toString()
        ? parentId
        : new mongoDBCore.BSON.ObjectId(isValidId(parentId) ? parentId : NULL_ID),
    };
    const files = await (await dbClient.filesCollection
      .aggregate([
        { $match: filesFilter },
        { $sort: { _id: -1 } },
        { $skip: page * MAX_FILES_PER_PAGE },
        { $limit: MAX_FILES_PER_PAGE },
        {
          $project: {
            _id: 0,
            id: '$_id',
            userId: '$userId',
            name: '$name',
            type: '$type',
            isPublic: '$isPublic',
            parentId: {
              $cond: { if: { $eq: ['$parentId', '0'] }, then: 0, else: '$parentId' },
            },
          },
        },
      ])).toArray();
    return res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    const userIds = await (await redisClient.get(`auth_${token}`));
    const user = await (await dbClient.usersCollection.findOne({ _id: ObjectId(userIds) }));
    const userId = userIds.toString();
    const { id } = req.params;
    const fileFilter = {
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
      userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
    };
    const file = await (await dbClient.filesCollection
      .findOne(fileFilter));

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    await (await dbClient.filesCollection
      .updateOne(fileFilter, { $set: { isPublic: true } }));
    return res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: true,
      parentId: file.parentId === ROOT_FOLDER_ID.toString()
        ? 0
        : file.parentId.toString(),
    });
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    const userIds = await (await redisClient.get(`auth_${token}`));
    const user = await (await dbClient.usersCollection.findOne({ _id: ObjectId(userIds) }));
    const userId = userIds.toString();
    const { id } = req.params;
    const fileFilter = {
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
      userId: new mongoDBCore.BSON.ObjectId(isValidId(userId) ? userId : NULL_ID),
    };
    const file = await (await dbClient.filesCollection
      .findOne(fileFilter));
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    await (await dbClient.filesCollection
      .updateOne(fileFilter, { $set: { isPublic: false } }));
    return res.status(200).json({
      id,
      userId,
      name: file.name,
      type: file.type,
      isPublic: false,
      parentId: file.parentId === ROOT_FOLDER_ID.toString()
        ? 0
        : file.parentId.toString(),
    });
  }

  static async getFile(req, res) {
    const token = req.headers['x-token'];
    const userIds = await (await redisClient.get(`auth_${token}`));
    const user = await (await dbClient.usersCollection.findOne({ _id: ObjectId(userIds) }));
    const userId = user ? userIds.toString() : '';
    const { id } = req.params;
    const size = req.query.size || null;
    const fileFilter = {
      _id: new mongoDBCore.BSON.ObjectId(isValidId(id) ? id : NULL_ID),
    };
    const file = await (await dbClient.filesCollection
      .findOne(fileFilter));

    if (!file || (!file.isPublic && (file.userId.toString() !== userId))) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (file.type === VALID_FILE_TYPES.folder) {
      return res.status(400).json({ error: 'A folder doesn\'t have content' });
    }
    let filePath = file.localPath;
    if (size) {
      filePath = `${file.localPath}_${size}`;
    }
    if (existsSync(filePath)) {
      const fileInfo = await statAsync(filePath);
      if (!fileInfo.isFile()) {
        return res.status(404).json({ error: 'Not found' });
      }
    } else {
      return res.status(404).json({ error: 'Not found' });
    }
    const absoluteFilePath = await realpathAsync(filePath);
    res.setHeader('Content-Type', contentType(file.name) || 'text/plain; charset=utf-8');
    return res.status(200).sendFile(absoluteFilePath);
  }
}

module.exports = FilesController;
