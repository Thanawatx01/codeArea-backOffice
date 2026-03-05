const router = require('express').Router();
const questionCategoriesController = require('../controllers/questionCategoriesController');

router.get('/', questionCategoriesController.list);
router.get('/:id', questionCategoriesController.getById);
router.post('/', questionCategoriesController.create);
router.put('/:id', questionCategoriesController.update);
router.delete('/:id', questionCategoriesController.remove);

module.exports = router;
