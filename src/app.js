const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
const { errorHandler } = require('./middlewares');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/assets', express.static(path.resolve(__dirname, '../uploads')));
app.use('/api', routes);
app.use(errorHandler);

module.exports = app;
