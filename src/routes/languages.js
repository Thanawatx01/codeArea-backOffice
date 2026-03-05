const router = require('express').Router();
const languagesController = require('../controllers/languagesController');

router.get('/', languagesController.list);
router.get('/:id', languagesController.getById);
router.post('/', languagesController.create);
router.put('/:id', languagesController.update);
router.delete('/:id', languagesController.remove);

module.exports = router;
