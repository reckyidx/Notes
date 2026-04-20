const Redis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

// Create Redis client for general operations
const redis = new Redis(redisConfig);

// Create Redis client for pub/sub
const redisPubSub = new Redis(redisConfig);

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

/**
 * Cache utility functions
 */
const cache = {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached value or null
   */
  async get(key) {
    const value = await redis.get(key);
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return null;
  },

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, value, ttl = 300) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, stringValue);
    } else {
      await redis.set(key, stringValue);
    }
  },

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   */
  async del(key) {
    await redis.del(key);
  },

  /**
   * Delete keys matching pattern
   * @param {string} pattern - Key pattern (e.g., "movies:*")
   */
  async delPattern(pattern) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    const result = await redis.exists(key);
    return result === 1;
  },

  /**
   * Set TTL for a key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   */
  async expire(key, ttl) {
    await redis.expire(key, ttl);
  },

  /**
   * Get TTL for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} - TTL in seconds, -1 if no TTL, -2 if key doesn't exist
   */
  async ttl(key) {
    return await redis.ttl(key);
  },
};

/**
 * Distributed lock utility functions
 */
const lock = {
  /**
   * Acquire a distributed lock
   * @param {string} key - Lock key
   * @param {string} value - Lock value (usually unique identifier)
   * @param {number} ttl - Lock TTL in seconds
   * @returns {Promise<boolean>} - True if lock acquired
   */
  async acquire(key, value, ttl = 300) {
    const result = await redis.set(key, value, 'NX', 'EX', ttl);
    return result === 'OK';
  },

  /**
   * Release a distributed lock
   * @param {string} key - Lock key
   * @param {string} value - Lock value (must match to release)
   * @returns {Promise<boolean>} - True if lock released
   */
  async release(key, value) {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await redis.eval(script, 1, key, value);
    return result === 1;
  },

  /**
   * Extend lock TTL
   * @param {string} key - Lock key
   * @param {string} value - Lock value (must match)
   * @param {number} ttl - New TTL in seconds
   * @returns {Promise<boolean>} - True if TTL extended
   */
  async extend(key, value, ttl) {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("expire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;
    const result = await redis.eval(script, 1, key, value, ttl);
    return result === 1;
  },

  /**
   * Check if lock is held
   * @param {string} key - Lock key
   * @returns {Promise<boolean>}
   */
  async isLocked(key) {
    const result = await redis.exists(key);
    return result === 1;
  },
};

/**
 * Rate limiter utility
 */
const rateLimiter = {
  /**
   * Check and increment rate limit
   * @param {string} key - Rate limit key
   * @param {number} limit - Max requests allowed
   * @param {number} window - Window size in seconds
   * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
   */
  async check(key, limit, window) {
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, window);
    }

    const ttl = await redis.ttl(key);
    const resetAt = Date.now() + (ttl * 1000);

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt,
    };
  },
};

module.exports = {
  redis,
  redisPubSub,
  cache,
  lock,
  rateLimiter,
};