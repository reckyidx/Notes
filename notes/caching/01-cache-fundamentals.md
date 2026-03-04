# Cache Fundamentals - Senior Level Interview Questions

## Table of Contents
1. [What is Cache?](#what-is-cache)
2. [Cache Layers and Hierarchy](#cache-layers-and-hierarchy)
3. [Cache Types](#cache-types)
4. [Cache Properties](#cache-properties)
5. [Cache Performance Metrics](#cache-performance-metrics)

---

## What is Cache?

### Q1: What is cache and why is it important in modern applications?

**Answer:**

Cache is a high-speed data storage layer that stores a subset of data, typically transient in nature, so that future requests for that data can be served faster. The primary purpose of caching is to improve application performance by reducing the time to access data from slower storage systems.

**Key Characteristics:**
- **Faster access**: Cache provides faster data access compared to primary storage (database, disk, network)
- **Temporary storage**: Cache data is typically volatile and can be evicted
- **Subset of data**: Cache stores only frequently accessed or computationally expensive data
- **Trade-off**: Balances speed vs. consistency and storage capacity

**Why Cache is Important:**

1. **Performance Improvement**
   ```
   Database Query: 100ms average
   Cache Hit: 1ms average
   Performance Gain: 100x faster
   ```

2. **Reduced Database Load**
   - Offloads read traffic from databases
   - Prevents database from becoming bottleneck
   - Extends database life and reduces costs

3. **Cost Efficiency**
   - In-memory caching (Redis, Memcached) is cheaper than scaling databases
   - Reduces need for expensive database read replicas

4. **Improved User Experience**
   - Faster response times
   - Lower latency
   - Better scalability under high traffic

**Real-world Example:**
```javascript
// Without Cache
async function getUserProfile(userId) {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  const posts = await db.query('SELECT * FROM posts WHERE user_id = ?', [userId]);
  return { user, posts }; // Takes 200ms (2 database queries)
}

// With Cache
async function getUserProfile(userId) {
  const cached = await cache.get(`profile:${userId}`);
  if (cached) return JSON.parse(cached); // Takes 1ms
  
  const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  const posts = await db.query('SELECT * FROM posts WHERE user_id = ?', [userId]);
  const result = { user, posts };
  await cache.set(`profile:${userId}`, JSON.stringify(result), 'EX', 3600); // 1 hour
  return result; // First time 200ms, subsequent 1ms
}
```

---

## Cache Layers and Hierarchy

### Q2: How many cache layers are there and explain the cache hierarchy?

**Answer:**

Cache is organized in multiple layers, forming a hierarchy from fastest/smallest to slowest/largest. Each layer serves as a fallback for the next.

### Modern Cache Hierarchy (7 Layers)

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: CPU Registers (Fastest)                            │
│ - Size: < 1 KB per core                                      │
│ - Speed: < 1 cycle                                           │
│ - Purpose: Immediate data access by CPU                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: CPU L1 Cache                                        │
│ - Size: 32-64 KB per core                                    │
│ - Speed: 1-4 cycles                                          │
│ - Purpose: Most frequently accessed instructions/data       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: CPU L2 Cache                                        │
│ - Size: 256-512 KB per core                                  │
│ - Speed: 5-12 cycles                                         │
│ - Purpose: Second level cache, larger than L1                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: CPU L3 Cache (Last Level Cache)                    │
│ - Size: 2-32 MB (shared across cores)                        │
│ - Speed: 20-60 cycles                                        │
│ - Purpose: Shared cache for all cores                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: Application Cache (In-Memory)                       │
│ - Size: GBs to TBs                                           │
│ - Speed: 100-1000 µs                                         │
│ - Tools: Redis, Memcached, Hazelcast                         │
│ - Purpose: Distributed application-level caching              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 6: Database Query Cache                                │
│ - Size: Depends on DB configuration                          │
│ - Speed: 1-10 ms                                             │
│ - Tools: MySQL Query Cache, PostgreSQL pgpool               │
│ - Purpose: Query result caching at database level            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 7: Database/Disk Storage (Slowest)                     │
│ - Size: TBs to PBs                                           │
│ - Speed: 10-100 ms                                            │
│ - Purpose: Persistent storage                                │
└─────────────────────────────────────────────────────────────┘
```

### Senior-Level Understanding of Each Layer

**Layer 1-4: CPU Cache Hierarchy**

**Why CPU Caches Matter for Senior Developers:**
- Understanding cache locality affects algorithm design
- CPU cache misses can cause 100x performance degradation
- Data structure layout impacts cache performance

```java
// Cache-friendly vs Cache-unfriendly arrays
public class CacheExample {
    
    // Cache-friendly: Sequential access
    public int sumSequential(int[][] matrix) {
        int sum = 0;
        for (int i = 0; i < matrix.length; i++) {
            for (int j = 0; j < matrix[i].length; j++) {
                sum += matrix[i][j]; // Good locality
            }
        }
        return sum;
    }
    
    // Cache-unfriendly: Strided access
    public int sumStrided(int[][] matrix) {
        int sum = 0;
        for (int j = 0; j < matrix[0].length; j++) {
            for (int i = 0; i < matrix.length; i++) {
                sum += matrix[i][j]; // Poor locality, cache misses
            }
        }
        return sum;
    }
}
```

**Layer 5: Application Cache (Primary Focus for Backend Developers)**

This is where most senior developers spend their time:

```javascript
// Multi-level application cache
class MultiLevelCache {
    constructor() {
        this.l1 = new Map(); // Local memory cache (fastest)
        this.redis = createRedisClient(); // L2: Distributed cache
    }
    
    async get(key) {
        // Check L1 first
        if (this.l1.has(key)) {
            return this.l1.get(key);
        }
        
        // Check L2 (Redis)
        const value = await this.redis.get(key);
        if (value) {
            this.l1.set(key, value); // Promote to L1
            return value;
        }
        
        return null; // Cache miss
    }
    
    async set(key, value, ttl) {
        this.l1.set(key, value);
        await this.redis.set(key, value, 'EX', ttl);
    }
}
```

**Layer 6: Database Query Cache**

```sql
-- MySQL Query Cache Example
SET GLOBAL query_cache_size = 268435456; -- 256MB
SET GLOBAL query_cache_type = ON;

-- Query results are cached if identical query is issued again
SELECT * FROM products WHERE category = 'electronics';
-- Second call: returns from cache (faster)
```

### Q3: Explain cache hit ratio and its importance?

**Answer:**

**Cache Hit Ratio** = (Cache Hits / Total Requests) × 100

```javascript
const cacheStats = {
    hits: 950,
    misses: 50,
    total: 1000
};

const hitRatio = (cacheStats.hits / cacheStats.total) * 100;
console.log(`Cache Hit Ratio: ${hitRatio}%`); // 95%
```

**Hit Ratio Analysis:**

| Hit Ratio | Assessment | Action Required |
|-----------|------------|-----------------|
| 90-100% | Excellent | Monitor for over-caching |
| 80-90% | Very Good | Optimize hot data |
| 70-80% | Good | Review cache strategy |
| 50-70% | Fair | Investigate misses |
| <50% | Poor | Reconsider caching approach |

**Impact of Hit Ratio on Response Time:**

```javascript
// Formula: Average Response Time = (Hit Ratio × Cache Time) + (Miss Ratio × DB Time)

function calculateAverageResponseTime(hitRatio, cacheTime, dbTime) {
    const hitRate = hitRatio / 100;
    const missRate = 1 - hitRate;
    return (hitRate * cacheTime) + (missRate * dbTime);
}

// Example
const avgResponse95 = calculateAverageResponseTime(95, 1, 100); // 5.95ms
const avgResponse80 = calculateAverageResponseTime(80, 1, 100); // 20.2ms
const avgResponse50 = calculateAverageResponseTime(50, 1, 100); // 50.5ms

console.log(`95% hit ratio: ${avgResponse95}ms`);
console.log(`80% hit ratio: ${avgResponse80}ms`);
console.log(`50% hit ratio: ${avgResponse50}ms`);
```

---

## Cache Types

### Q4: What are the different types of cache?

**Answer:**

### 1. Based on Storage Location

**a) Client-Side Cache**
- Browser Cache (HTTP cache headers)
- CDN Cache (Content Delivery Network)
- Service Worker Cache

```javascript
// Browser Cache Headers
app.get('/api/products', (req, res) => {
    const products = await getProducts();
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.set('ETag', generateETag(products));
    res.json(products);
});
```

**b) Server-Side Cache**
- In-Memory Cache (Local to application)
- Distributed Cache (Redis, Memcached)
- Database Cache

```javascript
// Local In-Memory Cache
const localCache = new Map();

function getProductFromCache(productId) {
    if (localCache.has(productId)) {
        return localCache.get(productId);
    }
    const product = fetchFromDatabase(productId);
    localCache.set(productId, product);
    return product;
}

// Distributed Cache (Redis)
async function getProductFromRedis(productId) {
    const cached = await redis.get(`product:${productId}`);
    if (cached) return JSON.parse(cached);
    
    const product = await fetchFromDatabase(productId);
    await redis.set(`product:${productId}`, JSON.stringify(product), 'EX', 3600);
    return product;
}
```

### 2. Based on Caching Strategy

**a) Read-Through Cache**

```javascript
// Application never talks to database directly
class ReadThroughCache {
    async get(key) {
        let value = await cache.get(key);
        if (value === null) {
            value = await this.loadFromDatabase(key);
            await cache.set(key, value, 'EX', 3600);
        }
        return value;
    }
    
    async loadFromDatabase(key) {
        return db.query('SELECT * FROM data WHERE key = ?', [key]);
    }
}
```

**b) Write-Through Cache**

```javascript
// Write to cache and database synchronously
class WriteThroughCache {
    async set(key, value) {
        await Promise.all([
            cache.set(key, value, 'EX', 3600),
            db.query('INSERT INTO data VALUES (?, ?)', [key, value])
        ]);
    }
}
```

**c) Write-Behind (Write-Back) Cache**

```javascript
// Write to cache immediately, database asynchronously
class WriteBehindCache {
    constructor() {
        this.writeQueue = [];
    }
    
    async set(key, value) {
        await cache.set(key, value, 'EX', 3600);
        this.writeQueue.push({ key, value });
        this.processQueue(); // Async write to database
    }
    
    async processQueue() {
        while (this.writeQueue.length > 0) {
            const { key, value } = this.writeQueue.shift();
            await db.query('INSERT INTO data VALUES (?, ?)', [key, value]);
        }
    }
}
```

**d) Refresh-Ahead Cache**

```javascript
// Proactively refresh cache before expiry
class RefreshAheadCache {
    async get(key) {
        let value = await cache.get(key);
        const ttl = await cache.ttl(key);
        
        // Refresh if TTL is below threshold
        if (value !== null && ttl < 60) {
            this.refreshInBackground(key);
        }
        
        return value;
    }
    
    async refreshInBackground(key) {
        const newValue = await loadFromDatabase(key);
        await cache.set(key, newValue, 'EX', 3600);
    }
}
```

---

## Cache Properties

### Q5: What are the key properties to consider when designing a cache?

**Answer:**

### 1. Eviction Policies

**a) LRU (Least Recently Used)**
```javascript
class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map();
    }
    
    get(key) {
        if (!this.cache.has(key)) return null;
        
        // Move to end (most recently used)
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }
    
    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.capacity) {
            // Remove least recently used (first entry)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
}
```

**b) LFU (Least Frequently Used)**
```javascript
class LFUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map();
        this.frequency = new Map();
    }
    
    get(key) {
        if (!this.cache.has(key)) return null;
        
        // Increment frequency
        this.frequency.set(key, (this.frequency.get(key) || 0) + 1);
        return this.cache.get(key);
    }
    
    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.set(key, value);
        } else if (this.cache.size >= this.capacity) {
            // Find least frequently used
            let minFreq = Infinity;
            let lfuKey = null;
            for (const [k, freq] of this.frequency) {
                if (freq < minFreq) {
                    minFreq = freq;
                    lfuKey = k;
                }
            }
            this.cache.delete(lfuKey);
            this.frequency.delete(lfuKey);
        }
        this.cache.set(key, value);
        this.frequency.set(key, 1);
    }
}
```

**c) FIFO (First In, First Out)**
```javascript
class FIFOCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = [];
    }
    
    get(key) {
        const item = this.cache.find(item => item.key === key);
        return item ? item.value : null;
    }
    
    set(key, value) {
        const existingIndex = this.cache.findIndex(item => item.key === key);
        
        if (existingIndex >= 0) {
            this.cache[existingIndex] = { key, value };
        } else {
            if (this.cache.length >= this.capacity) {
                this.cache.shift(); // Remove first item
            }
            this.cache.push({ key, value });
        }
    }
}
```

**d) Random Eviction**
```javascript
class RandomCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map();
    }
    
    set(key, value) {
        if (this.cache.size >= this.capacity && !this.cache.has(key)) {
            const keys = Array.from(this.cache.keys());
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            this.cache.delete(randomKey);
        }
        this.cache.set(key, value);
    }
}
```

### 2. Expiration Policies

```javascript
// TTL (Time To Live) - Absolute expiration
await redis.set('key', 'value', 'EX', 3600); // Expires in 1 hour

