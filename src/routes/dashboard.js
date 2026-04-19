const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middlewares');

// Dashboard Routes
// เส้นทาง API สำหรับระบบผู้ดูแลระบบ (Admin Dashboard)
// 1. / — ดึงข้อมูลสรุปภาพรวม (Summary)
// 2. /category-stats — ดึงสถิติแยกตามหมวดหมู่
// 3. /question-stats — ดึงสถิติแยกตามรายข้อ
// Security: ทุกเส้นทางต้องผ่าน requireAuth และมีการตรวจสอบ Admin Role ในระดับ Controller

// ดึงสถิติสรุปภาพรวม
router.get('/', requireAuth, dashboardController.getSummary);

// ดึงสถิติตามหมวดหมู่
router.get('/category-stats', requireAuth, dashboardController.getCategoryStats);

// ดึงสถิติตามรายข้อ
router.get('/question-stats', requireAuth, dashboardController.getQuestionStats);

module.exports = router;
