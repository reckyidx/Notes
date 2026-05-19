const { v4: uuidv4 } = require('uuid');
const { lock, cache } = require('../config/redis');
const ShowRepository = require('../repositories/ShowRepository');
const config = require('../config');
const { logger } = require('../utils/logger');

/**
 * Seat Lock Service
 * Handles distributed seat locking for booking
 * Pattern: Distributed Lock Pattern with Redis
 */
class SeatLockService {
  constructor() {
    this.lockTTL = config.seatLock.ttl; // 5 minutes
  }

  /**
   * Lock seats for a show
   * @param {string} showId - Show ID
   * @param {Array} seatIds - Array of show seat IDs to lock
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Lock response
   */
  async lockSeats(showId, seatIds, userId) {
    // Validate max seats
    if (seatIds.length > config.booking.maxSeatsPerBooking) {
      throw new Error(`Cannot book more than ${config.booking.maxSeatsPerBooking} seats`);
    }

    if (seatIds.length === 0) {
      throw new Error('No seats selected');
    }

    // Sort seat IDs to prevent deadlocks (ordered locking)
    const sortedSeatIds = [...seatIds].sort();

    // Check if seats are available
    const showSeats = await ShowRepository.findShowSeatsByIds(sortedSeatIds);
    
    for (const seat of showSeats) {
      if (seat.showId !== showId) {
        throw new Error(`Seat ${seat.id} does not belong to this show`);
      }
      if (seat.status === 'BOOKED') {
        throw new Error(`Seat ${seat.seat.rowNumber}-${seat.seat.seatNumber} is already booked`);
      }
    }

    // Check Redis locks first
    const lockId = uuidv4();
    const acquiredLocks = [];
    const failedLocks = [];

    try {
      for (const seatId of sortedSeatIds) {
        const lockKey = `seat_lock:${showId}:${seatId}`;
        const lockValue = `${lockId}:${userId}`;

        // Try to acquire lock
        const acquired = await lock.acquire(lockKey, lockValue, this.lockTTL);
        
        if (acquired) {
          acquiredLocks.push(seatId);
        } else {
          failedLocks.push(seatId);
        }
      }

      // If any lock failed, release all and throw error
      if (failedLocks.length > 0) {
        await this.releaseLocksInternal(showId, acquiredLocks, lockId);
        throw new Error('Some seats are currently being booked by another user. Please try again.');
      }

      // Lock seats in database
      const lockExpiry = new Date(Date.now() + this.lockTTL * 1000);
      const lockedCount = await ShowRepository.lockShowSeats(sortedSeatIds, userId, lockExpiry);

      if (lockedCount !== sortedSeatIds.length) {
        // Some seats couldn't be locked in DB, release all
        await this.releaseLocksInternal(showId, acquiredLocks, lockId);
        await ShowRepository.releaseShowSeats(sortedSeatIds);
        throw new Error('Some seats are no longer available. Please try again.');
      }

      // Calculate total amount
      const totalAmount = showSeats.reduce((sum, seat) => sum + parseFloat(seat.price), 0);

      // Store lock metadata in Redis
      const lockMetadata = {
        lockId,
        showId,
        seatIds: sortedSeatIds,
        userId,
        lockedAt: new Date().toISOString(),
        expiresAt: lockExpiry.toISOString(),
        amount: totalAmount,
      };
      await cache.set(`lock_meta:${lockId}`, lockMetadata, this.lockTTL);

      logger.info('Seats locked successfully', { lockId, showId, seatIds: sortedSeatIds, userId });

      return {
        lockId,
        showId,
        seatIds: sortedSeatIds,
        expiresAt: lockExpiry,
        amount: totalAmount,
        ttl: this.lockTTL,
      };
    } catch (error) {
      // Release all locks on error
      await this.releaseLocksInternal(showId, acquiredLocks, lockId);
      throw error;
    }
  }

  /**
   * Release seat lock
   * @param {string} lockId - Lock ID
   * @param {string} userId - User ID (for validation)
   * @returns {Promise<boolean>} Success status
   */
  async releaseLock(lockId, userId) {
    // Get lock metadata
    const lockMetadata = await cache.get(`lock_meta:${lockId}`);
    
    if (!lockMetadata) {
      logger.warn('Lock not found or expired', { lockId });
      return false;
    }

    // Validate user
    if (lockMetadata.userId !== userId) {
      throw new Error('Unauthorized to release this lock');
    }

    // Release Redis locks
    await this.releaseLocksInternal(lockMetadata.showId, lockMetadata.seatIds, lockId);

    // Release database locks
    await ShowRepository.releaseShowSeats(lockMetadata.seatIds);

    // Delete lock metadata
    await cache.del(`lock_meta:${lockId}`);

    logger.info('Lock released', { lockId, showId: lockMetadata.showId });

    return true;
  }

