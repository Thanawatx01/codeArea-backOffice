const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';
let secret = process.env.JWT_SECRET === 'generated-by-setup-env' ? '' : process.env.JWT_SECRET;
const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

if (!secret && !isProduction) {
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('JWT_SECRET missing; generated temporary development secret. Tokens reset on restart.');
}

if (!secret) {
  throw new Error('JWT_SECRET is required in production');
}

if (secret.length < 32) {
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
