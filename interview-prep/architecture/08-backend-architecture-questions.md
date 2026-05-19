# Backend Architecture Interview Questions & Answers
## For 10+ Years Experienced Node.js Developer

---

## Table of Contents
1. [Architectural Patterns](#architectural-patterns)
2. [System Design](#system-design)
3. [Scalability](#scalability)
4. [Performance](#performance)
5. [High Availability](#high-availability)
6. [Complex Scenarios](#complex-scenarios)

---

## Architectural Patterns

### Q1: Explain different architectural patterns and when to use them.

**Answer:**

```javascript
/**
 * Common Architectural Patterns
 */

const architecturalPatterns = {
  monolithic: {
    definition: 'Single deployable unit with shared database',
    pros: [
      'Simple to develop and test',
      'Easy deployment',
      'Single codebase',
      'Shared transactions',
      'Simple debugging'
    ],
    cons: [
      'Difficult to scale',
      'Single point of failure',
      'Tight coupling',
      'Technology lock-in',
      'Slow build/deploy cycles'
    ],
    useCase: 'Small to medium applications, startups, MVP'
  },

  microservices: {
    definition: 'Collection of independent, loosely coupled services',
    pros: [
      'Independent scaling',
      'Technology diversity',
      'Fault isolation',
      'Faster deployment',
      'Team autonomy'
    ],
    cons: [
      'Increased complexity',
      'Distributed system challenges',
      'Data consistency issues',
      'Network latency',
      'DevOps overhead'
    ],
    useCase: 'Large applications, high traffic, multiple teams'
  },

  serverless: {
    definition: 'Function as a Service (FaaS) with managed services',
    pros: [
      'No server management',
      'Auto-scaling',
      'Pay-per-use pricing',
      'Reduced operational costs',
      'Built-in high availability'
    ],
    cons: [
      'Cold starts',
      'Vendor lock-in',
      'Execution time limits',
      'Debugging complexity',
      'Limited control'
    ],
    useCase: 'Event-driven apps, sporadic workloads, startups'
  },

  eventDriven: {
    definition: 'Asynchronous communication via events',
    pros: [
      'Loose coupling',
      'Scalable',
      'Real-time processing',
      'Audit trail',
      'Event sourcing'
    ],
    cons: [
      'Complex debugging',
      'Eventual consistency',
      'Event schema evolution',
      'Complex routing',
      'Learning curve'
    ],
    useCase: 'Real-time systems, microservices, IoT'
  },

  cqrs: {
    definition: 'Command Query Responsibility Segregation',
    pros: [
      'Optimized read/write models',
      'Better scalability',
      'Separation of concerns',
      'Performance tuning',
      'Eventual consistency'
    ],
    cons: [
      'Increased complexity',
      'Data synchronization',
      'Stale reads',
      'More code',
      'Learning curve'
    ],
    useCase: 'High read/write ratios, complex domain models'
  }
};

/**
 * Monolithic Architecture Implementation
 */
class MonolithicService {
  constructor() {
    this.userService = new UserService();
    this.productService = new ProductService();
    this.orderService = new OrderService();
    this.notificationService = new NotificationService();
    this.database = new Database();
  }

  async createOrder(orderData) {
    const client = await this.database.connect();
    
    try {
      await client.query('BEGIN');

      // All services share the same transaction
      const user = await this.userService.findById(orderData.userId, client);
      const product = await this.productService.findById(orderData.productId, client);
      
      const order = await this.orderService.create(orderData, client);
      
      await this.notificationService.sendOrderConfirmation(order, client);

      await client.query('COMMIT');
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

/**
 * Microservices Architecture Implementation
 */
class MicroservicesOrchestrator {
  constructor() {
    this.userServiceClient = new UserServiceClient();
    this.productServiceClient = new ProductServiceClient();
    this.orderServiceClient = new OrderServiceClient();
    this.notificationServiceClient = new NotificationServiceClient();
    this.messageQueue = new MessageQueue();
  }

  async createOrder(orderData) {
    try {
      // Step 1: Validate user (synchronous)
      const user = await this.userServiceClient.getUser(orderData.userId);
      
      // Step 2: Validate product (synchronous)
      const product = await this.productServiceClient.getProduct(orderData.productId);
      
      // Step 3: Create order (synchronous)
      const order = await this.orderServiceClient.createOrder({
        userId: orderData.userId,
        productId: orderData.productId,
        quantity: orderData.quantity,
        price: product.price
      });

      // Step 4: Publish order created event (asynchronous)
      await this.messageQueue.publish('order.created', order);

      // Step 5: Trigger notification (asynchronous)
      await this.messageQueue.publish('notification.send', {
        type: 'order_confirmation',
        userId: user.id,
        orderId: order.id
      });

      return order;
    } catch (error) {
      console.error('Order creation failed:', error);
      throw error;
    }
  }
}

/**
 * Event-Driven Architecture Implementation
 */
class EventOrchestrator {
  constructor(messageQueue) {
    this.messageQueue = messageQueue;
    this.handlers = new Map();
  }

  async start() {
    // Subscribe to all events
    await this.messageQueue.subscribe('order.created', this.handleOrderCreated.bind(this));
    await this.messageQueue.subscribe('payment.completed', this.handlePaymentCompleted.bind(this));
    await this.messageQueue.subscribe('notification.send', this.handleNotification.bind(this));
  }

  async handleOrderCreated(event) {
    console.log('Processing order created event:', event);

    // Event sourcing: store the event
    await this.eventStore.save(event);

    // Trigger business logic
    await this.updateInventory(event);
    await this.calculateRevenue(event);
  }

  async handlePaymentCompleted(event) {
    console.log('Processing payment completed event:', event);

    // Update order status
    await this.orderService.updateStatus(event.orderId, 'paid');

    // Publish order shipped event
    await this.messageQueue.publish('order.shipped', {
      orderId: event.orderId
    });
  }

  async handleNotification(event) {
    console.log('Sending notification:', event);
    
    const notification = await this.notificationService.send({
      type: event.type,
      userId: event.userId,
      data: event.data
    });

    // Store notification status
    await this.notificationService.updateStatus(notification.id, 'sent');
  }
}
```

---

## System Design

### Q2: Design a scalable URL shortener service like bit.ly.

**Answer:**

```javascript
/**
 * URL Shortener System Design
 * Requirements:
 * - Generate short URLs (7 characters)
 * - Handle redirection quickly
 * - Track analytics (clicks, locations, devices)
 * - Handle millions of URLs
 * - Custom short URLs
 */

/**
 * Architecture Components
 */
const urlShortenerArchitecture = {
  components: {
    api: 'Node.js/Express',
    database: 'Cassandra (for writes) + Redis (for reads)',
    cache: 'Redis with LRU eviction',
    messageQueue: 'Kafka (for analytics events)',
    analytics: 'Elasticsearch',
    loadBalancer: 'AWS ALB with round-robin'
  },
  dataModel: {
    url: {
      id: 'Unique ID (Base62 encoded)',
      longUrl: 'Original URL',
      createdAt: 'Timestamp',
      userId: 'Creator ID',
      customAlias: 'Optional custom short URL'
    },
    click: {
      id: 'Click ID',
      urlId: 'Reference to URL',
      timestamp: 'Click timestamp',
      ipAddress: 'Client IP',
      userAgent: 'Browser/device info',
      referer: 'HTTP referer',
      location: 'Geolocation data'
    }
  },
  scaling: {
    readHeavy: 'Redis cache for most frequently accessed URLs',
    writeHeavy: 'Cassandra for distributed writes',
    analytics: 'Async processing via Kafka'
  }
};

/**
 * URL Shortener Service Implementation
 */
class URLShortenerService {
  constructor(config) {
    this.database = config.database; // Cassandra
    this.cache = config.cache; // Redis
    this.messageQueue = config.messageQueue; // Kafka
    this.analyticsService = config.analyticsService;
  }

  /**
   * Generate unique short URL
   */
  async generateShortUrl(longUrl, userId, customAlias = null) {
    // Validate URL
    if (!this.isValidUrl(longUrl)) {
      throw new Error('Invalid URL');
    }

    // Check if custom alias is available
    if (customAlias) {
      const existing = await this.database.findById(customAlias);
      if (existing) {
        throw new Error('Custom alias already taken');
      }
    }

    // Generate unique ID
    const id = await this.generateUniqueId();
    
    const shortUrl = customAlias || this.encodeBase62(id);

    // Store in database
    await this.database.insert({
      id: customAlias || id,
      shortUrl: shortUrl,
      longUrl: longUrl,
      userId: userId,
      createdAt: new Date()
    });

    // Cache the URL for fast lookup
    await this.cache.set(shortUrl, longUrl, {
      ex: 86400 // 24 hours TTL
    });

    return shortUrl;
  }

  /**
   * Generate unique ID using Snowflake algorithm
   */
  async generateUniqueId() {
    const timestamp = Date.now();
    const machineId = 1; // Get from config
    const sequence = await this.getSequence(timestamp, machineId);
    
    // Combine: timestamp (41 bits) + machineId (10 bits) + sequence (12 bits)
    const id = (BigInt(timestamp) << BigInt(22)) | 
             (BigInt(machineId) << BigInt(12)) | 
             BigInt(sequence);
    
    return id.toString();
  }

  /**
   * Get sequence number for timestamp/machineId
   */
  async getSequence(timestamp, machineId) {
    const key = `sequence:${timestamp}:${machineId}`;
    
    // Use Redis INCR for sequence
    const sequence = await this.cache.incr(key);
    
    // Set expiry to prevent sequence reuse
    await this.cache.expire(key, 60); // 1 minute

    return sequence;
  }

  /**
   * Encode ID to Base62
   */
  encodeBase62(id) {
    const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const num = BigInt(id);
    let result = '';
    
    if (num === 0n) {
      return characters[0];
    }

    while (num > 0n) {
      result = characters[num % 62n] + result;
      num = num / 62n;
    }

    return result;
  }

  /**
   * Decode Base62 to ID
   */
  decodeBase62(shortUrl) {
    const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let id = 0n;

    for (const char of shortUrl) {
      id = id * 62n + BigInt(characters.indexOf(char));
    }

    return id.toString();
  }

  /**
   * Redirect to long URL
   */
  async redirect(shortUrl) {
    // Check cache first (fast path)
    let longUrl = await this.cache.get(shortUrl);

    if (longUrl) {
      // Publish click event asynchronously (don't wait)
      this.trackClick(shortUrl).catch(error => {
        console.error('Failed to track click:', error);
      });
      return longUrl;
    }

    // Fallback to database (slow path)
    const urlData = await this.database.findById(shortUrl);
    
    if (!urlData) {
      throw new Error('Short URL not found');
    }

    // Cache for future requests
    await this.cache.set(shortUrl, urlData.longUrl, {
      ex: 86400
    });

    // Track click asynchronously
    this.trackClick(shortUrl).catch(error => {
      console.error('Failed to track click:', error);
    });

    return urlData.longUrl;
  }

  /**
   * Track click analytics
   */
  async trackClick(shortUrl, metadata = {}) {
    const clickData = {
      id: this.generateClickId(),
      shortUrl: shortUrl,
      timestamp: new Date(),
      ipAddress: metadata.ip,
      userAgent: metadata.userAgent,
      referer: metadata.referer,
      location: metadata.location
    };

    // Publish to Kafka for analytics processing
    await this.messageQueue.publish('clicks', clickData);
  }

  /**
   * Get analytics for URL
   */
  async getAnalytics(shortUrl, startDate, endDate) {
    // Query analytics service
    const analytics = await this.analyticsService.query({
      shortUrl: shortUrl,
      startDate: startDate,
      endDate: endDate
    });

    return {
      totalClicks: analytics.total,
      uniqueVisitors: analytics.unique,
      topCountries: analytics.countries,
      topDevices: analytics.devices,
      clicksOverTime: analytics.timeline
    };
  }

  /**
   * Validate URL
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate unique click ID
   */
  generateClickId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

/**
 * Analytics Service (Consumer)
 */
class AnalyticsConsumer {
  constructor(messageQueue, analyticsDatabase) {
    this.messageQueue = messageQueue;
    this.analyticsDatabase = analyticsDatabase; // Elasticsearch

    this.start();
  }

  async start() {
    // Consume click events from Kafka
    await this.messageQueue.subscribe('clicks', this.handleClick.bind(this));
  }

  async handleClick(clickData) {
    console.log('Processing click:', clickData);

    // Store in Elasticsearch for analytics
    await this.analyticsDatabase.index('clicks', {
      body: clickData
    });
  }
}

/**
 * Complex Problem: Design rate limiting for URL shortener
 */
class RateLimiter {
  constructor(redis) {
    this.redis = redis;
    this.windows = {
      minute: 60,      // 60 seconds
      hour: 3600,     // 1 hour
      day: 86400      // 24 hours
    };
    this.limits = {
      perMinute: 60,   // 60 requests per minute
      perHour: 1000,  // 1000 requests per hour
      perDay: 10000   // 10000 requests per day
    };
  }

  async checkRateLimit(identifier, action = 'create_url') {
    const now = Date.now();
    const limits = this.limits[action] || this.limits.perMinute;

    for (const [windowName, windowSeconds] of Object.entries(this.windows)) {
      const limit = this.limits[`per${windowName}`];
      const key = `ratelimit:${action}:${identifier}:${windowName}`;
      const window = Math.floor(now / 1000 / windowSeconds);

      // Use Redis Lua script for atomic increment and expiration
      const current = await this.redis.eval(
        `
        local key = KEYS[1]
        local window = ARGV[1]
        local limit = ARGV[2]
        
        local current = redis.call('INCR', key)
        
        if current == 1 then
          redis.call('EXPIRE', key, ARGV[3])
        end
        
        if current > limit then
          return { allowed: false, current: current, limit: limit, window: windowName }
        else
          return { allowed: true, current: current, limit: limit, window: windowName }
        end
        `,
        1, // Number of keys
        [key, window, limit, windowSeconds]
      );

      if (!current.allowed) {
        return {
          allowed: false,
          error: `Rate limit exceeded: ${current.current}/${current.limit} per ${windowName}`,
          retryAfter: windowSeconds - (now % 1000) % windowSeconds
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Implement sliding window rate limiter
   */
  async checkSlidingWindow(identifier, action, limit, windowMs) {
    const now = Date.now();
    const key = `ratelimit:sliding:${action}:${identifier}`;
    const windowStart = now - windowMs;

    // Use Redis sorted set for sliding window
    const pipe = this.redis.multi();

    // Remove old entries
    pipe.zremrangebyscore(key, 0, windowStart);

    // Count current requests
    pipe.zcard(key);

    // Add current request
    pipe.zadd(key, now, now);

    // Set expiration
    pipe.pexpire(key, windowMs);

    const results = await pipe.exec();

    const currentCount = results[1];
    
    if (currentCount >= limit) {
      return {
        allowed: false,
        current: currentCount,
        limit: limit,
        window: 'sliding'
      };
    }

    return {
      allowed: true,
      current: currentCount,
      limit: limit,
      window: 'sliding'
    };
  }
}
```

---

## Scalability

### Q3: Implement auto-scaling with circuit breaker pattern.

**Answer:**

```javascript
/**
 * Auto-Scaling Service with Circuit Breaker
 */

class CircuitBreaker {
  constructor(service, options = {}) {
    this.service = service;
    this.threshold = options.threshold || 5; // Failures before opening
    this.timeout = options.timeout || 60000; // Reset timeout (ms)
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN

    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold || 3;
  }

  async execute(fn, ...args) {
    // Check circuit state
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        console.log('Circuit breaker: HALF_OPEN - allowing test request');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      // Execute the function
      const result = await fn.apply(this.service, args);

      // Success
      this.onSuccess();
      return result;
    } catch (error) {
      // Failure
      this.onFailure(error);
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        console.log('Circuit breaker: CLOSED - service recovered');
      }
    }
  }

  onFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.successCount = 0;
      console.log('Circuit breaker: OPEN - service still failing');
    } else if (this.state === 'CLOSED' && this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      console.log('Circuit breaker: OPEN - threshold exceeded');
    }

    console.error(`Circuit breaker: Service failure (count: ${this.failureCount})`, error);
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Auto-Scaling Service
 */
class AutoScalingService {
  constructor(config) {
    this.config = config;
    this.metricsCollector = new MetricsCollector();
    this.instanceManager = new InstanceManager();
    this.circuitBreakers = new Map();
  }

  /**
   * Monitor and scale based on metrics
   */
  async monitorAndScale() {
    const metrics = await this.collectMetrics();

    // Check scale-up conditions
    if (this.shouldScaleUp(metrics)) {
      await this.scaleUp();
    }

    // Check scale-down conditions
    if (this.shouldScaleDown(metrics)) {
      await this.scaleDown();
    }

    // Check for unhealthy instances
    await this.checkInstanceHealth();
  }

  /**
   * Collect metrics from all instances
   */
  async collectMetrics() {
    const instances = await this.instanceManager.getInstances();
    const metrics = {
      totalInstances: instances.length,
      cpu: 0,
      memory: 0,
      requests: 0,
      errors: 0,
      responseTime: []
    };

    for (const instance of instances) {
      const instanceMetrics = await this.metricsCollector.collect(instance);
      
      metrics.cpu += instanceMetrics.cpu;
      metrics.memory += instanceMetrics.memory;
      metrics.requests += instanceMetrics.requests;
      metrics.errors += instanceMetrics.errors;
      metrics.responseTime.push(instanceMetrics.avgResponseTime);
    }

    // Calculate averages
    metrics.cpu = metrics.cpu / metrics.totalInstances;
    metrics.memory = metrics.memory / metrics.totalInstances;
    metrics.avgResponseTime = metrics.responseTime.reduce((a, b) => a + b, 0) / metrics.responseTime.length;
    metrics.errorRate = (metrics.errors / metrics.requests) * 100;

    return metrics;
  }

  /**
   * Decide whether to scale up
   */
  shouldScaleUp(metrics) {
    const config = this.config;

    // Scale up if CPU usage is high
    if (metrics.cpu > config.scaleUpThreshold.cpu) {
      return true;
    }

    // Scale up if memory usage is high
    if (metrics.memory > config.scaleUpThreshold.memory) {
      return true;
    }

    // Scale up if request queue is long
    if (metrics.avgResponseTime > config.scaleUpThreshold.responseTime) {
      return true;
    }

    // Scale up if error rate is high
    if (metrics.errorRate > config.scaleUpThreshold.errorRate) {
      return true;
    }

    return false;
  }

  /**
   * Decide whether to scale down
   */
  shouldScaleDown(metrics) {
    const config = this.config;

    // Don't scale down if below minimum instances
    if (metrics.totalInstances <= config.minInstances) {
      return false;
    }

    // Scale down if CPU usage is low
    if (metrics.cpu < config.scaleDownThreshold.cpu) {
      return true;
    }

    // Scale down if memory usage is low
    if (metrics.memory < config.scaleDownThreshold.memory) {
      return true;
    }

    return false;
  }

  /**
   * Scale up by adding instances
   */
  async scaleUp() {
    const config = this.config;
    const currentInstances = await this.instanceManager.getInstances();

    if (currentInstances.length >= config.maxInstances) {
      console.log('Already at max instances, cannot scale up');
      return;
    }

    const instancesToAdd = Math.min(
      config.scaleUpStep,
      config.maxInstances - currentInstances.length
    );

    console.log(`Scaling up by ${instancesToAdd} instances`);

    const promises = [];
    for (let i = 0; i < instancesToAdd; i++) {
      promises.push(this.instanceManager.launchInstance());
    }

    await Promise.all(promises);

    // Warm up new instances
    await this.warmupInstances(instancesToAdd);
  }

  /**
   * Scale down by removing instances
   */
  async scaleDown() {
    const config = this.config;
    const instances = await this.instanceManager.getInstances();

    const instancesToRemove = Math.min(
      config.scaleDownStep,
      instances.length - config.minInstances
    );

    console.log(`Scaling down by ${instancesToRemove} instances`);

    // Terminate instances (graceful shutdown)
    const promises = [];
    for (let i = 0; i < instancesToRemove; i++) {
      const instance = instances[i];
      await this.instanceManager.drainConnections(instance);
      promises.push(this.instanceManager.terminateInstance(instance.id));
    }

    await Promise.all(promises);
  }

  /**
   * Check instance health and replace unhealthy ones
   */
  async checkInstanceHealth() {
    const instances = await this.instanceManager.getInstances();

    for (const instance of instances) {
      const healthy = await this.healthCheck(instance);

      if (!healthy) {
        console.log(`Instance ${instance.id} is unhealthy, marking for replacement`);

        // Mark instance for replacement
        await this.instanceManager.markForReplacement(instance.id);

        // Check if we need to replace it now
        const unhealthyCount = await this.instanceManager.getUnhealthyCount();

        if (unhealthyCount > this.config.maxUnhealthyInstances) {
          await this.replaceUnhealthyInstances();
        }
      }
    }
  }

  /**
   * Health check for an instance
   */
  async healthCheck(instance) {
    try {
      // Use circuit breaker to protect health checks
      const breaker = this.getCircuitBreaker(instance.id);

      const result = await breaker.execute(async () => {
        const response = await fetch(`http://${instance.ip}:${instance.port}/health`, {
          method: 'GET',
          timeout: 5000
        });

        return response.ok;
      });

      return result;
    } catch (error) {
      console.error(`Health check failed for instance ${instance.id}:`, error);
      return false;
    }
  }

  /**
   * Get or create circuit breaker for instance
   */
  getCircuitBreaker(instanceId) {
    if (!this.circuitBreakers.has(instanceId)) {
      this.circuitBreakers.set(instanceId, new CircuitBreaker(null, {
        threshold: 3,
        timeout: 30000
      }));
    }

    return this.circuitBreakers.get(instanceId);
  }

  /**
   * Warm up new instances
   */
  async warmupInstances(count) {
    const instances = await this.instanceManager.getInstances();
    const newInstances = instances.slice(-count);

    const warmupRequests = this.config.warmupRequests || 10;

    for (const instance of newInstances) {
      try {
        // Send warmup requests
        const promises = [];
        for (let i = 0; i < warmupRequests; i++) {
          promises.push(fetch(`http://${instance.ip}:${instance.port}/warmup`));
        }

        await Promise.all(promises);
        console.log(`Warmed up instance ${instance.id}`);
      } catch (error) {
        console.error(`Failed to warm up instance ${instance.id}:`, error);
      }
    }
  }

  /**
   * Replace unhealthy instances
   */
  async replaceUnhealthyInstances() {
    const unhealthyInstances = await this.instanceManager.getUnhealthyInstances();

    console.log(`Replacing ${unhealthyInstances.length} unhealthy instances`);

    // Terminate unhealthy instances
    const terminatePromises = unhealthyInstances.map(instance =>
      this.instanceManager.terminateInstance(instance.id)
    );

    await Promise.all(terminatePromises);

    // Launch new instances
    const launchPromises = unhealthyInstances.map(() =>
      this.instanceManager.launchInstance()
    );

    await Promise.all(launchPromises);

    // Warm up new instances
    await this.warmupInstances(unhealthyInstances.length);
  }
}

