const express = require('express');
const { validateShortenUrl, validateShortCode } = require('../middleware/validator');

/**
 * Routes
 * Defines API endpoints and maps them to controller methods
 */

const createUrlRoutes = (urlController) => {
  const router = express.Router();

  // Shorten a URL
  router.post('/shorten', validateShortenUrl, (req, res, next) => {
    urlController.shortenUrl(req, res, next);
  });

  // Get URL statistics
  router.get('/stats/:shortCode', validateShortCode, (req, res, next) => {
    urlController.getUrlStats(req, res, next);
  });

  // Get user's URLs
  router.get('/urls', (req, res, next) => {
    urlController.getUserUrls(req, res, next);
  });

  // Delete a URL
  router.delete('/urls/:shortCode', validateShortCode, (req, res, next) => {
    urlController.deleteUrl(req, res, next);
  });

  // Health check
  router.get('/health', (req, res) => {
    urlController.healthCheck(req, res);
  });

  return router;
};

module.exports = createUrlRoutes;
