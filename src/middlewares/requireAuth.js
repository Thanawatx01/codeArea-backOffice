const { verify } = require('../utils/jwt');
const { from, TABLE_NAMES } = require('../models/index');

// =====================================================================
// # requireAuth Middleware
// ตรวจสอบ JWT Token จาก Header แล้วดึงข้อมูลผู้ใช้จากฐานข้อมูล
// ถ้าไม่มี Token หรือ Token ไม่ถูกต้อง จะตอบกลับ 401 ทันที
//
// ขั้นตอนการทำงาน:
// 1. ดึง Token จาก Authorization Header
// 2. ถอดรหัส Token ด้วย JWT verify
// 3. ค้นหาผู้ใช้จากฐานข้อมูลด้วย decoded.sub (User ID)
// 4. ผูกข้อมูลผู้ใช้เข้ากับ req.user สำหรับ Controller ถัดไป
// =====================================================================
const requireAuth = async (req, res, next) => {
  try {
    // ขั้นตอนที่ 1: ดึง Token จาก Header "Authorization: Bearer <token>"
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'ไม่พบ token' });

    // ขั้นตอนที่ 2: ถอดรหัส Token เพื่อหา User ID (sub)
    const decoded = verify(token);

    // ขั้นตอนที่ 3: ค้นหาผู้ใช้จากฐานข้อมูลตาม ID ที่ได้จาก Token
    const { data: user, error } = await from(TABLE_NAMES.USERS)
      .select('id, email, display_name, role_id')
      .eq('id', decoded.sub)
      .single();

    if (error || !user) {
      console.warn(`[requireAuth] Auth failure. sub: ${decoded.sub} (${typeof decoded.sub}), error:`, error);
      return res.status(401).json({ message: 'ไม่พบผู้ใช้' });
    }

    // ขั้นตอนที่ 4: ผูกข้อมูลผู้ใช้กับ req เพื่อส่งต่อให้ Controller
    req.user = user;
    next();
  } catch (err) {
    // # Security
    // ตรวจจับ Token ที่ไม่ถูกต้องหรือหมดอายุแยกจาก Error อื่น
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER' });
  }
};

// =====================================================================
// # optionalAuth Middleware
// ตรวจสอบ JWT Token แบบไม่บังคับ — ถ้ามี Token จะดึงข้อมูลผู้ใช้
// ถ้าไม่มีหรือ Token ไม่ถูกต้อง จะปล่อยผ่านโดย req.user = undefined
//
// ใช้สำหรับ: หน้าที่ผู้ใช้ทั่วไป (ไม่ล็อกอิน) สามารถดูได้
// แต่ถ้าล็อกอินอยู่จะแสดงข้อมูลเพิ่มเติม (เช่น ความก้าวหน้าส่วนตัว)
//
// ขั้นตอนการทำงาน:
// 1. ดึง Token จาก Header — ถ้าไม่มี ปล่อยผ่าน
// 2. ถอดรหัส Token และค้นหาผู้ใช้จากฐานข้อมูล
// 3. ถ้าพบผู้ใช้ ผูกเข้า req.user / ถ้าไม่พบ ปล่อยผ่าน
// =====================================================================
const optionalAuth = async (req, res, next) => {
  try {
    // ขั้นตอนที่ 1: ดึง Token — ถ้าไม่มีก็ปล่อยผ่านเลย (ไม่ block)
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      req.user = undefined;
      return next();
    }

    // ขั้นตอนที่ 2: ถอดรหัส Token และค้นหาข้อมูลผู้ใช้
    const decoded = verify(token);
    const { data: user, error } = await from(TABLE_NAMES.USERS)
      .select('id, email, display_name, role_id')
      .eq('id', decoded.sub)
      .single();

    // ขั้นตอนที่ 3: ผูกข้อมูลผู้ใช้ถ้าพบ หรือปล่อยผ่านถ้าไม่พบ
    if (error || !user) {
      req.user = undefined;
      return next();
    }
    req.user = user;
    next();
  } catch (err) {
    // Token ผิดหรือหมดอายุ — ปล่อยผ่านแทนที่จะ block (ต่างจาก requireAuth)
    req.user = undefined;
    next();
  }
};

module.exports = { requireAuth, optionalAuth };
