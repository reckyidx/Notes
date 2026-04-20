const logger = require('../utils/logger');

/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 * Catches all errors and returns consistent JSON responses
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error occurred', {
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Determine error code
  const errorCode = err.code || 'INTERNAL_ERROR';

  // Prepare error response
  const errorResponse = {
    success: false,
    message: err.message || 'An unexpected error occurred',
    code: errorCode,
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || null;
  }

  // Handle specific error types
  switch (errorCode) {
    case 'VALIDATION_ERROR':
    case 'MISSING_PHONE':
    case 'INVALID_PHONE':
      return res.status(400).json(errorResponse);

    case 'PHONE_EXISTS':
    case 'DUPLICATE_PHONE':
      return res.status(409).json(errorResponse);

    case 'CONCURRENT_REQUEST':
    case 'LOCK_ACQUISITION_FAILED':
      return res.status(429).json(errorResponse);

    case 'USER_NOT_FOUND':
      return res.status(404).json(errorResponse);

    default:
      // Internal server error
      return res.status(statusCode).json(errorResponse);
  }
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  });
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors and pass to error middleware
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
};