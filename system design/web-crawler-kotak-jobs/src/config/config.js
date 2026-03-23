import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const config = {
  // Application
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 3000,
  
  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/kotak-jobs',
    database: process.env.MONGODB_DATABASE || 'kotak-jobs',
    options: {
      maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE) || 50,
      minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE) || 10,
      maxIdleTimeMS: parseInt(process.env.MONGO_MAX_IDLE_TIME_MS) || 60000,
      waitQueueTimeoutMS: parseInt(process.env.MONGO_WAIT_QUEUE_TIMEOUT_MS) || 10000,
      connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT_MS) || 10000,
    },
  },
  
  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB) || 0,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'kotak-crawler:',
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  },
  
  // Crawler Configuration
  crawler: {
    baseUrl: process.env.KOTAK_CAREER_URL || 'https://www.kotak.com/careers',
    userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
    maxRedirects: parseInt(process.env.MAX_REDIRECTS) || 5,
    followRedirects: true,
    
    // Rate Limiting
    rateLimit: {
      capacity: parseInt(process.env.RATE_LIMIT_CAPACITY) || 100,
      refillRate: parseInt(process.env.RATE_LIMIT_REFILL_RATE) || 10, // tokens per second
      minDelay: parseInt(process.env.RATE_LIMIT_MIN_DELAY) || 100, // milliseconds
    },
    
    // Retry Configuration
    retry: {
      maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
      initialDelay: parseInt(process.env.RETRY_INITIAL_DELAY) || 1000,
      maxDelay: parseInt(process.env.RETRY_MAX_DELAY) || 30000,
      backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER) || 2,
    },
    
    // Worker Configuration
    workers: {
      count: parseInt(process.env.WORKER_COUNT) || 10,
      maxWorkers: parseInt(process.env.MAX_WORKERS) || 50,
      minWorkers: parseInt(process.env.MIN_WORKERS) || 2,
    },
    
    // Connection Pool
    connectionPool: {
      maxSockets: parseInt(process.env.HTTP_MAX_SOCKETS) || 100,
      maxFreeSockets: parseInt(process.env.HTTP_MAX_FREE_SOCKETS) || 10,
      timeout: parseInt(process.env.HTTP_TIMEOUT) || 60000,
      keepAliveMsecs: parseInt(process.env.HTTP_KEEP_ALIVE_MS) || 1000,
    },
    
    // Caching
    cache: {
      enabled: process.env.CACHE_ENABLED === 'true',
      ttl: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour
      maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
    },
  },
  
  // Parser Configuration
  parser: {
    selectors: {
      // Kotak-specific selectors (to be updated based on actual HTML structure)
      jobCard: '.job-card',
      jobTitle: '.job-title',
      jobId: '.job-id',
      location: '.job-location',
      department: '.job-department',
      jobType: '.job-type',
      workModel: '.work-model',
      experienceLevel: '.experience-level',
      salary: '.salary-range',
      description: '.job-description',
      requirements: '.job-requirements',
      responsibilities: '.job-responsibilities',
      skills: '.job-skills',
      postedDate: '.posted-date',
      applicationDeadline: '.application-deadline',
      applyUrl: '.apply-button',
      pagination: '.pagination',
      nextPage: '.next-page',
    },
    
    // Pagination
    pagination: {
      maxPages: parseInt(process.env.MAX_PAGES) || 50,
      pageParameter: 'page',
    },
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      directory: join(__dirname, '../../logs'),
      filename: 'app.log',
      errorFilename: 'error.log',
      maxSize: '20m',
      maxFiles: '14d',
    },
    console: {
      enabled: process.env.LOG_CONSOLE_ENABLED !== 'false',
      colorize: process.env.LOG_COLORIZE !== 'false',
    },
  },
  
  // Scheduling Configuration
  scheduling: {
    enabled: process.env.SCHEDULING_ENABLED === 'true',
    cronExpression: process.env.CRAWL_SCHEDULE || '0 */30 * * * *', // Every 30 minutes
    timezone: process.env.TIMEZONE || 'Asia/Kolkata',
  },
  
  // Circuit Breaker Configuration
  circuitBreaker: {
    failureThreshold: parseInt(process.env.CB_FAILURE_THRESHOLD) || 5,
    resetTimeout: parseInt(process.env.CB_RESET_TIMEOUT) || 60000,
    monitoringPeriod: parseInt(process.env.CB_MONITORING_PERIOD) || 10000,
  },
  
  // Batch Processing Configuration
  batch: {
    enabled: process.env.BATCH_ENABLED === 'true',
    size: parseInt(process.env.BATCH_SIZE) || 100,
    timeout: parseInt(process.env.BATCH_TIMEOUT) || 5000,
  },
  
  // Monitoring Configuration
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    metricsInterval: parseInt(process.env.METRICS_INTERVAL) || 60000, // 1 minute
  },
};

export default config;