// Sliding Expiration - Extends TTL on access
class SlidingExpirationCache {
    async get(key) {
        const value = await redis.get(key);
        if (value) {
            // Reset TTL
            await redis.expire(key, 3600);
        }
        return value;
    }
}

// Idle Timeout - Expires if not accessed
async function setWithIdleTimeout(key, value, idleTimeout) {
    await redis.set(key, value);
    await redis.expire(key, idleTimeout);
}
```

### 3. Cache Granularity

**Coarse-Grained Caching:**
```javascript
// Cache entire user profile (easier but less flexible)
cache.set('user:123', userProfile, 'EX', 3600);
```

**Fine-Grained Caching:**
```javascript
// Cache individual attributes (more flexible, better hit ratio)
cache.set('user:123:profile', user.profile, 'EX', 3600);
cache.set('user:123:settings', user.settings, 'EX', 3600);
cache.set('user:123:notifications', user.notifications, 'EX', 3600);
```

---

## Cache Performance Metrics

### Q6: What metrics should you monitor for cache performance?

**Answer:**

```javascript
class CacheMetrics {
    constructor() {
        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
        this.latencies = [];
        this.errors = 0;
    }
    
    recordHit() {
        this.hits++;
    }
    
    recordMiss() {
        this.misses++;
    }
    