/**
 * Metrics Collector
 */
class MetricsCollector {
  async collect(instance) {
    try {
      const [cpu, memory, requests, errors, responseTime] = await Promise.all([
        this.getCPUUsage(instance),
        this.getMemoryUsage(instance),
        this.getRequestCount(instance),
        this.getErrorCount(instance),
        this.getAvgResponseTime(instance)
      ]);

      return {
        instanceId: instance.id,
        cpu: cpu,
        memory: memory,
        requests: requests,
        errors: errors,
        avgResponseTime: responseTime
      };
    } catch (error) {
      console.error(`Failed to collect metrics from ${instance.id}:`, error);
      return null;
    }
  }

  async getCPUUsage(instance) {
    // Implementation depends on monitoring system
    const metrics = await this.fetchMetrics(instance, '/metrics/cpu');
    return metrics.usage;
  }

  async getMemoryUsage(instance) {
    const metrics = await this.fetchMetrics(instance, '/metrics/memory');
    return metrics.usage;
  }

  async getRequestCount(instance) {
    const metrics = await this.fetchMetrics(instance, '/metrics/requests');
    return metrics.count;
  }

  async getErrorCount(instance) {
    const metrics = await this.fetchMetrics(instance, '/metrics/errors');
    return metrics.count;
  }

