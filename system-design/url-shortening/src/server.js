require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const database = require('./config/database');
const redis = require('./config/redis');
const logger = require('./utils/logger');
const UrlRepository = require('./repositories/UrlRepository');
const UrlShorteningService = require('./services/UrlShorteningService');
const UrlController = require('./controllers/urlController');
const createUrlRoutes = require('./routes/urlRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { validateShortCode } = require('./middleware/validator');

/**
 * Application Factory Pattern
 * Creates and configures the Express application
 */
const createApp = () => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  }));

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting with Redis
  const limiter = rateLimit({
    store: new RedisStore({
      client: redis.getClient(),
    }),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
  });

  app.use('/api/', limiter);

  // Request logging
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  return app;
};

/**
 * Initialize and start the server
 */
const startServer = async () => {
  try {
    // Connect to database
    await database.connect();

    // Connect to Redis
    await redis.connect();

    // Create Express app
    const app = createApp();

    // Initialize layers (Dependency Injection)
    const prisma = database.getClient();
    const urlRepository = new UrlRepository(prisma);
    const urlShorteningService = new UrlShorteningService(
      urlRepository,
      redis.getClient(),
      process.env.SHORT_CODE_STRATEGY || 'random'
    );
    const urlController = new UrlController(urlShorteningService);

    // Register routes
    app.use('/api', createUrlRoutes(urlController));

    // Redirect endpoint (without /api prefix)
    app.get('/:shortCode', validateShortCode, (req, res, next) => {
      urlController.resolveUrl(req, res, next);
    });

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'URL Shortening Service API',
        version: '1.0.0',
        endpoints: {
          health: 'GET /api/health',
          shorten: 'POST /api/shorten',
          stats: 'GET /api/stats/:shortCode',
          urls: 'GET /api/urls',
          delete: 'DELETE /api/urls/:shortCode',
          redirect: 'GET /:shortCode',
        },
      });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The requested resource was not found',
      });
    });

    // Error handling middleware (must be last)
    app.use(errorHandler);

    // Start server
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server is running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
    });

    // Schedule cleanup task for expired URLs (every 24 hours)
    setInterval(async () => {
      try {
        await urlShorteningService.cleanupExpiredUrls();
      } catch (error) {
        logger.error('Error in scheduled cleanup:', error);
      }
    }, 24 * 60 * 60 * 1000);

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await database.disconnect();
          await redis.disconnect();
          logger.info('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('❌ Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer };
