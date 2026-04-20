const { v4: uuidv4 } = require('uuid');
const lockService = require('./DistributedLockService');
const userRepository = require('../repositories/UserRepository');
const logger = require('../utils/logger');

/**
 * Signup Service
 * 
 * Implements race-condition-safe user signup using a multi-layer approach:
 * 
 * Layer 1: Distributed Lock (Redis/Redlock)
 * - Acquires a distributed lock for the phone number before any operation
 * - Prevents concurrent requests across multiple servers/pods
 * - Lock has TTL to prevent deadlocks
 * 
 * Layer 2: Database Unique Constraint
 * - Database enforces unique constraint on phone number
 * - Acts as final safety net if lock somehow fails
 * 
 * Layer 3: Double-Check Pattern
 * - Check if user exists before attempting creation
 * - Prevents unnecessary database operations
 */
class SignupService {
  /**
   * Register a new user with race condition protection
   * 
   * @param {Object} userData - User registration data
   * @param {string} userData.phoneNumber - Phone number (required, unique)
   * @param {string} userData.name - User's name (optional)
   * @param {string} userData.email - User's email (optional)
   * @returns {Promise<Object>} Created user
   * @throws {Error} If registration fails
   */
  async signup(userData) {
    const { phoneNumber, name, email } = userData;
    const requestId = uuidv4();

    logger.info('Signup request received', {
      requestId,
      phoneNumber,
      hasName: !!name,
      hasEmail: !!email,
    });

    // Validate required fields
    if (!phoneNumber) {
      const error = new Error('Phone number is required');
      error.code = 'MISSING_PHONE';
      error.statusCode = 400;
      throw error;
    }

    // Validate phone number format
    if (!this.validatePhoneNumber(phoneNumber)) {
      const error = new Error('Invalid phone number format');
      error.code = 'INVALID_PHONE';
      error.statusCode = 400;
      throw error;
    }

    // Normalize phone number
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    try {
      // Use distributed lock to prevent race conditions
      const result = await lockService.withLock(normalizedPhone, async () => {
        logger.debug('Lock acquired, checking for existing user', {
          requestId,
          phoneNumber: normalizedPhone,
        });

        // Double-check: Verify user doesn't exist (inside lock)
        const existingUser = await userRepository.findByPhoneNumber(normalizedPhone);
        if (existingUser) {
          const error = new Error('Phone number already registered');
          error.code = 'PHONE_EXISTS';
          error.statusCode = 409;
          throw error;
        }

        // Create user
        const newUser = await userRepository.create({
          id: uuidv4(),
          phoneNumber: normalizedPhone,
          name: name || null,
          email: email || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        logger.info('User created successfully', {
          requestId,
          userId: newUser.id,
          phoneNumber: normalizedPhone,
        });

        return newUser;
      });

      return result;
    } catch (error) {
      // Handle specific error types
      if (error.code === 'LOCK_ACQUISITION_FAILED') {
        logger.warn('Signup rejected - concurrent request in progress', {
          requestId,
          phoneNumber: normalizedPhone,
        });
        
        const lockError = new Error('A signup request is already in progress for this phone number. Please wait and try again.');
        lockError.code = 'CONCURRENT_REQUEST';
        lockError.statusCode = 429;
        throw lockError;
      }

      if (error.code === 'PHONE_EXISTS' || error.code === 'DUPLICATE_PHONE') {
        logger.warn('Signup rejected - phone number exists', {
          requestId,
          phoneNumber: normalizedPhone,
        });
        
        const existsError = new Error('Phone number already registered');
        existsError.code = 'PHONE_EXISTS';
        existsError.statusCode = 409;
        throw existsError;
      }

      // Re-throw other errors
      logger.error('Signup failed', {
        requestId,
        phoneNumber: normalizedPhone,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Validate phone number format
   * Supports international format with country code
   * @param {string} phoneNumber 
   * @returns {boolean}
   */
  validatePhoneNumber(phoneNumber) {
    // Remove spaces and dashes
    const cleaned = phoneNumber.replace(/[\s-]/g, '');
    
    // Validate: starts with + followed by 1-3 digit country code and 6-14 digits
    // Or just 10-15 digits
    const phoneRegex = /^(\+\d{1,3})?\d{10,15}$/;
    return phoneRegex.test(cleaned);
  }

  /**
   * Normalize phone number to consistent format
   * @param {string} phoneNumber 
   * @returns {string}
   */
  normalizePhoneNumber(phoneNumber) {
    // Remove spaces, dashes, and parentheses
    let normalized = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Ensure consistent format (you may customize this based on your needs)
    // For now, just return cleaned number
    return normalized;
  }

  /**
   * Check if a phone number is already registered
   * @param {string} phoneNumber 
   * @returns {Promise<boolean>}
   */
  async checkPhoneExists(phoneNumber) {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    return await userRepository.phoneExists(normalized);
  }

  /**
   * Get user by phone number
   * @param {string} phoneNumber 
   * @returns {Promise<Object|null>}
   */
  async getUserByPhone(phoneNumber) {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    return await userRepository.findByPhoneNumber(normalized);
  }

  /**
   * Get user by ID
   * @param {string} userId 
   * @returns {Promise<Object|null>}
   */
  async getUserById(userId) {
    return await userRepository.findById(userId);
  }
}

// Singleton instance
const signupService = new SignupService();

module.exports = signupService;