  async getAvgResponseTime(instance) {
    const metrics = await this.fetchMetrics(instance, '/metrics/response_time');
    return metrics.avg;
  }

  async fetchMetrics(instance, path) {
    const response = await fetch(`http://${instance.ip}:${instance.port}${path}`);
    return response.json();
  }
}

/**
 * Instance Manager
 */
class InstanceManager {
  constructor(cloudProvider) {
    this.cloudProvider = cloudProvider;
  }

  async getInstances() {
    return await this.cloudProvider.listInstances();
  }

  async launchInstance() {
    const instance = await this.cloudProvider.launchInstance();
    console.log(`Launched new instance: ${instance.id}`);
    return instance;
  }

  async terminateInstance(instanceId) {
    await this.cloudProvider.terminateInstance(instanceId);
    console.log(`Terminated instance: ${instanceId}`);
  }

  async drainConnections(instance) {
    // Graceful shutdown: drain existing connections
    await this.cloudProvider.drainConnections(instance);
  }

  async markForReplacement(instanceId) {
    // Mark instance for replacement
    await this.cloudProvider.markUnhealthy(instanceId);
  }

  async getUnhealthyCount() {
    const instances = await this.getInstances();
    return instances.filter(i => i.health !== 'healthy').length;
  }
}

/**
 * Usage Example
 */
