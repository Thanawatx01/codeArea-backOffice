const router = require('express').Router();
const { requireAuth } = require('../middlewares');
const usersController = require('../controllers/usersController');

// ฟังก์ชันดัก Method ที่ไม่ได้อนุญาต (Clean JSON ตามสั่ง)
const handleMethodNotAllowed = (req, res) => {
    res.status(405).json({
        error: `Method ${req.method} Not Allowed`
    });
};

// --- Path: /api/users/ ---

// GET /api/users/ (Pagination)
router.route('/')
    .get(requireAuth, usersController.list)
    .post(requireAuth, usersController.create)
    .all(handleMethodNotAllowed);

// --- Path: /api/users/:id ---

// GET/PUT/PATCH/DELETE /api/users/:id
router.route('/:id')
    .get(requireAuth, usersController.getById)
    .put(requireAuth, usersController.update)
    .patch(requireAuth, usersController.update)
    .delete(requireAuth, usersController.remove)
    .all(handleMethodNotAllowed);

module.exports = router;