const router = require('express').Router();
const { requireAuth } = require('../middlewares');
const usersController = require('../controllers/usersController');

// ฟังก์ชันดัก Method ที่ไม่ได้อนุญาต
const handleMethodNotAllowed = (req, res) => {
    res.status(405).json({
        status: 405,
        message: `Method ${req.method} Not Allowed`
    });
};

// จัดการ Path: /api/users/
router.route('/')
    .get(requireAuth, usersController.list)   // เพิ่ม requireAuth ถ้าต้องการล็อคการเข้าถึง
    .post(usersController.create)             // ปกติสร้าง User ใหม่อาจจะไม่ต้องใช้ Auth
    .all(handleMethodNotAllowed);

// จัดการ Path: /api/users/:id
router.route('/:id')
    .get(requireAuth, usersController.getById)
    .put(requireAuth, usersController.update)
    .delete(requireAuth, usersController.remove)
    .all(handleMethodNotAllowed);

module.exports = router;