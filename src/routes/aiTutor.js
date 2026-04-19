const express = require('express');
const router = express.Router();
const aiTutorController = require('../controllers/aiTutorController');
const { requireAuth } = require('../middlewares');

// All AI Tutor endpoints require authentication
router.use(requireAuth);

router.post('/hint', aiTutorController.proxyHint);
router.post('/compare', aiTutorController.proxyCompare);
router.post('/analyze', aiTutorController.proxyAnalyze);

module.exports = router;
