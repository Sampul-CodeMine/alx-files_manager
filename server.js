#!/usr/bin/node

import express from 'express';
import routerController from './routes/index.js';

const server = express();
const PORT = (process.env.PORT) ? process.env.PORT : 5000;

server.use(express.json());

routerController(server);

server.listen(PORT, () => {
  console.log(`Server Running: http://localhost:${PORT}/`);
});

export default server;
