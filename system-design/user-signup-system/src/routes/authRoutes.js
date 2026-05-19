const express = require('express');
const authController = require('../controllers/authController');
const { validateSignup } = require('../middleware/validator');

const router = express.Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', validateSignup, authController.signup);

/**
 * @route   GET /api/auth/check-phone/:phoneNumber
 * @desc    Check if phone number is already registered
 * @access  Public
 */
router.get('/check-phone/:phoneNumber', authController.checkPhone);

module.exports = router;