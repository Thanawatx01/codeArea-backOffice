const router = require('express').Router();
const { requireAuth } = require('../middlewares');
const controller = require('../controllers/questionCategoriesController');

const handleMethodNotAllowed = (req, res) => {
    res.status(405).json({
        error: `Method ${req.method} Not Allowed for this endpoint`
    });
};

// GET /question-categories, POST /question-categories
router.route('/')
    .get(controller.list)
    .post(requireAuth, controller.create)
    .all(handleMethodNotAllowed);

// GET /question-categories/:id, PUT/PATCH /question-categories/:id, DELETE /question-categories/:id
router.route('/:id')
    .get(requireAuth, controller.getById)
    .put(requireAuth, controller.update)
    .patch(requireAuth, controller.update)
    .delete(requireAuth, controller.remove)
    .all(handleMethodNotAllowed);

// PUT/PATCH /question-categories/:id/restore
router.route('/:id/restore')
    .put(requireAuth, controller.restore)
    .patch(requireAuth, controller.restore)
    .all(handleMethodNotAllowed);

// Backward Compatibility / Specialized
router.get('/list', controller.list);
router.post('/search', requireAuth, controller.search);
router.get('/report', requireAuth, controller.report);

module.exports = router;