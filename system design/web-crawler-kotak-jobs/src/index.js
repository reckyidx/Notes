import { MongoClient } from 'mongodb';
import Redis from 'ioredis';
import CrawlerOrchestrator from './orchestrator/CrawlerOrchestrator.js';
import Logger from './utils/logger.js';
import config from './config/config.js';

const logger = Logger.getInstance();

async function main() {
  let mongoClient = null;
  let redisClient = null;

  try {
    logger.info('Starting Kotak Job Crawler...');

    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    mongoClient = new MongoClient(config.mongodb.uri, config.mongodb.options);
    await mongoClient.connect();
    logger.info('Connected to MongoDB successfully');

    // Connect to Redis
    logger.info('Connecting to Redis...');
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
      retryStrategy: config.redis.retryStrategy,
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis successfully');
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error', { error: error.message });
    });

    // Wait for Redis connection
    await new Promise((resolve) => {
      redisClient.once('connect', resolve);
    });

    // Initialize crawler orchestrator
    const orchestrator = new CrawlerOrchestrator(mongoClient, redisClient);
    await orchestrator.initialize();

    // Start crawling
    const startUrl = config.crawler.baseUrl;
    logger.info(`Starting crawl from ${startUrl}`);

    const metrics = await orchestrator.startCrawl(startUrl, {
      maxPages: config.parser.pagination.maxPages,
    });

    logger.info('Crawl completed successfully', metrics);

    // Get some statistics
    const stats = await orchestrator.getJobStatistics();
    logger.info('Job statistics', stats);

    // Get recent jobs
    const recentJobs = await orchestrator.getRecentJobs(5);
    logger.info(`Found ${recentJobs.length} recent jobs`);

  } catch (error) {
    logger.error('Fatal error', { error: error.message, stack: error.stack });
    process.exit(1);
  } finally {
    // Cleanup
    if (mongoClient) {
      await mongoClient.close();
      logger.info('MongoDB connection closed');
    }

    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }

    logger.info('Crawler shutdown complete');
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start the crawler
main();