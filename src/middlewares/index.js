// =====================================================================
// # Middlewares Index
// ศูนย์รวม Export สำหรับ Middleware ทั้งหมดของระบบ
// นำเข้าจากไฟล์ย่อยแล้ว re-export เพื่อให้ Routes ใช้งานผ่าน path เดียว
// =====================================================================

const { errorHandler } = require('./errorHandler');
const { requireAuth, optionalAuth } = require('./requireAuth');
const { uploadPdf } = require('./uploadPdf');
const { isAdmin } = require('./isAdmin');

module.exports = { errorHandler, requireAuth, optionalAuth, uploadPdf, isAdmin };
