// =====================================================================
// # Questions Routes
// กำหนดเส้นทาง API สำหรับระบบโจทย์ (Questions)
//
// ขั้นตอนการทำงาน:
// 1. GET / และ GET /:code ใช้ optionalAuth — ผู้ใช้ทั่วไปดูได้ ล็อกอินแล้วเห็นความก้าวหน้า
// 2. POST, PUT, DELETE ใช้ requireAuth — ต้องล็อกอินเท่านั้น (สร้าง/แก้ไข/ลบ)
//
// # Security
// แยกสิทธิ์ระหว่าง "ดู" (สาธารณะ) กับ "เขียน" (ต้องล็อกอิน) อย่างชัดเจน
// =====================================================================

const router = require('express').Router();
const questionsController = require('../controllers/questionsController');
const { requireAuth, optionalAuth } = require('../middlewares');

// --- เส้นทางสาธารณะ (ไม่บังคับล็อกอิน) ---
router.get('/', optionalAuth, questionsController.list);
router.get('/report', requireAuth, questionsController.report);
router.get('/:code', optionalAuth, questionsController.getByCode);

// --- เส้นทางที่ต้องล็อกอิน (สร้าง / แก้ไข / ลบ) ---
router.post('/', requireAuth, questionsController.create);
router.put('/:code', requireAuth, questionsController.update);
router.delete('/:code', requireAuth, questionsController.remove);

module.exports = router;
