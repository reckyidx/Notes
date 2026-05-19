const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const UserRepository = require('../repositories/UserRepository');
const { cache } = require('../config/redis');
const config = require('../config');
const { logger } = require('../utils/logger');

/**
 * Authentication Service
 * Handles user authentication, registration, and token management
 * Pattern: Service Layer Pattern
 */
class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Auth response with tokens
   */
  async signup(userData) {
    const { name, email, phone, password } = userData;

    // Validate input
    if (!email || !password || !name) {
      throw new Error('Name, email, and password are required');
    }

    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Check if user exists
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Check phone if provided
    if (phone) {
      const existingPhone = await UserRepository.findByPhone(phone);
      if (existingPhone) {
        throw new Error('Phone number already registered');
      }
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(config.bcrypt.rounds);
    const passwordHash = await bcrypt.hash(password + salt, 10);

    // Create user
    const user = await UserRepository.create({
      name,
      email,
      phone,
      passwordHash,
      salt,
      role: 'CUSTOMER',
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    logger.info('User registered successfully', { userId: user.id, email: user.email });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user
   * @param {Object} credentials - Login credentials
   * @returns {Promise<Object>} Auth response with tokens
   */
  async login(credentials) {
    const { email, password } = credentials;

    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find user
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password + user.salt, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Update last login
    await UserRepository.updateLastLogin(user.id);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    logger.info('User logged in successfully', { userId: user.id, email: user.email });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Logout user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async logout(userId) {
    // Invalidate refresh token in cache
    await cache.del(`refresh_token:${userId}`);
    logger.info('User logged out', { userId });
    return true;
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New access token
   */
  async refreshToken(refreshToken) {
    // Verify refresh token
    let payload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.secret);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Check if token matches stored token
    const storedToken = await cache.get(`refresh_token:${payload.userId}`);
    if (!storedToken || storedToken !== refreshToken) {
      throw new Error('Token has been revoked');
    }

    // Get user
    const user = await UserRepository.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken(user);

    return { accessToken };
  }

  /**
   * Generate access and refresh tokens
   * @param {Object} user - User object
   * @returns {Promise<Object>} Tokens
   */
  async generateTokens(user) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Store refresh token in cache
    await cache.set(
      `refresh_token:${user.id}`,
      refreshToken,
      config.jwt.refreshTokenExpiry
    );

    return { accessToken, refreshToken };
  }

  /**
   * Generate access token
   * @param {Object} user - User object
   * @returns {string} Access token
   */
  generateAccessToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessTokenExpiry,
    });
  }

  /**
   * Generate refresh token
   * @param {Object} user - User object
   * @returns {string} Refresh token
   */
  generateRefreshToken(user) {
    const payload = {
      userId: user.id,
      type: 'refresh',
    };
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshTokenExpiry,
    });
  }

  /**
   * Verify access token
   * @param {string} token - Access token
   * @returns {Object} Decoded token payload
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sanitize user object (remove sensitive data)
   * @param {Object} user - User object
   * @returns {Object} Sanitized user
   */
  sanitizeUser(user) {
    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  }
}

module.exports = new AuthService();