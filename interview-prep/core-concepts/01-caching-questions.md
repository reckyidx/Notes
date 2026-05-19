# Caching Interview Questions & Answers
## For 10+ Years Experienced Node.js Developer

---

## Table of Contents
1. [Basic Concepts](#basic-concepts)
2. [Redis Implementation](#redis-implementation)
3. [Cache Strategies](#cache-strategies)
4. [Cache Invalidation](#cache-invalidation)
5. [Complex Scenarios](#complex-scenarios)
6. [Performance Optimization](#performance-optimization)

---

## Basic Concepts

### Q1: What is caching and why is it important in high-performance systems?

**Answer:**
Caching is the process of storing frequently accessed data in a fast-access storage layer to reduce the load on primary data stores and improve response times.

**Key Benefits:**
- **Reduced Latency**: Data served from memory (microseconds) vs database (milliseconds)
- **Reduced Database Load**: Fewer queries to the database
- **Improved Scalability**: Handles more concurrent users
- **Cost Optimization**: Reduced database resources needed

**Trade-offs:**
- **Staleness**: Cached data might be outdated
- **Complexity**: Cache invalidation adds system complexity
- **Memory Usage**: Caching requires additional resources
- **Consistency**: Data consistency challenges across distributed systems

---

### Q2: Explain different types of caching strategies.

**Answer:**

**1. In-Memory Caching**
- Node process memory (e.g., `node-cache`, `memory-cache`)
- Fastest access but limited by process memory
- Lost on process restart

**2. Distributed Caching**
- Redis, Memcached
- Shared across multiple instances
- Persistent (Redis) or volatile (Memcached)

**3. CDN Caching**
- Cache static assets at edge locations
- Reduces latency for geographically distributed users
- Examples: Cloudflare, AWS CloudFront

**4. Database Query Caching**
- Cache query results
- Database-level (e.g., MySQL query cache)
- Application-level (e.g., Sequelize caching)

**5. Object Caching**
- Cache complete objects/entities
- Reduces object construction overhead
- Example: Cache user profile after database fetch

**6. Page/Fragment Caching**
- Cache rendered HTML or fragments
- Server-side or client-side
- Great for static or rarely changing content

---

## Redis Implementation

### Q3: How would you implement Redis caching in a Node.js application with proper error handling?

**Answer:**

```javascript
// cache-redis.js
const Redis = require('ioredis');
const { promisify } = require('util');

class RedisCache {
  constructor(options = {}) {
    this.redis = new Redis({
      host: options.host || 'localhost',
      port: options.port || 6379,
      password: options.password,
      db: options.db || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.redis.on('close', () => {
      console.warn('Redis connection closed');
    });

    // Default TTL: 1 hour
    this.defaultTTL = options.defaultTTL || 3600;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      
      return JSON.parse(value);
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null; // Fail gracefully
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serialized = JSON.stringify(value);
      if (ttl > 0) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false; // Fail gracefully
    }
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async del(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error(`Cache del error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set multiple values at once (MSET)
   * @param {Object} keyValueMap - Key-value pairs
   * @returns {Promise<boolean>}
   */
  async mset(keyValueMap) {
    try {
      const pipeline = this.redis.pipeline();
      for (const [key, value] of Object.entries(keyValueMap)) {
        pipeline.set(key, JSON.stringify(value));
      }
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Get multiple values at once (MGET)
   * @param {string[]} keys - Array of keys
   * @returns {Promise<Array>}
   */
  async mget(keys) {
    try {
      const values = await this.redis.mget(keys);
      return values.map(v => v ? JSON.parse(v) : null);
    } catch (error) {
      console.error('Cache mget error:', error);
      return new Array(keys.length).fill(null);
    }
  }

  /**
   * Increment counter
   * @param {string} key - Cache key
   * @returns {Promise<number>}
   */
  async incr(key) {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      console.error(`Cache incr error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Increment counter with expiry
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<number>}
   */
  async incrWithExpiry(key, ttl) {
    try {
      const result = await this.redis.multi()
        .incr(key)
        .expire(key, ttl)
        .exec();
      return result[0][1];
    } catch (error) {
      console.error(`Cache incrWithExpiry error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    await this.redis.quit();
  }
}

module.exports = RedisCache;
```

**Usage Example:**

```javascript
// Example: Caching user data with proper fallback
const cache = new RedisCache({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  defaultTTL: 3600
});

async function getUserWithCache(userId) {
  const cacheKey = `user:${userId}`;
  
  // Try to get from cache
  const cachedUser = await cache.get(cacheKey);
  if (cachedUser) {
    return cachedUser;
  }
  
  // Cache miss - fetch from database
  const user = await User.findById(userId);
  
  if (user) {
    // Set in cache
    await cache.set(cacheKey, user, 1800); // 30 minutes
  }
  
  return user;
}

// Using with Promise.allSettled for cache-aside pattern
async function getUsersWithCache(userIds) {
  const cacheKeys = userIds.map(id => `user:${id}`);
  
  // Get all cached users
  const cachedUsers = await cache.mget(cacheKeys);
  
  // Find missing user IDs
  const missingIds = userIds.filter((_, index) => !cachedUsers[index]);
  
  if (missingIds.length > 0) {
    // Fetch missing users from database
    const dbUsers = await User.findAll({
      where: { id: missingIds }
    });
    
    // Cache the fetched users
    const cacheOps = dbUsers.map(user => 
      cache.set(`user:${user.id}`, user, 1800)
    );
    
    await Promise.allSettled(cacheOps); // Don't fail if cache fails
    
    // Merge cached and db users
    const userMap = new Map(cachedUsers.filter(Boolean).map(u => [u.id, u]));
    dbUsers.forEach(user => userMap.set(user.id, user));
    
    return Array.from(userMap.values());
  }
  
  return cachedUsers.filter(Boolean);
}
```

---

## Cache Strategies

### Q4: Explain different caching patterns and when to use each.

**Answer:**

**1. Cache-Aside (Lazy Loading)**
```
Application → Check Cache → Hit? Return
                         → Miss? Load from DB, Update Cache, Return
```

**When to use:**
- Read-heavy workloads
- Data is read more often than written
- Simple implementation needed

```javascript
async function getProduct(productId) {
  const cacheKey = `product:${productId}`;
  
  // Try cache first
  let product = await cache.get(cacheKey);
  
  if (!product) {
    // Cache miss - load from DB
    product = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
    
    // Update cache
    if (product) {
      await cache.set(cacheKey, product, 3600);
    }
  }
  
  return product;
}
```

**2. Write-Through**
```
Application → Write to Cache → Write to DB → Return
```

**When to use:**
- Read-after-write consistency is required
- Data is frequently written
- Can tolerate slightly slower writes

```javascript
async function updateProduct(productId, data) {
  const cacheKey = `product:${productId}`;
  
  // Update cache first
  await cache.set(cacheKey, data, 3600);
  
  // Then update database
  await db.query('UPDATE products SET ... WHERE id = $1', [productId]);
  
  return data;
}
```

**3. Write-Behind (Write-Back)**
```
Application → Write to Cache → Return (Async write to DB)
```

**When to use:**
- Write-heavy workloads
- Can tolerate data loss
- Need maximum write performance

```javascript
async function updateProduct(productId, data) {
  const cacheKey = `product:${productId}`;
  
  // Update cache immediately
  await cache.set(cacheKey, data, 3600);
  
  // Asynchronously write to DB
  setImmediate(async () => {
    try {
      await db.query('UPDATE products SET ... WHERE id = $1', [productId]);
    } catch (error) {
      console.error('Write-behind failed:', error);
      // Retry logic or queue for later
    }
  });
  
  return data;
}
```

**4. Refresh-Ahead**
```
Application → Check Cache → About to expire? Refresh in background
```

**When to use:**
- High traffic to specific keys
- Can predict access patterns
- Need to avoid cache stampede

```javascript
async function getProduct(productId) {
  const cacheKey = `product:${productId}`;
  const ttlKey = `${cacheKey}:ttl`;
  
  let product = await cache.get(cacheKey);
  
  if (product) {
    // Check TTL
    const ttl = await cache.redis.ttl(cacheKey);
    
    // Refresh if TTL < 10% of original (360 seconds if original is 3600)
    if (ttl < 360) {
      // Refresh in background without waiting
      refreshInBackground(productId, cacheKey);
    }
    
    return product;
  }
  
  // Cache miss - load from DB
  product = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
  
  if (product) {
    await cache.set(cacheKey, product, 3600);
  }
  
  return product;
}

async function refreshInBackground(productId, cacheKey) {
  try {
    const product = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
    if (product) {
      await cache.set(cacheKey, product, 3600);
    }
  } catch (error) {
    console.error('Background refresh failed:', error);
  }
}
```

**5. Multi-Level Caching**
```
Application → L1 Cache (In-Memory) → L2 Cache (Redis) → Database
```

**When to use:**
- Very high throughput requirements
- Need to reduce load on Redis
- Complex caching hierarchy

```javascript
class MultiLevelCache {
  constructor() {
    this.l1Cache = new Map(); // In-memory cache
    this.l2Cache = new RedisCache(); // Redis
    this.l1MaxSize = 1000;
    this.l1MaxAge = 60000; // 1 minute
  }

  async get(key) {
    // Try L1 cache first
    const l1Value = this.l1Cache.get(key);
    if (l1Value && Date.now() - l1Value.timestamp < this.l1MaxAge) {
      return l1Value.data;
    }
    
    // Try L2 cache
    const l2Value = await this.l2Cache.get(key);
    if (l2Value) {
      this.setL1(key, l2Value);
      return l2Value;
    }
    
    return null;
  }

  async set(key, value) {
    await this.l2Cache.set(key, value);
    this.setL1(key, value);
  }

  setL1(key, value) {
    if (this.l1Cache.size >= this.l1MaxSize) {
      // Simple LRU: delete first key
      const firstKey = this.l1Cache.keys().next().value;
      this.l1Cache.delete(firstKey);
    }
    this.l1Cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }
}
```

---

## Cache Invalidation

### Q5: How do you handle cache invalidation in a distributed system?

**Answer:**

**Strategies for Cache Invalidation:**

**1. Time-Based Invalidation (TTL)**
```javascript
// Simplest approach - set expiration time
await cache.set('product:123', product, 3600); // Expires in 1 hour
```

**Pros:**
- Simple to implement
- No coordination needed
- Works well for data that changes infrequently

**Cons:**
- Stale data until expiry
- Wasteful if data changes immediately after caching

**2. Event-Based Invalidation**
```javascript
// Using Pub/Sub for cache invalidation
const redis = new Redis();
const subscriber = new Redis();

// Subscribe to invalidation events
subscriber.subscribe('cache:invalidate');

subscriber.on('message', async (channel, message) => {
  if (channel === 'cache:invalidate') {
    const { key, pattern } = JSON.parse(message);
    if (pattern) {
      await cache.invalidatePattern(pattern);
    } else {
      await cache.del(key);
    }
  }
});

// When data changes, publish invalidation
async function updateProduct(productId, data) {
  await db.query('UPDATE products SET ... WHERE id = $1', [productId]);
  
  // Invalidate cache
  await redis.publish('cache:invalidate', JSON.stringify({
    key: `product:${productId}`
  }));
  
  // Also invalidate related caches
  await redis.publish('cache:invalidate', JSON.stringify({
    pattern: 'products:category:*' // All products in this category
  }));
}
```

**3. Database-Based Invalidation (Change Data Capture)**
```javascript
// Using database triggers or CDC tools
// Example: PostgreSQL NOTIFY/LISTEN

const { Client } = require('pg');
const client = new Client();

await client.connect();

await client.query('LISTEN cache_invalidate');

client.on('notification', async (msg) => {
  const { key, pattern } = JSON.parse(msg.payload);
  await cache.invalidate(pattern ? { pattern } : { key });
});

// Trigger in PostgreSQL
/*
CREATE OR REPLACE FUNCTION notify_cache_invalidate()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('cache_invalidate', json_build_object(
    'key', 'product:' || NEW.id
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_cache_invalidate
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION notify_cache_invalidate();
*/
```

**4. Tag-Based Invalidation**
```javascript
class TaggedCache {
  async set(key, value, tags = [], ttl = 3600) {
    await cache.set(key, value, ttl);
    
    // Add key to each tag
    for (const tag of tags) {
      await cache.sadd(`tag:${tag}`, key);
      await cache.expire(`tag:${tag}`, ttl);
    }
  }

  async invalidateTag(tag) {
    const keys = await cache.smembers(`tag:${tag}`);
    
    if (keys.length > 0) {
      await cache.del(...keys);
      await cache.del(`tag:${tag}`);
    }
  }

  async get(key) {
    return cache.get(key);
  }
}

// Usage
const taggedCache = new TaggedCache();

// Cache product with tags
await taggedCache.set('product:123', product, ['category:electronics', 'brand:apple'], 3600);

// Invalidate all products in a category
await taggedCache.invalidateTag('category:electronics');
```

**5. Write-Through Invalidation**
```javascript
async function updateUser(userId, data) {
  const cacheKey = `user:${userId}`;
  
  // Update database
  await db.query('UPDATE users SET ... WHERE id = $1', [userId]);
  
  // Invalidate cache immediately
  await cache.del(cacheKey);
  
  // Also invalidate related caches
  await cache.del(`user:profile:${userId}`);
  await cache.del(`user:settings:${userId}`);
  
  return data;
}
```

**6. Distributed Cache Invalidation with Redis Keyspace Notifications**
```javascript
// Enable keyspace notifications in redis.conf
// notify-keyspace-events Ex

const redis = new Redis();
const subscriber = new Redis();

// Subscribe to expired events
subscriber.subscribe('__keyevent@0__:expired');

subscriber.on('message', async (channel, key) => {
  if (channel === '__keyevent@0__:expired') {
    console.log(`Key expired: ${key}`);
    
    // Optionally refresh or log
    if (key.startsWith('product:')) {
      const productId = key.split(':')[1];
      // Refresh in background
      refreshProduct(productId);
    }
  }
});
```

**Complex Scenario: Handling Cache Stampede**

```javascript
async function getProductWithLock(productId) {
  const cacheKey = `product:${productId}`;
  const lockKey = `lock:${cacheKey}`;
  
  // Try cache
  let product = await cache.get(cacheKey);
  if (product) {
    return product;
  }
  
  // Use Redis SET with NX (only set if not exists) for locking
  const lockAcquired = await cache.redis.set(lockKey, '1', 'PX', 5000, 'NX');
  
  if (lockAcquired) {
    try {
      // Double-check cache (another process might have populated it)
      product = await cache.get(cacheKey);
      if (product) {
        return product;
      }
      
      // Load from database
      product = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
      
      if (product) {
        await cache.set(cacheKey, product, 3600);
      }
      
      return product;
    } finally {
      // Release lock
      await cache.del(lockKey);
    }
  } else {
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return getProductWithLock(productId); // Retry
  }
}
```

---

## Complex Scenarios

### Q6: Design a caching system for a high-traffic e-commerce application.

**Answer:**

**Requirements:**
- Handle millions of concurrent users
- Low latency (p99 < 100ms)
- Data consistency
- Scalability
- Fault tolerance

**Architecture:**

```javascript
// E-commerce Caching Architecture

class ECommerceCache {
  constructor(redisCluster) {
    this.redis = redisCluster;
    this.localCache = new LRUCache({ max: 1000, maxAge: 60000 });
  }

  /**
   * Product catalog caching with multi-level strategy
   */
  async getProduct(productId) {
    const cacheKey = `product:${productId}`;
    
    // L1: Local cache (fastest)
    const localProduct = this.localCache.get(cacheKey);
    if (localProduct) {
      return localProduct;
    }
    
    // L2: Redis (shared)
    const redisProduct = await this.redis.get(cacheKey);
    if (redisProduct) {
      this.localCache.set(cacheKey, redisProduct);
      return redisProduct;
    }
    
    // L3: Database
    const dbProduct = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
    
    if (dbProduct) {
      // Set in both caches with different TTLs
      await this.redis.setex(cacheKey, 3600, JSON.stringify(dbProduct)); // 1 hour
      this.localCache.set(cacheKey, dbProduct); // 1 minute
    }
    
    return dbProduct;
  }

  /**
   * Shopping cart caching with session-based invalidation
   */
  async getCart(userId) {
    const cacheKey = `cart:${userId}`;
    
    let cart = await this.redis.hgetall(cacheKey);
    
    if (!cart || Object.keys(cart).length === 0) {
      // Load from database
      cart = await db.query('SELECT * FROM cart WHERE user_id = $1', [userId]);
      
      // Store in Redis with 24-hour TTL
      for (const item of cart) {
        await this.redis.hset(cacheKey, item.product_id, JSON.stringify(item));
      }
      await this.redis.expire(cacheKey, 86400);
    }
    
    return Object.values(cart).map(item => JSON.parse(item));
  }

  /**
   * Cart item operations with atomic Redis commands
   */
  async addToCart(userId, productId, quantity) {
    const cacheKey = `cart:${userId}`;
    const item = { productId, quantity, addedAt: new Date() };
    
    // Atomic operation: HINCRBY
    const newQuantity = await this.redis.hincrby(cacheKey, productId, quantity);
    
    if (newQuantity > quantity) {
      // Item existed, update quantity
      await this.redis.hset(cacheKey, productId, JSON.stringify({
        ...item,
        quantity: newQuantity
      }));
    } else {
      // New item
      await this.redis.hset(cacheKey, productId, JSON.stringify(item));
    }
    
    // Persist to database asynchronously
    setImmediate(async () => {
      await db.query(`
        INSERT INTO cart (user_id, product_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, product_id)
        DO UPDATE SET quantity = cart.quantity + $3
      `, [userId, productId, quantity]);
    });
    
    return { success: true, quantity: newQuantity };
  }

  /**
   * Rate limiting for API endpoints
   */
  async checkRateLimit(userId, endpoint, limit = 100, window = 60) {
    const key = `ratelimit:${userId}:${endpoint}`;
    
    // Using Redis INCR and EXPIRE atomically
    const multi = this.redis.multi();
    multi.incr(key);
    multi.expire(key, window);
    
    const results = await multi.exec();
    const currentCount = results[0][1];
    
    return {
      allowed: currentCount <= limit,
      remaining: Math.max(0, limit - currentCount),
      resetAt: Date.now() + window * 1000
    };
  }

  /**
   * Product search with caching
   */
  async searchProducts(query, filters = {}) {
    const cacheKey = `search:${hashQuery(query, filters)}`;
    
    // Try cache
    const cachedResults = await this.redis.get(cacheKey);
    if (cachedResults) {
      return JSON.parse(cachedResults);
    }
    
    // Execute search
    const results = await db.query(`
      SELECT * FROM products 
      WHERE name ILIKE $1 
      AND category = $2
      AND price BETWEEN $3 AND $4
      LIMIT 100
    `, [`%${query}%`, filters.category, filters.minPrice, filters.maxPrice]);
    
    // Cache results for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(results));
    
    return results;
  }

  /**
   * Product inventory with distributed lock
   */
  async reserveStock(productId, quantity) {
    const lockKey = `lock:stock:${productId}`;
    const stockKey = `stock:${productId}`;
    
    // Acquire lock
    const lock = await this.acquireLock(lockKey, 5000);
    if (!lock) {
      throw new Error('Could not acquire lock for stock reservation');
    }
    
    try {
      // Get current stock
      const currentStock = parseInt(await this.redis.get(stockKey)) || 0;
      
      if (currentStock < quantity) {
        throw new Error('Insufficient stock');
      }
      
      // Reserve stock
      await this.redis.decrby(stockKey, quantity);
      
      // Log reservation
      await this.redis.lpush(`stock:reservations:${productId}`, JSON.stringify({
        quantity,
        timestamp: Date.now()
      }));
      
      return { success: true, remainingStock: currentStock - quantity };
    } finally {
      await this.releaseLock(lockKey, lock);
    }
  }

  /**
   * Distributed lock implementation
   */
  async acquireLock(key, timeout = 5000) {
    const lockValue = Date.now() + timeout + 1;
    const acquired = await this.redis.set(key, lockValue, 'PX', timeout, 'NX');
    return acquired ? lockValue : null;
  }

  async releaseLock(key, lockValue) {
    const pipeline = this.redis.pipeline();
    pipeline.watch(key);
    pipeline.get(key);
    pipeline.exec((err, results) => {
      if (results && results[1] === lockValue) {
        this.redis.del(key);
      }
    });
  }

  /**
   * Cache warming for popular products
   */
  async warmCache() {
    // Get top 100 most viewed products from analytics
    const popularProducts = await db.query(`
      SELECT product_id, COUNT(*) as views
      FROM product_views
      GROUP BY product_id
      ORDER BY views DESC
      LIMIT 100
    `);
    
    // Warm cache in parallel
    const warmPromises = popularProducts.map(async (item) => {
      const product = await db.query('SELECT * FROM products WHERE id = $1', [item.product_id]);
      if (product) {
        await this.redis.setex(`product:${item.product_id}`, 3600, JSON.stringify(product));
      }
    });
    
    await Promise.allSettled(warmPromises);
  }

  /**
   * Handle cache eviction with smart TTL
   */
  async setWithSmartTTL(key, value, metadata = {}) {
    let ttl = 3600; // Default 1 hour
    
    // Adjust TTL based on metadata
    if (metadata.isPopular) {
      ttl = 7200; // Popular items stay longer
    }
    
    if (metadata.isSeasonal) {
      ttl = 1800; // Seasonal items expire faster
    }
    
    if (metadata.isFlashSale) {
      ttl = 300; // Flash sale items expire quickly
    }
    
    await this.redis.setex(key, ttl, JSON.stringify(value));
    
    return ttl;
  }
}

// Initialize with Redis Cluster for scalability
const RedisCluster = require('ioredis').Cluster;
const redisCluster = new RedisCluster([
  { host: 'redis-node1', port: 6379 },
  { host: 'redis-node2', port: 6379 },
  { host: 'redis-node3', port: 6379 }
]);

const ecommerceCache = new ECommerceCache(redisCluster);
```

---

## Performance Optimization

### Q7: How do you optimize cache performance and prevent cache-related issues?

**Answer:**

**1. Cache Key Design**
```javascript
// Good cache key structure
const cacheKeys = {
  user: (id) => `user:${id}`,
  userProfile: (id) => `user:${id}:profile`,
  userSettings: (id) => `user:${id}:settings`,
  
  product: (id) => `product:${id}`,
  productCategory: (id, catId) => `product:${id}:category:${catId}`,
  
  search: (query, filters) => `search:${crypto.createHash('md5').update(JSON.stringify({ query, filters })).digest('hex')}`,
  
  apiResponse: (method, path, params) => `api:${method}:${path}:${hashParams(params)}`
};
```

**2. Memory Management**
```javascript
// Monitor Redis memory usage
async function monitorMemoryUsage() {
  const info = await redis.info('memory');
  const usedMemory = parseInt(info.match(/used_memory:(\d+)/)[1]);
  const maxMemory = parseInt(info.match(/maxmemory:(\d+)/)[1]);
  
  const usagePercent = (usedMemory / maxMemory) * 100;
  
  if (usagePercent > 80) {
    console.warn(`Redis memory usage high: ${usagePercent.toFixed(2)}%`);
    
    // Trigger cache cleanup
    await cleanupLeastRecentlyUsed();
  }
}

async function cleanupLeastRecentlyUsed() {
  // Use Redis OBJECT IDLETIME to find idle keys
  const keys = await redis.keys('product:*');
  
  for (const key of keys) {
    const idleTime = await redis.object('idletime', key);
    
    // Evict keys idle for more than 1 hour
    if (idleTime > 3600) {
      await redis.del(key);
    }
  }
}
```

**3. Pipeline Commands**
```javascript
// Use pipelining for bulk operations
async function cacheMultipleProducts(products) {
  const pipeline = redis.pipeline();
  
  for (const product of products) {
    pipeline.setex(`product:${product.id}`, 3600, JSON.stringify(product));
  }
  
  await pipeline.exec();
}
```

**4. Batch Operations**
```javascript
// Use MGET/MSET for batch operations
async function getMultipleProducts(productIds) {
  const keys = productIds.map(id => `product:${id}`);
  const values = await redis.mget(keys);
  
  return values.map((v, i) => v ? JSON.parse(v) : null);
}

async function setMultipleProducts(products) {
  const keyValueMap = {};
  for (const product of products) {
    keyValueMap[`product:${product.id}`] = JSON.stringify(product);
  }
  
  await redis.mset(keyValueMap);
}
```

**5. Compression for Large Values**
```javascript
const zlib = require('zlib');

async function setCompressed(key, value, ttl) {
  const serialized = JSON.stringify(value);
  const compressed = await promisify(zlib.gzip)(serialized);
  
  await redis.setex(key, ttl, compressed);
}

async function getCompressed(key) {
  const compressed = await redis.get(key);
  if (!compressed) return null;
  
  const decompressed = await promisify(zlib.gunzip)(compressed);
  return JSON.parse(decompressed.toString());
}
```

**6. Connection Pooling**
```javascript
// Configure connection pool
const redis = new Redis.Cluster(
  [
    { host: 'redis-node1', port: 6379 },
    { host: 'redis-node2', port: 6379 },
    { host: 'redis-node3', port: 6379 }
  ],
  {
    scaleReads: 'slave',
    redisOptions: {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      keepAlive: 30000,
      connectionName: 'app-server-1',
      // Connection pool size
      maxRedirections: 16,
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
      retryTimes: 3
    }
  }
);
```

**7. Monitoring and Alerting**
```javascript
class CacheMonitor {
  constructor(redis) {
    this.redis = redis;
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      latency: []
    };
  }

  recordHit() {
    this.metrics.hits++;
  }

  recordMiss() {
    this.metrics.misses++;
  }

  recordError() {
    this.metrics.errors++;
  }

  recordLatency(ms) {
    this.metrics.latency.push(ms);
    
    // Keep only last 1000 measurements
    if (this.metrics.latency.length > 1000) {
      this.metrics.latency.shift();
    }
  }

  getHitRate() {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  getAverageLatency() {
    if (this.metrics.latency.length === 0) return 0;
    
    const sum = this.metrics.latency.reduce((a, b) => a + b, 0);
    return sum / this.metrics.latency.length;
  }

  getMetrics() {
    return {
      hitRate: this.getHitRate(),
      averageLatency: this.getAverageLatency(),
      totalRequests: this.metrics.hits + this.metrics.misses,
      errors: this.metrics.errors
    };
  }
}

// Usage
const monitor = new CacheMonitor(redis);

async function getCachedData(key) {
  const start = Date.now();
  
  try {
    const data = await redis.get(key);
    
    if (data) {
      monitor.recordHit();
      return JSON.parse(data);
    } else {
      monitor.recordMiss();
      return null;
    }
  } catch (error) {
    monitor.recordError();
    throw error;
  } finally {
    const latency = Date.now() - start;
    monitor.recordLatency(latency);
  }
}
```

**8. Preventing Cache Avalanche**
```javascript
// Add random jitter to TTL to prevent simultaneous expiration
async function setWithJitter(key, value, baseTTL = 3600, jitterPercent = 0.1) {
  const jitter = Math.floor(baseTTL * jitterPercent * (Math.random() * 2 - 1));
  const ttl = baseTTL + jitter;
  
  await redis.setex(key, ttl, JSON.stringify(value));
}

// Example: Cache products with random TTL
for (const product of products) {
  await setWithJitter(`product:${product.id}`, product, 3600, 0.1);
}
```

---

---

## Advanced Production Patterns & Debugging

### Q8: How do you implement cache-aware architecture for high-scale production systems?

**Answer:**

**1. Distributed Cache Coherence (Write-Through vs Write-Behind)**

```javascript
// Write-Through: Synchronous updates to both cache and database
class WriteThroug CacheStrategy {
  async updateProduct(productId, data) {
    const client = await this.db.connect();
    
    try {
      // Update database first
      const result = await client.query(
        'UPDATE products SET data = $1 WHERE id = $2 RETURNING *',
        [data, productId]
      );
      
      // Then update cache
      await this.cache.set(`product:${productId}`, result.rows[0], 3600);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

// Write-Behind (Write-Back): Asynchronous cache update
class WriteBehindCacheStrategy {
  constructor(cache, db, flushInterval = 5000) {
    this.cache = cache;
    this.db = db;
    this.flushInterval = flushInterval;
    this.dirtyKeys = new Map();
    this.startFlushTimer();
  }

  async updateProduct(productId, data) {
    // Update cache immediately
    await this.cache.set(`product:${productId}`, data);
    
    // Mark as dirty for later database update
    this.dirtyKeys.set(`product:${productId}`, {
      id: productId,
      data,
      timestamp: Date.now()
    });
  }

  async flushToDatabase() {
    if (this.dirtyKeys.size === 0) return;

    const batch = Array.from(this.dirtyKeys.values());
    this.dirtyKeys.clear();

    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const item of batch) {
        await client.query(
          'UPDATE products SET data = $1, updated_at = NOW() WHERE id = $2',
          [item.data, item.id]
        );
      }
      
      await client.query('COMMIT');
      console.log(`Flushed ${batch.length} items to database`);
    } catch (error) {
      await client.query('ROLLBACK');
      // Re-add items back to dirty map
      batch.forEach(item => {
        this.dirtyKeys.set(`product:${item.id}`, item);
      });
      throw error;
    } finally {
      client.release();
    }
  }

  startFlushTimer() {
    setInterval(() => this.flushToDatabase().catch(console.error), this.flushInterval);
  }
}
```

**2. Advanced Cache Warming Strategies**

```javascript
class CacheWarmer {
  constructor(cache, db) {
    this.cache = cache;
    this.db = db;
  }

  // Warm cache based on access patterns
  async warmBasedOnPopularity(limit = 1000) {
    const query = `
      SELECT id, data FROM products
      WHERE last_accessed > NOW() - INTERVAL '30 days'
      ORDER BY access_count DESC
      LIMIT $1
    `;

    const products = await this.db.query(query, [limit]);
    
    const pipeline = this.cache.redis.pipeline();
    
    for (const product of products.rows) {
      pipeline.setex(
        `product:${product.id}`,
        3600,
        JSON.stringify(product.data)
      );
    }

    await pipeline.exec();
    console.log(`Warmed ${products.rows.length} popular products`);
  }

  // Idempotent warm-up with versioning
  async warmWithVersion(version) {
    const sql = `
      SELECT id, data, version FROM products
      WHERE version >= $1
      ORDER BY version DESC
    `;

    const products = await this.db.query(sql, [version]);
    const timestamp = Date.now();

    for (const product of products.rows) {
      const cacheKey = `product:${product.id}:v${product.version}`;
      await this.cache.set(cacheKey, product.data, 7200);
    }

    // Store warm-up metadata
    await this.cache.set(
      `cache:warmup:${version}`,
      { timestamp, count: products.rows.length },
      86400
    );
  }
}
```

**3. Production Debugging & Troubleshooting**

```javascript
class CacheDebugger {
  constructor(cache, db) {
    this.cache = cache;
    this.db = db;
  }

  // Detect cache/database inconsistencies
  async detectInconsistencies(sampleSize = 100) {
    const query = `
      SELECT id FROM products
      ORDER BY RANDOM()
      LIMIT $1
    `;

    const products = await this.db.query(query, [sampleSize]);
    const inconsistencies = [];

    for (const product of products.rows) {
      const cacheKey = `product:${product.id}`;
      
      const [cachedData, dbData] = await Promise.all([
        this.cache.get(cacheKey),
        this.db.query('SELECT * FROM products WHERE id = $1', [product.id])
      ]);

      if (!cachedData && dbData.rows[0]) {
        inconsistencies.push({
          id: product.id,
          issue: 'MISSING_IN_CACHE',
          dbData: dbData.rows[0]
        });
      } else if (cachedData && !dbData.rows[0]) {
        inconsistencies.push({
          id: product.id,
          issue: 'STALE_IN_CACHE',
          cachedData
        });
      } else if (cachedData && JSON.stringify(cachedData) !== JSON.stringify(dbData.rows[0])) {
        inconsistencies.push({
          id: product.id,
          issue: 'DATA_MISMATCH',
          cached: cachedData,
          database: dbData.rows[0]
        });
      }
    }

    return {
      sampledCount: sampleSize,
      inconsistencyCount: inconsistencies.length,
      inconsistencyRate: (inconsistencies.length / sampleSize * 100).toFixed(2) + '%',
      details: inconsistencies
    };
  }

  // Audit cache key usage
  async auditCacheUsage() {
    const keys = await this.cache.redis.keys('*');
    const metrics = {
      totalKeys: keys.length,
      keysByPrefix: {},
      largestKeys: [],
      expiredSoon: []
    };

    for (const key of keys) {
      const prefix = key.split(':')[0];
      metrics.keysByPrefix[prefix] = (metrics.keysByPrefix[prefix] || 0) + 1;

      const size = await this.cache.redis.strlen(key);
      const ttl = await this.cache.redis.ttl(key);

      metrics.largestKeys.push({ key, size });
      
      if (ttl > 0 && ttl < 300) {
        metrics.expiredSoon.push({ key, ttl_seconds: ttl });
      }
    }

    metrics.largestKeys = metrics.largestKeys
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    return metrics;
  }

  // Performance profiling
  async profileCacheOperation(operation, iterations = 1000) {
    const latencies = [];
    const errors = [];

    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      
      try {
        await operation();
      } catch (error) {
        errors.push(error);
      }

      const end = process.hrtime.bigint();
      const latency = Number(end - start) / 1000; // Convert to microseconds
      latencies.push(latency);
    }

    latencies.sort((a, b) => a - b);

    return {
      iterations,
      errors: errors.length,
      p50: latencies[Math.floor(latencies.length * 0.5)],
      p95: latencies[Math.floor(latencies.length * 0.95)],
      p99: latencies[Math.floor(latencies.length * 0.99)],
      max: Math.max(...latencies),
      min: Math.min(...latencies),
      avg: latencies.reduce((a, b) => a + b) / latencies.length
    };
  }
}
```

**4. Cost Optimization Strategies**

```javascript
class CostOptimizer {
  // Choose appropriate Redis instance size
  analyzeMemoryRequirements(metrics) {
    const avgKeySize = metrics.totalMemory / metrics.totalKeys;
    const growthRate = metrics.dailyGrowth;
    const projectedSize90Days = metrics.totalMemory + (growthRate * 90);

    return {
      currentUsage: metrics.totalMemory,
      avgKeySize,
      growthRate,
      projectedSize90Days,
      recommendedInstance: this.getRecommendedInstance(projectedSize90Days)
    };
  }

  getRecommendedInstance(projectedSize) {
    if (projectedSize < 256 * 1024 * 1024) return 'cache.t3.micro';
    if (projectedSize < 512 * 1024 * 1024) return 'cache.t3.small';
    if (projectedSize < 1024 * 1024 * 1024) return 'cache.t3.medium';
    if (projectedSize < 2 * 1024 * 1024 * 1024) return 'cache.t3.large';
    return 'cache.r6g.xlarge'; // General purpose
  }

  // Recommend cache eviction policies
  recommendEvictionPolicy(accessPattern, consistency) {
    if (consistency === 'critical') {
      return 'noeviction'; // Fail rather than evict
    }
    
    if (accessPattern === 'hot') {
      return 'allkeys-lfu'; // Evict least frequently used
    }
    
    if (accessPattern === 'temporal') {
      return 'volatile-lru'; // Evict LRU with TTL
    }
    
    return 'allkeys-lru'; // Default
  }
}
```

---

## Summary

**Key Takeaways:**
1. **Choose the right caching strategy** based on your use case
2. **Handle cache invalidation properly** to avoid stale data
3. **Use distributed locking** to prevent cache stampedes
4. **Implement multi-level caching** for better performance
5. **Monitor cache metrics** continuously
6. **Plan for failures** - cache should be a nice-to-have, not required
7. **Use compression** for large cached objects
8. **Implement proper key naming** conventions
9. **Use connection pooling** for better resource utilization
10. **Regular consistency checks** between cache and database
11. **Implement cache warming** strategies for production readiness
12. **Profile and optimize** based on actual usage patterns
13. **Cost optimize** based on growth projections
10. **Add randomness to TTL** to prevent cache avalanche