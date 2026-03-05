const router = require('express').Router();
const tagsController = require('../controllers/tagsController');

// GET /tags, GET /tags/:id, POST /tags, PUT /tags/:id, DELETE /tags/:id
router.get('/', tagsController.list);
router.get('/:id', tagsController.getById);
router.post('/', tagsController.create);
router.put('/:id', tagsController.update);
router.delete('/:id', tagsController.remove);

module.exports = router;
