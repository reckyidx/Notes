const logger = require('../utils/logger');

/**
 * Validation middleware for signup requests
 */
const validateSignup = (req, res, next) => {
  const { phoneNumber, name, email } = req.body;
  const errors = [];

  // Validate phone number (required)
  if (!phoneNumber) {
    errors.push({
      field: 'phoneNumber',
      message: 'Phone number is required',
    });
  } else if (typeof phoneNumber !== 'string') {
    errors.push({
      field: 'phoneNumber',
      message: 'Phone number must be a string',
    });
  } else {
    // Validate phone number format
    const cleaned = phoneNumber.replace(/[\s-]/g, '');
    const phoneRegex = /^(\+\d{1,3})?\d{10,15}$/;
    if (!phoneRegex.test(cleaned)) {
      errors.push({
        field: 'phoneNumber',
        message: 'Invalid phone number format. Must be 10-15 digits, optionally starting with country code (+)',
      });
    }
  }

  // Validate name (optional, but if provided must be string)
  if (name !== undefined && name !== null && typeof name !== 'string') {
    errors.push({
      field: 'name',
      message: 'Name must be a string',
    });
  }

  // Validate email (optional, but if provided must be valid format)
  if (email !== undefined && email !== null) {
    if (typeof email !== 'string') {
      errors.push({
        field: 'email',
        message: 'Email must be a string',
      });
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push({
          field: 'email',
          message: 'Invalid email format',
        });
      }
    }
  }

  // Return errors if any
  if (errors.length > 0) {
    logger.warn('Validation failed for signup request', { errors });
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

/**
 * Validation middleware for phone number parameter
 */
const validatePhoneNumber = (req, res, next) => {
  const { phoneNumber } = req.params;

  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required',
    });
  }

  const cleaned = phoneNumber.replace(/[\s-]/g, '');
  const phoneRegex = /^(\+\d{1,3})?\d{10,15}$/;
  if (!phoneRegex.test(cleaned)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number format',
    });
  }

  next();
};

module.exports = {
  validateSignup,
  validatePhoneNumber,
};