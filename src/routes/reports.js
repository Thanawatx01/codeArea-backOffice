const router = require('express').Router();
const reportsController = require('../controllers/reportsController');

router.get('/questions/:code', reportsController.getQuestionReport);

module.exports = router;
