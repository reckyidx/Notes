const RandomShortCodeStrategy = require('../strategies/RandomShortCodeStrategy');
const HashShortCodeStrategy = require('../strategies/HashShortCodeStrategy');
const logger = require('../utils/logger');

/**
 * Service Pattern for URL Shortening Business Logic
 * Implements the core business logic and coordinates between components
 */
class UrlShorteningService {
  constructor(urlRepository, redisClient, strategy = 'random') {
    this.urlRepository = urlRepository;
    this.redisClient = redisClient;
    
    // Strategy Pattern: Initialize the appropriate short code generation strategy
    switch (strategy.toLowerCase()) {
      case 'hash':
        this.shortCodeStrategy = new HashShortCodeStrategy(parseInt(process.env.SHORT_CODE_LENGTH) || 6);
        break;
      case 'random':
      default:
        this.shortCodeStrategy = new RandomShortCodeStrategy(parseInt(process.env.SHORT_CODE_LENGTH) || 6);
    }
    
    this.cacheTTL = 3600; // 1 hour cache TTL
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  }

  /**
   * Shorten a URL
   */
  async shortenUrl(originalUrl, customCode = null, userId = null) {
    try {
      // Validate URL
      const validUrl = new URL(originalUrl);
      
      // Check if custom code is provided
      if (customCode) {
        const existingUrl = await this.urlRepository.findByShortCode(customCode);
        if (existingUrl) {
          throw new Error('Custom short code already exists');
        }
        return this._createUrlEntry(originalUrl, customCode, userId);
      }

      // Check if URL already exists (deduplication)
      const existingUrl = await this.urlRepository.findByOriginalUrl(originalUrl);
      if (existingUrl) {
        logger.info(`URL already exists: ${existingUrl.shortCode}`);
        return {
          id: existingUrl.id,
          originalUrl: existingUrl.originalUrl,
          shortCode: existingUrl.shortCode,
          shortUrl: `${this.baseUrl}/${existingUrl.shortCode}`,
          clicks: existingUrl.clicks,
          createdAt: existingUrl.createdAt,
        };
      }

      // Generate unique short code with retry logic
      let shortCode;
      let attempts = 0;
      const maxAttempts = 5;

      do {
        shortCode = this.shortCodeStrategy.generate(originalUrl);
        const existing = await this.urlRepository.findByShortCode(shortCode);
        if (!existing) {
          break;
        }
        attempts++;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique short code');
      }

      return this._createUrlEntry(originalUrl, shortCode, userId);
    } catch (error) {
      logger.error('Error shortening URL:', error);
      throw error;
    }
  }

  /**
   * Resolve a short URL to original URL
   */
  async resolveUrl(shortCode) {
    try {
      // Check cache first (Cache-Aside Pattern)
      const cacheKey = `url:${shortCode}`;
      const cachedUrl = await this.redisClient.get(cacheKey);
      
      if (cachedUrl) {
        logger.info(`URL ${shortCode} found in cache`);
        await this.urlRepository.incrementClicks(shortCode);
        return JSON.parse(cachedUrl);
      }

      // Fetch from database
      const url = await this.urlRepository.findByShortCode(shortCode);
      
      if (!url) {
        throw new Error('URL not found');
      }

      // Check if URL has expired
      if (url.expiresAt && new Date(url.expiresAt) < new Date()) {
        throw new Error('URL has expired');
      }

      // Increment click count
      await this.urlRepository.incrementClicks(shortCode);

      // Cache the result
      await this.redisClient.setEx(
        cacheKey,
        this.cacheTTL,
        JSON.stringify({
          originalUrl: url.originalUrl,
          clicks: url.clicks + 1,
        })
      );

      return {
        originalUrl: url.originalUrl,
        clicks: url.clicks + 1,
      };
    } catch (error) {
      logger.error(`Error resolving URL ${shortCode}:`, error);
      throw error;
    }
  }

  /**
   * Get URL statistics
   */
  async getUrlStats(shortCode) {
    try {
      const url = await this.urlRepository.findByShortCode(shortCode);
      
      if (!url) {
        throw new Error('URL not found');
      }

      return {
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        shortUrl: `${this.baseUrl}/${url.shortCode}`,
        clicks: url.clicks,
        createdAt: url.createdAt,
        expiresAt: url.expiresAt,
      };
    } catch (error) {
      logger.error(`Error getting stats for ${shortCode}:`, error);
      throw error;
    }
  }

  /**
   * Get all URLs for a user
   */
  async getUserUrls(userId) {
    try {
      const urls = await this.urlRepository.findByUserId(userId);
      return urls.map(url => ({
        id: url.id,
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        shortUrl: `${this.baseUrl}/${url.shortCode}`,
        clicks: url.clicks,
        createdAt: url.createdAt,
        expiresAt: url.expiresAt,
      }));
    } catch (error) {
      logger.error(`Error getting URLs for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a URL
   */
  async deleteUrl(shortCode) {
    try {
      // Invalidate cache
      await this.redisClient.del(`url:${shortCode}`);
      
      // Delete from database
      await this.urlRepository.delete(shortCode);
      
      return { success: true, message: 'URL deleted successfully' };
    } catch (error) {
      logger.error(`Error deleting URL ${shortCode}:`, error);
      throw error;
    }
  }

  /**
   * Helper method to create URL entry
   */
  async _createUrlEntry(originalUrl, shortCode, userId) {
    const expiryDays = parseInt(process.env.EXPIRY_DAYS) || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const urlData = {
      originalUrl,
      shortCode,
      userId,
      expiresAt,
    };

    const url = await this.urlRepository.create(urlData);

    return {
      id: url.id,
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      shortUrl: `${this.baseUrl}/${url.shortCode}`,
      clicks: url.clicks,
      createdAt: url.createdAt,
      expiresAt: url.expiresAt,
    };
  }

  /**
   * Clean up expired URLs
   */
  async cleanupExpiredUrls() {
    try {
      const count = await this.urlRepository.deleteExpired();
      logger.info(`Cleaned up ${count} expired URLs`);
      return count;
    } catch (error) {
      logger.error('Error cleaning up expired URLs:', error);
      throw error;
    }
  }
}

module.exports = UrlShorteningService;
