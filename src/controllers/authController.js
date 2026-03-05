const bcrypt = require('bcrypt');
const { from, TABLE_NAMES } = require('../models/index');
const { setToken, delToken, getToken } = require('../config/redis');
const { sign } = require('../utils/jwt');

const SALT_ROUNDS = 10;

// POST /auth/register — body: email, password, display_name?, role_id?
const register = async (req, res, next) => {
  try {
    const { email, password, display_name, role_id } = req.body || {};
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
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { data: user, error } = await from(TABLE_NAMES.USERS)
      .insert({
        email: emailNorm,
        password_hash,
        display_name: display_name || null,
        role_id: role_id ?? null,
      })
      .select('id, email, display_name, role_id, created_at')
      .single();
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว', error: 'CONFLICT' });
      }
      return res.status(400).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'DB', code: error.code });
    }
    const { token, jti, ttlSeconds } = sign({ sub: user.id, email: user.email });
    await setToken(jti, user.id, ttlSeconds);
    const expires_in_days = Math.ceil(ttlSeconds / 86400);
    res.status(201).json({
      token,
      expires_in: expires_in_days,
      user: { id: user.id, email: user.email, display_name: user.display_name, role_id: user.role_id },
    });
  } catch (err) {
    next(err);
  }
};

// POST /auth/login — body: email, password
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!emailNorm || !password) {
      return res.status(400).json({
        message: 'กรุณาระบุอีเมลและรหัสผ่าน',
        error: 'VALIDATION',
      });
    }
    const { data: user, error } = await from(TABLE_NAMES.USERS)
      .select('id, email, password_hash, display_name, role_id')
      .eq('email', emailNorm)
      .single();
    if (error || !user || !user.password_hash) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', error: 'AUTH' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', error: 'AUTH' });
    }
    const { token, jti, ttlSeconds } = sign({ sub: user.id, email: user.email });
    await setToken(jti, user.id, ttlSeconds);
    const expires_in_days = Math.ceil(ttlSeconds / 86400);
    res.json({
      token,
      expires_in: expires_in_days,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role_id: user.role_id,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /auth/logout — header: Authorization: Bearer <token>
const logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const { verify } = require('../utils/jwt');
      try {
        const decoded = verify(token);
        if (decoded.jti) await delToken(decoded.jti);
      } catch (_) {}
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// GET /auth/me — header: Authorization: Bearer <token>
const me = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'ไม่พบ token' });
    const { verify } = require('../utils/jwt');
    const decoded = verify(token);
    const exists = await getToken(decoded.jti);
    if (!exists) return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    const { data: user } = await from(TABLE_NAMES.USERS)
      .select('id, email, display_name, role_id, created_at')
      .eq('id', decoded.sub)
      .single();
    if (!user) return res.status(401).json({ message: 'ไม่พบผู้ใช้' });
    res.json({ user });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
    next(err);
  }
};

module.exports = { register, login, logout, me };
