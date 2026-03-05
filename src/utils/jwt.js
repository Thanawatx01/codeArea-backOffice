const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { parseExpiryToSeconds } = require('../config/redis');

const secret = process.env.JWT_SECRET;
const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

if (!secret || secret.length < 32) {
  console.warn('JWT_SECRET should be at least 32 characters for production');
}

function sign(payload, options = {}) {
  const jti = randomUUID();
  const token = jwt.sign(
    { ...payload, jti },
    secret,
    { expiresIn: options.expiresIn || expiresIn }
  );
  const decoded = jwt.decode(token);
  const ttlSeconds = decoded?.exp && decoded?.iat ? decoded.exp - decoded.iat : parseExpiryToSeconds(expiresIn);
  return { token, jti, ttlSeconds };
}

function verify(token) {
  return jwt.verify(token, secret);
}

module.exports = { sign, verify };
