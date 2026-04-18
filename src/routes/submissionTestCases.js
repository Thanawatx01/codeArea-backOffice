const router = require('express').Router();
const { requireAuth } = require('../middlewares');
const submissionTestCasesController = require('../controllers/submissionTestCasesController');

router.get('/', requireAuth, submissionTestCasesController.list);
router.get('/:id', requireAuth, submissionTestCasesController.getById);

module.exports = router;
