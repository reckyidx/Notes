# Caching Tools - Senior Level Interview Questions

## Table of Contents
1. [Redis Deep Dive](#redis-deep-dive)
2. [Redis Alternatives](#redis-alternatives)
3. [Tool Comparison](#tool-comparison)
4. [Choosing the Right Tool](#choosing-the-right-tool)
5. [Implementation Examples](#implementation-examples)
6. [Real-world Scenarios](#real-world-scenarios)

---

## Redis Deep Dive

### Q1: What is Redis and why is it so popular?

**Answer:**

Redis (Remote Dictionary Server) is an open-source, in-memory data structure store used as a database, cache, message broker, and streaming engine.

### Key Features

**1. In-Memory Storage**
```javascript
// Extremely fast operations - all data in RAM
const Redis = require('ioredis');
const redis = new Redis();

// Write operation: ~0.1ms
await redis.set('user:123', JSON.stringify({ name: 'John' }));

// Read operation: ~0.1ms
const user = JSON.parse(await redis.get('user:123'));
```

**2. Rich Data Structures**
```javascript
// 1. Strings
await redis.set('key', 'value');
await redis.incr('counter'); // Atomic increment

// 2. Hashes
await redis.hset('user:123', 'name', 'John');
await redis.hset('user:123', 'email', 'john@example.com');
const name = await redis.hget('user:123', 'name');
const userObj = await redis.hgetall('user:123');

// 3. Lists
await redis.lpush('queue', 'task1');
await redis.lpush('queue', 'task2');
const task = await redis.rpop('queue'); // FIFO queue

// 4. Sets
await redis.sadd('tags', 'redis', 'caching', 'database');
const members = await redis.smembers('tags');

// 5. Sorted Sets
await redis.zadd('leaderboard', 100, 'player1');
await redis.zadd('leaderboard', 150, 'player2');
const topPlayers = await redis.zrange('leaderboard', 0, 9, 'WITHSCORES', 'REV');

// 6. Bitmaps
await redis.setbit('user:123:flags', 0, 1); // Set bit 0 to 1

// 7. HyperLogLog
await redis.pfadd('unique:visitors', 'user1', 'user2', 'user3');
const uniqueCount = await redis.pfcount('unique:visitors');
```

**3. Persistence Options**
```javascript
// RDB (Snapshot) - Point-in-time snapshots
// redis.conf:
save 900 1     // Save after 900 seconds if at least 1 key changed
save 300 10    // Save after 300 seconds if at least 10 keys changed
save 60 10000  // Save after 60 seconds if at least 10000 keys changed

// AOF (Append-Only File) - Every write operation logged
// redis.conf:
appendonly yes
appendfsync everysec  // Sync every second (balance between safety and performance)

// Hybrid: Both RDB and AOF
save 900 1
appendonly yes
appendfsync everysec
```

**4. Replication**
```javascript
// Master-Slave Replication
// Master configuration
const master = new Redis({ host: 'master.example.com', port: 6379 });

// Slave configuration (replicaof in redis.conf or during runtime)
const slave = new Redis({ host: 'slave.example.com', port: 6379 });

// Setup replication
await slave.slaveof('master.example.com', 6379);

// Read from replicas for scalability
async function get(key) {
  // Read from any replica
  return await replica.get(key);
}

async function set(key, value) {
  // Write to master only
  return await master.set(key, value);
}
```

**5. Clustering**
```javascript
// Redis Cluster - Automatic sharding and high availability
const { Cluster } = require('ioredis');

const cluster = new Cluster([
  { host: 'redis-node-1', port: 6379 },
  { host: 'redis-node-2', port: 6379 },
  { host: 'redis-node-3', port: 6379 },
  { host: 'redis-node-4', port: 6379 },
  { host: 'redis-node-5', port: 6379 },
  { host: 'redis-node-6', port: 6379 }
], {
  scaleReads: 'slave', // Read from replicas
  redisOptions: {
    password: process.env.REDIS_PASSWORD
  }
});

// Automatic sharding - keys are distributed across nodes
await cluster.set('user:123', userData); // Goes to node 1
await cluster.set('product:456', productData); // Goes to node 2
await cluster.set('order:789', orderData); // Goes to node 3
```

### Advanced Redis Features

**1. Pub/Sub Messaging**
```javascript
// Publisher
const publisher = new Redis();
async function publishMessage(channel, message) {
  await publisher.publish(channel, JSON.stringify(message));
}

// Subscriber
const subscriber = new Redis();
subscriber.subscribe('news:updates');
subscriber.on('message', (channel, message) => {
  const data = JSON.parse(message);
  console.log(`Received from ${channel}:`, data);
});

// Usage
await publishMessage('news:updates', { title: 'New Redis Released!' });
```

**2. Transactions**
```javascript
// Redis transactions - all commands execute atomically
const transaction = redis.multi();

transaction.set('key1', 'value1');
transaction.incr('counter');
transaction.hset('user:123', 'balance', 100);

const results = await transaction.exec();
console.log(results); // [OK, 1, 1]

// Optimistic locking with WATCH
async function transferFunds(fromAccount, toAccount, amount) {
  const fromKey = `account:${fromAccount}`;
  const toKey = `account:${toAccount}`;
  
  // Watch accounts for changes
  await redis.watch(fromKey, toKey);
  
  const balance = parseInt(await redis.hget(fromKey, 'balance'));
  
  if (balance < amount) {
    await redis.unwatch();
    throw new Error('Insufficient funds');
  }
  
  // Execute transaction
  const results = await redis
    .multi()
    .hincrby(fromKey, 'balance', -amount)
    .hincrby(toKey, 'balance', amount)
    .exec();
    
  if (results === null) {
    // Transaction failed due to watched key changes
    throw new Error('Transaction failed - please retry');
  }
  
  return true;
}
```

**3. Lua Scripting**
```javascript
// Atomic operations with Lua scripts
const luaScript = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local current = redis.call('incr', key)
  
  if current == 1 then
    redis.call('expire', key, window)
  end
  
  if current > limit then
    return 0
  else
    return 1
  end
`;

// Rate limiter implementation
async function checkRateLimit(userId, limit, window) {
  const key = `ratelimit:${userId}`;
  const result = await redis.eval(
    luaScript,
    1, // Number of keys
    key, // KEYS[1]
    limit, // ARGV[1]
    window // ARGV[2]
  );
  
  return result === 1; // true if under limit
}

// Usage: 10 requests per minute
const allowed = await checkRateLimit('user:123', 10, 60);
console.log(allowed ? 'Request allowed' : 'Rate limit exceeded');
```

**4. Streams**
```javascript
// Redis Streams - Log data structure
async function addToStream(streamName, data) {
  return await redis.xadd(streamName, '*', ...data);
}

async function readFromStream(streamName, consumerGroup, consumerName) {
  // Create consumer group if doesn't exist
  try {
    await redis.xgroup('CREATE', streamName, consumerGroup, '0', 'MKSTREAM');
  } catch (error) {
    // Group already exists
  }
  
  // Read new messages
  return await redis.xreadgroup(
    'GROUP', consumerGroup, consumerName,
    'COUNT', 10,
    'BLOCK', 5000,
    'STREAMS', streamName, '>'
  );
}

async function processMessage(streamName, messageId) {
  // Process message
  console.log('Processing:', messageId);
  
  // Acknowledge message
  await redis.xack(streamName, 'mygroup', messageId);
}

// Usage
await addToStream('events', ['type', 'user_login', 'userId', '123']);
const messages = await readFromStream('events', 'mygroup', 'consumer1');
```

### Redis Performance Optimization

**1. Memory Optimization**
```bash
# redis.conf optimizations

# Max memory limit
maxmemory 2gb

# Eviction policy
maxmemory-policy allkeys-lru

# Save memory with compressed values
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64

# Disable slow operations that use CPU instead of memory
activerehashing yes
```

```javascript
// Use hashes for related data instead of multiple keys
// Bad:
await redis.set('user:123:name', 'John');
await redis.set('user:123:email', 'john@example.com');
await redis.set('user:123:age', '30');

// Good:
await redis.hset('user:123', 'name', 'John', 'email', 'john@example.com', 'age', 30);

// Use data structures efficiently
// Bitmap for boolean flags instead of strings
await redis.setbit('user:123:features:premium', 0, 1);
await redis.setbit('user:123:features:verified', 1, 1);
```

**2. Pipeline Commands**
```javascript
// Pipeline multiple commands for better performance
async function pipelineOperations() {
  const pipeline = redis.pipeline();
  
  for (let i = 0; i < 100; i++) {
    pipeline.set(`key:${i}`, `value:${i}`);
    pipeline.expire(`key:${i}`, 3600);
  }
  
  const results = await pipeline.exec();
  console.log('Pipeline completed with', results.length, 'operations');
}

// Benchmark: 1000 operations
// Without pipeline: ~100ms
// With pipeline: ~10ms (10x faster)
```

**3. Connection Pooling**
```javascript
const Redis = require('ioredis');
const GenericPool = require('generic-pool');

// Create connection pool
const redisPool = GenericPool.createPool({
  create: async () => {
    return new Redis({
      host: process.env.REDIS_HOST,
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3
    });
  },
  destroy: async (client) => {
    await client.quit();
  }
}, {
  max: 100, // Maximum pool size
  min: 10,  // Minimum pool size
  idleTimeoutMillis: 30000
});

async function getCachedData(key) {
  const client = await redisPool.acquire();
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } finally {
    await redisPool.release(client);
  }
}
```

---

## Redis Alternatives

### Q2: What are the alternatives to Redis and when to use them?

**Answer:**

### 1. Memcached

**Overview:** Simple, high-performance memory caching system

**Key Differences from Redis:**
- Only string data structure (no hashes, sets, etc.)
- No persistence (data lost on restart)
- Simpler architecture, faster for simple caching
- No replication (requires client-side sharding)

```javascript
const Memcached = require('memcached');
const memcached = new Memcached('localhost:11211');

// Basic operations
memcached.set('key', 'value', 3600, (err) => {
  if (err) console.error(err);
});

memcached.get('key', (err, data) => {
  console.log(data); // 'value'
});

// Multi-get
memcached.getMulti(['key1', 'key2', 'key3'], (err, data) => {
  console.log(data);
});

// Client-side sharding
const servers = [
  'cache1.example.com:11211',
  'cache2.example.com:11211',
  'cache3.example.com:11211'
];

const shardedMemcached = new Memcached(servers, {
  maxKeySize: 250,
  maxValue: 1048576,
  poolSize: 10
});
```

**When to use Memcached:**
- Simple key-value caching
- Read-heavy workloads
- Don't need persistence
- Don't need complex data structures
- Want maximum performance for simple caching

**Performance Comparison:**
```
Operation       Memcached    Redis
SET (simple)    0.05ms       0.1ms
GET (simple)    0.05ms       0.1ms
INCR            N/A          0.1ms
HGET            N/A          0.1ms
LPUSH           N/A          0.1ms
```

### 2. Hazelcast

**Overview:** Distributed in-memory data grid for Java

**Key Features:**
- Native Java integration
- Distributed maps, queues, topics
- Automatic data partitioning and replication
- Built-in cluster management
- SQL queries on cached data

```java
import com.hazelcast.core.Hazelcast;
import com.hazelcast.core.HazelcastInstance;
import com.hazelcast.map.IMap;

// Hazelcast instance
HazelcastInstance hz = Hazelcast.newHazelcastInstance();

// Distributed Map
IMap<String, User> userCache = hz.getMap("users");

// Put and Get
userCache.put("user:123", new User(123, "John Doe"));
User user = userCache.get("user:123");

// Near Cache - local cache for frequently accessed data
Config config = new Config();
config.getMapConfig("users")
      .getNearCacheConfig()
      .setMaxSize(1000)
      .setTimeToLiveSeconds(3600);

// SQL Queries
SqlPredicate predicate = new SqlPredicate("age > 18");
Collection<User> adults = userCache.values(predicate);

// Distributed Queue
IQueue<String> taskQueue = hz.getQueue("tasks");
taskQueue.offer("task1");
String task = taskQueue.take();

// Distributed Topic (Pub/Sub)
ITopic<String> newsTopic = hz.getTopic("news");
newsTopic.addMessageListener(message -> {
    System.out.println("Received: " + message.getMessageObject());
});
newsTopic.publish("Breaking news!");
```

**When to use Hazelcast:**
- Java-based applications
- Need complex distributed data structures
- Require automatic cluster management
- Need SQL-like queries on cached data
- Want in-memory computing capabilities

### 3. Apache Ignite

**Overview:** In-memory computing platform with SQL, key-value, and processing capabilities

**Key Features:**
- Memory-centric architecture
- ACID transactions
- SQL support with JDBC/ODBC
- Machine learning and data grid
- Persistence option
- Distributed computations

```java
import org.apache.ignite.Ignite;
import org.apache.ignite.Ignition;
import org.apache.ignite.configuration.CacheConfiguration;
import org.apache.ignite.cache.CacheMode;

// Start Ignite node
Ignite ignite = Ignition.start();

// Cache configuration
CacheConfiguration<String, User> userCacheCfg = new CacheConfiguration<>("users")
    .setCacheMode(CacheMode.PARTITIONED)
    .setBackups(1)
    .setAtomicityMode(CacheAtomicityMode.ATOMIC);

// Create cache
IgniteCache<String, User> userCache = ignite.getOrCreateCache(userCacheCfg);

// Put and Get
userCache.put("user:123", new User(123, "John Doe"));
User user = userCache.get("user:123");

// Transactions
Transaction tx = ignite.transactions().txStart();
try {
    userCache.put("user:123", new User(123, "Updated"));
    userCache.put("user:124", new User(124, "Jane"));
    tx.commit();
} catch (Exception e) {
    tx.rollback();
}

// SQL Queries
SqlFieldsQuery query = new SqlFieldsQuery(
    "SELECT name, email FROM User WHERE age > ?"
).setArgs(18);

List<List<?>> results = userCache.query(query).getAll();
for (List<?> row : results) {
    System.out.println(row.get(0) + " - " + row.get(1));
}

// Distributed Compute
IgniteCompute compute = ignite.compute();
Collection<String> results = compute.apply(
    (String word) -> word.toUpperCase(),
    Arrays.asList("hello", "world", "ignite")
);

// Stream processing
IgniteDataStreamer<String, User> streamer = ignite.dataStreamer("users");
streamer.allowOverwrite(true);

for (User user : userDataSource) {
    streamer.addData(user.getId(), user);
}
streamer.close();
```

**When to use Apache Ignite:**
- Need SQL support with in-memory performance
- Require ACID transactions
- Want distributed computing capabilities
- Need machine learning in-memory
- Require persistence with in-memory speed

### 4. Couchbase

**Overview:** NoSQL document database with powerful caching capabilities

**Key Features:**
- Document-oriented (JSON)
- N1QL query language (SQL-like for JSON)
- Built-in caching layer
- Automatic sharding and replication
- Cross Data Center Replication (XDCR)
- Mobile and edge computing support

```javascript
const couchbase = require('couchbase');
const cluster = await couchbase.connect('couchbase://localhost', {
  username: 'admin',
  password: 'password'
});

const bucket = cluster.bucket('default');
const collection = bucket.defaultCollection();

// Document operations
await collection.upsert('user:123', {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
});

const result = await collection.get('user:123');
console.log(result.content);

// N1QL Queries
const query = 'SELECT name, email FROM `default` WHERE age > $1';
const options = { parameters: [18] };
const queryResult = await cluster.query(query, options);

for (const row of queryResult.rows) {
  console.log(row.name, row.email);
}

// Sub-document operations (partial updates)
await collection.mutateIn('user:123', [
  couchbase.MutateInSpec.inc('age', 1)
]);

// Bulk operations
const operations = [
  couchbase.MutateInSpec.insert('name', 'John'),
  couchbase.MutateInSpec.insert('email', 'john@example.com')
];
await collection.mutateIn('user:123', operations);

// Durability levels
await collection.insert('user:124', userData, {
  durabilityLevel: couchbase.DurabilityLevel.Majority
});
```

**When to use Couchbase:**
- Need document database with caching
- Require SQL-like queries on JSON
- Need multi-datacenter replication
- Mobile and offline-first applications
- Want flexible schema with caching performance

### 5. Apache Geode

**Overview:** In-memory data management system for distributed systems

**Key Features:**
- Low latency, high throughput
- Continuous availability
- WAN replication
- OQL (Object Query Language)
- Event processing
- Spring integration

```java
import org.apache.geode.cache.client.*;
import org.apache.geode.cache.Region;
import org.apache.geode.pdx.ReflectionBasedAutoSerializer;

// Create client cache
ClientCacheFactory factory = new ClientCacheFactory()
    .addPoolLocator("localhost", 10334)
    .setPdxSerializer(new ReflectionBasedAutoSerializer());

ClientCache cache = factory.create();

// Get region
Region<String, User> userRegion = cache.getRegion("users");

// Put and Get
userRegion.put("user:123", new User(123, "John Doe"));
User user = userRegion.get("user:123");

// OQL Query
SelectResults<User> results = userRegion.query(
    "SELECT * FROM /users WHERE age > 18"
);

for (User u : results) {
    System.out.println(u.getName());
}

// Continuous Query (CQ)
QueryService queryService = cache.getQueryService();
Query query = queryService.newQuery("SELECT * FROM /users WHERE status = 'active'");
CqQuery cq = queryService.newCq("activeUsers", query, new CqListener() {
    @Override
    public void onEvent(CqEvent aCqEvent) {
        System.out.println("Query result changed: " + aCqEvent.getKey());
    }
    // ... other methods
});

cq.execute();
```

**When to use Apache Geode:**
- Need very low latency (<1ms)
- Require continuous query capabilities
- WAN replication across data centers
- Spring Boot applications
- Event-driven architectures

### 6. Amazon ElastiCache (Redis/Memcached)

**Overview:** Managed caching service by AWS

**Key Features:**
- Fully managed service
- Automatic failover
- Multi-AZ deployment
- Cluster mode
- Automatic backups
- Enhanced monitoring

```javascript
const Redis = require('ioredis');
const AWS = require('aws-sdk');

// Using ElastiCache Redis
const redis = new Redis({
  host: 'my-cluster.xxxxxx.0001.use1.cache.amazonaws.com',
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  tls: {} // Enable TLS for encryption
});

// Use it like regular Redis
await redis.set('key', 'value');
const value = await redis.get('key');

// ElastiCache Node.js SDK for management
const elasticache = new AWS.ElastiCache({ region: 'us-east-1' });

// Create cache cluster
elasticache.createReplicationGroup({
  ReplicationGroupId: 'my-cache-cluster',
  ReplicationGroupDescription: 'Production cache cluster',
  CacheNodeType: 'cache.m5.large',
  Engine: 'redis',
  EngineVersion: '6.x',
  NumCacheClusters: 3,
  AutomaticFailoverEnabled: true,
  SecurityGroupIds: ['sg-12345678']
}).promise();
```

**When to use Amazon ElastiCache:**
- Running on AWS
- Want fully managed service
- Need automatic failover
- Require compliance and security features
- Don't want to manage infrastructure

---

## Tool Comparison

### Q3: Compare caching tools with detailed analysis?

**Answer:**

### Comprehensive Comparison Table

| Feature | Redis | Memcached | Hazelcast | Ignite | Couchbase | Geode |
|---------|-------|-----------|-----------|--------|-----------|-------|
| **Data Types** | 5+ | String | 5+ | 5+ | Document | Object |
| **Persistence** | Yes | No | Yes | Yes | Yes | Yes |
| **Replication** | Yes | No | Yes | Yes | Yes | Yes |
| **Clustering** | Yes | No | Yes | Yes | Yes | Yes |
| **Sharding** | Yes | No | Yes | Yes | Yes | Yes |
| **Transactions** | Yes | No | Yes | Yes | Yes | Yes |
| **SQL Support** | Limited | No | Yes | Yes | Yes | No |
| **Latency** | 0.1-1ms | 0.05-0.1ms | 0.5-2ms | 1-5ms | 1-5ms | 0.5-2ms |
| **Throughput** | 100K+ ops/s | 200K+ ops/s | 50K+ ops/s | 100K+ ops/s | 50K+ ops/s | 100K+ ops/s |
| **Memory Efficiency** | High | Very High | Medium | Medium | Medium | Medium |
| **Language** | C | C | Java | Java | C/C++ | Java |
| **Community** | Very Large | Large | Medium | Medium | Medium | Small |
| **Ease of Use** | High | Very High | Medium | Medium | Medium | Medium |

### Performance Benchmarks

```javascript
// Benchmarking different caching solutions
async function benchmarkCacheSystems() {
  const operations = 100000;
  const key = 'benchmark:key';
  const value = { data: 'x'.repeat(1000) };
  const serializedValue = JSON.stringify(value);
  
  const benchmarks = [
    { name: 'Redis', client: redis },
    { name: 'Memcached', client: memcached }
  ];
  
  for (const benchmark of benchmarks) {
    const start = Date.now();
    
    // Write operations
    for (let i = 0; i < operations; i++) {
      await benchmark.client.set(`${key}:${i}`, serializedValue);
    }
    
    const writeTime = Date.now() - start;
    const writeOpsPerSec = operations / (writeTime / 1000);
    
    // Read operations
    const readStart = Date.now();
    for (let i = 0; i < operations; i++) {
      await benchmark.client.get(`${key}:${i}`);
    }
    
    const readTime = Date.now() - readStart;
    const readOpsPerSec = operations / (readTime / 1000);
    
    console.log(`${benchmark.name}:`);
    console.log(`  Write: ${writeOpsPerSec.toFixed(0)} ops/sec (${writeTime}ms)`);
    console.log(`  Read: ${readOpsPerSec.toFixed(0)} ops/sec (${readTime}ms)`);
  }
}

// Sample Results:
/*
Redis:
  Write: 85000 ops/sec (1176ms)
  Read: 95000 ops/sec (1052ms)

Memcached:
  Write: 180000 ops/sec (555ms)
  Read: 200000 ops/sec (500ms)
*/
```

### Cost Comparison

**TCO Analysis for 1TB Cache**

| Solution | Infrastructure | Management | Licensing | Total/Year |
|----------|---------------|------------|-----------|------------|
| **Redis (Self-hosted)** | $12,000 | $20,000 | $0 | $32,000 |
| **Memcached (Self-hosted)** | $10,000 | $15,000 | $0 | $25,000 |
| **Hazelcast** | $15,000 | $20,000 | $0 | $35,000 |
| **Apache Ignite** | $15,000 | $20,000 | $0 | $35,000 |
| **Couchbase Enterprise** | $20,000 | $10,000 | $30,000 | $60,000 |
| **Apache Geode** | $18,000 | $22,000 | $0 | $40,000 |
| **ElastiCache Redis** | $24,000 | $5,000 | $0 | $29,000 |

---

## Choosing the Right Tool

### Q4: How to choose the right caching tool for your use case?

**Answer:**

### Decision Tree

```
Start
  │
  ├─ Need persistence?
  │   ├─ Yes → Need transactions?
  │   │   ├─ Yes → Need SQL?
  │   │   │   ├─ Yes → Apache Ignite / Couchbase
  │   │   │   └─ No → Redis / Hazelcast / Geode
  │   │   └─ No → Redis / Memcached (with persistence)
  │   └─ No → Simple key-value?
  │       ├─ Yes → Memcached
  │       └─ No → Redis
  │
  ├─ Need complex data structures?
  │   ├─ Yes → Redis / Hazelcast / Geode
  │   └─ No → Memcached
  │
  ├─ Need SQL queries?
  │   ├─ Yes → Couchbase / Apache Ignite
  │   └─ No → Redis / Memcached / Hazelcast
  │
  ├─ Running on cloud?
  │   ├─ AWS → ElastiCache
  │   ├─ Azure → Azure Cache for Redis
  │   ├─ GCP → Memorystore
  │   └─ Self-hosted → Redis / Memcached
  │
  ├─ Application language?
  │   ├─ Java → Hazelcast / Ignite / Geode
  │   ├─ Node.js → Redis / Memcached
  │   ├─ Python → Redis / Memcached
  │   └─ Multi-language → Redis / Couchbase
  │
  └─ Budget constraints?
      ├─ Low → Redis (open source) / Memcached
      ├─ Medium → Hazelcast / Ignite / Geode
      └─ High → Couchbase Enterprise / Redis Enterprise
```

### Use Case-Based Selection

**1. Session Storage**
```
Requirements:
- Fast reads/writes
- TTL support
- Simple key-value
- Low cost

Best Choice: Memcached
  - Faster than Redis for simple operations
  - Lower memory overhead
  - Simpler to operate

Alternative: Redis
  - If you need additional features later
```

**2. E-commerce Product Cache**
```
Requirements:
- Complex data structures (products with variants, attributes)
- Persistence
- Fast lookups
- Search capabilities

Best Choice: Redis
  - Hashes for product attributes
  - Sorted sets for rankings
  - Sets for categories
  - Persistence with RDB/AOF

Alternative: Couchbase
  - If you need SQL-like queries
```

**3. Real-time Leaderboard**
```
Requirements:
- Sorted data structures
- Atomic updates
- Fast rank queries
- High concurrency

Best Choice: Redis
  - Sorted sets perfect for leaderboards
  - Atomic increment operations
  - ZRANGE/ZREVRANGE for rankings
```

```javascript
// Leaderboard implementation with Redis
class Leaderboard {
  constructor(redis, key) {
    this.redis = redis;
    this.key = key;
  }
  
  async addScore(playerId, score) {
    return await this.redis.zadd(this.key, score, playerId);
  }
  
  async getRank(playerId) {
    const rank = await this.redis.zrevrank(this.key, playerId);
    return rank !== null ? rank + 1 : null; // 1-based rank
  }
  
  async getTopPlayers(limit = 10) {
    return await this.redis.zrevrange(
      this.key, 0, limit - 1, 'WITHSCORES'
    );
  }
  
  async getPlayersAroundRank(rank, range = 5) {
    const start = Math.max(0, rank - 1 - range);
    const end = rank - 1 + range;
    return await this.redis.zrevrange(
      this.key, start, end, 'WITHSCORES'
    );
  }
}

// Usage
const leaderboard = new Leaderboard(redis, 'game:leaderboard');

await leaderboard.addScore('player1', 1000);
await leaderboard.addScore('player2', 1500);
await leaderboard.addScore('player3', 1200);

console.log(await leaderboard.getRank('player2')); // 1
console.log(await leaderboard.getTopPlayers(3));
// [['player2', '1500'], ['player3', '1200'], ['player1', '1000']]
```

**4. Rate Limiting**
```
Requirements:
- Counter increments
- Window-based limits
- Distributed
- High performance

Best Choice: Redis
  - INCR for atomic increments
  - EXPIRE for sliding windows
  - Lua scripts for complex rate limiting
```

```javascript
// Rate limiter with Redis
class RateLimiter {
  constructor(redis) {
    this.redis = redis;
  }
  
  async checkLimit(key, maxRequests, windowSeconds) {
    const luaScript = `
      local current = redis.call('incr', KEYS[1])
      if current == 1 then
        redis.call('expire', KEYS[1], ARGV[1])
      end
      
      if current > tonumber(ARGV[2]) then
        return {0, redis.call('pttl', KEYS[1])}
      else
        return {1, redis.call('pttl', KEYS[1])}
      end
    `;
    
    const result = await this.redis.eval(
      luaScript,
      1,
      key,
      windowSeconds,
      maxRequests
    );
    
    return {
      allowed: result[0] === 1,
      ttl: result[1]
    };
  }
}

// Usage: 100 requests per minute
const rateLimiter = new RateLimiter(redis);
const { allowed, ttl } = await rateLimiter.checkLimit(
  'user:123:api',
  100,
  60
);

if (!allowed) {
  console.log(`Rate limited. Retry in ${ttl}ms`);
}
```

**5. Pub/Sub Messaging**
```
Requirements:
- Real-time messaging
- Multiple subscribers
- Pattern matching
- High throughput

Best Choice: Redis
  - Native pub/sub support
  - Pattern subscriptions
  - Simple API

Alternative: Hazelcast
  - If you need reliability guarantees
  - In a Java ecosystem
```

**6. Distributed Locking**
```
Requirements:
- Mutual exclusion
- Automatic expiration
- High availability
- Performance

Best Choice: Redis
  - SET with NX and EX options
  - Redlock algorithm for distributed locks
```

```javascript
// Distributed lock with Redis (Redlock)
class DistributedLock {
  constructor(redis, key, ttl = 10000) {
    this.redis = redis;
    this.key = `lock:${key}`;
    this.ttl = ttl;
    this.token = this.generateToken();
  }
  
  generateToken() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async acquire() {
    const result = await this.redis.set(
      this.key,
      this.token,
      'PX',
      this.ttl,
      'NX'
    );
    
    return result === 'OK';
  }
  
  async release() {
    const luaScript = `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
      else
        return 0
      end
    `;
    
    const result = await this.redis.eval(
      luaScript,
      1,
      this.key,
      this.token
    );
    
    return result === 1;
  }
  
  async extend() {
    const luaScript = `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('pexpire', KEYS[1], ARGV[2])
      else
        return 0
      end
    `;
    
    const result = await this.redis.eval(
      luaScript,
      1,
      this.key,
      this.token,
      this.ttl
    );
    
    return result === 1;
  }
}

// Usage
async function withLock(key, callback) {
  const lock = new DistributedLock(redis, key, 10000);
  
  if (!await lock.acquire()) {
    throw new Error('Could not acquire lock');
  }
  
  try {
    return await callback();
  } finally {
    await lock.release();
  }
}

// Example
await withLock('resource:123', async () => {
  // Critical section - only one process can execute this
  console.log('Lock acquired, processing...');
  await performCriticalOperation();
});
```

---

## Implementation Examples

### Q5: Provide production-ready implementations for different tools?

**Answer:**

### Redis Implementation

```javascript
const Redis = require('ioredis');

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
      enableOfflineQueue: true
    });
    
    this.defaultTTL = options.defaultTTL || 3600;
    this.setupErrorHandling();
  }
  
  setupErrorHandling() {
    this.redis.on('error', (error) => {
      console.error('Redis error:', error);
    });
    
    this.redis.on('close', () => {
      console.log('Redis connection closed');
    });
    
    this.redis.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });
  }
  
  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }
  
  async set(key, value, ttl = null) {
    try {
      const serialized = JSON.stringify(value);
      const finalTTL = ttl || this.defaultTTL;
      await this.redis.set(key, serialized, 'EX', finalTTL);
      return true;
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  }
  
  async del(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error(`Redis del error for key ${key}:`, error);
      return false;
    }
  }
  
  async getOrSet(key, fetcher, ttl = null) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }
  
  async mget(keys) {
    try {
      const values = await this.redis.mget(keys);
      return values.map(v => v ? JSON.parse(v) : null);
    } catch (error) {
      console.error('Redis mget error:', error);
      return keys.map(() => null);
    }
  }
  
  async mset(keyValuePairs) {
    try {
      const pipeline = this.redis.pipeline();
      for (const [key, value] of Object.entries(keyValuePairs)) {
        pipeline.set(key, JSON.stringify(value), 'EX', this.defaultTTL);
      }
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Redis mset error:', error);
      return false;
    }
  }
  
  async close() {
    await this.redis.quit();
  }
}

