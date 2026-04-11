const router = require('express').Router();
const { requireAuth } = require('../middlewares');
const aiFeedbackController = require('../controllers/aiFeedbackController');

router.get('/', requireAuth, aiFeedbackController.list);
router.get('/:id', requireAuth, aiFeedbackController.getById);
router.post('/', requireAuth, aiFeedbackController.create);

module.exports = router;
