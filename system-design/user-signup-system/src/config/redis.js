const Redis = require('ioredis');
const config = require('./config');
const logger = require('../utils/logger');

let redisClient = null;
let redisSubscribers = [];

/**
 * Create and configure Redis client
 * @returns {Redis}
 */
function createRedisClient() {
  const client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('error', (err) => {
    logger.error('Redis client error:', err);
  });

  client.on('close', () => {
    logger.warn('Redis client connection closed');
  });

  return client;
}

/**
 * Get the main Redis client instance
 * @returns {Redis}
 */
function getRedisClient() {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

/**
 * Create a new Redis connection for pub/sub or separate operations
 * Each Redlock instance needs its own connection
 * @returns {Redis}
 */
function createRedisConnection() {
  const client = createRedisClient();
  redisSubscribers.push(client);
  return client;
}

/**
 * Close all Redis connections
 */
async function closeRedisConnections() {
  const closePromises = [];

  if (redisClient) {
    closePromises.push(redisClient.quit());
  }

  for (const subscriber of redisSubscribers) {
    closePromises.push(subscriber.quit());
  }

  await Promise.all(closePromises);
  logger.info('All Redis connections closed');
}

module.exports = {
  getRedisClient,
  createRedisConnection,
  closeRedisConnections,
};