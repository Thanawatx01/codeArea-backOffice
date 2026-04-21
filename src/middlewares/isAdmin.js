const ADMIN_ROLE_ID = 2;

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role_id !== ADMIN_ROLE_ID) {
    return res.status(403).json({ 
      ok: false, 
      message: 'Forbidden. Admins only.', 
      error: 'FORBIDDEN' 
    });
  }
  next();
};

module.exports = { isAdmin };
