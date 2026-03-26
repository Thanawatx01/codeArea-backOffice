const router = require('express').Router();
const { requireAuth } = require('../middlewares');
const controller = require('../controllers/questionCategoriesController');

// ฟังก์ชันกลางสำหรับตอบกลับเมื่อ Method ไม่ถูกต้อง
const handleMethodNotAllowed = (req, res) => {
    res.status(405).json({
        status: 405,
        message: `Method ${req.method} Not Allowed for this endpoint`
    });
};

// --- Table List ---
router.route('/list')
    .get(controller.list)
    .all(handleMethodNotAllowed); // ถ้าไม่ใช่ GET ให้ Error

// --- Search Filter ---
router.route('/search')
    .post(controller.search)
    .all(handleMethodNotAllowed); // ถ้าไม่ใช่ POST ให้ Error

// --- Create ---
router.route('/create')
    .post(controller.create)
    .all(handleMethodNotAllowed); // ถ้าไม่ใช่ POST ให้ Error

// --- Update ---
router.route('/update/:id')
    .patch(controller.update)
    .all(handleMethodNotAllowed); // ถ้าไม่ใช่ PATCH ให้ Error

// --- Delete (Soft Delete) ---
router.route('/delete/:id')
    .delete(controller.remove)
    .all(handleMethodNotAllowed); // ถ้าไม่ใช่ DELETE ให้ Error

// --- Get By ID ---
router.route('/:id')
    .get(controller.getById)
    .all(handleMethodNotAllowed); // ถ้าไม่ใช่ GET ให้ Error

module.exports = router;