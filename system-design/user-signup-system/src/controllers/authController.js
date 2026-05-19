const signupService = require('../services/SignupService');
const logger = require('../utils/logger');

/**
 * Auth Controller
 * Handles HTTP requests for authentication endpoints
 */
class AuthController {
  /**
   * Handle user signup
   * POST /api/auth/signup
   */
  async signup(req, res, next) {
    try {
      const { phoneNumber, name, email } = req.body;

      logger.info('Signup request', {
        phoneNumber,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      const user = await signupService.signup({
        phoneNumber,
        name,
        email,
      });

      // Return success response (exclude sensitive data)
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            phoneNumber: user.phoneNumber,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if phone number is registered
   * GET /api/auth/check-phone/:phoneNumber
   */
  async checkPhone(req, res, next) {
    try {
      const { phoneNumber } = req.params;

      const exists = await signupService.checkPhoneExists(phoneNumber);

      res.json({
        success: true,
        data: {
          exists,
          phoneNumber,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   * GET /api/users/:id
   */
  async getUser(req, res, next) {
    try {
      const { id } = req.params;

      const user = await signupService.getUserById(id);

      if (!user) {
        const error = new Error('User not found');
        error.code = 'USER_NOT_FOUND';
        error.statusCode = 404;
        throw error;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            phoneNumber: user.phoneNumber,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Health check endpoint
   * GET /health
   */
  health(req, res) {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'user-signup-system',
    });
  }
}

// Singleton instance
const authController = new AuthController();

module.exports = authController;