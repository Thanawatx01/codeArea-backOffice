const bcrypt = require('bcrypt');
const { from, TABLE_NAMES } = require('../models/index');
const { sign, verify } = require('../utils/jwt');

const SALT_ROUNDS = 10;

// ============================================================
// ฟังก์ชัน register
// รับข้อมูลอีเมล รหัสผ่าน และข้อมูลเสริม แล้วสร้างบัญชีผู้ใช้ใหม่
//
// 1. ตรวจสอบข้อมูลที่จำเป็น (อีเมล, รหัสผ่าน)
// 2. แฮชรหัสผ่านด้วย bcrypt
// 3. บันทึกผู้ใช้ลงฐานข้อมูล
// 4. สร้าง JWT Token แล้วส่งกลับพร้อมข้อมูลผู้ใช้
// ============================================================
const register = async (req, res, next) => {
  try {
    const { email, password, display_name, role_id } = req.body || {};

    // 1. ตรวจสอบความถูกต้องของข้อมูล
    const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!emailNorm || !password) {
      return res.status(400).json({
        message: 'กรุณาระบุอีเมลและรหัสผ่าน',
        error: 'VALIDATION',
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
        error: 'VALIDATION',
      });
    }

    // 2. แฮชรหัสผ่านก่อนบันทึก
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // 3. บันทึกผู้ใช้ใหม่ลงฐานข้อมูล
    const { data: user, error } = await from(TABLE_NAMES.USERS)
      .insert({
        email: emailNorm,
        password_hash,
        display_name: display_name || null,
        role_id: role_id ?? null,
      })
      .select('id, email, display_name, role_id, avatar_url, created_at')
      .single();

    if (error) {
      // ตรวจสอบอีเมลซ้ำ (PostgreSQL unique violation)
      if (error.code === '23505') {
        return res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว', error: 'CONFLICT' });
      }
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }

    // 4. สร้าง JWT Token แล้วส่งกลับ
    const { token } = sign({ sub: user.id, email: user.email });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role_id: user.role_id,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// ฟังก์ชัน login
// ตรวจสอบอีเมลและรหัสผ่าน แล้วออก JWT Token ถ้าถูกต้อง
//
// 1. ตรวจสอบข้อมูลที่ส่งมา
// 2. ค้นหาผู้ใช้จากอีเมลในฐานข้อมูล
// 3. เปรียบเทียบรหัสผ่านกับ hash ที่เก็บไว้
// 4. สร้าง JWT Token แล้วส่งกลับพร้อมข้อมูลผู้ใช้
// ============================================================
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    // 1. ตรวจสอบข้อมูลที่จำเป็น
    const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!emailNorm || !password) {
      return res.status(400).json({
        message: 'กรุณาระบุอีเมลและรหัสผ่าน',
        error: 'VALIDATION',
      });
    }

    // 2. ค้นหาผู้ใช้จากอีเมล
    const { data: user, error } = await from(TABLE_NAMES.USERS)
      .select('id, email, password_hash, display_name, role_id, avatar_url')
      .eq('email', emailNorm)
      .single();

    // ความปลอดภัย: ใช้ข้อความเดียวกันทั้งกรณีไม่พบผู้ใช้และรหัสผ่านผิด
    // เพื่อป้องกันการเดาว่าอีเมลมีอยู่ในระบบหรือไม่
    if (error || !user || !user.password_hash) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', error: 'AUTH' });
    }

    // 3. เปรียบเทียบรหัสผ่าน
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', error: 'AUTH' });
    }

    // 4. สร้าง JWT Token แล้วส่งกลับ
    const { token } = sign({ sub: user.id, email: user.email });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role_id: user.role_id,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// ฟังก์ชัน logout
