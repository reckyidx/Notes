require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { logRequest } = require('./utils/logger');
const { rateLimiter } = require('./config/redis');

const app = express();

// ==================== MIDDLEWARE ====================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(logRequest);

// HTTP request logger
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting middleware
app.use((req, res, next) => {
  const key = `rate_limit:${req.ip}`;
  rateLimiter.check(key, config.rateLimit.maxRequests, 60)
    .then(result => {
      res.setHeader('X-RateLimit-Limit', config.rateLimit.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetAt);
      
      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests, please try again later',
        });
      }
      next();
    })
    .catch(err => {
      console.error('Rate limiter error:', err);
      next();
    });
});

// ==================== ROUTES ====================

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// ==================== SERVER ====================

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   🎬 BookMyShow API Server                                ║
  ║                                                           ║
  ║   Environment: ${config.nodeEnv.padEnd(42)}║
  ║   Port: ${PORT.toString().padEnd(50)}║
  ║   URL: http://localhost:${PORT}/api/v1`.padEnd(60) + `║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
});

// ==================== GRACEFUL SHUTDOWN ====================

const gracefulShutdown = async () => {
  console.log('\nReceived shutdown signal. Closing server gracefully...');
  
  server.close(async () => {
    console.log('HTTP server closed.');
    
    // Close database connection
    const prisma = require('./config/database');
    await prisma.$disconnect();
    console.log('Database connection closed.');
    
    // Close Redis connection
    const { redis } = require('./config/redis');
    redis.quit();
    console.log('Redis connection closed.');
    
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ==================== UNHANDLED ERRORS ====================

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;