    recordEviction() {
        this.evictions++;
    }
    
    recordLatency(ms) {
        this.latencies.push(ms);
        if (this.latencies.length > 1000) {
            this.latencies.shift();
        }
    }
    
    getMetrics() {
        const total = this.hits + this.misses;
        return {
            hitRatio: total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0%',
            hitCount: this.hits,
            missCount: this.misses,
            totalRequests: total,
            evictions: this.evictions,
            avgLatency: this.averageLatency(),
            p50Latency: this.percentile(50),
            p95Latency: this.percentile(95),
            p99Latency: this.percentile(99),
            errorRate: this.errors / total * 100
        };
    }
    
    averageLatency() {
        if (this.latencies.length === 0) return 0;
        const sum = this.latencies.reduce((a, b) => a + b, 0);
        return (sum / this.latencies.length).toFixed(2) + 'ms';
    }
    
    percentile(p) {
        if (this.latencies.length === 0) return 0;
        const sorted = [...this.latencies].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[index] + 'ms';
    }
}

// Usage
const metrics = new CacheMetrics();

// Monitor cache operations
async function getCachedData(key) {
    const start = Date.now();
    const value = await cache.get(key);
    const latency = Date.now() - start;
    
    metrics.recordLatency(latency);
    
    if (value !== null) {
        metrics.recordHit();
        return value;
    }
    
    metrics.recordMiss();
    return null;
}

