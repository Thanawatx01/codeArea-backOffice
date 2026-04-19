const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { requireAuth } = require('../middlewares');

router.get('/executor', settingsController.getExecutorConfig);
router.post('/executor', requireAuth, settingsController.updateExecutorConfig);
router.delete('/executor', requireAuth, settingsController.deleteExecutorConfig);

router.get('/ai', settingsController.getAIConfig);
router.post('/ai', requireAuth, settingsController.updateAIConfig);
router.post('/ai/test', requireAuth, settingsController.testAIConnector);
router.delete('/ai', requireAuth, settingsController.deleteAIConfig);

router.get('/ollama', settingsController.getOllamaConfig);
router.get('/ollama/models', settingsController.getOllamaModels);
router.post('/ollama', requireAuth, settingsController.updateOllamaConfig);
router.post('/ollama/test', requireAuth, settingsController.testOllama);

module.exports = router;
