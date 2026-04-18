const router = require('express').Router();
const tagsController = require('../controllers/tagsController');
const { requireAuth } = require('../middlewares/requireAuth');

// GET /tags, POST /tags
router.route('/')
    .get(tagsController.list)
    .post(requireAuth, tagsController.create);

// PUT/PATCH /tags/:id/restore
router.route('/:id/restore')
    .put(requireAuth, tagsController.restore)
    .patch(requireAuth, tagsController.restore);

// GET /tags/:id, PUT/PATCH /tags/:id, DELETE /tags/:id
router.route('/:id')
    .get(requireAuth, tagsController.getById)
    .put(requireAuth, tagsController.update)
    .patch(requireAuth, tagsController.update)
    .delete(requireAuth, tagsController.remove);

module.exports = router;
