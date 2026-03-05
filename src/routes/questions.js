const router = require('express').Router();
const questionsController = require('../controllers/questionsController');

router.get('/', questionsController.list);
router.get('/:id', questionsController.getById);
router.post('/', questionsController.create);
router.put('/:id', questionsController.update);
router.delete('/:id', questionsController.remove);

module.exports = router;
