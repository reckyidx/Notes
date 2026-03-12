const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Validation Middleware
 * Validates request payloads using Joi schemas
 */

// URL shortening schema
const shortenUrlSchema = Joi.object({
  url: Joi.string().uri().required().messages({
    'string.uri': 'URL must be a valid URL',
    'any.required': 'URL is required',
  }),
  customCode: Joi.string().alphanum().min(3).max(15).optional().messages({
    'string.alphanum': 'Custom code must be alphanumeric',
    'string.min': 'Custom code must be at least 3 characters',
    'string.max': 'Custom code must be at most 15 characters',
  }),
});

/**
 * Middleware to validate URL shortening request
 */
const validateShortenUrl = (req, res, next) => {
  const { error } = shortenUrlSchema.validate(req.body);
  
  if (error) {
    logger.warn('Validation error:', error.details[0].message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: error.details[0].message,
    });
  }
  
  next();
};

/**
 * Middleware to validate short code parameter
 */
const validateShortCode = (req, res, next) => {
  const shortCodeSchema = Joi.string().alphanum().min(3).max(15).required();
  
  const { error } = shortCodeSchema.validate(req.params.shortCode);
  
  if (error) {
    logger.warn('Validation error:', error.details[0].message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: error.details[0].message,
    });
  }
  
  next();
};

module.exports = {
  validateShortenUrl,
  validateShortCode,
};
