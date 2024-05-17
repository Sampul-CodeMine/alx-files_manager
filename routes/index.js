#!/usr/bin/node

import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';

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

}

export default routerController;