  /**
   * Extend lock TTL
   * @param {string} lockId - Lock ID
   * @param {string} userId - User ID (for validation)
   * @returns {Promise<Object>} Extended lock info
   */
  async extendLock(lockId, userId) {
    // Get lock metadata
    const lockMetadata = await cache.get(`lock_meta:${lockId}`);
    
    if (!lockMetadata) {
      throw new Error('Lock not found or expired');
    }

    // Validate user
    if (lockMetadata.userId !== userId) {
      throw new Error('Unauthorized to extend this lock');
    }

    // Check if lock is still valid
    if (new Date(lockMetadata.expiresAt) < new Date()) {
      throw new Error('Lock has already expired');
    }

    // Extend Redis locks
    for (const seatId of lockMetadata.seatIds) {
      const lockKey = `seat_lock:${lockMetadata.showId}:${seatId}`;
      const lockValue = `${lockId}:${userId}`;
      await lock.extend(lockKey, lockValue, this.lockTTL);
    }

    // Extend database lock
    const newExpiry = new Date(Date.now() + this.lockTTL * 1000);
    await ShowRepository.lockShowSeats(lockMetadata.seatIds, userId, newExpiry);

    // Update lock metadata
    lockMetadata.expiresAt = newExpiry.toISOString();
    await cache.set(`lock_meta:${lockId}`, lockMetadata, this.lockTTL);

    logger.info('Lock extended', { lockId, newExpiry });

    return {
      lockId,
      expiresAt: newExpiry,
      ttl: this.lockTTL,
    };
  }

  /**
   * Get lock status
   * @param {string} lockId - Lock ID
   * @returns {Promise<Object|null>} Lock status
   */
  async getLockStatus(lockId) {
    const lockMetadata = await cache.get(`lock_meta:${lockId}`);
    
    if (!lockMetadata) {
      return null;
    }

    const isExpired = new Date(lockMetadata.expiresAt) < new Date();

    return {
      ...lockMetadata,
      isExpired,
      remainingTime: isExpired ? 0 : Math.max(0, 
        Math.floor((new Date(lockMetadata.expiresAt) - new Date()) / 1000)
      ),
    };
  }

  /**
   * Confirm lock (convert to booking)
   * @param {string} lockId - Lock ID
   * @param {string} bookingId - Booking ID
   * @returns {Promise<boolean>} Success status
   */
  async confirmLock(lockId, bookingId) {
    const lockMetadata = await cache.get(`lock_meta:${lockId}`);
    
    if (!lockMetadata) {
      throw new Error('Lock not found or expired');
    }

    // Book seats in database
    await ShowRepository.bookShowSeats(lockMetadata.seatIds, bookingId);

    // Release Redis locks (no longer needed)
    await this.releaseLocksInternal(lockMetadata.showId, lockMetadata.seatIds, lockId);

    // Delete lock metadata
    await cache.del(`lock_meta:${lockId}`);

    logger.info('Lock confirmed and converted to booking', { lockId, bookingId });

    return true;
  }

  /**
   * Release all Redis locks internally
   * @param {string} showId - Show ID
   * @param {Array} seatIds - Seat IDs
   * @param {string} lockId - Lock ID
   */
  async releaseLocksInternal(showId, seatIds, lockId) {
    for (const seatId of seatIds) {
      const lockKey = `seat_lock:${showId}:${seatId}`;
      await cache.del(lockKey);
    }
  }

  /**
   * Check if a seat is available
   * @param {string} showId - Show ID
   * @param {string} seatId - Seat ID
   * @returns {Promise<boolean>} Is available
   */
  async isSeatAvailable(showId, seatId) {
    // Check Redis lock
    const lockKey = `seat_lock:${showId}:${seatId}`;
    const isLocked = await lock.isLocked(lockKey);
    
    if (isLocked) {
      return false;
    }

    // Check database status
    const showSeats = await ShowRepository.findShowSeatsByIds([seatId]);
    
    if (showSeats.length === 0) {
      return false;
    }

    return showSeats[0].status === 'AVAILABLE';
  }

  /**
   * Clean up expired locks (cron job)
   * @returns {Promise<number>} Count of released seats
   */
  async cleanupExpiredLocks() {
    const releasedCount = await ShowRepository.releaseExpiredLocks();
    logger.info('Cleaned up expired locks', { releasedCount });
    return releasedCount;
  }
}

module.exports = new SeatLockService();