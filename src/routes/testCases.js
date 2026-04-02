const router = require('express').Router();
const { requireAuth } = require('../middlewares');
const testCasesController = require('../controllers/testCasesController');

router.get('/', requireAuth, testCasesController.list);
router.get('/:id', requireAuth, testCasesController.getById);

module.exports = router;
