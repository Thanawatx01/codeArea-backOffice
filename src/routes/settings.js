const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { requireAuth } = require('../middlewares');

router.get('/executor', settingsController.getExecutorConfig);
router.post('/executor', requireAuth, settingsController.updateExecutorConfig);

module.exports = router;
