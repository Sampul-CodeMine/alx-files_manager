#!/usr/bin/node

import express from 'express';
import AppController from '../controllers/AppController.js';
import UsersController from '../controllers/UsersController.js';
import AuthController from '../controllers/AuthController.js';
import FilesController from '../controllers/FilesController.js';

function routerController(app) {
  const router = express.Router();
  app.use('/', router);

  /**
   * Route to check if redis and mongodb connectivity are active
   */
  router.get('/status', (req, res) => {
    AppController.getStatus(req, res);
  });

  /**
   * Route to check the number of documents in the users and files collections
   */
  router.get('/stats', (req, res) => {
    AppController.getStats(req, res);
  });

  /**
   * Route to create a new user Using POST method
   */
  router.post('/users', (req, res) => {
    UsersController.postNew(req, res);
  });

  // Route to sign in a user using an auth-token
  router.get('/connect', (req, res) => {
    AuthController.getConnect(req, res);
  });

  // Route to sign authenticated logged in user out
  router.get('/disconnect', (req, res) => {
    AuthController.getDisconnect(req, res);
  });

  // Route to retrieve a user based on the login auth token specified
  router.get('/users/me', (req, res) => {
    UsersController.getMe(req, res);
  });

  /**
   * This is the routes for handling Files
   */
  // Route to create new file on the disk and to the Database
  router.post('/files', (req, res) => {
    FilesController.postUpload(req, res);
  });

  // This is a route to retrieve file document based on the ID
  router.get('/files/:id', (req, res) => {
    FilesController.getShow(req, res);
  });

  //Route to retrieve parentId and with pagination
  router.get('/files', (req, res) => {
    FilesController.getIndex(req, res);
  });

  // Route to set isPublic to true on the file document based on the ID
  router.put('/files/:id/publish', (req, res) => {
    FilesController.putPublish(req, res);
  });

  // Route to set isPublic to false on the file document based on the ID
  router.put('/files/:id/unpublish', (req, res) => {
    FilesController.putUnpublish(req, res);
  });

  // Route to return the content of the file document based on the ID
  router.get('/files/:id/data', (req, res) => {
    FilesController.getFile(req, res);
  });

}

export default routerController;
