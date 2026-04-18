// =====================================================================
// # Question Categories Routes
// กำหนดเส้นทาง API สำหรับระบบหมวดหมู่โจทย์ (Question Categories)
//
// ขั้นตอนการทำงาน:
// 1. เส้นทาง RESTful หลัก (/, /:id) — ใช้กับ Dashboard จัดการ
// 2. เส้นทางเดิม (Legacy) — /list, /search, /create, /update, /delete, /restore
//    เก็บไว้เพื่อ Backward Compatibility กับระบบเก่า
// 3. ใช้ handleMethodNotAllowed ป้องกันการเรียก Method ที่ไม่รองรับ
//
// # Security
// - GET /list และ GET / เป็นเส้นทางสาธารณะ (ไม่ต้องล็อกอิน)
// - GET /:id ใช้ optionalAuth — ดูได้โดยไม่ล็อกอิน
// - POST, PUT, PATCH, DELETE ทุกเส้นทางต้องล็อกอิน (requireAuth)
// =====================================================================

const router = require('express').Router();
const { requireAuth, optionalAuth } = require('../middlewares');
const controller = require('../controllers/questionCategoriesController');

// ฟังก์ชันกลางสำหรับตอบกลับ 405 เมื่อ Method ไม่ถูกต้อง
const handleMethodNotAllowed = (req, res) => {
  res.status(405).json({
    status: 405,
    message: `Method ${req.method} Not Allowed for this endpoint`
  });
};

// --- เส้นทาง RESTful หลัก (Dashboard ใหม่) ---
router.route('/')
  .get(controller.list)        // สาธารณะ: ดูรายการหมวดหมู่
  .post(requireAuth, controller.create); // ต้องล็อกอิน: สร้างหมวดหมู่ใหม่

router.route('/:id')
  .get(optionalAuth, controller.getById)  // สาธารณะ: ดูรายละเอียดหมวดหมู่
  .put(requireAuth, controller.update)    // ต้องล็อกอิน: แก้ไข
  .delete(requireAuth, controller.remove) // ต้องล็อกอิน: ลบ (Soft Delete)
  .all(handleMethodNotAllowed);

// --- เส้นทางเดิม (Backward Compatibility) ---

// ดูรายการหมวดหมู่ (สาธารณะ)
router.route('/list')
  .get(controller.list)
  .all(handleMethodNotAllowed);

// ค้นหาหมวดหมู่ (ต้องล็อกอิน)
router.route('/search')
  .post(requireAuth, controller.search)
  .all(handleMethodNotAllowed);

// รายงานหมวดหมู่ (ต้องล็อกอิน)
router.route('/report')
  .get(requireAuth, controller.report)
  .all(handleMethodNotAllowed);

// สร้างหมวดหมู่ใหม่ (ต้องล็อกอิน)
router.route('/create')
  .post(requireAuth, controller.create)
  .all(handleMethodNotAllowed);

// แก้ไขหมวดหมู่ (ต้องล็อกอิน)
router.route('/update/:id')
  .patch(requireAuth, controller.update)
  .put(requireAuth, controller.update)
  .all(handleMethodNotAllowed);

// ลบหมวดหมู่ — Soft Delete (ต้องล็อกอิน)
router.route('/delete/:id')
  .delete(requireAuth, controller.remove)
  .all(handleMethodNotAllowed);

// กู้คืนหมวดหมู่ (ต้องล็อกอิน)
router.route('/restore/:id')
  .patch(requireAuth, controller.restore)
  .all(handleMethodNotAllowed);

module.exports = router;