// Get metrics report
console.log(metrics.getMetrics());
```

**Key Metrics Dashboard:**

```
Cache Performance Dashboard
==========================

Hit Ratio:           94.5% (Target: >90%)
Total Requests:      1,000,000
Hits:                945,000
Misses:              55,000

Latency:
  Average:           2.3ms (Target: <5ms)
  P50:               1.8ms
  P95:               4.2ms
  P99:               8.5ms

Evictions:          1,234
Error Rate:         0.01%

Memory Usage:       2.3GB / 4GB (57.5%)
Cache Size:         500,000 items
```

---

## Summary

### Key Takeaways for Senior Developers:

1. **Cache is a trade-off**: Performance vs. consistency vs. cost
2. **Multi-layer caching**: CPU cache → Application cache → Database cache
3. **Hit ratio matters**: Target >90% for most applications
4. **Choose right eviction policy**: LRU for temporal locality, LFU for frequency
5. **Monitor continuously**: Track hit ratio, latency, evictions, memory usage

### Real-World Example: E-commerce Product Cache

```javascript
class ProductCache {
    constructor() {
        this.redis = createRedisClient();
        this.localCache = new LRUCache(1000);
        this.metrics = new CacheMetrics();
    }
    
    async getProduct(productId) {
        const start = Date.now();
        
        // L1: Local cache
        let product = this.localCache.get(productId);
        if (product) {
            this.metrics.recordHit();
            this.metrics.recordLatency(Date.now() - start);
            return product;
        }
        
        // L2: Redis cache
        const cached = await this.redis.get(`product:${productId}`);
        if (cached) {
            product = JSON.parse(cached);
            this.localCache.set(productId, product); // Promote to L1
            this.metrics.recordHit();
            this.metrics.recordLatency(Date.now() - start);
            return product;
        }
        
        // L3: Database
        product = await this.fetchFromDatabase(productId);
        await this.redis.set(`product:${productId}`, JSON.stringify(product), 'EX', 3600);
        this.localCache.set(productId, product);
        this.metrics.recordMiss();
        this.metrics.recordLatency(Date.now() - start);
        return product;
    }
    
    getMetrics() {
        return this.metrics.getMetrics();
    }
}
```

This comprehensive understanding of cache fundamentals forms the foundation for distributed caching, which we'll cover in the next section.