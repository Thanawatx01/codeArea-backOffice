const router = require('express').Router();
const testCasesController = require('../controllers/testCasesController');

router.get('/', testCasesController.list);
router.get('/:id', testCasesController.getById);
router.post('/', testCasesController.create);
router.put('/:id', testCasesController.update);
router.delete('/:id', testCasesController.remove);

module.exports = router;
