const { verify } = require('../utils/jwt');
const { getToken } = require('../config/redis');
const { from, TABLE_NAMES } = require('../models/index');

const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'ไม่พบ token' });
    const decoded = verify(token);
    const exists = await getToken(decoded.jti);
    if (!exists) return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    const { data: user } = await from(TABLE_NAMES.USERS)
      .select('id, email, display_name, role_id')
      .eq('id', decoded.sub)
      .single();
    if (!user) return res.status(401).json({ message: 'ไม่พบผู้ใช้' });
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
    next(err);
  }
};

module.exports = { requireAuth };
