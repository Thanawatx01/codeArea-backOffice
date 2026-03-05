const router = require('express').Router();
const aiFeedbackController = require('../controllers/aiFeedbackController');

// GET /api/ai-feedback?submissionId=, GET /:id, POST
router.get('/', aiFeedbackController.list);
router.get('/:id', aiFeedbackController.getById);
router.post('/', aiFeedbackController.create);

module.exports = router;