const autoScalingConfig = {
  minInstances: 2,
  maxInstances: 10,
  scaleUpStep: 2,
  scaleDownStep: 1,
  scaleUpThreshold: {
    cpu: 70, // 70%
    memory: 80, // 80%
    responseTime: 500, // 500ms
    errorRate: 5 // 5%
  },
  scaleDownThreshold: {
    cpu: 30, // 30%
    memory: 40 // 40%
  },
  maxUnhealthyInstances: 1,
  warmupRequests: 10
};

const autoScaler = new AutoScalingService(autoScalingConfig);

// Run monitoring loop every 30 seconds
setInterval(() => {
  autoScaler.monitorAndScale().catch(error => {
    console.error('Auto-scaling error:', error);
  });
}, 30000);
```

---

## Summary

**Key Takeaways:**
1. **Architecture Patterns** - Choose based on requirements (Monolith → Microservices → Serverless)
2. **System Design** - Consider CAP theorem, scalability patterns, data partitioning
3. **Auto-Scaling** - Circuit breaker, health checks, graceful shutdown
4. **Performance** - Caching, load balancing, connection pooling
5. **High Availability** - Redundancy, failover, disaster recovery
6. **Monitoring** - Metrics collection, alerting, dashboards
7. **Security** - Authentication, authorization, encryption
8. **Deployment** - Blue-green deployments, canary releases, rollback
9. **Data Consistency** - Eventual consistency in distributed systems
10. **Resilience** - Retry policies, timeouts, bulkheads