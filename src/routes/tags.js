const router = require('express').Router();
const tagsController = require('../controllers/tagsController');
const { requireAuth } = require('../middlewares/requireAuth');

// GET /tags, GET /tags/:id, POST /tags, PUT /tags/:id, DELETE /tags/:id
router.get('/', requireAuth, tagsController.list);
router.get('/:id', requireAuth, tagsController.getById);
router.post('/', requireAuth, tagsController.create);
router.put('/:id', requireAuth, tagsController.update);
router.put('/:id/restore', requireAuth, tagsController.restore);
router.delete('/:id', requireAuth, tagsController.remove);

module.exports = router;
