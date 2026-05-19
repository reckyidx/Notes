const logger = require('../utils/logger');

/**
 * Controller Pattern
 * Handles HTTP requests and responses, delegates business logic to service layer
 */
class UrlController {
  constructor(urlShorteningService) {
    this.urlShorteningService = urlShorteningService;
  }

  /**
   * Shorten a URL
   * POST /api/shorten
   */
  shortenUrl = async (req, res, next) => {
    try {
      const { url, customCode } = req.body;
      const userId = req.user?.id; // Optional: from authentication middleware

      const result = await this.urlShorteningService.shortenUrl(url, customCode, userId);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Resolve a short URL
   * GET /:shortCode
   */
  resolveUrl = async (req, res, next) => {
    try {
      const { shortCode } = req.params;
      const result = await this.urlShorteningService.resolveUrl(shortCode);

      // Redirect to original URL
      res.redirect(301, result.originalUrl);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get URL statistics
   * GET /api/stats/:shortCode
   */
  getUrlStats = async (req, res, next) => {
    try {
      const { shortCode } = req.params;
      const stats = await this.urlShorteningService.getUrlStats(shortCode);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all URLs for a user
   * GET /api/urls
   */
  getUserUrls = async (req, res, next) => {
    try {
      const userId = req.user?.id; // From authentication middleware
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const urls = await this.urlShorteningService.getUserUrls(userId);

      res.status(200).json({
        success: true,
        data: urls,
        count: urls.length,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a URL
   * DELETE /api/urls/:shortCode
   */
  deleteUrl = async (req, res, next) => {
    try {
      const { shortCode } = req.params;
      const result = await this.urlShorteningService.deleteUrl(shortCode);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Health check endpoint
   * GET /api/health
   */
  healthCheck = async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'URL Shortening Service is running',
      timestamp: new Date().toISOString(),
    });
  };
}

module.exports = UrlController;