module.exports = RedisCache;
```

### Memcached Implementation

```javascript
const Memcached = require('memcached');

class MemcachedCache {
  constructor(options = {}) {
    const locations = options.locations || ['localhost:11211'];
    
    this.memcached = new Memcached(locations, {
      maxKeySize: 250,
      maxValue: 1048576,
      maxExpiration: 2592000,
      poolSize: options.poolSize || 10,
      reconnect: 10000,
      timeout: 5000,
      retries: 2,
      retry: 10000,
      remove: false,
      idle: 5000,
      failOverServers: options.failOverServers || []
    });
    
    this.defaultTTL = options.defaultTTL || 3600;
  }
  
  async get(key) {
    return new Promise((resolve, reject) => {
      this.memcached.get(key, (err, data) => {
        if (err) {
          console.error(`Memcached get error for key ${key}:`, err);
          resolve(null);
          return;
        }
        
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (e) {
          console.error(`Memcached parse error for key ${key}:`, e);
          resolve(null);
        }
      });
    });
  }
  
  async set(key, value, ttl = null) {
    return new Promise((resolve, reject) => {
      const serialized = JSON.stringify(value);
      const finalTTL = ttl || this.defaultTTL;
      
      this.memcached.set(key, serialized, finalTTL, (err) => {
        if (err) {
          console.error(`Memcached set error for key ${key}:`, err);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }
  
  async del(key) {
    return new Promise((resolve, reject) => {
      this.memcached.del(key, (err) => {
        if (err) {
          console.error(`Memcached del error for key ${key}:`, err);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }
  
  async mget(keys) {
    return new Promise((resolve, reject) => {
      this.memcached.getMulti(keys, (err, data) => {
        if (err) {
          console.error('Memcached mget error:', err);
          resolve(keys.map(() => null));
          return;
        }
        
        try {
          const results = keys.map(key => {
            const value = data[key];
            return value ? JSON.parse(value) : null;
          });
          resolve(results);
        } catch (e) {
          console.error('Memcached mget parse error:', e);
          resolve(keys.map(() => null));
        }
      });
    });
  }
  
  async end() {
    this.memcached.end();
  }
}

module.exports = MemcachedCache;
```

---

## Real-world Scenarios

### Q6: Provide real-world case studies and implementations?

**Answer:**

### Case Study 1: E-commerce Platform Caching Strategy

**Challenge:** High-traffic e-commerce site with 10M daily users, 50K+ products

**Solution: Multi-layer caching with Redis**

```javascript
class ECommerceCache {
  constructor() {
    this.redis = new Redis();
    this.localCache = new Map();
  }
  
  // Product cache with hierarchical keys
  async getProduct(productId) {
    const productKey = `product:${productId}`;
    
    // L1: Local cache
    if (this.localCache.has(productKey)) {
      return this.localCache.get(productKey);
    }
    
    // L2: Redis cache
    const cached = await this.redis.get(productKey);
    if (cached) {
      const product = JSON.parse(cached);
      this.localCache.set(productKey, product);
      return product;
    }
    
    // L3: Database
    const product = await this.fetchProductFromDB(productId);
    
    // Cache with different TTLs
    await this.redis.set(productKey, JSON.stringify(product), 'EX', 3600); // 1 hour
    await this.redis.set(`${productKey}:price`, product.price, 'EX', 300); // 5 minutes
    await this.redis.set(`${productKey}:stock`, product.stock, 'EX', 60); // 1 minute
    
    this.localCache.set(productKey, product);
    return product;
  }
  
  // Category page cache with precomputed data
  async getCategoryProducts(categoryId, page = 1) {
    const cacheKey = `category:${categoryId}:page:${page}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const products = await this.fetchCategoryProductsFromDB(categoryId, page);
    
    // Cache with shorter TTL for category pages
    await this.redis.set(cacheKey, JSON.stringify(products), 'EX', 1800); // 30 min
    
    return products;
  }
  
  // Shopping cart cache with session ID
  async getCart(sessionId) {
    const cartKey = `cart:${sessionId}`;
    const cached = await this.redis.hgetall(cartKey);
    return cached;
  }
  
  async addToCart(sessionId, productId, quantity) {
    const cartKey = `cart:${sessionId}`;
    await this.redis.hincrby(cartKey, productId, quantity);
    await this.redis.expire(cartKey, 86400); // 24 hours
  }
  
  // Rate limiting for checkout API
  async checkCheckoutRateLimit(userId) {
    const limiterKey = `ratelimit:checkout:${userId}`;
    const limit = 10; // 10 checkouts per hour
    
    const luaScript = `
      local current = redis.call('incr', KEYS[1])
      if current == 1 then
        redis.call('expire', KEYS[1], 3600)
      end
      return current
    `;
    
    const current = await this.redis.eval(luaScript, 1, limiterKey);
    
    return current <= limit;
  }
  
  // Real-time inventory tracking
  async updateInventory(productId, delta) {
    const inventoryKey = `inventory:${productId}`;
    
    const luaScript = `
      local key = KEYS[1]
      local delta = tonumber(ARGV[1])
      local newStock = redis.call('hincrby', key, 'stock', delta)
      redis.call('hset', key, 'updatedAt', ARGV[2])
      return newStock
    `;
    
    const newStock = await this.redis.eval(
      luaScript,
      1,
      inventoryKey,
      delta,
      Date.now()
    );
    
    return newStock;
  }
  
  // Search suggestions cache
  async getSearchSuggestions(query) {
    const suggestionKey = `search:suggestions:${query.toLowerCase()}`;
    
    const cached = await this.redis.zrevrange(suggestionKey, 0, 9);
    if (cached.length > 0) {
      return cached;
    }
    
    const suggestions = await this.fetchSuggestionsFromDB(query);
    
    // Cache with scores based on frequency
    const pipeline = this.redis.pipeline();
    suggestions.forEach((suggestion, index) => {
      pipeline.zadd(suggestionKey, suggestions.length - index, suggestion);
    });
    pipeline.expire(suggestionKey, 3600);
    await pipeline.exec();
    
    return suggestions;
  }
}
```

### Case Study 2: Social Media Feed Caching

**Challenge:** Real-time feed with millions of posts, millions of users

**Solution: Redis Lists and Sorted Sets**

```javascript
class SocialFeedCache {
  constructor() {
    this.redis = new Redis();
  }
  
  // Add post to user's timeline
  async addPostToTimeline(userId, post) {
    const timelineKey = `timeline:${userId}`;
    const postKey = `post:${post.id}`;
    
    // Store post data
    await this.redis.set(postKey, JSON.stringify(post), 'EX', 604800); // 7 days
    
    // Add to timeline (sorted by timestamp)
    await this.redis.zadd(timelineKey, post.timestamp, post.id);
    
    // Trim timeline to last 1000 posts
    await this.redis.zremrangebyrank(timelineKey, 0, -1001);
    
    // Invalidate cache
    await this.redis.del(`timeline:${userId}:cached`);
  }
  
  // Get user's timeline
  async getTimeline(userId, page = 1, pageSize = 20) {
    const timelineKey = `timeline:${userId}`;
    const cachedKey = `timeline:${userId}:cached:page:${page}`;
    
    // Check if page is cached
    const cached = await this.redis.get(cachedKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Get post IDs from timeline
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    
    const postIds = await this.redis.zrevrange(timelineKey, start, end);
    
    if (postIds.length === 0) {
      return [];
    }
    
    // Fetch posts in pipeline
    const pipeline = this.redis.pipeline();
    postIds.forEach(postId => {
      pipeline.get(`post:${postId}`);
    });
    
    const results = await pipeline.exec();
    const posts = results
      .map(result => result[1] ? JSON.parse(result[1]) : null)
      .filter(post => post !== null);
    
    // Cache the page
    await this.redis.set