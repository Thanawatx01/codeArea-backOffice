const { verify } = require('../utils/jwt');
const { from, TABLE_NAMES } = require('../models/index');

const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'ไม่พบ token' });
    const decoded = verify(token);
    const { data: user, error } = await from(TABLE_NAMES.USERS)
      .select('id, email, display_name, role_id')
      .eq('id', decoded.sub)
      .single();
    
    if (error || !user) {
      console.warn(`[requireAuth] Auth failure. sub: ${decoded.sub} (${typeof decoded.sub}), error:`, error);
      return res.status(401).json({ message: 'ไม่พบผู้ใช้' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดจากระบบ', error: 'SERVER' });
  }
};

module.exports = { requireAuth };
