const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * User Repository
 * Handles all database operations related to users
 * Abstracts database implementation details from the service layer
 */
class UserRepository {
  /**
   * Find user by phone number
   * @param {string} phoneNumber 
   * @returns {Promise<Object|null>}
   */
  async findByPhoneNumber(phoneNumber) {
    try {
      const user = await db.findUserByPhone(phoneNumber);
      return user;
    } catch (error) {
      logger.error('Error finding user by phone number', {
        phoneNumber,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {string} userId 
   * @returns {Promise<Object|null>}
   */
  async findById(userId) {
    try {
      const user = await db.findUserById(userId);
      return user;
    } catch (error) {
      logger.error('Error finding user by ID', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create a new user
   * @param {Object} userData 
   * @returns {Promise<Object>}
   */
  async create(userData) {
    try {
      const user = await db.createUser(userData);
      logger.info('User created in database', { userId: user.id });
      return user;
    } catch (error) {
      logger.error('Error creating user', {
        phoneNumber: userData.phoneNumber,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if phone number exists
   * @param {string} phoneNumber 
   * @returns {Promise<boolean>}
   */
  async phoneExists(phoneNumber) {
    try {
      return await db.phoneExists(phoneNumber);
    } catch (error) {
      logger.error('Error checking phone existence', {
        phoneNumber,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all users (for testing/admin)
   * @returns {Promise<Array>}
   */
  async findAll() {
    try {
      return await db.getAllUsers();
    } catch (error) {
      logger.error('Error finding all users', { error: error.message });
      throw error;
    }
  }

  /**
   * Clear all users (for testing)
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await db.clear();
      logger.info('All users cleared from database');
    } catch (error) {
      logger.error('Error clearing users', { error: error.message });
      throw error;
    }
  }
}

// Singleton instance
const userRepository = new UserRepository();

module.exports = userRepository;