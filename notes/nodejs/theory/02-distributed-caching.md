# Distributed Caching in Node.js

## The Problem: In-Memory Cache Per Server

In a distributed Node.js system, when you have multiple server instances behind a load balancer, each server maintains its own **in-memory cache** (stored in that server's RAM). This creates a cache consistency problem:

### Without Distributed Cache (The Problem)

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ↓
┌──────────────────┐
│  Load Balancer   │
└────┬─────┬──────┘
     │     │
     ↓     ↓
┌──────────────────┐  ┌──────────────────┐
│   Server 1       │  │   Server 2       │
│  (In-Memory)     │  │  (In-Memory)     │
│  ┌────────────┐  │  │  ┌────────────┐  │
│  │   Cache    │  │  │  │   Cache    │  │
│  │ (RAM)      │  │  │  │ (RAM)      │  │
│  └────────────┘  │  │  └────────────┘  │
└──────────────────┘  └──────────────────┘
     │     │                 │     │
     │     └─────────────────┘     │
     ↓                            ↓
┌──────────────────────────────────────┐
│         Database                     │
└──────────────────────────────────────┘

Problem: Server 1's cache is SEPARATE from Server 2's cache
```

### How the Problem Occurs

```
User Request 1 → Load Balancer → Server 1
                              └─ Cache Miss (empty)
                              └─ Fetch from Database
                              └─ Store in Server 1's RAM ⚠️
                              └─ Return Response

User Request 2 → Load Balancer → Server 2
                              └─ Cache Miss (different RAM!) ⚠️
                              └─ Fetch from Database AGAIN ❌
                              └─ Store in Server 2's RAM
                              └─ Return Response
```

**Key Point**: Each server's in-memory cache is stored in its own RAM and is not shared with other servers.

## The Solution: Dedicated Cache Server

The solution is to use a **dedicated cache server** (Redis/Memcached) that stores all cached data in its own memory, separate from the application servers.

### With Distributed Cache (The Solution)

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ↓
┌──────────────────┐
│  Load Balancer   │
└────┬─────┬──────┘
     │     │
     ↓     ↓
┌──────────────────┐  ┌──────────────────┐
│   Server 1       │  │   Server 2       │
│  (No In-Memory   │  │  (No In-Memory   │
│   Cache)         │  │   Cache)         │
│  ┌────────────┐  │  │  ┌────────────┐  │
│  │  Client    │  │  │  │  Client    │  │
│  │  (connects│  │  │  │  (connects│  │
│  │   to Redis)│  │  │  │   to Redis)│  │
│  └────────────┘  │  │  └────────────┘  │
└─────────┬────────┘  └─────────┬────────┘
          │                    │
          └────────┬───────────┘
                   ↓
         ┌──────────────────┐
         │  Dedicated Redis  │
         │   Server          │
         │  ┌────────────┐  │
         │  │   Cache    │  │
         │  │  (Redis RAM)│ │
         │  └────────────┘  │
         └────────┬─────────┘
                  ↑
                  │
         ┌──────────────────┐
         │   Database       │
         └──────────────────┘

Solution: All servers connect to ONE dedicated Redis server
with its own memory for caching
```

### How the Solution Works

```
User Request 1 → Load Balancer → Server 1
                              └─ Check Redis (dedicated server)
                              └─ Cache Miss
                              └─ Fetch from Database
                              └─ Store in Redis's RAM ✅
                              └─ Return Response

User Request 2 → Load Balancer → Server 2
                              └─ Check Redis (same server!) ✅
                              └─ Cache HIT (data in Redis RAM) ✅
                              └─ Return Response from Cache
```

```javascript
// server.js (Instance 1)
const redis = require('redis');
const client = redis.createClient({
  url: 'redis://localhost:6379'
});

async function getResource(id) {
  // Check distributed cache first
  const cached = await client.get(`resource:${id}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Cache miss - fetch from database
  const resource = await db.findById(id);
  
  // Store in distributed cache (available to all servers)
  await client.setEx(
    `resource:${id}`,
    3600, // 1 hour TTL
    JSON.stringify(resource)
  );
  
  return resource;
}
```

```javascript
// server.js (Instance 2) - Same code, different instance
const redis = require('redis');
const client = redis.createClient({
  url: 'redis://localhost:6379' // Same Redis instance
});

