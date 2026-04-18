const router = require('express').Router();
const questionsController = require('../controllers/questionsController');
const { requireAuth } = require('../middlewares');

router.get('/', requireAuth, questionsController.list);
router.get('/:code', requireAuth, questionsController.getByCode);
router.post('/', requireAuth, questionsController.create);
router.put('/:code', requireAuth, questionsController.update);
router.delete('/:code', requireAuth, questionsController.remove);

module.exports = router;
