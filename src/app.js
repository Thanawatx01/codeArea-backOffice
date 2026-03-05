const express = require('express');
const cors = require('cors');
const multer = require('multer');
const routes = require('./routes');
const { errorHandler } = require('./middlewares');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// รองรับ form-data จาก Postman (multipart/form-data) — ใส่ใน req.body
app.use(multer().none());
app.use('/api', routes);
app.use(errorHandler);

module.exports = app;
