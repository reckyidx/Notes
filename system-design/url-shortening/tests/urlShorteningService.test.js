const UrlShorteningService = require('../src/services/UrlShorteningService');
const UrlRepository = require('../src/repositories/UrlRepository');

// Mock dependencies
jest.mock('../src/repositories/UrlRepository');
jest.mock('../src/config/redis');

describe('UrlShorteningService', () => {
  let urlShorteningService;
  let mockRepository;
  let mockRedis;

  beforeEach(() => {
    mockRepository = new UrlRepository();
    mockRedis = {
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
    };

    urlShorteningService = new UrlShorteningService(
      mockRepository,
      mockRedis,
      'random'
    );
  });

  describe('shortenUrl', () => {
    it('should create a new short URL', async () => {
      const mockUrl = {
        id: '123',
        originalUrl: 'https://example.com',
        shortCode: 'abc123',
        clicks: 0,
        createdAt: new Date(),
        expiresAt: new Date(),
      };

      mockRepository.findByShortCode.mockResolvedValue(null);
      mockRepository.findByOriginalUrl.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockUrl);

      const result = await urlShorteningService.shortenUrl('https://example.com');

      expect(result).toBeDefined();
      expect(result.originalUrl).toBe('https://example.com');
      expect(result.shortCode).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should return existing URL if already shortened', async () => {
      const existingUrl = {
        id: '123',
        originalUrl: 'https://example.com',
        shortCode: 'abc123',
        clicks: 5,
        createdAt: new Date(),
      };

      mockRepository.findByOriginalUrl.mockResolvedValue(existingUrl);

      const result = await urlShorteningService.shortenUrl('https://example.com');

      expect(result.shortCode).toBe('abc123');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should validate URL format', async () => {
      await expect(
        urlShorteningService.shortenUrl('invalid-url')
      ).rejects.toThrow();
    });
  });

  describe('resolveUrl', () => {
    it('should resolve URL from cache', async () => {
      const cachedData = {
        originalUrl: 'https://example.com',
        clicks: 10,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));
      mockRepository.incrementClicks.mockResolvedValue({});

      const result = await urlShorteningService.resolveUrl('abc123');

      expect(result.originalUrl).toBe('https://example.com');
      expect(mockRedis.get).toHaveBeenCalledWith('url:abc123');
    });

    it('should resolve URL from database and cache it', async () => {
      const dbUrl = {
        originalUrl: 'https://example.com',
        clicks: 5,
        expiresAt: new Date(Date.now() + 86400000),
      };

      mockRedis.get.mockResolvedValue(null);
      mockRepository.findByShortCode.mockResolvedValue(dbUrl);
      mockRepository.incrementClicks.mockResolvedValue({ clicks: 6 });
      mockRedis.setEx.mockResolvedValue('OK');

      const result = await urlShorteningService.resolveUrl('abc123');

      expect(result.originalUrl).toBe('https://example.com');
      expect(mockRedis.setEx).toHaveBeenCalled();
    });

    it('should throw error for expired URL', async () => {
      const expiredUrl = {
        originalUrl: 'https://example.com',
        expiresAt: new Date(Date.now() - 86400000), // Past date
      };

      mockRedis.get.mockResolvedValue(null);
      mockRepository.findByShortCode.mockResolvedValue(expiredUrl);

      await expect(
        urlShorteningService.resolveUrl('abc123')
      ).rejects.toThrow('URL has expired');
    });

    it('should throw error for non-existent URL', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRepository.findByShortCode.mockResolvedValue(null);

      await expect(
        urlShorteningService.resolveUrl('nonexistent')
      ).rejects.toThrow('URL not found');
    });
  });

  describe('getUrlStats', () => {
    it('should return URL statistics', async () => {
      const mockUrl = {
        originalUrl: 'https://example.com',
        shortCode: 'abc123',
        clicks: 42,
        createdAt: new Date(),
        expiresAt: new Date(),
      };

      mockRepository.findByShortCode.mockResolvedValue(mockUrl);

      const stats = await urlShorteningService.getUrlStats('abc123');

      expect(stats.clicks).toBe(42);
      expect(stats.shortCode).toBe('abc123');
    });
  });

  describe('deleteUrl', () => {
    it('should delete URL and invalidate cache', async () => {
      mockRedis.del.mockResolvedValue(1);
      mockRepository.delete.mockResolvedValue({});

      const result = await urlShorteningService.deleteUrl('abc123');

      expect(result.success).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('url:abc123');
      expect(mockRepository.delete).toHaveBeenCalledWith('abc123');
    });
  });
});
