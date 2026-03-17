require('dotenv').config();
const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
});

redis.on('error', (err) => {
  console.error('Redis error object:', err);
  console.error('Redis error message:', err && err.message);
});
redis.on('connect', () => console.log('Redis connected'));

const PREFIX = 'auth:';

function parseExpiryToSeconds(str) {
  if (!str || typeof str !== 'string') return 7 * 24 * 60 * 60;
  const m = str.trim().match(/^(\d+)(d|h|m|s)?$/i);
  if (!m) return 7 * 24 * 60 * 60;
  const n = parseInt(m[1], 10);
  const unit = (m[2] || 'd').toLowerCase();
  if (unit === 'd') return n * 24 * 60 * 60;
  if (unit === 'h') return n * 60 * 60;
  if (unit === 'm') return n * 60;
  return n;
}

const defaultTtl = parseExpiryToSeconds(process.env.JWT_EXPIRES_IN);

async function setToken(jti, userId, expiresInSeconds = defaultTtl) {
  await redis.setex(PREFIX + jti, expiresInSeconds, String(userId));
}

async function getToken(jti) {
  return redis.get(PREFIX + jti);
}

async function delToken(jti) {
  await redis.del(PREFIX + jti);
}

module.exports = { redis, setToken, getToken, delToken, PREFIX, parseExpiryToSeconds };
