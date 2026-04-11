const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const routes = require('./routes');
const swaggerSpec = require('./openapi/api-docs');
const { errorHandler } = require('./middlewares');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/assets', express.static(path.resolve(__dirname, '../uploads')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root route for health checks (required by Railway)
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'CodeArea API is running' });
});

app.use('/api', routes);
app.use(errorHandler);

module.exports = app;
