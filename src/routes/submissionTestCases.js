const router = require('express').Router();
const submissionTestCasesController = require('../controllers/submissionTestCasesController');

// GET /api/submission-test-cases?submissionId=, GET /:id
router.get('/', submissionTestCasesController.list);
router.get('/:id', submissionTestCasesController.getById);

module.exports = router;