// ออกจากระบบ — Stateless JWT ไม่มีสถานะฝั่ง Server
// ฝั่ง Client จะลบ Token เอง, Server ตอบ 204 กลับ
// หมายเหตุ: หากเพิ่ม Refresh Token ให้เพิ่ม Revoke Logic ที่นี่
// ============================================================
const logout = async (req, res, next) => {
  try {
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ============================================================
// ฟังก์ชัน me
// ดึงข้อมูลผู้ใช้ปัจจุบันจาก JWT Token ที่ส่งมาใน Header
//
// 1. ดึง Token จาก Authorization Header
// 2. ถอดรหัส Token เพื่อหา user ID
// 3. ค้นหาข้อมูลผู้ใช้จากฐานข้อมูลแล้วส่งกลับ
// ============================================================
const me = async (req, res, next) => {
  try {
    // 1. ดึง Token จาก Header
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'ไม่พบ token' });

    // 2. ถอดรหัส Token
    const decoded = verify(token);

    // 3. ค้นหาผู้ใช้จากฐานข้อมูล
    const { data: user } = await from(TABLE_NAMES.USERS)
      .select('id, email, display_name, role_id, avatar_url, created_at')
      .eq('id', decoded.sub)
      .single();

    if (!user) return res.status(401).json({ message: 'ไม่พบผู้ใช้' });
    res.json({ user });
  } catch (err) {
    // ความปลอดภัย: จัดการ Token ไม่ถูกต้องหรือหมดอายุแยกจาก error อื่น
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
    next(err);
  }
};

// ============================================================
// ฟังก์ชัน forgotPassword
// รับอีเมลแล้วสร้างลิงก์รีเซ็ตรหัสผ่านพร้อม Token (หมดอายุ 1 ชม.)
//
// 1. ตรวจสอบอีเมลที่ส่งมา
// 2. ค้นหาผู้ใช้จากอีเมล
// 3. สร้าง Reset Token (JWT ที่มี type='reset')
// 4. สร้าง URL รีเซ็ตแล้ว Log ไว้ (ยังไม่ส่งอีเมลจริง)
//
// ความปลอดภัย: ตอบ 200 เสมอแม้ไม่พบอีเมล เพื่อป้องกัน Email Harvesting
// ============================================================
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body || {};

    // 1. ตรวจสอบอีเมล
    const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!emailNorm) {
      return res.status(400).json({ message: 'กรุณาระบุอีเมล', error: 'VALIDATION' });
    }

    // 2. ค้นหาผู้ใช้จากอีเมล
    const { data: user } = await from(TABLE_NAMES.USERS)
      .select('id, email, display_name')
      .eq('email', emailNorm)
      .single();

    // ความปลอดภัย: ตอบกลับเหมือนกันทั้งพบและไม่พบอีเมล
    if (!user) {
      return res.json({ message: 'หากพบอีเมลในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านไปให้' });
    }

    // 3. สร้าง Reset Token (หมดอายุ 1 ชม.)
    const { token } = sign({ sub: user.id, type: 'reset' }, { expiresIn: '1h' });

    // 4. สร้าง Reset URL — ในระบบจริงควรส่งอีเมล ตอนนี้ Log ไว้ใน Console
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    console.log('----------------------------------------------------');
    console.log(`Password reset requested for: ${user.email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('----------------------------------------------------');

    res.json({ message: 'หากพบอีเมลในระบบ เราจะส่งลิงก์รีเซ็ตรหัสผ่านไปให้' });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// ฟังก์ชัน resetPassword
// รับ Reset Token และรหัสผ่านใหม่ แล้วอัปเดตรหัสผ่านในฐานข้อมูล
//
// 1. ตรวจสอบข้อมูลที่ส่งมา (token, password)
// 2. ถอดรหัส Token และตรวจว่าเป็นประเภท 'reset'
// 3. แฮชรหัสผ่านใหม่แล้วอัปเดตในฐานข้อมูล
// ============================================================
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body || {};

    // 1. ตรวจสอบข้อมูลที่จำเป็น
    if (!token || !password) {
      return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน', error: 'VALIDATION' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', error: 'VALIDATION' });
    }

    // 2. ถอดรหัสและตรวจสอบ Reset Token
    let decoded;
    try {
      decoded = verify(token);
    } catch (err) {
      return res.status(400).json({ message: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุ', error: 'INVALID_TOKEN' });
    }

    // ความปลอดภัย: ตรวจสอบว่า Token เป็นประเภท reset จริงๆ
    if (decoded.type !== 'reset') {
      return res.status(400).json({ message: 'Token ไม่ถูกต้อง', error: 'INVALID_TOKEN' });
    }

    // 3. แฮชรหัสผ่านใหม่แล้วอัปเดต
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { error } = await from(TABLE_NAMES.USERS)
      .update({ password_hash })
      .eq('id', decoded.sub);

    if (error) {
      return res.status(500).json({ message: 'ไม่สามารถอัปเดตรหัสผ่านได้', error: 'DB' });
    }

    res.json({ message: 'รีเซ็ตรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, me, forgotPassword, resetPassword };
