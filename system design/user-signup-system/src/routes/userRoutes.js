const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Public (should be protected in production)
 */
router.get('/:id', authController.getUser);

module.exports = router;