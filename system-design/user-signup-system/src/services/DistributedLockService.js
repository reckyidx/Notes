const Redlock = require('redlock');
const { createRedisConnection } = require('../config/redis');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Distributed Lock Service using Redlock algorithm
 * 
 * Redlock provides distributed locking across multiple Redis instances,
 * ensuring mutual exclusion even in distributed systems with multiple
 * servers/pods.
 * 
 * Key features:
 * - Prevents race conditions across multiple servers
 * - Automatic lock expiration (TTL) to prevent deadlocks
 * - Retry mechanism for lock acquisition
 * - Automatic lock extension support
 */
class DistributedLockService {
  constructor() {
    this.redlock = null;
    this.locks = new Map(); // Track active locks
  }

  /**
   * Initialize Redlock with Redis connections
   * For production, use multiple Redis instances for fault tolerance
   */
  initialize() {
    // Create separate Redis connections for Redlock
    // In production, use multiple Redis instances for quorum
    const redisClients = [
      createRedisConnection(),
    ];

    this.redlock = new Redlock(redisClients, {
      // The expected clock drift factor
      driftFactor: 0.01,
      // The max number of times Redlock will attempt to lock a resource
      retryCount: config.lock.retryCount,
      // The time between retry attempts
      retryDelay: config.lock.retryDelay,
      // The max jitter for retry attempts
      retryJitter: 200,
      // The minimum time to live for a lock
      automaticExtensionThreshold: 500,
    });

    this.redlock.on('error', (err) => {
      // Ignore errors for locks that expired
      if (err.message !== 'Exceeded maximum retry attempts') {
        logger.error('Redlock error:', err);
      }
    });

    logger.info('Distributed lock service initialized');
  }

  /**
   * Generate lock key for a phone number
   * @param {string} phoneNumber 
   * @returns {string} Lock key
   */
  getLockKey(phoneNumber) {
    return `lock:signup:${phoneNumber}`;
  }

  /**
   * Acquire a distributed lock for a phone number
   * This prevents concurrent signups with the same phone number
   * 
   * @param {string} phoneNumber - Phone number to lock
   * @param {number} ttl - Lock TTL in milliseconds (default from config)
   * @returns {Promise<Object>} Lock object
   * @throws {Error} If lock cannot be acquired
   */
  async acquireLock(phoneNumber, ttl = config.lock.ttl) {
    if (!this.redlock) {
      this.initialize();
    }

    const lockKey = this.getLockKey(phoneNumber);
    const lockValue = `lock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.debug(`Attempting to acquire lock for phone: ${phoneNumber}`);
      
      const lock = await this.redlock.acquire([lockKey], ttl);
      
      // Store lock for tracking
      this.locks.set(phoneNumber, {
        lock,
        acquiredAt: Date.now(),
        ttl,
      });

      logger.info(`Lock acquired for phone: ${phoneNumber}`, {
        lockKey,
        ttl,
        value: lockValue,
      });

      return lock;
    } catch (error) {
      logger.warn(`Failed to acquire lock for phone: ${phoneNumber}`, {
        error: error.message,
      });
      
      const lockError = new Error('Unable to acquire lock - another signup is in progress');
      lockError.code = 'LOCK_ACQUISITION_FAILED';
      lockError.statusCode = 429; // Too Many Requests
      throw lockError;
    }
  }

  /**
   * Release a distributed lock
   * Always release locks after use to prevent blocking other requests
   * 
   * @param {string} phoneNumber - Phone number to unlock
   * @param {Object} lock - Lock object to release
   */
  async releaseLock(phoneNumber, lock) {
    if (!lock) {
      logger.warn(`No lock to release for phone: ${phoneNumber}`);
      return;
    }

    try {
      await this.redlock.release(lock);
      this.locks.delete(phoneNumber);
      logger.info(`Lock released for phone: ${phoneNumber}`);
    } catch (error) {
      // Lock might have expired, which is fine
      logger.debug(`Lock release warning for phone: ${phoneNumber}`, {
        error: error.message,
      });
      this.locks.delete(phoneNumber);
    }
  }

  /**
   * Extend a lock's TTL
   * Useful for long-running operations
   * 
   * @param {string} phoneNumber - Phone number
   * @param {Object} lock - Lock to extend
   * @param {number} ttl - New TTL in milliseconds
   * @returns {Promise<Object>} Extended lock
   */
  async extendLock(phoneNumber, lock, ttl = config.lock.ttl) {
    try {
      const extendedLock = await this.redlock.extend(lock, ttl);
      
      this.locks.set(phoneNumber, {
        lock: extendedLock,
        acquiredAt: Date.now(),
        ttl,
      });

      logger.debug(`Lock extended for phone: ${phoneNumber}`, { ttl });
      return extendedLock;
    } catch (error) {
      logger.error(`Failed to extend lock for phone: ${phoneNumber}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Execute a function with a distributed lock
   * Automatically acquires and releases the lock
   * 
   * @param {string} phoneNumber - Phone number to lock
   * @param {Function} fn - Async function to execute
   * @param {number} ttl - Lock TTL in milliseconds
   * @returns {Promise<any>} Result of the function
   */
  async withLock(phoneNumber, fn, ttl = config.lock.ttl) {
    let lock = null;
    
    try {
      // Acquire lock
      lock = await this.acquireLock(phoneNumber, ttl);
      
      // Execute the function
      const result = await fn();
      
      return result;
    } finally {
      // Always release the lock
      if (lock) {
        await this.releaseLock(phoneNumber, lock);
      }
    }
  }

  /**
   * Check if a lock is currently held for a phone number
   * @param {string} phoneNumber 
   * @returns {boolean}
   */
  isLocked(phoneNumber) {
    return this.locks.has(phoneNumber);
  }

  /**
   * Get active lock count (for monitoring)
   * @returns {number}
   */
  getActiveLockCount() {
    return this.locks.size;
  }

  /**
   * Shutdown the lock service
   */
  async shutdown() {
    if (this.redlock) {
      await this.redlock.quit();
      logger.info('Distributed lock service shut down');
    }
  }
}

// Singleton instance
const lockService = new DistributedLockService();

module.exports = lockService;