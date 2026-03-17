const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;
const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

if (!secret || secret.length < 32) {
  console.warn('JWT_SECRET should be at least 32 characters for production');
}

function sign(payload, options = {}) {
  const token = jwt.sign(
    payload,
    secret,
    { expiresIn: options.expiresIn || expiresIn }
  );
  return { token };
}

function verify(token) {
  return jwt.verify(token, secret);
}

module.exports = { sign, verify };
