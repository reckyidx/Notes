# Cache State Management - Senior Level Interview Questions

## Table of Contents
1. [Cache State Maintenance](#cache-state-maintenance)
2. [Cache Invalidation Strategies](#cache-invalidation-strategies)
3. [Cache Eviction Policies](#cache-eviction-policies)
4. [Cache Consistency Models](#cache-consistency-models)
5. [Cache Synchronization](#cache-synchronization)
6. [Real-world Implementation](#real-world-implementation)

---

## Cache State Maintenance

### Q1: How is cache state maintained in distributed systems?

**Answer:**

Cache state maintenance involves tracking what data is cached, where it's stored, when it expires, and ensuring consistency across distributed nodes.

### Key Aspects of Cache State

**1. Metadata Tracking**
```javascript
class CacheStateManager {
  constructor() {
    this.cacheMetadata = new Map(); // Tracks cache state
  }
  
  async set(key, value, ttl) {
    const timestamp = Date.now();
    const expiryTime = timestamp + (ttl * 1000);
    
    // Store value
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
    
    // Track metadata
    this.cacheMetadata.set(key, {
      createdAt: timestamp,
      expiresAt: expiryTime,
      ttl: ttl,
      accessCount: 0,
      lastAccessed: timestamp,
      size: this.calculateSize(key, value)
    });
  }
  
  async get(key) {
    const metadata = this.cacheMetadata.get(key);
    
    if (!metadata) {
      return null; // Key not in cache
    }
    
    // Check if expired
    if (Date.now() > metadata.expiresAt) {
      this.cacheMetadata.delete(key);
      return null;
    }
    
    // Update access metadata
    metadata.accessCount++;
    metadata.lastAccessed = Date.now();
    
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async del(key) {
    await redis.del(key);
    this.cacheMetadata.delete(key);
  }
  
  calculateSize(key, value) {
    return Buffer.byteLength(key) + Buffer.byteLength(JSON.stringify(value));
  }
}
```

**2. Version Tracking**
```javascript
class VersionedCache {
  constructor() {
    this.versions = new Map(); // Track versions of cached data
  }
  
  async set(key, value, ttl) {
    const version = this.generateVersion();
    const timestamp = Date.now();
    
    // Store with version
    await redis.hset(`versions:${key}`, version, JSON.stringify({
      value,
      timestamp,
      ttl
    }));
    
    // Set current version
    await redis.set(`current:${key}`, version);
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
    
    // Track version metadata
    this.versions.set(key, {
      currentVersion: version,
      versionHistory: [version]
    });
  }
  
  async get(key) {
    const currentVersion = await redis.get(`current:${key}`);
    
    if (!currentVersion) {
      return null;
    }
    
    // Get value
    const value = await redis.get(key);
    
    if (value) {
      return {
        data: JSON.parse(value),
        version: currentVersion
      };
    }
    
    return null;
  }
  
  async compareAndSet(key, expectedVersion, newValue, ttl) {
    const currentVersion = await redis.get(`current:${key}`);
    
    if (currentVersion !== expectedVersion) {
      throw new Error('Version conflict: Data has been modified');
    }
    
    const newVersion = this.generateVersion();
    
    // Set new version
    await redis.hset(`versions:${key}`, newVersion, JSON.stringify({
      value: newValue,
      timestamp: Date.now(),
      ttl
    }));
    
    await redis.set(`current:${key}`, newVersion);
    await redis.set(key, JSON.stringify(newValue), 'EX', ttl);
    
    return newVersion;
  }
  
  generateVersion() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

**3. Replication State**
```javascript
class ReplicatedCacheState {
  constructor(nodes) {
    this.nodes = nodes;
    this.replicationState = new Map();
  }
  
  async set(key, value, ttl, replicationFactor = 2) {
    const primaryNode = this.getPrimaryNode(key);
    const replicaNodes = this.getReplicaNodes(key, replicationFactor);
    
    // Write to primary
    await primaryNode.set(key, JSON.stringify(value), 'EX', ttl);
    
    // Track replication state
    this.replicationState.set(key, {
      primary: primaryNode.id,
      replicas: replicaNodes.map(n => n.id),
      replicationFactor,
      timestamp: Date.now(),
      status: 'replicating'
    });
    
    // Replicate to replicas asynchronously
    this.replicateToNodes(key, value, ttl, replicaNodes);
  }
  
  async replicateToNodes(key, value, ttl, nodes) {
    const replicationPromises = nodes.map(async (node) => {
      try {
        await node.set(key, JSON.stringify(value), 'EX', ttl);
        this.updateReplicationStatus(key, node.id, 'success');
      } catch (error) {
        this.updateReplicationStatus(key, node.id, 'failed');
        console.error(`Replication failed for ${key} on node ${node.id}:`, error);
      }
    });
    
    await Promise.allSettled(replicationPromises);
  }
  
  updateReplicationStatus(key, nodeId, status) {
    const state = this.replicationState.get(key);
    if (state) {
      const replicaStatus = state.replicaStatus || {};
      replicaStatus[nodeId] = status;
      state.replicaStatus = replicaStatus;
      
      // Check if all replications complete
      const completed = Object.values(replicaStatus).every(s => s !== 'pending');
      if (completed) {
        state.status = 'completed';
      }
    }
  }
  
  getPrimaryNode(key) {
    const nodeIndex = this.hash(key) % this.nodes.length;
    return this.nodes[nodeIndex];
  }
  
  getReplicaNodes(key, count) {
    const replicas = [];
    const primaryIndex = this.hash(key) % this.nodes.length;
    
    for (let i = 1; i <= count && i < this.nodes.length; i++) {
      const replicaIndex = (primaryIndex + i) % this.nodes.length;
      replicas.push(this.nodes[replicaIndex]);
    }
    
    return replicas;
  }
  
  hash(key) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
```

---

## Cache Invalidation Strategies

### Q2: What are the different cache invalidation strategies and when to use each?

**Answer:**

Cache invalidation ensures cached data remains consistent with the source of truth.

### Invalidation Strategies Comparison

| Strategy | Consistency | Performance | Complexity | Use Case |
|----------|-------------|-------------|------------|----------|
| Time-Based (TTL) | Low | High | Low | Non-critical data |
| Write-Through | High | Low | Medium | Critical consistency |
| Write-Behind | Medium | High | High | High write throughput |
| Cache-Aside | Medium | High | Low | General purpose |
| Event-Driven | High | Medium | High | Real-time systems |

### 1. Time-Based Invalidation (TTL)

```javascript
class TTLInvalidation {
  async get(key) {
    // Cache handles expiration automatically via TTL
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set(key, value, ttl) {
    // Redis automatically expires after TTL
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  }
  
  async update(key, value) {
    // Database update + cache invalidation
    await database.update(key, value);
    await redis.del(key); // Invalidate - next read will reload
  }
}

// Usage
const ttlCache = new TTLInvalidation();

// Set with 1 hour TTL
await ttlCache.set('product:123', productData, 3600);

// After 1 hour, cache automatically expires
// Next get will reload from database
```

### 2. Write-Through Caching

```javascript
class WriteThroughCache {
  async set(key, value, ttl) {
    // Write to cache and database synchronously
    await Promise.all([
      redis.set(key, JSON.stringify(value), 'EX', ttl),
      database.update(key, value)
    ]);
  }
  
  async update(key, value, ttl) {
    // Update both cache and database
    await Promise.all([
      redis.set(key, JSON.stringify(value), 'EX', ttl),
      database.update(key, value)
    ]);
  }
  
  async get(key) {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
    
    // Fallback to database
    const value = await database.query(key);
    await redis.set(key, JSON.stringify(value), 'EX', 3600);
    return value;
  }
}

// Usage
const writeThroughCache = new WriteThroughCache();

// Strong consistency guaranteed
await writeThroughCache.update('user:123', userData, 3600);
```

### 3. Write-Behind (Write-Back) Caching

```javascript
class WriteBehindCache {
  constructor() {
    this.writeQueue = [];
    this.isProcessing = false;
  }
  
  async set(key, value, ttl) {
    // Write to cache immediately
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
    
    // Queue database write
    this.writeQueue.push({
      key,
      value,
      timestamp: Date.now()
    });
    
    // Trigger async processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }
  
  async processQueue() {
    this.isProcessing = true;
    
    while (this.writeQueue.length > 0) {
      const batch = this.writeQueue.splice(0, 100); // Batch size
      
      try {
        await Promise.all(batch.map(item =>
          database.update(item.key, item.value)
        ));
        console.log(`Processed batch of ${batch.length} writes`);
      } catch (error) {
        console.error('Batch write failed:', error);
        // Re-queue failed writes
        this.writeQueue.unshift(...batch);
        await this.sleep(1000); // Wait before retry
      }
    }
    
    this.isProcessing = false;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async get(key) {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
    
    // May have stale data if write is still in queue
    const value = await database.query(key);
    await redis.set(key, JSON.stringify(value), 'EX', 3600);
    return value;
  }
  
  async flush() {
    // Force all pending writes to database
    await this.processQueue();
  }
}

// Usage
const writeBehindCache = new WriteBehindCache();

// Fast write response
await writeBehindCache.set('product:456', productData, 3600);
```

### 4. Cache-Aside (Lazy Loading)

```javascript
class CacheAside {
  async get(key) {
    // Try cache first
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Cache miss - load from database
    const value = await database.query(key);
    
    // Populate cache
    await redis.set(key, JSON.stringify(value), 'EX', 3600);
    
    return value;
  }
  
  async set(key, value) {
    // Only update database
    await database.update(key, value);
    
    // Invalidate cache
    await redis.del(key);
  }
  
  async delete(key) {
    // Delete from database
    await database.delete(key);
    
    // Invalidate cache
    await redis.del(key);
  }
}

// Usage
const cacheAside = new CacheAside();

// Read with automatic caching
const user = await cacheAside.get('user:123');

// Write invalidates cache
await cacheAside.set('user:123', newUserData);

// Next read will reload from database
const updatedUser = await cacheAside.get('user:123');
```

### 5. Event-Driven Invalidation

```javascript
const { EventEmitter } = require('events');

class EventDrivenCache extends EventEmitter {
  constructor() {
    super();
    this.localCache = new Map();
    this.setupInvalidationListener();
  }
  
  setupInvalidationListener() {
    this.on('invalidate', (key) => {
      console.log(`Invalidating cache for key: ${key}`);
      this.localCache.delete(key);
      redis.del(key);
    });
  }
  
  async get(key) {
    // Check local cache
    if (this.localCache.has(key)) {
      return this.localCache.get(key);
    }
    
    // Check distributed cache
    const cached = await redis.get(key);
    if (cached) {
      const value = JSON.parse(cached);
      this.localCache.set(key, value);
      return value;
    }
    
    // Cache miss
    const value = await database.query(key);
    await redis.set(key, JSON.stringify(value), 'EX', 3600);
    this.localCache.set(key, value);
    
    return value;
  }
  
  async update(key, value) {
    // Update database
    await database.update(key, value);
    
    // Emit invalidation event
    this.emit('invalidate', key);
  }
}

// Database change listener (e.g., from CDC)
class DatabaseChangeListener {
  constructor(cache) {
    this.cache = cache;
    this.setupCDCListener();
  }
  
  setupCDCListener() {
    // Listen to database change events
    cdcStream.on('change', (change) => {
      const key = this.extractKey(change);
      console.log(`Database changed for ${key}, invalidating cache`);
      this.cache.emit('invalidate', key);
    });
  }
  
  extractKey(change) {
    // Extract cache key from change event
    return `${change.table}:${change.id}`;
  }
}

// Usage
const eventCache = new EventDrivenCache();
new DatabaseChangeListener(eventCache);

// Any database update automatically invalidates cache
await database.update('user:123', userData);
// Cache invalidation event fires automatically
```

---

## Cache Eviction Policies

### Q3: Explain different cache eviction policies and their trade-offs?

**Answer:**

Eviction policies determine which items to remove when cache is full.

### 1. LRU (Least Recently Used)

**Best for:** Temporal locality, most general purpose

```javascript
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }
  
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }
    
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }
  
  set(key, value) {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      console.log(`Evicting LRU key: ${firstKey}`);
      this.cache.delete(firstKey);
    }
    
    // Set as most recently used
    this.cache.set(key, value);
  }
  
  get size() {
    return this.cache.size;
  }
}

// Usage
const lru = new LRUCache(3);
lru.set('a', 1);
lru.set('b', 2);
lru.set('c', 3);
console.log(lru.get('a')); // Access 'a', makes it most recent
lru.set('d', 4); // Evicts 'b' (least recently used)
```

### 2. LFU (Least Frequently Used)

**Best for:** Data with stable access patterns

```javascript
class LFUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map(); // key -> value
    this.frequency = new Map(); // key -> access count
    this.minFrequency = 0;
    this.freqMap = new Map(); // frequency -> Set of keys
  }
  
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }
    
    this.increaseFrequency(key);
    return this.cache.get(key);
  }
  
  set(key, value) {
    if (this.capacity === 0) return;
    
    if (this.cache.has(key)) {
      // Update existing
      this.cache.set(key, value);
      this.increaseFrequency(key);
      return;
    }
    
    if (this.cache.size >= this.capacity) {
      // Evict least frequently used
      this.evictLFU();
    }
    
    // Add new entry
    this.cache.set(key, value);
    this.frequency.set(key, 1);
    this.minFrequency = 1;
    
    if (!this.freqMap.has(1)) {
      this.freqMap.set(1, new Set());
    }
    this.freqMap.get(1).add(key);
  }
  
  increaseFrequency(key) {
    const oldFreq = this.frequency.get(key);
    
    // Remove from old frequency set
    this.freqMap.get(oldFreq).delete(key);
    if (this.freqMap.get(oldFreq).size === 0 && oldFreq === this.minFrequency) {
      this.minFrequency++;
    }
    
    // Add to new frequency set
    const newFreq = oldFreq + 1;
    this.frequency.set(key, newFreq);
    
    if (!this.freqMap.has(newFreq)) {
      this.freqMap.set(newFreq, new Set());
    }
    this.freqMap.get(newFreq).add(key);
  }
  
  evictLFU() {
    const keys = this.freqMap.get(this.minFrequency);
    const keyToDelete = keys.values().next().value;
    
    console.log(`Evicting LFU key: ${keyToDelete} (frequency: ${this.minFrequency})`);
    
    keys.delete(keyToDelete);
    this.cache.delete(keyToDelete);
    this.frequency.delete(keyToDelete);
  }
}

// Usage
const lfu = new LFUCache(3);
lfu.set('a', 1);
lfu.set('b', 2);
lfu.set('c', 3);
lfu.get('a'); // Access 'a' twice
lfu.get('a');
lfu.set('d', 4); // Evicts 'b' or 'c' (less frequently accessed)
```

### 3. FIFO (First In, First Out)

**Best for:** Simple implementations, predictable eviction

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
      // Update existing
      this.cache[existingIndex] = { key, value, timestamp: Date.now() };
    } else {
      if (this.cache.length >= this.capacity) {
        // Evict first item
        const evicted = this.cache.shift();
        console.log(`Evicting FIFO key: ${evicted.key}`);
      }
      
      // Add to end
      this.cache.push({ key, value, timestamp: Date.now() });
    }
  }
}

// Usage
const fifo = new FIFOCache(3);
fifo.set('a', 1);
fifo.set('b', 2);
fifo.set('c', 3);
fifo.set('d', 4); // Evicts 'a' (first in)
```

### 4. LIFO (Last In, First Out)

**Best for:** Stack-like access patterns

```javascript
class LIFOCache {
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
      // Update existing
      this.cache[existingIndex] = { key, value };
    } else {
      if (this.cache.length >= this.capacity) {
        // Evict last item
        const evicted = this.cache.pop();
        console.log(`Evicting LIFO key: ${evicted.key}`);
      }
      
      // Add to end
      this.cache.push({ key, value });
    }
  }
}

// Usage
const lifo = new LIFOCache(3);
lifo.set('a', 1);
lifo.set('b', 2);
lifo.set('c', 3);
lifo.set('d', 4); // Evicts 'c' (last in)
```

### 5. Random Eviction

**Best for:** Uniform access patterns, simple implementation

```javascript
class RandomCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }
  
  get(key) {
    return this.cache.get(key) || null;
  }
  
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      return;
    }
    
    if (this.cache.size >= this.capacity) {
      // Evict random key
      const keys = Array.from(this.cache.keys());
      const randomIndex = Math.floor(Math.random() * keys.length);
      const evictedKey = keys[randomIndex];
      
      console.log(`Evicting random key: ${evictedKey}`);
      this.cache.delete(evictedKey);
    }
    
    this.cache.set(key, value);
  }
}

// Usage
const randomCache = new RandomCache(3);
randomCache.set('a', 1);
randomCache.set('b', 2);
randomCache.set('c', 3);
randomCache.set('d', 4); // Evicts random key
```

### Eviction Policy Comparison

```javascript
// Benchmark different eviction policies
async function benchmarkEvictionPolicies() {
  const policies = {
    'LRU': new LRUCache(1000),
    'LFU': new LFUCache(1000),
    'FIFO': new FIFOCache(1000),
    'Random': new RandomCache(1000)
  };
  
  // Simulate access pattern
  const keys = Array.from({ length: 2000 }, (_, i) => `key:${i}`);
  const accessPattern = keys.flatMap(key => [key, key, key]); // Some keys accessed more
  
  const results = {};
  
  for (const [name, cache] of Object.entries(policies)) {
    const hits = { total: 0, misses: 0 };
    const startTime = Date.now();
    
    for (const key of accessPattern) {
      const value = cache.get(key);
      if (value !== null) {
        hits.total++;
      } else {
        hits.misses++;
        cache.set(key, key);
      }
    }
    
    const endTime = Date.now();
    results[name] = {
      hitRatio: (hits.total / (hits.total + hits.misses) * 100).toFixed(2),
      totalOperations: hits.total + hits.misses,
      executionTime: endTime - startTime
    };
  }
  
  console.table(results);
}

// Output example:
/*
┌─────────┬───────────┬───────────────────┬───────────────┐
│ (index) │ hitRatio  │ totalOperations   │ executionTime │
├─────────┼───────────┼───────────────────┼───────────────┤
│  LRU    │ '75.50'   │ 6000              │ 45            │
│  LFU    │ '78.25'   │ 6000              │ 52            │
│  FIFO   │ '65.00'   │ 6000              │ 38            │
│  Random │ '60.75'   │ 6000              │ 35            │
└─────────┴───────────┴───────────────────┴───────────────┘
*/
```

---

## Cache Consistency Models

### Q4: What are the different cache consistency models and their trade-offs?

**Answer:**

### Consistency Models Spectrum

```
Strong Consistency ←─────────────────────────────────────→ Eventual Consistency

    Strong          Sequential      Causal      Read-Your-    Eventual
   Consistency     Consistency   Consistency   Writes      Consistency

   (Fastest)                   (Medium)                  (Slowest)
   Writes                      Reads/Writes              Reads
   Slow Reads                  Fast                      Fast
```

### 1. Strong Consistency

**Definition:** All reads return the most recent write.

```javascript
class StrongConsistentCache {
  constructor(nodes) {
    this.nodes = nodes;
    this.writeQuorum = Math.floor(nodes.length / 2) + 1;
    this.readQuorum = Math.floor(nodes.length / 2) + 1;
  }
  
  async set(key, value, ttl) {
    // Write to all nodes synchronously
    const writePromises = this.nodes.map(node =>
      node.set(key, JSON.stringify(value), 'EX', ttl)
    );
    
    await Promise.all(writePromises);
    
    // Wait for write quorum
    const results = await Promise.allSettled(writePromises);
    const successfulWrites = results.filter(r => r.status === 'fulfilled').length;
    
    if (successfulWrites < this.writeQuorum) {
      throw new Error('Write quorum not reached');
    }
    
    return true;
  }
  
  async get(key) {
    // Read from quorum of nodes
    const readPromises = this.nodes.map(node => node.get(key));
    const results = await Promise.allSettled(readPromises);
    
    const values = results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => JSON.parse(r.value));
    
    if (values.length < this.readQuorum) {
      throw new Error('Read quorum not reached');
    }
    
    // Return most recent value (based on timestamp)
    return values.sort((a, b) => b.timestamp - a.timestamp)[0];
  }
}

// Usage
const strongCache = new StrongConsistentCache([node1, node2, node3]);

// Write: Slow (waits for all nodes)
await strongCache.set('user:123', userData, 3600);

// Read: Slow (waits for quorum)
const user = await strongCache.get('user:123');

// Guarantee: Always returns most recent data
```

### 2. Eventual Consistency

**Definition:** All nodes will eventually converge to the same state.

```javascript
class EventualConsistentCache {
  constructor(nodes) {
    this.nodes = nodes;
    this.primary = nodes[0];
    this.replicas = nodes.slice(1);
  }
  
  async set(key, value, ttl) {
    // Write to primary immediately
    await this.primary.set(key, JSON.stringify(value), 'EX', ttl);
    
    // Replicate asynchronously
    this.replicateAsync(key, value, ttl);
    
    return true; // Return immediately
  }
  
  async replicateAsync(key, value, ttl) {
    const replicatePromises = this.replicas.map(replica =>
      replica.set(key, JSON.stringify(value), 'EX', ttl)
    );
    
    // Don't wait - eventual consistency
    Promise.allSettled(replicatePromises).then(results => {
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        console.error(`${failed} replicas failed to replicate`);
      }
    });
  }
  
  async get(key) {
    // Read from any node (may be stale)
    const node = this.getRandomNode();
    const value = await node.get(key);
    
    return value ? JSON.parse(value) : null;
  }
  
  getRandomNode() {
    return this.nodes[Math.floor(Math.random() * this.nodes.length)];
  }
}

// Usage
const eventualCache = new EventualConsistentCache([node1, node2, node3]);

// Write: Fast (returns immediately)
await eventualCache.set('user:123', userData, 3600);

// Read: Fast (may return stale data)
const user = await eventualCache.get('user:123');

// Trade-off: Fast operations, but may read stale data
```

### 3. Causal Consistency

**Definition:** Causally related operations are seen by all nodes in order.

```javascript
class CausalConsistentCache {
  constructor(nodes) {
    this.nodes = nodes;
    this.vectorClocks = new Map(); // Track versions per node
    this.causalOrder = new Map(); // Track operation order
  }
  
  async set(key, value, nodeId, dependencies = []) {
    // Get current vector clock
    const vectorClock = this.getVectorClock(nodeId);
    
    // Increment version for this node
    vectorClock[nodeId]++;
    
    // Check dependencies
    for (const dep of dependencies) {
      const depVector = this.vectorClocks.get(dep);
      if (!this.isCausal(dependies, vectorClock)) {
        throw new Error('Causal dependency not satisfied');
      }
    }
    
    // Create operation with vector clock
    const operation = {
      key,
      value,
      vectorClock: { ...vectorClock },
      timestamp: Date.now(),
      nodeId
    };
    
    // Store operation
    this.causalOrder.set(this.generateOperationId(operation), operation);
    
    // Write to all nodes
    await Promise.all(this.nodes.map(node =>
      node.set(key, JSON.stringify(operation))
    ));
    
    return true;
  }
  
  async get(key) {
    // Read from all nodes
    const values = await Promise.all(this.nodes.map(node =>
      node.get(key).then(v => v ? JSON.parse(v) : null)
    ));
    
    // Filter out null values
    const validValues = values.filter(v => v !== null);
    
    if (validValues.length === 0) {
      return null;
    }
    
    // Return value with latest vector clock (causally consistent)
    return this.selectLatestValue(validValues);
  }
  
  getVectorClock(nodeId) {
    if (!this.vectorClocks.has(nodeId)) {
      this.vectorClocks.set(nodeId, {});
    }
    return this.vectorClocks.get(nodeId);
  }
  
  isCausal(dependencies, vectorClock) {
    for (const dep of dependencies) {
      const depVector = this.vectorClocks.get(dep);
      for (const [node, version] of Object.entries(depVector)) {
        if ((vectorClock[node] || 0) < version) {
          return false;
        }
      }
    }
    return true;
  }
  
  selectLatestValue(values) {
    // Select value with latest vector clock
    return values.reduce((latest, current) => {
      return this.compareVectorClocks(current.vectorClock, latest.vectorClock) > 0
        ? current
        : latest;
    });
  }
  
  compareVectorClocks(v1, v2) {
    let v1Greater = false;
    let v2Greater = false;
    
    const allNodes = new Set([...Object.keys(v1), ...Object.keys(v2)]);
    
    for (const node of allNodes) {
      const v1Version = v1[node] || 0;
      const v2Version = v2[node] || 0;
      
      if (v1Version > v2Version) v1Greater = true;
      if (v2Version > v1Version) v2Greater = true;
    }
    
    if (v1Greater && !v2Greater) return 1;
    if (v2Greater && !v1Greater) return -1;
    return 0;
  }
  
  generateOperationId(operation) {
    return `${operation.nodeId}:${operation.timestamp}`;
  }
}
```

### 4. Read-Your-Writes Consistency

**Definition:** Client sees its own writes immediately.

```javascript
class ReadYourWritesCache {
  constructor(nodes) {
    this.nodes = nodes;
    this.pendingWrites = new Map(); // Track client's pending writes
  }
  
  async set(key, value, clientId, ttl) {
    // Write to cache immediately
    await this.nodes[0].set(key, JSON.stringify(value), 'EX', ttl);
    
    // Track client's write
    this.pendingWrites.set(`${clientId}:${key}`, {
      value,
      timestamp: Date.now()
    });
    
    // Async replication to other nodes
    this.replicateAsync(key, value, ttl);
    
    return true;
  }
  
  async get(key, clientId) {
    // Check if client has a pending write
    const pendingKey = `${clientId}:${key}`;
    if (this.pendingWrites.has(pendingKey)) {
      return this.pendingWrites.get(pendingKey).value;
    }
    
    // Read from cache
    const node = this.getRandomNode();
    const value = await node.get(key);
    
    return value ? JSON.parse(value) : null;
  }
  
  async replicateAsync(key, value, ttl) {
    const replicas = this.nodes.slice(1);
    const promises = replicas.map(node =>
      node.set(key, JSON.stringify(value), 'EX', ttl)
    );
    
    Promise.allSettled(promises);
  }
  
  getRandomNode() {
    return this.nodes[Math.floor(Math.random() * this.nodes.length)];
  }
  
  acknowledgeWrite(clientId, key) {
    // Remove pending write after replication
    this.pendingWrites.delete(`${clientId}:${key}`);
  }
}

// Usage
const rywCache = new ReadYourWritesCache([node1, node2, node3]);

// Write
await rywCache.set('user:123', userData, 'client-1', 3600);

// Immediate read by same client - sees own write
const user = await rywCache.get('user:123', 'client-1');
// Guaranteed to return userData

// Read by different client - may see stale data
const user2 = await rywCache.get('user:123', 'client-2');
```

---

## Cache Synchronization

### Q5: How do you synchronize cache across multiple nodes?

**Answer:**

### 1. Pub/Sub Based Synchronization

```javascript
const { createClient } = require('ioredis');

class PubSubCacheSync {
  constructor(channelName = 'cache:sync') {
    this.publisher = createClient();
    this.subscriber = createClient();
    this.channelName = channelName;
    this.localCache = new Map();
    this.setupSubscriber();
  }
  
  setupSubscriber() {
    this.subscriber.subscribe(this.channelName);
    
    this.subscriber.on('message', (channel, message) => {
      if (channel !== this.channelName) return;
      
      const event = JSON.parse(message);
      this.handleSyncEvent(event);
    });
  }
  
  async set(key, value, ttl) {
    // Update local cache
    this.localCache.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
    
    // Publish sync event
    await this.publisher.publish(this.channelName, JSON.stringify({
      type: 'set',
      key,
      value,
      ttl,
      timestamp: Date.now()
    }));
  }
  
  async get(key) {
    const cached = this.localCache.get(key);
    
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }
    
    if (cached) {
      this.localCache.delete(key); // Expired
    }
    
    return null;
  }
  
  async del(key) {
    // Delete from local cache
    this.localCache.delete(key);
    
    // Publish sync event
    await this.publisher.publish(this.channelName, JSON.stringify({
      type: 'del',
      key,
      timestamp: Date.now()
    }));
  }
  
  handleSyncEvent(event) {
    console.log('Received sync event:', event.type);
    
    switch (event.type) {
      case 'set':
        this.localCache.set(event.key, {
          value: event.value,
          expiresAt: Date.now() + event.ttl * 1000
        });
        break;
        
      case 'del':
        this.localCache.delete(event.key);
        break;
        
      case 'invalidate':
        this.localCache.delete(event.key);
        break;
    }
  }
}

// Usage
const cache1 = new PubSubCacheSync();
const cache2 = new PubSubCacheSync();

// Set on cache1 - syncs to cache2
await cache1.set('user:123', userData, 3600);

// Both caches have the same data
console.log(await cache1.get('user:123')); // userData
console.log(await cache2.get('user:123')); // userData
```

### 2. Multi-Leader Synchronization

```javascript
class MultiLeaderCacheSync {
  constructor(nodes, nodeId) {
    this.nodes = nodes;
    this.nodeId = nodeId;
    this.operationLog = [];
    this.vectorClock = { [nodeId]: 0 };
    this.pendingOperations = new Map();
  }
  
  async set(key, value, ttl) {
    const operation = {
      id: this.generateOperationId(),
      type: 'set',
      key,
      value,
      ttl,
      nodeId: this.nodeId,
      vectorClock: { ...this.vectorClock },
      timestamp: Date.now()
    };
    
    // Increment vector clock
    this.vectorClock[this.nodeId]++;
    operation.vectorClock[this.nodeId] = this.vectorClock[this.nodeId];
    
    // Apply locally
    await this.applyOperation(operation);
    
    // Replicate to other nodes
    this.replicateOperation(operation);
    
    return operation.id;
  }
  
  async applyOperation(operation) {
    switch (operation.type) {
      case 'set':
        await this.nodes[this.nodeId].set(
          operation.key,
          JSON.stringify(operation.value),
          'EX',
          operation.ttl
        );
        break;
        
      case 'del':
        await this.nodes[this.nodeId].del(operation.key);
        break;
    }
    
    this.operationLog.push(operation);
    this.updateVectorClock(operation.vectorClock);
  }
  
  async replicateOperation(operation) {
    const otherNodes = this.nodes.filter((_, i) => i !== this.nodeId);
    
    const replicationPromises = otherNodes.map(async (node, index) => {
      try {
        await node.set(
          `sync:${operation.id}`,
          JSON.stringify(operation),
          'EX',
          3600
        );
      } catch (error) {
        console.error(`Replication to node ${index} failed:`, error);
      }
    });
    
    await Promise.allSettled(replicationPromises);
  }
  
  async receiveOperation(operation) {
    // Check if already applied
    if (this.operationLog.some(op => op.id === operation.id)) {
      return;
    }
    
    // Check causal dependencies
    if (!this.isCausal(operation.vectorClock)) {
      // Wait for dependencies
      this.pendingOperations.set(operation.id, operation);
      return;
    }
    
    // Apply operation
    await this.applyOperation(operation);
    
    // Replicate further
    this.replicateOperation(operation);
    
    // Check pending operations
    await this.processPendingOperations();
  }
  
  isCausal(vectorClock) {
    for (const [node, version] of Object.entries(vectorClock)) {
      if ((this.vectorClock[node] || 0) < version) {
        return false;
      }
    }
    return true;
  }
  
  async processPendingOperations() {
    const ready = [];
    
    for (const [id, operation] of this.pendingOperations) {
      if (this.isCausal(operation.vectorClock)) {
        ready.push(operation);
        this.pendingOperations.delete(id);
      }
    }
    
    for (const operation of ready) {
      await this.applyOperation(operation);
    }
  }
  
  updateVectorClock(vectorClock) {
    for (const [node, version] of Object.entries(vectorClock)) {
      this.vectorClock[node] = Math.max(this.vectorClock[node] || 0, version);
    }
  }
  
  generateOperationId() {
    return `${this.nodeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

---

## Real-world Implementation

### Q6: Provide a complete cache state management implementation?

**Answer:**

```javascript
const Redis = require('ioredis');
const { EventEmitter } = require('events');

/**
 * Complete Cache State Management System
 */
class CacheStateManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      redis: options.redis || new Redis(),
      pubsub: options.pubsub || new Redis(),
      syncChannel: options.syncChannel || 'cache:sync',
      defaultTTL: options.defaultTTL || 3600,
      invalidationChannel: options.invalidationChannel || 'cache:invalidate',
      ...options
    };
    
    this.localCache = new Map();
    this.metadata = new Map();
    this.metrics = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      syncs: 0
    };
    
    this.setupPubSub();
  }
  
  setupPubSub() {
    // Subscribe to sync channel
    this.options.pubsub.subscribe(this.options.syncChannel);
    
    // Subscribe to invalidation channel
    this.options.pubsub.subscribe(this.options.invalidationChannel);
    
    this.options.pubsub.on('message', (channel, message) => {
      if (channel === this.options.syncChannel) {
        this.handleSyncMessage(message);
      } else if (channel === this.options.invalidationChannel) {
        this.handleInvalidationMessage(message);
      }
    });
  }
  
  async get(key) {
    // Check local cache
    const localValue = this.getLocal(key);
    if (localValue !== null) {
      this.metrics.hits++;
      return localValue;
    }
    
    // Check distributed cache
    const distributedValue = await this.getDistributed(key);
    if (distributedValue !== null) {
      this.localCache.set(key, distributedValue);
      this.metrics.hits++;
      return distributedValue;
    }
    
    this.metrics.misses++;
    return null;
  }
  
  async set(key, value, ttl = null) {
    const finalTTL = ttl || this.options.defaultTTL;
    const expiresAt = Date.now() + (finalTTL * 1000);
    
    // Set in local cache
    this.localCache.set(key, value);
    
    // Set in distributed cache
    await this.options.redis.set(key, JSON.stringify(value), 'EX', finalTTL);
    
    // Update metadata
    this.metadata.set(key, {
      createdAt: Date.now(),
      expiresAt,
      ttl: finalTTL,
      accessCount: 0,
      lastAccessed: Date.now(),
      size: this.calculateSize(key, value)
    });
    
    // Sync to other nodes
    await this.syncOperation({
      type: 'set',
      key,
      value,
      ttl: finalTTL,
      timestamp: Date.now()
    });
  }
  
  async del(key) {
    // Delete from local cache
    this.localCache.delete(key);
    this.metadata.delete(key);
    
    // Delete from distributed cache
    await this.options.redis.del(key);
    
    // Invalidate on other nodes
    await this.invalidate(key);
  }
  
  async invalidate(key) {
    this.metrics.invalidations++;
    
    // Invalidate locally
    this.localCache.delete(key);
    
    // Publish invalidation
    await this.options.pubsub.publish(
      this.options.invalidationChannel,
      JSON.stringify({ key, timestamp: Date.now() })
    );
  }
  
  async getOrSet(key, fetcher, ttl = null) {
    // Try cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Acquire lock to prevent stampede
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
  
  async syncOperation(operation) {
    this.metrics.syncs++;
    
    await this.options.pubsub.publish(
      this.options.syncChannel,
      JSON.stringify(operation)
    );
  }
  
  handleSyncMessage(message) {
    try {
      const operation = JSON.parse(message);
      console.log('Received sync operation:', operation.type);
      
      switch (operation.type) {
        case 'set':
          this.localCache.set(operation.key, operation.value);
          break;
          
        case 'del':
          this.localCache.delete(operation.key);
          this.metadata.delete(operation.key);
          break;
      }
    } catch (error) {
      console.error('Error handling sync message:', error);
    }
  }
  
  handleInvalidationMessage(message) {
    try {
      const { key } = JSON.parse(message);
      console.log('Invalidating cache for key:', key);
      
      this.localCache.delete(key);
      this.metadata.delete(key);
    } catch (error) {
      console.error('Error handling invalidation:', error);
    }
  }
  
  getLocal(key) {
    const value = this.localCache.get(key);
    const metadata = this.metadata.get(key);
    
    if (metadata && Date.now() > metadata.expiresAt) {
      this.localCache.delete(key);
      this.metadata.delete(key);
      return null;
    }
    
    if (value !== undefined) {
      // Update access metadata
      metadata.accessCount++;
      metadata.lastAccessed = Date.now();
      return value;
    }
    
    return null;
  }
  
  async getDistributed(key) {
    const value = await this.options.redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async acquireLock(key, ttl = 10) {
    const result = await this.options.redis.set(key, '1', 'NX', 'EX', ttl);
    return result === 'OK';
  }
  
  async releaseLock(key) {
    await this.options.redis.del(key);
  }
  
  async waitForLockRelease(key, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const exists = await this.options.redis.exists(key);
      if (!exists) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  calculateSize(key, value) {
    return Buffer.byteLength(key) + Buffer.byteLength(JSON.stringify(value));
  }
  
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      hitRatio: total > 0 ? (this.metrics.hits / total * 100).toFixed(2) : '0%',
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      invalidations: this.metrics.invalidations,
      syncs: this.metrics.syncs,
      localCacheSize: this.localCache.size,
      metadataSize: this.metadata.size
    };
  }
  
  async clear() {
    this.localCache.clear();
    this.metadata.clear();
    await this.options.redis.flushdb();
  }
  
  async close() {
    await this.options.pubsub.unsubscribe(this.options.syncChannel);
    await this.options.pubsub.unsubscribe(this.options.invalidationChannel);
    await this.options.pubsub.quit();
    await this.options.redis.quit();
  }
}

// Export
module.exports = CacheStateManager;

/**
 * Usage Example
 */
async function exampleUsage() {
  const cache = new CacheStateManager({
    redis: new Redis({ host: 'localhost', port: 6379 }),
    pubsub: new Redis({ host: 'localhost', port: 6379 }),
    defaultTTL: 3600
  });
  
  // Set value
  await cache.set('user:123', { id: 123, name: 'John Doe' }, 3600);
  
  // Get value
  const user = await cache.get('user:123');
  console.log('User:', user);
  
  // Get or set with fetcher
  const product = await cache.getOrSet('product:456', async () => {
    return await fetchProductFromDatabase(456);
  }, 1800);
  
  console.log('Product:', product);
  
  // Invalidate cache
  await cache.invalidate('user:123');
  
  // Get metrics
  console.log('Cache Metrics:', cache.getMetrics());
  
  // Close connection
  await cache.close();
}

// Example fetcher function
async function fetchProductFromDatabase(productId) {
  // Simulate database query
  return {
    id: productId,
    name: 'Sample Product',
    price: 99.99
  };
}
```

---

## Summary

### Key Takeaways for Senior Developers:

1. **State Tracking**: Maintain metadata for cache entries (TTL, access count, size)
2. **Versioning**: Use version numbers to detect conflicts and handle concurrent updates
3. **Eviction Policies**: Choose based on access patterns (LRU for temporal, LFU for frequency)
4. **Consistency Models**: Balance between consistency and availability (CAP theorem)
5. **Synchronization**: Use pub/sub for real-time cache invalidation across nodes
6. **Monitoring**: Track metrics to understand cache behavior and optimize performance

### Cache State Management Checklist

- [ ] Track cache metadata (TTL, access patterns, size)
- [ ] Implement appropriate eviction policy
- [ ] Choose consistency model based on requirements
- [ ] Set up synchronization mechanism for distributed nodes
- [ ] Monitor metrics (hit ratio, latency, eviction rate)
- [ ] Handle cache invalidation correctly
- [ ] Implement locking for cache stampede prevention
- [ ] Plan for cache warming strategies
- [ ] Set up alerts for cache-related issues

Proper cache state management is crucial for maintaining data consistency and optimal performance in distributed systems.