# Distributed Caching - Senior Level Interview Questions

## Table of Contents
1. [Distributed Caching Overview](#distributed-caching-overview)
2. [Cache Distribution Strategies](#cache-distribution-strategies)
3. [Cache Consistency in Distributed Systems](#cache-consistency-in-distributed-systems)
4. [Cache Warming and Population](#cache-warming-and-population)
5. [Distributed Cache Challenges](#distributed-cache-challenges)
6. [Real-world Implementation](#real-world-implementation)

---

## Distributed Caching Overview

### Q1: How does caching work in distributed networks?

**Answer:**

Distributed caching involves spreading cache data across multiple nodes in a network to provide:
- **Scalability**: Horizontal scaling beyond single-node limits
- **High Availability**: No single point of failure
- **Fault Tolerance**: Data replication and redundancy
- **Performance**: Reduced latency through geographic distribution

### Distributed Cache Architecture

```
                    ┌─────────────────────────────────────┐
                    │        Load Balancer                │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────┴──────────────────────┐
                    │                                     │
           ┌────────▼─────────┐                 ┌────────▼─────────┐
           │  Application    │                 │  Application    │
           │  Server 1       │                 │  Server 2       │
           └────────┬─────────┘                 └────────┬─────────┘
                    │                                     │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │      Distributed Cache Layer         │
                    └──────────────┬──────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
┌────────▼────────┐      ┌────────▼────────┐      ┌────────▼────────┐
│  Cache Node 1   │      │  Cache Node 2   │      │  Cache Node 3   │
│  Redis Cluster  │      │  Redis Cluster  │      │  Redis Cluster  │
│  Partition 1    │      │  Partition 2    │      │  Partition 3    │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                        ┌─────────▼─────────┐
                        │   Database        │
                        │   (PostgreSQL)    │
                        └───────────────────┘
```

### Key Components:

**1. Cache Nodes**
- Independent instances serving cache data
- Can be scaled horizontally
- Handle subset of total data

**2. Data Partitioning**
- Data distributed across nodes using consistent hashing
- Each node responsible for specific key ranges

**3. Replication**
- Data replicated across multiple nodes for redundancy
- Configurable replication factor

```javascript
// Basic distributed cache setup
const { Cluster } = require('ioredis');

// Redis Cluster with 3 master nodes and 3 replicas
const redisCluster = new Cluster([
  { host: 'cache-node-1', port: 6379 },
  { host: 'cache-node-2', port: 6379 },
  { host: 'cache-node-3', port: 6379 },
  { host: 'replica-node-1', port: 6379 },
  { host: 'replica-node-2', port: 6379 },
  { host: 'replica-node-3', port: 6379 }
], {
  scaleReads: 'slave', // Read from replicas
  redisOptions: {
    password: 'your-password'
  }
});

async function getDistributedCache(key) {
  try {
    const value = await redisCluster.get(key);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    console.error('Cache error:', error);
    // Fallback to database
    return fetchFromDatabase(key);
  }
}
```

---

## Cache Distribution Strategies

### Q2: What are the different cache distribution strategies?

**Answer:**

### 1. Consistent Hashing

**Problem with Simple Hashing:**
When a node is added/removed, most keys need to be remapped.

```javascript
// Simple Modulo Hashing (Poor for distributed systems)
function simpleHash(key, nodeCount) {
  const hash = key.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  return Math.abs(hash) % nodeCount;
}

// Problem: Adding/removing nodes redistributes most keys
const nodes = ['node1', 'node2', 'node3'];
let node = nodes[simpleHash('user:123', nodes.length)];
console.log(node); // node2

// Add node4 - Now user:123 goes to different node!
nodes.push('node4');
node = nodes[simpleHash('user:123', nodes.length)];
console.log(node); // node1 - Cache miss!
```

**Consistent Hashing Solution:**
Only remap keys whose node has changed.

```javascript
class ConsistentHashing {
  constructor(virtualNodes = 150) {
    this.ring = new Map();
    this.sortedHashes = [];
    this.virtualNodes = virtualNodes;
  }
  
  // Generate hash for key (simplified - use real hash in production)
  hash(key) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  addNode(node) {
    // Add virtual nodes for better distribution
    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualNodeKey = `${node}#${i}`;
      const hash = this.hash(virtualNodeKey);
      this.ring.set(hash, node);
      this.sortedHashes.push(hash);
    }
    this.sortedHashes.sort((a, b) => a - b);
  }
  
  removeNode(node) {
    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualNodeKey = `${node}#${i}`;
      const hash = this.hash(virtualNodeKey);
      this.ring.delete(hash);
      this.sortedHashes = this.sortedHashes.filter(h => h !== hash);
    }
  }
  
  getNode(key) {
    if (this.ring.size === 0) return null;
    
    const hash = this.hash(key);
    
    // Find first node with hash >= key hash
    for (const nodeHash of this.sortedHashes) {
      if (nodeHash >= hash) {
        return this.ring.get(nodeHash);
      }
    }
    
    // Wrap around to first node
    return this.ring.get(this.sortedHashes[0]);
  }
}

// Usage
const consistentHash = new ConsistentHashing(150);
consistentHash.addNode('node1');
consistentHash.addNode('node2');
consistentHash.addNode('node3');

let node = consistentHash.getNode('user:123');
console.log('Cache node:', node); // node1

// Add new node - minimal remapping
consistentHash.addNode('node4');
node = consistentHash.getNode('user:123');
console.log('Cache node after add:', node); // Still node1 (most likely)
```

### 2. Rendezvous Hashing (Highest Random Weight)

```javascript
class RendezvousHashing {
  constructor() {
    this.nodes = new Set();
  }
  
  addNode(node) {
    this.nodes.add(node);
  }
  
  removeNode(node) {
    this.nodes.delete(node);
  }
  
  hash(key, node) {
    // Combine key and node, then hash
    const combined = `${key}:${node}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  getNode(key) {
    if (this.nodes.size === 0) return null;
    
    let maxHash = -1;
    let selectedNode = null;
    
    // Find node with highest hash for this key
    for (const node of this.nodes) {
      const hash = this.hash(key, node);
      if (hash > maxHash) {
        maxHash = hash;
        selectedNode = node;
      }
    }
    
    return selectedNode;
  }
}

// Usage
const rendezvous = new RendezvousHashing();
rendezvous.addNode('node1');
rendezvous.addNode('node2');
rendezvous.addNode('node3');

const node = rendezvous.getNode('product:456');
console.log('Selected node:', node);
```

### 3. Client-Side vs Server-Side Routing

**Client-Side Routing:**
```javascript
// Application determines which cache node to use
class ClientSideCacheRouter {
  constructor(cacheNodes) {
    this.nodes = cacheNodes;
    this.hashing = new ConsistentHashing();
    this.nodes.forEach(node => this.hashing.addNode(node));
  }
  
  async get(key) {
    const nodeName = this.hashing.getNode(key);
    const node = this.nodes.find(n => n.name === nodeName);
    return node.get(key);
  }
  
  async set(key, value) {
    const nodeName = this.hashing.getNode(key);
    const node = this.nodes.find(n => n.name === nodeName);
    return node.set(key, value);
  }
}

const router = new ClientSideCacheRouter([
  { name: 'node1', get: (k) => fetch(`http://node1/get/${k}`) },
  { name: 'node2', get: (k) => fetch(`http://node2/get/${k}`) },
  { name: 'node3', get: (k) => fetch(`http://node3/get/${k}`) }
]);
```

**Server-Side Routing (Proxy-based):**
```javascript
// Proxy server handles routing
class CacheProxy {
  constructor(backendNodes) {
    this.backends = backendNodes;
    this.hashing = new ConsistentHashing();
    this.backends.forEach(node => this.hashing.addNode(node));
  }
  
  async route(request) {
    const { operation, key, value } = request;
    const nodeName = this.hashing.getNode(key);
    const backend = this.backends.find(n => n === nodeName);
    
    if (operation === 'get') {
      return backend.get(key);
    } else if (operation === 'set') {
      return backend.set(key, value);
    }
  }
}

// Application just talks to proxy
const cache = new CacheProxy(['node1', 'node2', 'node3']);
const value = await cache.route({ operation: 'get', key: 'user:123' });
```

---

## Cache Consistency in Distributed Systems

### Q3: How is cache consistency maintained in distributed networks?

**Answer:**

Cache consistency in distributed systems is challenging due to:
- Network partitions
- Message delays
- Concurrent writes
- Node failures

### Consistency Models

**1. Strong Consistency**
```javascript
// All nodes see same data at the same time
class StrongConsistentCache {
  async set(key, value) {
    // Write to all nodes synchronously
    await Promise.all([
      node1.set(key, value),
      node2.set(key, value),
      node3.set(key, value)
    ]);
  }
  
  async get(key) {
    // Read from quorum (majority)
    const [value1, value2, value3] = await Promise.all([
      node1.get(key),
      node2.get(key),
      node3.get(key)
    ]);
    
    // Return most recent value
    const values = [value1, value2, value3].filter(v => v !== null);
    return values[values.length - 1]; // Assumes versioned data
  }
}
```

**2. Eventual Consistency**
```javascript
// Nodes may have stale data temporarily
class EventualConsistentCache {
  async set(key, value) {
    // Write to primary, replicate asynchronously
    await primary.set(key, value);
    this.replicateAsync(key, value);
  }
  
  async replicateAsync(key, value) {
    setTimeout(async () => {
      await Promise.all([
        replica1.set(key, value),
        replica2.set(key, value)
      ]);
    }, 0);
  }
  
  async get(key) {
    // May read from any node
    return await getRandomNode().get(key);
  }
}
```

**3. Read-Your-Writes Consistency**
```javascript
// Client sees its own writes
class ReadYourWritesCache {
  constructor() {
    this.clientWrites = new Map();
  }
  
  async set(key, value, clientId) {
    await this.setInDistributedCache(key, value);
    // Track client's write
    this.clientWrites.set(`${clientId}:${key}`, value);
  }
  
  async get(key, clientId) {
    // Check if client has a pending write
    const clientValue = this.clientWrites.get(`${clientId}:${key}`);
    if (clientValue) return clientValue;
    
    return await this.getDistributedCache(key);
  }
}
```

### Cache Invalidation Strategies

**1. Write-Invalidate**
```javascript
class WriteInvalidateCache {
  async update(key, value) {
    // Update database
    await database.update(key, value);
    
    // Invalidate cache entries
    await this.invalidateCache(key);
  }
  
  async invalidateCache(key) {
    // Send invalidation message to all cache nodes
    const nodes = await this.getCacheNodesFor(key);
    await Promise.all(nodes.map(node => 
      node.del(key)
    ));
  }
}
```

**2. Write-Through**
```javascript
class WriteThroughCache {
  async update(key, value) {
    // Update cache and database simultaneously
    await Promise.all([
      cache.set(key, value),
      database.update(key, value)
    ]);
  }
}
```

**3. Write-Behind with Invalidation**
```javascript
class WriteBehindCache {
  async update(key, value) {
    // Update cache immediately
    await cache.set(key, value);
    
    // Queue database update
    await this.queueDatabaseUpdate(key, value);
    
    // Invalidate other cache nodes
    await this.broadcastInvalidation(key, value);
  }
}
```

### Handling Cache Coherence with Pub/Sub

```javascript
const Redis = require('ioredis');
const redis = new Redis();
const pubsub = new Redis();

class CoherentCache {
  constructor() {
    this.localCache = new Map();
    this.setupInvalidationChannel();
  }
  
  setupInvalidationChannel() {
    // Subscribe to invalidation messages
    pubsub.subscribe('cache:invalidation');
    pubsub.on('message', (channel, message) => {
      if (channel === 'cache:invalidation') {
        const { key } = JSON.parse(message);
        this.localCache.delete(key);
        console.log(`Invalidated local cache for key: ${key}`);
      }
    });
  }
  
  async get(key) {
    // Check local cache
    if (this.localCache.has(key)) {
      return this.localCache.get(key);
    }
    
    // Check distributed cache
    const value = await redis.get(key);
    if (value) {
      this.localCache.set(key, value);
      return JSON.parse(value);
    }
    
    return null;
  }
  
  async set(key, value) {
    const serialized = JSON.stringify(value);
    
    // Update distributed cache
    await redis.set(key, serialized, 'EX', 3600);
    
    // Update local cache
    this.localCache.set(key, value);
  }
  
  async invalidate(key) {
    // Invalidate in distributed cache
    await redis.del(key);
    
    // Broadcast invalidation to all nodes
    await pubsub.publish('cache:invalidation', JSON.stringify({ key }));
  }
  
  async update(key, value) {
    // Update database
    await database.update(key, value);
    
    // Invalidate cache everywhere
    await this.invalidate(key);
  }
}
```

---

## Cache Warming and Population

### Q4: How do you handle cache warming in distributed systems?

**Answer:**

Cache warming is the process of pre-populating cache with data before it's needed.

### Cache Warming Strategies

**1. Lazy Loading (Cache-Aside)**
```javascript
// Load data on first request
class LazyLoadingCache {
  async get(key) {
    const cached = await cache.get(key);
    if (cached) return JSON.parse(cached);
    
    // Cache miss - load from database
    const data = await database.query('SELECT * FROM data WHERE key = ?', [key]);
    
    // Populate cache
    await cache.set(key, JSON.stringify(data), 'EX', 3600);
    
    return data;
  }
}
```

**2. Eager Loading (Warm-up)**
```javascript
class EagerLoadingCache {
  async warmUp(keys) {
    console.log(`Warming up ${keys.length} keys...`);
    
    for (const key of keys) {
      const data = await database.query('SELECT * FROM data WHERE key = ?', [key]);
      await cache.set(key, JSON.stringify(data), 'EX', 3600);
    }
    
    console.log('Cache warming complete');
  }
  
  async initialize() {
    // Get frequently accessed keys from analytics
    const hotKeys = await this.getHotKeys();
    await this.warmUp(hotKeys);
  }
}
```

**3. Background Refresh**
```javascript
class BackgroundRefreshCache {
  async get(key) {
    const cached = await cache.get(key);
    const ttl = await cache.ttl(key);
    
    if (cached) {
      // Refresh if TTL is below threshold
      if (ttl < 300) { // 5 minutes
        this.refreshInBackground(key);
      }
      return JSON.parse(cached);
    }
    
    // Cache miss
    const data = await database.query('SELECT * FROM data WHERE key = ?', [key]);
    await cache.set(key, JSON.stringify(data), 'EX', 3600);
    return data;
  }
  
  async refreshInBackground(key) {
    const data = await database.query('SELECT * FROM data WHERE key = ?', [key]);
    await cache.set(key, JSON.stringify(data), 'EX', 3600);
    console.log(`Refreshed cache for key: ${key}`);
  }
}
```

**4. Scheduled Refresh**
```javascript
class ScheduledRefreshCache {
  constructor() {
    this.refreshSchedule = new Map();
  }
  
  async scheduleRefresh(key, interval) {
    const refresh = async () => {
      const data = await database.query('SELECT * FROM data WHERE key = ?', [key]);
      await cache.set(key, JSON.stringify(data), 'EX', 3600);
    };
    
    // Initial refresh
    await refresh();
    
    // Schedule periodic refreshes
    const intervalId = setInterval(refresh, interval);
    this.refreshSchedule.set(key, intervalId);
  }
  
  stopRefresh(key) {
    if (this.refreshSchedule.has(key)) {
      clearInterval(this.refreshSchedule.get(key));
      this.refreshSchedule.delete(key);
    }
  }
}
```

### Distributed Cache Warming

```javascript
class DistributedCacheWarmer {
  constructor() {
    this.workerPool = [];
    this.maxWorkers = 10;
  }
  
  async warmDistributedCache(keys) {
    const chunks = this.chunkArray(keys, Math.ceil(keys.length / this.maxWorkers));
    
    const promises = chunks.map(chunk => 
      this.warmChunk(chunk)
    );
    
    await Promise.all(promises);
    console.log('Distributed cache warming complete');
  }
  
  async warmChunk(keys) {
    for (const key of keys) {
      try {
        const node = this.getCacheNode(key);
        const data = await database.query('SELECT * FROM data WHERE key = ?', [key]);
        await node.set(key, JSON.stringify(data), 'EX', 3600);
        console.log(`Warmed: ${key} on ${node.name}`);
      } catch (error) {
        console.error(`Failed to warm ${key}:`, error.message);
      }
    }
  }
  
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Usage
const warmer = new DistributedCacheWarmer();
const hotKeys = await getHotKeysFromAnalytics();
await warmer.warmDistributedCache(hotKeys);
```

---

## Distributed Cache Challenges

### Q5: What are the main challenges with distributed caching?

**Answer:**

### 1. Network Partitions

**Problem:** Network splits isolate cache nodes.

```javascript
class PartitionAwareCache {
  async get(key) {
    try {
      return await this.getNode(key).get(key);
    } catch (error) {
      if (this.isNetworkPartition(error)) {
        // Fall back to another node or database
        console.log('Network partition detected, using fallback');
        return await this.getFallback(key);
      }
      throw error;
    }
  }
  
  isNetworkPartition(error) {
    return error.code === 'ECONNREFUSED' || 
           error.code === 'ETIMEDOUT';
  }
  
  async getFallback(key) {
    // Try alternative nodes
    for (const node of this.getAlternativeNodes(key)) {
      try {
        return await node.get(key);
      } catch (e) {
        continue;
      }
    }
    
    // Final fallback to database
    return await database.query('SELECT * FROM data WHERE key = ?', [key]);
  }
}
```

### 2. Hot Key Problem

**Problem:** Single key receives disproportionate traffic.

```javascript
class HotKeyHandler {
  async get(key) {
    // Check if this is a hot key
    if (await this.isHotKey(key)) {
      return await this.handleHotKey(key);
    }
    
    // Normal cache lookup
    return await this.normalGet(key);
  }
  
  async isHotKey(key) {
    const requestCount = await redis.incr(`requests:${key}`);
    if (requestCount === 1) {
      redis.expire(`requests:${key}`, 60); // Reset every minute
    }
    
    // Threshold for hot key
    return requestCount > 1000;
  }
  
  async handleHotKey(key) {
    // Strategy 1: Replicate to multiple nodes
    const nodes = await this.getReplicaNodes(key);
    const promises = nodes.map(node => node.get(key));
    const results = await Promise.allSettled(promises);
    
    // Return first successful result
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        return result.value;
      }
    }
    
    // Strategy 2: Split into sharded keys
    const shards = await this.getShardedKey(key);
    return await this.normalGet(shards);
  }
  
  async getShardedKey(key) {
    const shardIndex = Math.floor(Math.random() * 10);
    return `${key}:shard:${shardIndex}`;
  }
}
```

### 3. Cache Stampede

**Problem:** Multiple requests miss cache and hit database simultaneously.

```javascript
class StampedeProtectedCache {
  constructor() {
    this.locks = new Map();
  }
  
  async get(key) {
    // Check cache
    const cached = await cache.get(key);
    if (cached) return JSON.parse(cached);
    
    // Acquire lock to prevent stampede
    const lockKey = `lock:${key}`;
    const lockAcquired = await this.acquireLock(lockKey);
    
    if (lockAcquired) {
      try {
        // Double-check cache (another request might have populated it)
        const recheck = await cache.get(key);
        if (recheck) return JSON.parse(recheck);
        
        // Load from database
        const data = await database.query('SELECT * FROM data WHERE key = ?', [key]);
        await cache.set(key, JSON.stringify(data), 'EX', 3600);
        return data;
      } finally {
        await this.releaseLock(lockKey);
      }
    } else {
      // Wait for other request to populate cache
      await this.waitForLockRelease(lockKey);
      return await this.get(key);
    }
  }
  
  async acquireLock(key, ttl = 10) {
    const result = await redis.set(key, '1', 'NX', 'EX', ttl);
    return result === 'OK';
  }
  
  async releaseLock(key) {
    await redis.del(key);
  }
  
  async waitForLockRelease(key, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const lockExists = await redis.exists(key);
      if (!lockExists) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

### 4. Memory Management

```javascript
class MemoryAwareCache {
  async set(key, value, ttl) {
    const size = this.calculateSize(key, value);
    
    // Check available memory
    const memoryInfo = await this.getMemoryInfo();
    if (memoryInfo.available < size) {
      await this.evictForSpace(size);
    }
    
    await cache.set(key, JSON.stringify(value), 'EX', ttl);
    await this.trackMemory(key, size);
  }
  
  async evictForSpace(requiredBytes) {
    const evicted = 0;
    const threshold = 0.8; // Evict until 80% memory usage
    
    while (evicted < requiredBytes) {
      const memoryInfo = await this.getMemoryInfo();
      const usageRatio = memoryInfo.used / memoryInfo.total;
      
      if (usageRatio < threshold) break;
      
      // Evict least recently used keys
      const keys = await this.getLRUKeys(100);
      for (const key of keys) {
        const size = await this.getKeySize(key);
        await cache.del(key);
        evicted += size;
      }
    }
  }
  
  calculateSize(key, value) {
    const keySize = Buffer.byteLength(key);
    const valueSize = Buffer.byteLength(JSON.stringify(value));
    return keySize + valueSize + 100; // Overhead
  }
}
```

---

## Real-world Implementation

### Q6: Provide a complete example of distributed caching implementation?

**Answer:**

```javascript
const Redis = require('ioredis');
const crypto = require('crypto');

/**
 * Production-ready Distributed Cache Implementation
 */
class ProductionDistributedCache {
  constructor(options = {}) {
    this.options = {
      nodes: options.nodes || [
        { host: 'redis-1', port: 6379 },
        { host: 'redis-2', port: 6379 },
        { host: 'redis-3', port: 6379 }
      ],
      virtualNodes: options.virtualNodes || 150,
      defaultTTL: options.defaultTTL || 3600,
      replicationFactor: options.replicationFactor || 2,
      ...options
    };
    
    this.redisCluster = this.initializeCluster();
    this.metrics = this.initializeMetrics();
    this.consistentHash = new ConsistentHashing(this.options.virtualNodes);
    this.initializeNodes();
  }
  
  initializeCluster() {
    return new Redis.Cluster(this.options.nodes, {
      scaleReads: 'slave',
      redisOptions: {
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: 3
    });
  }
  
  initializeMetrics() {
    return {
      hits: 0,
      misses: 0,
      errors: 0,
      latencies: []
    };
  }
  
  initializeNodes() {
    this.options.nodes.forEach(node => {
      this.consistentHash.addNode(`${node.host}:${node.port}`);
    });
  }
  
  async get(key) {
    const startTime = Date.now();
    
    try {
      const value = await this.redisCluster.get(key);
      const latency = Date.now() - startTime;
      
      this.recordLatency(latency);
      
      if (value !== null) {
        this.metrics.hits++;
        return JSON.parse(value);
      }
      
      this.metrics.misses++;
      return null;
    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache get error for key ${key}:`, error.message);
      
      // Fallback to database on cache failure
      return await this.getFromDatabase(key);
    }
  }
  
  async set(key, value, ttl = null) {
    const startTime = Date.now();
    const finalTTL = ttl || this.options.defaultTTL;
    
    try {
      const serialized = JSON.stringify(value);
      await this.redisCluster.set(key, serialized, 'EX', finalTTL);
      
      const latency = Date.now() - startTime;
      this.recordLatency(latency);
      
      return true;
    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache set error for key ${key}:`, error.message);
      
      // Write-through to database if cache fails
      await this.setToDatabase(key, value);
      return false;
    }
  }
  
  async del(key) {
    try {
      await this.redisCluster.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error.message);
      return false;
    }
  }
  
  async getOrSet(key, fetcher, ttl = null) {
    // Try cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Cache miss - acquire lock to prevent stampede
    const lockKey = `lock:${key}`;
    const lockAcquired = await this.acquireLock(lockKey);
    
    if (lockAcquired) {
      try {
        // Double-check cache
        const recheck = await this.get(key);
        if (recheck !== null) return recheck;
        
        // Fetch data
        const value = await fetcher();
        
        // Set in cache
        await this.set(key, value, ttl);
        
        return value;
      } finally {
        await this.releaseLock(lockKey);
      }
    } else {
      // Wait for other request
      await this.waitForLockRelease(lockKey);
      return await this.get(key);
    }
  }
  
  async invalidate(key) {
    await this.del(key);
    
    // Broadcast invalidation if pub/sub is configured
    if (this.options.pubsub) {
      await this.options.pubsub.publish('cache:invalidation', JSON.stringify({ key }));
    }
  }
  
  async warmUp(keys, batchSize = 100) {
    console.log(`Warming up ${keys.length} keys...`);
    
    const batches = this.chunkArray(keys, batchSize);
    
    for (const batch of batches) {
      await Promise.all(batch.map(async (key) => {
        try {
          const data = await this.options.fetcher(key);
          await this.set(key, data);
        } catch (error) {
          console.error(`Failed to warm key ${key}:`, error.message);
        }
      }));
      
      console.log(`Warmed batch of ${batch.length} keys`);
    }
    
    console.log('Cache warming complete');
  }
  
  async acquireLock(key, ttl = 10) {
    const result = await this.redisCluster.set(key, '1', 'NX', 'EX', ttl);
    return result === 'OK';
  }
  
  async releaseLock(key) {
    await this.redisCluster.del(key);
  }
  
  async waitForLockRelease(key, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const exists = await this.redisCluster.exists(key);
      if (!exists) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  async getFromDatabase(key) {
    // Implement database fallback
    if (this.options.databaseFetcher) {
      return await this.options.databaseFetcher(key);
    }
    throw new Error('No database fetcher configured');
  }
  
  async setToDatabase(key, value) {
    // Implement database write-through
    if (this.options.databaseWriter) {
      await this.options.databaseWriter(key, value);
    }
  }
  
  recordLatency(ms) {
    this.metrics.latencies.push(ms);
    if (this.metrics.latencies.length > 1000) {
      this.metrics.latencies.shift();
    }
  }
  
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const sortedLatencies = [...this.metrics.latencies].sort((a, b) => a - b);
    
    return {
      hitRatio: total > 0 ? (this.metrics.hits / total * 100).toFixed(2) : 0,
      totalRequests: total,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      errors: this.metrics.errors,
      avgLatency: this.averageLatency(),
      p50Latency: this.percentile(sortedLatencies, 50),
      p95Latency: this.percentile(sortedLatencies, 95),
      p99Latency: this.percentile(sortedLatencies, 99)
    };
  }
  
  averageLatency() {
    if (this.metrics.latencies.length === 0) return 0;
    const sum = this.metrics.latencies.reduce((a, b) => a + b, 0);
    return (sum / this.metrics.latencies.length).toFixed(2);
  }
  
  percentile(sortedArray, p) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[index];
  }
  
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  async close() {
    await this.redisCluster.quit();
  }
}

/**
 * Consistent Hashing Implementation
 */
class ConsistentHashing {
  constructor(virtualNodes = 150) {
    this.ring = new Map();
    this.sortedHashes = [];
    this.virtualNodes = virtualNodes;
  }
  
  hash(key) {
    return crypto.createHash('md5').update(key).digest('hex');
  }
  
  addNode(node) {
    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualNodeKey = `${node}#${i}`;
      const hash = this.hash(virtualNodeKey);
      this.ring.set(hash, node);
      this.sortedHashes.push(hash);
    }
    this.sortedHashes.sort();
  }
  
  removeNode(node) {
    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualNodeKey = `${node}#${i}`;
      const hash = this.hash(virtualNodeKey);
      this.ring.delete(hash);
      this.sortedHashes = this.sortedHashes.filter(h => h !== hash);
    }
  }
  
  getNode(key) {
    if (this.ring.size === 0) return null;
    
    const hash = this.hash(key);
    
    // Find first node with hash >= key hash
    for (const nodeHash of this.sortedHashes) {
      if (nodeHash >= hash) {
        return this.ring.get(nodeHash);
      }
    }
    
    // Wrap around
    return this.ring.get(this.sortedHashes[0]);
  }
}