async function getResource(id) {
  // Check distributed cache first
  const cached = await client.get(`resource:${id}`);
  if (cached) {
    return JSON.parse(cached); // HIT! Data cached by Server 1
  }
  
  // Cache miss - fetch from database
  const resource = await db.findById(id);
  
  // Store in distributed cache
  await client.setEx(
    `resource:${id}`,
    3600,
    JSON.stringify(resource)
  );
  
  return resource;
}
```

**How it works:**
- Both servers connect to the **same dedicated Redis instance**
- Redis has its own memory (RAM) that stores the cache
- Cache is **NOT** stored in Server 1 or Server 2's memory
- All servers access the cache from Redis's memory
- Fast access because Redis keeps data in its RAM
- Built-in TTL support

**Important Distinction:**
- ❌ **Without Redis**: Each app server stores cache in its own RAM (separate caches)
- ✅ **With Redis**: A dedicated Redis server stores cache in its RAM (shared cache)

### 2. Cache Invalidation Pattern

When data changes, invalidate the cache so servers fetch fresh data.

```javascript
// Update operation
async function updateResource(id, data) {
  // Update database
  await db.update(id, data);
  
  // Invalidate cache (or update it)
  await client.del(`resource:${id}`);
  // OR update the cache immediately:
  // await client.setEx(`resource:${id}`, 3600, JSON.stringify(data));
}

