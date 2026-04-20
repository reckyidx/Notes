const config = require('./config');

/**
 * In-memory database simulation for demonstration
 * In production, replace with actual database client (PostgreSQL, MySQL, etc.)
 * 
 * This implementation simulates database operations with in-memory storage
 * while maintaining the same interface as a real database.
 */
class Database {
  constructor() {
    // In-memory storage for users
    this.users = new Map();
    // Index for phone number lookups
    this.phoneIndex = new Map();
  }

  /**
   * Find user by phone number
   * @param {string} phoneNumber 
   * @returns {Object|null}
   */
  async findUserByPhone(phoneNumber) {
    const userId = this.phoneIndex.get(phoneNumber);
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  /**
   * Find user by ID
   * @param {string} userId 
   * @returns {Object|null}
   */
  async findUserById(userId) {
    return this.users.get(userId) || null;
  }

  /**
   * Create a new user with unique phone number constraint
   * Uses atomic operation to prevent race conditions at database level
   * @param {Object} userData 
   * @returns {Object} Created user
   * @throws {Error} If phone number already exists
   */
  async createUser(userData) {
    const { id, phoneNumber, email, name, createdAt, updatedAt } = userData;

    // Check if phone already exists (double-check at DB level)
    if (this.phoneIndex.has(phoneNumber)) {
      const error = new Error('Phone number already registered');
      error.code = 'DUPLICATE_PHONE';
      error.statusCode = 409;
      throw error;
    }

    // Create user atomically
    const user = {
      id,
      phoneNumber,
      email: email || null,
      name: name || null,
      createdAt: createdAt || new Date(),
      updatedAt: updatedAt || new Date(),
    };

    // Store user and update index atomically
    this.users.set(id, user);
    this.phoneIndex.set(phoneNumber, id);

    return { ...user };
  }

  /**
   * Check if phone number exists (for quick validation)
   * @param {string} phoneNumber 
   * @returns {boolean}
   */
  async phoneExists(phoneNumber) {
    return this.phoneIndex.has(phoneNumber);
  }

  /**
   * Get all users (for testing/debugging)
   * @returns {Array}
   */
  async getAllUsers() {
    return Array.from(this.users.values());
  }

  /**
   * Clear all data (for testing)
   */
  async clear() {
    this.users.clear();
    this.phoneIndex.clear();
  }
}

// Singleton instance
const db = new Database();

module.exports = db;