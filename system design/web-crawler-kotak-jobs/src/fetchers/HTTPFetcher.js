import axios from 'axios';
import https from 'https';
import Logger from '../utils/logger.js';
import { TokenBucketRateLimiter } from '../patterns/RateLimiter.js';
import config from '../config/config.js';

// Connection Pool Pattern
class HTTPConnectionPool {
  constructor() {
    this.agent = new https.Agent({
      keepAlive: true,
      maxSockets: config.crawler.connectionPool.maxSockets,
      maxFreeSockets: config.crawler.connectionPool.maxFreeSockets,
      timeout: config.crawler.connectionPool.timeout,
      keepAliveMsecs: config.crawler.connectionPool.keepAliveMsecs,
    });
  }

  getAgent() {
    return this.agent;
  }
}

// Base Fetcher with Decorator Pattern support
class FetcherDecorator {
  constructor(fetcher) {
    this.fetcher = fetcher;
  }

  async fetch(url, options = {}) {
    return this.fetcher.fetch(url, options);
  }
}

// HTTP Fetcher implementation
class HTTPFetcher extends FetcherDecorator {
  constructor(rateLimiter) {
    super();
    this.rateLimiter = rateLimiter;
    this.connectionPool = new HTTPConnectionPool();
    this.logger = Logger.getInstance();
  }

  async fetch(url, options = {}) {
    try {
      // Rate limiting
      if (this.rateLimiter) {
        const allowed = await this.rateLimiter.allow();
        if (!allowed) {
          const waitTime = this.rateLimiter.getWaitTime();
          this.logger.debug(`Rate limited, waiting ${waitTime}ms`);
          await this.sleep(waitTime);
        }
      }

      const response = await axios({
        url,
        method: options.method || 'GET',
        headers: {
          'User-Agent': config.crawler.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          ...options.headers,
        },
        httpsAgent: this.connectionPool.getAgent(),
        timeout: config.crawler.requestTimeout,
        maxRedirects: config.crawler.maxRedirects,
        validateStatus: (status) => status < 500, // Don't throw on 4xx
      });

      this.logger.debug(`Fetched ${url} - Status: ${response.status}`);
      
      return {
        url: response.request.res.responseUrl || url,
        status: response.status,
        headers: response.headers,
        data: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch ${url}`, { error: error.message });
      throw error;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Retry Decorator
class RetryDecorator extends FetcherDecorator {
  constructor(fetcher, maxRetries = 3, initialDelay = 1000, backoffMultiplier = 2) {
    super(fetcher);
    this.maxRetries = maxRetries;
    this.initialDelay = initialDelay;
    this.backoffMultiplier = backoffMultiplier;
    this.logger = Logger.getInstance();
  }

  async fetch(url, options = {}) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await super.fetch(url, options);
      } catch (error) {
        lastError = error;
        
        // Don't retry on 4xx errors (client errors)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          throw error;
        }

        if (attempt < this.maxRetries) {
          const backoffDelay = this.initialDelay * Math.pow(this.backoffMultiplier, attempt - 1);
          this.logger.warn(`Attempt ${attempt}/${this.maxRetries} failed for ${url}, retrying in ${backoffDelay}ms`, {
            error: error.message,
          });
          await this.sleep(backoffDelay);
        }
      }
    }

    this.logger.error(`All ${this.maxRetries} attempts failed for ${url}`, {
      error: lastError.message,
    });
    throw lastError;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Circuit Breaker Decorator
class CircuitBreakerDecorator extends FetcherDecorator {
  constructor(fetcher, options = {}) {
    super(fetcher);
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    this.logger = Logger.getInstance();
  }

  async fetch(url, options = {}) {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN';
        this.logger.info('Circuit breaker moved to HALF_OPEN state');
      } else {
        const error = new Error('Circuit breaker is OPEN');
        this.logger.warn('Circuit breaker is OPEN, rejecting request');
        throw error;
      }
    }

    try {
      const result = await super.fetch(url, options);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.logger.info('Circuit breaker moved to CLOSED state');
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      this.logger.error('Circuit breaker moved to OPEN state', {
        failureCount: this.failureCount,
        resetTimeout: this.resetTimeout,
      });
    }
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    this.logger.info('Circuit breaker reset to CLOSED state');
  }
}

// Factory function to create configured fetcher
export function createFetcher(redisClient) {
  const rateLimiter = new TokenBucketRateLimiter(
    config.crawler.rateLimit.capacity,
    config.crawler.rateLimit.refillRate
  );

  const baseFetcher = new HTTPFetcher(rateLimiter);
  const retryFetcher = new RetryDecorator(
    baseFetcher,
    config.crawler.retry.maxRetries,
    config.crawler.retry.initialDelay,
    config.crawler.retry.backoffMultiplier
  );
  const circuitBreakerFetcher = new CircuitBreakerDecorator(retryFetcher, {
    failureThreshold: config.circuitBreaker.failureThreshold,
    resetTimeout: config.circuitBreaker.resetTimeout,
  });

  return circuitBreakerFetcher;
}

export default HTTPFetcher;