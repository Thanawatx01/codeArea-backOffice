const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middlewares');

// GET /api/dashboard - Get aggregated dashboard statistics
router.get('/', requireAuth, dashboardController.getSummary);

module.exports = router;
