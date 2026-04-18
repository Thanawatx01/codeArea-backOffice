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

// ดึงรายชื่อผู้ใช้ทั้งหมด (Pagination)
router.get('/', requireAuth, usersController.list);

// สร้างผู้ใช้ใหม่
// หมายเหตุ: ถ้าใน Controller มีการใช้ req.user.id ต้องใส่ requireAuth ด้วยนะครับ
router.post('/', requireAuth, usersController.create); 

// ดักจับ Method อื่นๆ ที่ยิงมาที่ /
router.all('/', handleMethodNotAllowed);


// --- Path: /api/users/profile/ ---

// รายงานสรุปโปรไฟล์ของผู้ใช้เอง
router.get('/profile/me', requireAuth, usersController.getProfileSummary);


// --- Path: /api/users/:id ---

// ดูข้อมูลรายคน
router.get('/:id', requireAuth, usersController.getById);

// แก้ไขข้อมูล
router.put('/:id', requireAuth, usersController.update);

// ลบผู้ใช้ (Soft Delete)
router.delete('/:id', requireAuth, usersController.remove);

// ดักจับ Method อื่นๆ ที่ยิงมาที่ /:id
router.all('/:id', handleMethodNotAllowed);

module.exports = router;