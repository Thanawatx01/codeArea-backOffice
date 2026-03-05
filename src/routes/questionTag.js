const router = require('express').Router();
const questionTagController = require('../controllers/questionTagController');

// GET /api/question-tags?questionId=, POST, DELETE
router.get('/', questionTagController.list);
router.post('/', questionTagController.attach);
router.delete('/:questionId/:tagId', questionTagController.detach);

module.exports = router;
