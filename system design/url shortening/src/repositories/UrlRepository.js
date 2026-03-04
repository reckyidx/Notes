const logger = require('../utils/logger');

/**
 * Repository Pattern for URL Data Access
 * Abstracts database operations and provides a clean interface
 */
class UrlRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Create a new URL entry
   */
  async create(data) {
    try {
      const url = await this.prisma.url.create({
        data,
      });
      logger.info(`URL created: ${url.shortCode}`);
      return url;
    } catch (error) {
      logger.error('Error creating URL:', error);
      throw error;
    }
  }

  /**
   * Find URL by short code
   */
  async findByShortCode(shortCode) {
    try {
      const url = await this.prisma.url.findUnique({
        where: { shortCode },
      });
      return url;
    } catch (error) {
      logger.error(`Error finding URL by short code ${shortCode}:`, error);
      throw error;
    }
  }

  /**
   * Find URL by original URL
   */
  async findByOriginalUrl(originalUrl) {
    try {
      const url = await this.prisma.url.findFirst({
        where: { originalUrl },
      });
      return url;
    } catch (error) {
      logger.error('Error finding URL by original URL:', error);
      throw error;
    }
  }

  /**
   * Increment click count for a URL
   */
  async incrementClicks(shortCode) {
    try {
      const url = await this.prisma.url.update({
        where: { shortCode },
        data: { clicks: { increment: 1 } },
      });
      logger.info(`URL ${shortCode} clicked. Total clicks: ${url.clicks}`);
      return url;
    } catch (error) {
      logger.error(`Error incrementing clicks for ${shortCode}:`, error);
      throw error;
    }
  }

  /**
   * Get all URLs for a user
   */
  async findByUserId(userId) {
    try {
      const urls = await this.prisma.url.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      return urls;
    } catch (error) {
      logger.error(`Error finding URLs for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a URL
   */
  async delete(shortCode) {
    try {
      const url = await this.prisma.url.delete({
        where: { shortCode },
      });
      logger.info(`URL deleted: ${shortCode}`);
      return url;
    } catch (error) {
      logger.error(`Error deleting URL ${shortCode}:`, error);
      throw error;
    }
  }

  /**
   * Clean up expired URLs
   */
  async deleteExpired() {
    try {
      const now = new Date();
      const result = await this.prisma.url.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      });
      logger.info(`Deleted ${result.count} expired URLs`);
      return result.count;
    } catch (error) {
      logger.error('Error deleting expired URLs:', error);
      throw error;
    }
  }
}

module.exports = UrlRepository;
