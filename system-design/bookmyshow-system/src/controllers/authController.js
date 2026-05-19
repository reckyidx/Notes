const AuthService = require('../services/AuthService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Auth Controller
 * Handles authentication endpoints
 */
const authController = {
  /**
   * Register new user
   * POST /api/v1/auth/signup
   */
  signup: asyncHandler(async (req, res) => {
    const { name, email, phone, password } = req.body;

    const result = await AuthService.signup({
      name,
      email,
      phone,
      password,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  }),

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await AuthService.login({ email, password });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  }),

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  logout: asyncHandler(async (req, res) => {
    await AuthService.logout(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }),

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh-token
   */
  refreshToken: asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const result = await AuthService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    });
  }),

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  getProfile: asyncHandler(async (req, res) => {
    const UserRepository = require('../repositories/UserRepository');
    const user = await UserRepository.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const { passwordHash, salt, ...safeUser } = user;

    res.status(200).json({
      success: true,
      data: safeUser,
    });
  }),
};

module.exports = authController;