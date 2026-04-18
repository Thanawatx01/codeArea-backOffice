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

// --- RESTful Routes for Management Dashboard ---
router.route('/')
    .get(controller.list)
    .post(requireAuth, controller.create);

// --- Legacy / Specific Paths (Backward Compatibility) ---
// --- Table List ---
router.route('/list')
    .get(controller.list)
    .all(handleMethodNotAllowed); // ถ้าไม่ใช่ GET ให้ Error

// --- Search Filter ---
router.route('/search')
    .post(requireAuth, controller.search)
    .all(handleMethodNotAllowed); // ถ้าไม่ใช่ POST ให้ Error

// --- Report ---
router.route('/report')
    .get(requireAuth, controller.report)
    .all(handleMethodNotAllowed); // ถ้าไม่ใช่ GET ให้ Error

// --- Create ---
router.route('/create')
    .post(requireAuth, controller.create)
    .all(handleMethodNotAllowed); // ถ้าไม่ใช่ POST ให้ Error

// --- RESTful Routes for Management Dashboard ---
router.route('/:id')
    .get(requireAuth, controller.getById)
    .put(requireAuth, controller.update)
    .delete(requireAuth, controller.remove)
    .all(handleMethodNotAllowed);

// --- Update ---
router.route('/update/:id')
    .patch(requireAuth, controller.update)
    .put(requireAuth, controller.update)
    .all(handleMethodNotAllowed);

// --- Delete (Soft Delete) ---
router.route('/delete/:id')
    .delete(requireAuth, controller.remove)
    .all(handleMethodNotAllowed); // ถ้าไม่ใช่ DELETE ให้ Error

// --- Restore ---
router.route('/restore/:id')
    .patch(requireAuth, controller.restore)
    .all(handleMethodNotAllowed); // ถ้าไม่ใช่ PATCH ให้ Error

module.exports = router;