// Get operation (write-through caching)
async function getResource(id) {
  const cached = await client.get(`resource:${id}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const resource = await db.findById(id);
  await client.setEx(`resource:${id}`, 3600, JSON.stringify(resource));
  return resource;
}
```

### 3. Cache Aside Pattern (Lazy Loading)

```javascript
async function getResource(id) {
  // 1. Check cache
  const cached = await client.get(`resource:${id}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 2. Cache miss - load from database
  const resource = await db.findById(id);
  
  // 3. Store in cache
  await client.setEx(`resource:${id}`, 3600, JSON.stringify(resource));
  
  return resource;
}
```

### 4. Write Through Pattern

```javascript
async function updateResource(id, data) {
  // 1. Update database
  await db.update(id, data);
  
  // 2. Update cache immediately
  await client.setEx(`resource:${id}`, 3600, JSON.stringify(data));
  
  // Next read will hit the cache
}
```

### 5. Write Back Pattern (Write Behind)

```javascript
async function updateResource(id, data) {
  // 1. Update cache immediately (fast)
  await client.setEx(`resource:${id}`, 3600, JSON.stringify(data));
  
  // 2. Asynchronously update database
  setImmediate(async () => {
    await db.update(id, data);
  });
}
```

## Architecture Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ↓
┌──────────────────┐
│  Load Balancer   │
└────┬─────┬──────┘
     │     │
     ↓     ↓
┌─────────┐  ┌─────────┐
│ Server 1│  │ Server 2│
└────┬────┘  └────┬────┘
     │            │
     └─────┬──────┘
           ↓
    ┌──────────────┐
    │   Redis      │
    │ (Distributed │
    │    Cache)    │
    └──────────────┘
           ↑
           │
    ┌──────────────┐
    │   Database   │
    └──────────────┘
```

## Redis Implementation Example

### Setup with Express

```javascript
const express = require('express');
const { createClient } = require('redis');
const app = express();

// Redis client setup
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));

async function startServer() {
  await redisClient.connect();
  console.log('Connected to Redis');
  
  app.listen(3000, () => {
    console.log('Server running on port 3000');
  });
}

startServer();

// Middleware for caching
function cacheMiddleware(keyGenerator, ttl = 3600) {
  return async (req, res, next) => {
    const cacheKey = keyGenerator(req);
    
    try {
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        console.log('Cache HIT:', cacheKey);
        return res.json(JSON.parse(cached));
      }
      
      console.log('Cache MISS:', cacheKey);
      
      // Store original json method to intercept response
      const originalJson = res.json.bind(res);
      
      res.json = function(data) {
        // Cache the response
        redisClient.setEx(cacheKey, ttl, JSON.stringify(data))
          .catch(err => console.error('Cache set error:', err));
        
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      console.error('Cache error:', error);
      next(); // Continue on cache errors
    }
  };
}

// API route with caching
app.get('/api/users/:id', 
  cacheMiddleware(req => `user:${req.params.id}`, 3600),
  async (req, res) => {
    // Simulate database query
    const user = await db.findById(req.params.id);
    res.json(user);
  }
);

// Invalidate cache on update
app.put('/api/users/:id', async (req, res) => {
  const user = await db.update(req.params.id, req.body);
  
  // Invalidate cache
  await redisClient.del(`user:${req.params.id}`);
  
  res.json(user);
});
```

### Advanced: Cache Warming

```javascript
// Pre-populate cache
async function warmUpCache() {
  console.log('Warming up cache...');
  
  const popularItems = await db.getPopularItems();
  
  for (const item of popularItems) {
    await redisClient.setEx(
      `item:${item.id}`,
      3600,
      JSON.stringify(item)
    );
  }
  
  console.log('Cache warmed up');
}

// Run on server start
warmUpCache();
```

## Memcached Alternative

```javascript
const Memcached = require('memcached');
const memcached = new Memcached('localhost:11211');

async function getResource(id) {
  const key = `resource:${id}`;
  
  return new Promise((resolve, reject) => {
    memcached.get(key, (err, cached) => {
      if (cached) {
        return resolve(JSON.parse(cached));
      }
      
      db.findById(id).then(resource => {
        memcached.set(key, resource, 3600, (err) => {
          if (err) console.error('Cache set error:', err);
        });
        resolve(resource);
      }).catch(reject);
    });
  });
}
```

## Distributed Cache Benefits

1. **Consistency**: All servers see the same cache data
2. **Scalability**: Easy to add/remove servers without cache issues
3. **Performance**: Sub-millisecond cache access
4. **TTL Support**: Automatic expiration
5. **Persistence**: Redis can persist to disk
6. **Advanced Features**: Pub/Sub, transactions, Lua scripts

## Best Practices

### 1. Use Appropriate TTL
```javascript
// Short TTL for frequently changing data
await client.setEx(`user:${id}`, 60, JSON.stringify(user));

// Long TTL for rarely changing data
await client.setEx(`static:${key}`, 86400, JSON.stringify(data));
```

### 2. Handle Cache Failures Gracefully
```javascript
async function getResource(id) {
  try {
    const cached = await client.get(`resource:${id}`);
    if (cached) return JSON.parse(cached);
  } catch (error) {
    console.error('Cache error:', error);
    // Continue to database on cache failure
  }
  
  return await db.findById(id);
}
```

### 3. Use Cache Versioning
```javascript
async function getResource(id, version = 'v1') {
  const key = `${version}:resource:${id}`;
  const cached = await client.get(key);
  // ...
}
```

### 4. Monitor Cache Performance
```javascript
const cacheHits = new Map();
const cacheMisses = new Map();

function trackCache(key, hit) {
  const counter = hit ? cacheHits : cacheMisses;
  counter.set(key, (counter.get(key) || 0) + 1);
}

// Log metrics periodically
setInterval(() => {
  console.log('Cache Hit Rate:', 
    calculateHitRate(cacheHits, cacheMisses)
  );
}, 60000);
```

### 5. Use Connection Pooling
```javascript
// Redis Cluster for large-scale deployments
const { Cluster } = require('ioredis');

const redis = new Cluster([
  { host: 'redis-node-1', port: 6379 },
  { host: 'redis-node-2', port: 6379 },
  { host: 'redis-node-3', port: 6379 }
], {
  redisOptions: {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true
  }
});
```

## Comparison: In-Memory vs Distributed Cache

| Feature | In-Memory Cache | Distributed Cache (Redis) |
|---------|----------------|---------------------------|
| Consistency | ❌ Per-server | ✅ Shared across servers |
| Latency | ⚡ Fastest | ⚡ Fast |
| Scalability | ❌ Limited | ✅ Highly scalable |
| Persistence | ❌ Lost on restart | ✅ Optional persistence |
| Memory | Limited by server | Can be distributed |
| Setup | Simple | Requires separate service |

## Production Example

```javascript
// cache-service.js
const { createClient } = require('redis');

class CacheService {
  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });
    
    this.client.on('error', (err) => {
      console.error('Redis Error:', err);
    });
  }
  
  async connect() {
    await this.client.connect();
  }
  
  async get(key) {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  async set(key, value, ttl = 3600) {
    await this.client.setEx(key, ttl, JSON.stringify(value));
  }
  
  async del(key) {
    await this.client.del(key);
  }
  
  async invalidatePattern(pattern) {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }
  
  async disconnect() {
    await this.client.disconnect();
  }
}

module.exports = new CacheService();
```

```javascript
// user-service.js
const cache = require('./cache-service');
const db = require('./database');

class UserService {
  async getUserById(id) {
    const cacheKey = `user:${id}`;
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Cache miss - fetch from database
    const user = await db.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Cache the result
    await cache.set(cacheKey, user, 3600);
    
    return user;
  }
  
  async updateUser(id, updates) {
    const user = await db.update(id, updates);
    
    // Invalidate cache (or update it)
    await cache.del(`user:${id}`);
    
    return user;
  }
  
  async deleteUser(id) {
    await db.delete(id);
    
    // Invalidate all related caches
    await cache.invalidatePattern(`user:${id}*`);
    await cache.invalidatePattern(`user:${id}:profile*`);
  }
}

module.exports = new UserService();
```

## Summary

In distributed Node.js systems, cache consistency across servers is achieved by:

1. **Using an external distributed cache** (Redis/Memcached) that all servers connect to
2. **Implementing cache invalidation** when data changes
3. **Choosing appropriate caching patterns** (cache-aside, write-through, etc.)
4. **Handling cache failures gracefully** with fallback to database
5. **Monitoring cache performance** and optimizing hit rates

This ensures that when a user makes a request to any server, they can benefit from cached data regardless of which server originally cached it.
