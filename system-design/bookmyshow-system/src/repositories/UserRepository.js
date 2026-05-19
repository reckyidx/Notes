const prisma = require('../config/database');

/**
 * User Repository
 * Handles all database operations for User entity
 * Pattern: Repository Pattern - Abstracts data access layer
 */
class UserRepository {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  async create(userData) {
    return prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        passwordHash: userData.passwordHash,
        salt: userData.salt,
        role: userData.role || 'CUSTOMER',
        isVerified: userData.isVerified || false,
        isActive: userData.isActive !== undefined ? userData.isActive : true,
      },
    });
  }

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} User or null
   */
  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User or null
   */
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by phone
   * @param {string} phone - User phone
   * @returns {Promise<Object|null>} User or null
   */
  async findByPhone(phone) {
    return prisma.user.findUnique({
      where: { phone },
    });
  }

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user
   */
  async update(id, updateData) {
    return prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete user (soft delete)
   * @param {string} id - User ID
   * @returns {Promise<Object>} Deleted user
   */
  async delete(id) {
    return prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Update last login timestamp
   * @param {string} id - User ID
   * @returns {Promise<Object>} Updated user
   */
  async updateLastLogin(id) {
    return prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }

  /**
   * Verify user email
   * @param {string} id - User ID
   * @returns {Promise<Object>} Updated user
   */
  async verifyEmail(id) {
    return prisma.user.update({
      where: { id },
      data: { isVerified: true },
    });
  }

  /**
   * Find users by role
   * @param {string} role - User role
   * @returns {Promise<Array>} List of users
   */
  async findByRole(role) {
    return prisma.user.findMany({
      where: { role, isActive: true },
    });
  }

  /**
   * Get user with bookings
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} User with bookings
   */
  async findWithBookings(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        bookings: {
          include: {
            show: {
              include: {
                movie: true,
                theater: true,
              },
            },
            tickets: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }
}

module.exports = new UserRepository();