/**
 * Usage Example
 */
async function exampleUsage() {
  const cache = new ProductionDistributedCache({
    nodes: [
      { host: 'redis-1.prod.example.com', port: 6379 },
      { host: 'redis-2.prod.example.com', port: 6379 },
      { host: 'redis-3.prod.example.com', port: 6379 }
    ],
    defaultTTL: 3600,
    replicationFactor: 2,
    databaseFetcher: async (key) => {
      // Implement database fetch
      console.log(`Fetching ${key} from database`);
      return { key, data: 'from-database' };
    }
  });
  
  // Warm up cache
  const hotKeys = ['user:1', 'user:2', 'product:100'];
  await cache.warmUp(hotKeys);
  
  // Get or set with automatic fetching
  const user = await cache.getOrSet('user:1', async () => {
    return { id: 1, name: 'John Doe', email: 'john@example.com' };
  });
  
  console.log('User:', user);
  
  // Get metrics
  console.log('Cache Metrics:', cache.getMetrics());
  
  // Close connection
  await cache.close();
}

// Export
module.exports = ProductionDistributedCache;
```

---

## Summary

### Key Takeaways for Senior Developers:

1. **Consistent Hashing**: Essential for distributed cache - minimizes data movement during scaling
2. **Cache Coherence**: Use pub/sub for invalidation across nodes
3. **Avoid Stampede**: Implement locking mechanisms for cache misses
4. **Handle Hot Keys**: Detect and redistribute hot key traffic
5. **Warm Up Strategically**: Pre-populate cache with frequently accessed data
6. **Monitor Metrics**: Track hit ratio, latency, and error rates continuously

### Distributed Cache Comparison Matrix

| Strategy | Pros | Cons | Use Case |
|----------|------|------|----------|
| Consistent Hashing | Minimal remapping, scalable | Complex to implement | Most distributed caches |
| Rendezvous Hashing | Simple, no remapping | O(n) lookup | Small clusters (<10 nodes) |
| Write-Through | Strong consistency | Slower writes | Critical data consistency |
| Write-Behind | Fast writes | Risk of data loss | High write throughput |
| Cache-Aside | Simple, flexible | Application complexity | General purpose |

Distributed caching is essential for high-scale applications but introduces complexity. Understanding these patterns and trade-offs is crucial for senior developers building resilient, performant systems.