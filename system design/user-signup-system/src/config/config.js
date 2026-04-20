require('dotenv').config();

const config = {
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  lock: {
    ttl: parseInt(process.env.LOCK_TTL_MS, 10) || 10000,
    retryDelay: parseInt(process.env.LOCK_RETRY_DELAY_MS, 10) || 200,
    retryCount: parseInt(process.env.LOCK_RETRY_COUNT, 10) || 3,
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/userdb',
  },
};

module.exports = config;