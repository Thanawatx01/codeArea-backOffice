const express = require('express');
const router = express.Router();
const executorController = require('../controllers/executorController');

// Proxy execution requests
router.post('/execute', executorController.execute);

// Additional Judge0 endpoint if needed
router.get('/submissions/:token', executorController.getJudge0Result);

module.exports = router;
