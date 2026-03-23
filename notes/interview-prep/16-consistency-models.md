# Consistency Models in Distributed Systems
## For 10+ Years Experienced Node.js Developer

---

## Table of Contents
1. [CAP Theorem & PACELC](#cap-theorem--pacelc)
2. [Consistency Levels](#consistency-levels)
3. [Consistency Models](#consistency-models)
4. [Implementation Patterns](#implementation-patterns)
5. [Distributed Transactions](#distributed-transactions)
6. [Consistency in Practice](#consistency-in-practice)
7. [Trade-offs & Decision Making](#trade-offs--decision-making)

---

## CAP Theorem & PACELC

### Q1: Explain the CAP theorem and how it influences system design decisions.

**Answer:**

**CAP Theorem states that a distributed system can provide at most two of the following three guarantees:**

**1. Consistency (C)**
- All nodes see the same data at the same time
- Every read receives the most recent write or an error
- Linearizability

**2. Availability (A)**
- Every request receives a (non-error) response
- System remains operational despite node failures
- No guarantees about response freshness

**3. Partition Tolerance (P)**
- System continues operating despite network partitions
- Messages may be lost or delayed between nodes
- Required for distributed systems

```javascript
/**
 * CAP Trade-offs in Practice
 */

class CAPSystemDesign {
  // CP: Consistency + Partition Tolerance (Sacrifice Availability)
  static cpSystem() {
    return {
      examples: [
        'Traditional RDBMS with synchronous replication',
        'HBase',
        'MongoDB with majority write concern',
        'Redis Cluster with WAIT command'
      ],
      
      characteristics: {
        writes: 'May fail during partition',
        reads: 'Always return latest committed data',
        availability: 'Reduced during partitions'
      },

      useWhen: [
        'Financial transactions',
        'Inventory management',
        'User authentication',
        'Order processing'
      ],

      implementation: `
// MongoDB CP Configuration
await db.collection('orders').insertOne(order, {
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 5000
  }
});

// If majority unavailable, write fails
      `
    };
  }

  // AP: Availability + Partition Tolerance (Sacrifice Consistency)
  static apSystem() {
    return {
      examples: [
        'Cassandra',
        'DynamoDB',
        'CouchDB',
        'DNS system',
        'Social media feeds'
      ],

      characteristics: {
        writes: 'Always succeed locally',
        reads: 'May return stale data',
        availability: 'High, even during partitions'
      },

      useWhen: [
        'User profiles',
        'Content delivery',
        'Analytics and metrics',
        'Social media posts',
        'Product catalogs'
      ],

      implementation: `
// Cassandra AP Configuration
const query = 'INSERT INTO posts (id, user_id, content) VALUES (?, ?, ?)';
await client.execute(query, [postId, userId, content], {
  consistency: types.consistencies.localQuorum
  // Writes succeed even if some nodes unavailable
});

// Reads may return stale data
await client.execute('SELECT * FROM posts WHERE id = ?', [postId], {
  consistency: types.consistencies.one
});
      `
    };
  }

  // CA: Consistency + Availability (Sacrifice Partition Tolerance)
  static caSystem() {
    return {
      examples: [
        'Single-node RDBMS',
        'RDBMS with synchronous replication in single data center',
        'Legacy monolithic applications'
      ],

      characteristics: {
        writes: 'ACID compliant',
        reads: 'Always consistent',
        availability: 'High within single network',
        partition: 'System fails if partition occurs'
      },

      limitations: [
        'Cannot handle network partitions',
        'Single point of failure',
        'Limited scalability'
      ],

      useWhen: [
        'Small-scale applications',
        'Single data center deployments',
        'Systems where partition tolerance not required'
      ]
    };
  }
}
```

**PACELC: Extension of CAP**

```javascript
/**
 * PACELC Theorem
 * 
 * If there is a Partition (P), how does the system trade off
 * Availability (A) and Consistency (C)?
 * 
 * Else (E), when the system is running normally,
 * how does it trade off Latency (L) and Consistency (C)?
 */

class PACELCDesign {
  // PC/EC: Consistency over Availability and Latency
  static pcEcSystem() {
    return {
      choices: {
        partition: 'Consistency over Availability',
        normal: 'Consistency over Latency'
      },
      examples: [
        'Traditional RDBMS with synchronous replication',
        'HBase with strong consistency'
      ],
      characteristics: {
        duringPartition: 'Reject writes to maintain consistency',
        normalOperation: 'Higher latency for synchronous replication'
      }
    };
  }

  // PA/EC: Availability over Partition, Consistency over Latency
  static paEcSystem() {
    return {
      choices: {
        partition: 'Availability over Consistency',
        normal: 'Consistency over Latency'
      },
      examples: [
        'Cassandra with QUORUM reads/writes',
        'MongoDB with majority concern'
      ],
      characteristics: {
        duringPartition: 'Accept writes, reconcile later',
        normalOperation: 'Higher latency for consensus'
      }
    };
  }

  // PA/EL: Availability over Partition and Latency
  static paElSystem() {
    return {
      choices: {
        partition: 'Availability over Consistency',
        normal: 'Latency over Consistency'
      },
      examples: [
        'DynamoDB with eventual consistency',
        'Cassandra with ONE consistency',
        'CouchDB'
      ],
      characteristics: {
        duringPartition: 'All writes succeed locally',
        normalOperation: 'Low latency, eventual consistency'
      }
    };
  }
}
```

---

## Consistency Levels

### Q2: What are the different consistency levels and when would you use each?

**Answer:**

**Consistency Levels (Weakest to Strongest):**

```javascript
class ConsistencyLevels {
  // 1. Eventual Consistency
  static eventualConsistency() {
    return {
      definition: 'All nodes eventually converge to the same value',
      timeline: 'No guarantee on when convergence happens',
      characteristics: {
        writes: 'Always succeed',
        reads: 'May return stale data',
        window: 'Milliseconds to seconds'
      },

      implementations: {
        dynamoDB: {
          consistency: 'Eventual',
          readCapacity: 'Reads from any replica',
          latency: 'Very low (1-5ms)'
        },

        cassandra: {
          consistency: 'ONE or LOCAL_ONE',
          readCapacity: 'Read from single node',
          latency: 'Very low'
        }
      },

      useCases: [
        'Social media feeds',
        'Product catalogs',
        'User activity logs',
        'Analytics dashboards',
        'Recommendation engines'
      ],

      codeExample: `
// DynamoDB with eventual consistency
const result = await dynamodb.getItem({
  TableName: 'products',
  Key: { productId: '123' },
  ConsistentRead: false // Default - eventual consistency
});

// Cassandra with ONE consistency
const query = 'SELECT * FROM products WHERE id = ?';
await client.execute(query, [productId], {
  consistency: types.consistencies.one
});
      `
    };
  }

  // 2. Read-after-Write Consistency
  static readAfterWriteConsistency() {
    return {
      definition: 'After a write, subsequent reads reflect that write',
      scope: 'Single user/context',
      timeline: 'Immediate for the writer',

      implementations: {
        dynamoDB: {
          consistentRead: true,
          behavior: 'Reads from leader replica',
          cost: 'Double read capacity units',
          latency: 'Higher (5-10ms)'
        },

        cassandra: {
          consistency: 'QUORUM for read and write',
          behavior: 'Ensures latest write',
          availability: 'Reduced during failures'
        }
      },

      useCases: [
        'User profile updates',
        'Shopping cart contents',
        'Document editing',
        'Configuration changes'
      ],

      codeExample: `
// DynamoDB with consistent reads
const result = await dynamodb.getItem({
  TableName: 'users',
  Key: { userId: 'user-123' },
  ConsistentRead: true // Strong consistency for this user
});

// Ensure user sees their own updates
      `
    };
  }

  // 3. Monotonic Reads
  static monotonicReads() {
    return {
      definition: 'If you read value X, subsequent reads return X or newer',
      scope: 'Single client session',
      timeline: 'No "going back in time"',

      implementation: `
class MonotonicReadCache {
  constructor() {
    this.sessionVersions = new Map();
  }

  async read(key, clientId) {
    // Get last read version for this client
    const lastVersion = this.sessionVersions.get(clientId) || 0;
    
    // Read from database
    const result = await db.query(
      'SELECT * FROM data WHERE key = $1 AND version >= $2',
      [key, lastVersion]
    );

    // Update client's version
    if (result.length > 0) {
      this.sessionVersions.set(clientId, result[0].version);
    }

    return result;
  }

  async write(key, value) {
    const version = Date.now();
    await db.query(
      'INSERT INTO data (key, value, version) VALUES ($1, $2, $3)',
      [key, value, version]
    );
    return version;
  }
}
      `,

      useCases: [
        'Pagination',
        'Real-time dashboards',
        'Chat applications',
        'Live updates'
      ]
    };
  }

  // 4. Bounded Staleness
  static boundedStaleness() {
    return {
      definition: 'Data is at most K versions or T time units stale',
      parameters: {
        version: 'Max acceptable version lag',
        time: 'Max acceptable time lag (e.g., 5 seconds)'
      },

      implementation: `
class BoundedStalenessCache {
  constructor(stalenessThreshold = 5000) {
    this.stalenessThreshold = stalenessThreshold;
  }

  async read(key) {
    // Try cache first
    const cached = await this.cache.get(key);
    
    if (cached) {
      const age = Date.now() - cached.timestamp;
      
      if (age < this.stalenessThreshold) {
        // Return cached data if within threshold
        return cached.data;
      } else {
        // Stale - refresh in background
        this.refreshInBackground(key);
        return cached.data; // Return stale data
      }
    }
    
    // Cache miss - fetch from DB
    return this.freshRead(key);
  }

  async refreshInBackground(key) {
    const freshData = await this.freshRead(key);
    return freshData;
  }

  async freshRead(key) {
    const data = await db.query('SELECT * FROM data WHERE key = $1', [key]);
    
    await this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }
}
      `,

      useCases: [
        'Financial tickers',
        'Leaderboards',
        'Activity feeds',
        'Analytics dashboards'
      ]
    };
  }

  // 5. Causal Consistency
  static causalConsistency() {
    return {
      definition: 'Causally related operations seen in order by all nodes',
      concept: 'Happens-before relationship',
      guarantee: 'Preserves cause-effect relationships',

      implementation: `
class CausalConsistency {
  constructor() {
    this.vectorClocks = new Map();
    this.pendingOps = new Map();
  }

  async write(key, value, clientId, dependencies = []) {
    const clock = this.getVectorClock(clientId);
    
    // Update vector clock
    clock[clientId] = (clock[clientId] || 0) + 1;
    
    // Create operation with dependencies
    const operation = {
      key,
      value,
      clientId,
      version: clock[clientId],
      dependencies,
      timestamp: Date.now()
    };

    // Persist operation
    await this.logOperation(operation);
    
    return operation;
  }

  async read(key, clientId) {
    const operations = await this.getOperations(key);
    const clientClock = this.getVectorClock(clientId);
    
    // Filter operations that are causally ready
    const readyOps = operations.filter(op => {
      return this.isCausallyReady(op, clientClock);
    });

    // Apply operations in causal order
    let result = null;
    for (const op of readyOps.sort(this.causalOrder)) {
      result = op.value;
      // Update client's clock
      clientClock[op.clientId] = Math.max(
        clientClock[op.clientId] || 0,
        op.version
      );
    }

    return result;
  }

  isCausallyReady(operation, clientClock) {
    for (const dep of operation.dependencies) {
      const clientVersion = clientClock[dep.clientId] || 0;
      if (clientVersion < dep.version) {
        return false; // Dependency not satisfied
      }
    }
    return true;
  }

  causalOrder(a, b) {
    // Compare dependencies
    for (const dep of a.dependencies) {
      if (dep.clientId === b.clientId && dep.version >= b.version) {
        return -1; // A depends on B, A comes first
      }
    }
    return 0;
  }

  getVectorClock(clientId) {
    if (!this.vectorClocks.has(clientId)) {
      this.vectorClocks.set(clientId, {});
    }
    return this.vectorClocks.get(clientId);
  }
}
      `,

      useCases: [
        'Collaborative editing',
        'Social media comments',
        'Messaging systems',
        'Distributed version control'
      ]
    };
  }

  // 6. Strong Consistency (Linearizability)
  static strongConsistency() {
    return {
      definition: 'Operations appear to execute atomically at a single point in time',
      guarantees: [
        'Latest write visible to all reads',
        'Total order of operations',
        'No stale reads ever'
      ],

      implementations: {
        zookeeper: {
          consensus: 'ZAB protocol',
          writes: 'Leader-based',
          reads: 'From leader or synchronized followers'
        },

        etcd: {
          consensus: 'Raft protocol',
          writes: 'Require quorum',
          reads: 'Linearizable reads from leader'
        },

        redisRedlock: {
          consensus: 'Distributed lock',
          writes: 'Require majority of locks',
          reads: 'From lock holder'
        }
      },

      useCases: [
        'Financial transactions',
        'Inventory management',
        'Authentication',
        'Configuration management',
        'Leader election'
      ],

      codeExample: `
// ZooKeeper with strong consistency
const zk = await Zookeeper.createClient('localhost:2181');

// Create znode (atomic operation)
await zk.create('/config/app', JSON.stringify(config));

// Read (always latest)
const data = await zk.getData('/config/app');

// Etcd with strong consistency
const client = new Etcd3();

// Strong consistency write
await client.put('/config/app')
  .value(JSON.stringify(config));

// Linearizable read (from leader)
const config = await client.get('/config/app')
  .serializable(true);
      `
    };
  }
}
```

---

## Consistency Models

### Q3: Explain different consistency models and provide real-world examples.

**Answer:**

**Consistency Models Hierarchy:**

```javascript
class ConsistencyModels {
  // 1. Strict Consistency
  static strictConsistency() {
    return {
      definition: 'Any read returns most recent write globally',
      requirement: 'Global synchronized clock',
      guarantee: 'Impossible to implement in distributed systems',
      
      characteristics: {
        timeline: 'Absolute global time',
        ordering: 'Total order across all operations',
        implementation: 'Theoretical only'
      },

      whyNotPossible: [
        'Network latency prevents global synchronization',
        'Clock skew across nodes',
        'CAP theorem prevents CP in real systems'
      ]
    };
  }

  // 2. Sequential Consistency
  static sequentialConsistency() {
    return {
      definition: 'Operations seen in same order by all processes',
      keyPoint: 'Order preserved, but not necessarily real-time',
      
      implementation: `
class SequentialConsistency {
  constructor() {
    this.globalLog = [];
    this.processLog = new Map();
  }

  async write(key, value, processId) {
    const operation = {
      type: 'write',
      key,
      value,
      processId,
      timestamp: Date.now()
    };

    // Append to global log
    this.globalLog.push(operation);
    
    // Broadcast to all processes
    await this.broadcast(operation);
  }

  async read(key, processId) {
    const processOps = this.processLog.get(processId) || [];
    
    // Find latest write for this key
    const latestWrite = [...processOps]
      .reverse()
      .find(op => op.type === 'write' && op.key === key);
    
    return latestWrite ? latestWrite.value : null;
  }

  async broadcast(operation) {
    // Broadcast to all processes (eventually)
    for (const [pid, ops] of this.processLog.entries()) {
      ops.push(operation);
    }
  }
}
      `,

      useCases: [
        'Debugging distributed systems',
        'Testing frameworks',
        'Theoretical models'
      ],

      challenges: [
        'Requires global ordering',
        'Performance bottleneck',
        'Complex to implement at scale'
      ]
    };
  }

  // 3. Causal Consistency
  static causalConsistency() {
    return {
      definition: 'Causally related operations seen in correct order',
      keyPoint: 'Preserves cause-effect relationships',
      
      realWorldExample: `
// Social Media Example
// User A posts, then User B comments on A's post
// All users should see B's comment only after seeing A's post

class SocialMediaCausal {
  async createPost(userId, content) {
    const postId = uuid();
    const vectorClock = this.getVectorClock();
    
    const post = {
      id: postId,
      userId,
      content,
      vectorClock: { ...vectorClock },
      timestamp: Date.now()
    };

    vectorClock[userId] = (vectorClock[userId] || 0) + 1;
    
    await this.storePost(post);
    await this.broadcastPost(post);
    
    return post;
  }

  async addComment(postId, userId, content) {
    const post = await this.getPost(postId);
    const vectorClock = post.vectorClock;
    
    const comment = {
      id: uuid(),
      postId,
      userId,
      content,
      vectorClock: { ...vectorClock },
      dependencies: [{ operation: post.id, clock: post.vectorClock }],
      timestamp: Date.now()
    };

    vectorClock[userId] = (vectorClock[userId] || 0) + 1;
    
    await this.storeComment(comment);
    
    return comment;
  }

  async getFeed(userId) {
    const posts = await this.getAllPosts();
    const userClock = this.getUserVectorClock(userId);
    
    // Filter causally ready posts
    const readyPosts = posts.filter(post => {
      return this.isCausallyReady(post.vectorClock, userClock);
    });

    return readyPosts;
  }

  isCausallyReady(postClock, userClock) {
    for (const [process, version] of Object.entries(postClock)) {
      if ((userClock[process] || 0) < version) {
        return false; // Missing dependency
      }
    }
    return true;
  }
}
      `,

      useCases: [
        'Collaborative documents',
        'Social media feeds',
        'Version control systems',
        'Messaging applications'
      ]
    };
  }

  // 4. FIFO Consistency
  static fifoConsistency() {
    return {
      definition: 'Writes from same process seen in order',
      keyPoint: 'Per-process ordering, not global ordering',
      
      implementation: `
class FIFOConsistency {
  constructor() {
    this.processSequences = new Map();
    this.operations = [];
  }

  async write(key, value, processId) {
    const sequence = (this.processSequences.get(processId) || 0) + 1;
    this.processSequences.set(processId, sequence);

    const operation = {
      key,
      value,
      processId,
      sequence,
      timestamp: Date.now()
    };

    this.operations.push(operation);
    await this.persist(operation);
  }

  async read(key, processId) {
    const operations = this.operations
      .filter(op => op.key === key)
      .sort((a, b) => {
        // FIFO ordering: same process in sequence order
        if (a.processId === b.processId) {
          return a.sequence - b.sequence;
        }
        // Different processes: any order
        return 0;
      });

    const latest = operations[operations.length - 1];
    return latest ? latest.value : null;
  }
}
      `,

      useCases: [
        'Simple message queues',
        'Per-user data streams',
        'Logging systems'
      ]
    };
  }

  // 5. Weak Consistency
  static weakConsistency() {
    return {
      definition: 'No guarantees on order or visibility',
      keyPoint: 'Best effort delivery',
      
      characteristics: {
        writes: 'May not be visible to other processes',
        reads: 'May return stale data',
        ordering: 'No ordering guarantees',
        timeline: 'No timeline guarantees'
      },

      implementation: `
class WeakConsistency {
  constructor() {
    this.localCache = new Map();
  }

  async write(key, value, processId) {
    // Write to local cache only
    this.localCache.set(key, {
      value,
      processId,
      timestamp: Date.now()
    });

    // Eventually propagate to other processes
    setImmediate(() => {
      this.propagate(key, value, processId);
    });
  }

  async read(key, processId) {
    // Read from local cache
    const local = this.localCache.get(key);
    
    if (local) {
      return local.value;
    }

    // Try remote caches
    return this.readRemote(key);
  }

  async propagate(key, value, processId) {
    // Eventually propagate to other processes
    // No guarantee of when or if successful
    await this.broadcastToOtherProcesses(key, value, processId);
  }
}
      `,

      useCases: [
        'DNS caching',
        'Web caching',
        'CDN edge caches',
        'Replicated databases'
      ]
    };
  }

  // 6. Release Consistency
  static releaseConsistency() {
    return {
      definition: 'Updates propagated on release',
      keyPoint: 'Lazy propagation',
      
      implementation: `
class ReleaseConsistency {
  constructor() {
    this.localCache = new Map();
    this.pendingUpdates = new Map();
    this.locks = new Map();
  }

  async acquireLock(key, processId) {
    while (this.locks.has(key)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.locks.set(key, processId);
  }

  async releaseLock(key, processId) {
    // Propagate pending updates on release
    const updates = this.pendingUpdates.get(processId) || [];
    
    for (const update of updates) {
      await this.propagate(update.key, update.value, processId);
    }
    
    this.pendingUpdates.delete(processId);
    this.locks.delete(key);
  }

  async write(key, value, processId) {
    await this.acquireLock(key, processId);
    
    try {
      // Update local cache immediately
      this.localCache.set(key, {
        value,
        processId,
        timestamp: Date.now()
      });

      // Queue for propagation on release
      const updates = this.pendingUpdates.get(processId) || [];
      updates.push({ key, value });
      this.pendingUpdates.set(processId, updates);
    } finally {
      await this.releaseLock(key, processId);
    }
  }

  async read(key, processId) {
    return this.localCache.get(key)?.value;
  }
}
      `,

      useCases: [
        'Distributed shared memory',
        'Parallel computing',
        'Cache coherence protocols'
      ]
    };
  }
}
```

---

## Implementation Patterns

### Q4: How do you implement consistency patterns in Node.js applications?

**Answer:**

**1. Two-Phase Commit (2PC)**

```javascript
class TwoPhaseCommit {
  constructor(participants) {
    this.participants = participants;
    this.transactionLog = [];
  }

  async beginTransaction(transactionId) {
    this.transactionLog.push({
      id: transactionId,
      status: 'PENDING',
      participants: this.participants,
      timestamp: Date.now()
    });

    return transactionId;
  }

  async prepare(transactionId) {
    const transaction = this.transactionLog.find(t => t.id === transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    transaction.status = 'PREPARING';

    // Prepare all participants
    const preparePromises = transaction.participants.map(participant => 
      participant.prepare(transactionId).catch(error => ({
        participant: participant.name,
        success: false,
        error: error.message
      }))
    );

    const results = await Promise.all(preparePromises);
    
    // Check if all participants prepared successfully
    const allPrepared = results.every(r => r.success !== false);

    if (allPrepared) {
      transaction.status = 'PREPARED';
      return true;
    } else {
      transaction.status = 'ABORTED';
      await this.abort(transactionId);
      throw new Error('Prepare phase failed');
    }
  }

  async commit(transactionId) {
    const transaction = this.transactionLog.find(t => t.id === transactionId);
    
    if (!transaction || transaction.status !== 'PREPARED') {
      throw new Error('Transaction not in prepared state');
    }

    transaction.status = 'COMMITTING';

    // Commit all participants
    const commitPromises = transaction.participants.map(participant => 
      participant.commit(transactionId).catch(error => ({
        participant: participant.name,
        success: false,
        error: error.message
      }))
    );

    const results = await Promise.allSettled(commitPromises);
    
    // Check for failures
    const failures = results.filter(r => r.status === 'rejected');
    
    if (failures.length > 0) {
      transaction.status = 'COMMIT_FAILED';
      console.error('Commit failures:', failures);
      // Implement retry or compensation logic
    } else {
      transaction.status = 'COMMITTED';
    }

    return results;
  }

  async abort(transactionId) {
    const transaction = this.transactionLog.find(t => t.id === transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    transaction.status = 'ABORTING';

    // Abort all participants
    const abortPromises = transaction.participants.map(participant => 
      participant.abort(transactionId).catch(error => {
        console.error(`Abort failed for ${participant.name}:`, error);
      })
    );

    await Promise.allSettled(abortPromises);
    transaction.status = 'ABORTED';

    return true;
  }
}

// Example: Financial transaction using 2PC
class BankAccount {
  constructor(name, balance, db) {
    this.name = name;
    this.balance = balance;
    this.db = db;
  }

  async prepare(transactionId) {
    console.log(`[${this.name}] Preparing transaction ${transactionId}`);
    
    // Check if sufficient funds
    if (this.balance < 0) {
      throw new Error('Insufficient funds');
    }

    // Lock funds
    await this.db.query(
      'INSERT INTO locks (account, transaction_id, amount) VALUES ($1, $2, $3)',
      [this.name, transactionId, Math.abs(this.balance)]
    );

    return { success: true };
  }

  async commit(transactionId) {
    console.log(`[${this.name}] Committing transaction ${transactionId}`);
    
    await this.db.query(
      'UPDATE accounts SET balance = balance + $1 WHERE name = $2',
      [this.balance, this.name]
    );

    return { success: true };
  }

  async abort(transactionId) {
    console.log(`[${this.name}] Aborting transaction ${transactionId}`);
    
    await this.db.query(
      'DELETE FROM locks WHERE transaction_id = $1',
      [transactionId]
    );

    return { success: true };
  }
}

// Usage
const fromAccount = new BankAccount('Alice', -100, db);
const toAccount = new BankAccount('Bob', 100, db);

const coordinator = new TwoPhaseCommit([fromAccount, toAccount]);
const txId = uuid();

try {
  await coordinator.beginTransaction(txId);
  await coordinator.prepare(txId);
  await coordinator.commit(txId);
  console.log('Transaction committed successfully');
} catch (error) {
  console.error('Transaction failed:', error);
  await coordinator.abort(txId);
}
```

**2. Saga Pattern**

```javascript
class SagaOrchestrator {
  constructor(steps) {
    this.steps = steps;
    this.sagaLog = [];
  }

  async execute(sagaId, data) {
    const saga = {
      id: sagaId,
      status: 'STARTED',
      steps: this.steps.map(step => ({
        name: step.name,
        status: 'PENDING',
        retryCount: 0
      })),
      data,
      timestamp: Date.now()
    };

    this.sagaLog.push(saga);

    try {
      // Execute each step
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];
        const sagaStep = saga.steps[i];

        await this.executeStep(saga, step, sagaStep, data);
        data = await step.execute(data); // Pass result to next step
      }

      saga.status = 'COMPLETED';
      return saga;
    } catch (error) {
      console.error(`Saga ${sagaId} failed at step ${saga.currentStep}:`, error);
      saga.status = 'COMPENSATING';
      
      // Compensate completed steps in reverse order
      await this.compensate(saga);
      
      throw error;
    }
  }

  async executeStep(saga, step, sagaStep, data) {
    let lastError;
    
    for (let attempt = 0; attempt < step.maxRetries; attempt++) {
      try {
        sagaStep.status = 'EXECUTING';
        sagaStep.retryCount = attempt;

        await step.execute(data);
        
        sagaStep.status = 'COMPLETED';
        return;
      } catch (error) {
        lastError = error;
        console.error(`Step ${step.name} attempt ${attempt + 1} failed:`, error);
        
        sagaStep.status = 'FAILED';
        
        if (attempt < step.maxRetries - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, step.retryDelay * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError;
  }

  async compensate(saga) {
    // Find last completed step
    let completedSteps = saga.steps.filter(s => s.status === 'COMPLETED');
    
    // Compensate in reverse order
    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const sagaStep = completedSteps[i];
      const step = this.steps[saga.steps.indexOf(sagaStep)];
      
      if (step.compensate) {
        try {
          sagaStep.status = 'COMPENSATING';
          await step.compensate(saga.data);
          sagaStep.status = 'COMPENSATED';
        } catch (error) {
          console.error(`Compensation failed for ${step.name}:`, error);
          sagaStep.status = 'COMPENSATION_FAILED';
          // Continue with other compensations
        }
      }
    }

    saga.status = 'COMPENSATED';
  }
}

// Example: Order processing saga
const orderSaga = new SagaOrchestrator([
  {
    name: 'ReserveInventory',
    execute: async (data) => {
      console.log('Reserving inventory:', data.orderId);
      await inventoryService.reserve(data.orderId, data.items);
    },
    compensate: async (data) => {
      console.log('Releasing inventory:', data.orderId);
      await inventoryService.release(data.orderId, data.items);
    },
    maxRetries: 3,
    retryDelay: 1000
  },
  {
    name: 'ProcessPayment',
    execute: async (data) => {
      console.log('Processing payment:', data.orderId);
      await paymentService.charge(data.userId, data.amount);
    },
    compensate: async (data) => {
      console.log('Refunding payment:', data.orderId);
      await paymentService.refund(data.paymentId, data.amount);
    },
    maxRetries: 3,
    retryDelay: 1000
  },
  {
    name: 'ShipOrder',
    execute: async (data) => {
      console.log('Shipping order:', data.orderId);
      await shippingService.createShipment(data.orderId, data.address);
    },
    compensate: async (data) => {
      console.log('Cancelling shipment:', data.orderId);
      await shippingService.cancelShipment(data.orderId);
    },
    maxRetries: 3,
    retryDelay: 1000
  },
  {
    name: 'SendConfirmation',
    execute: async (data) => {
      console.log('Sending confirmation:', data.orderId);
      await notificationService.sendEmail(data.userId, 'Order confirmed');
    },
    maxRetries: 5,
    retryDelay: 2000
  }
]);

// Execute saga
try {
  await orderSaga.execute(uuid(), {
    orderId: 'order-123',
    userId: 'user-456',
    items: [{ productId: 'prod-1', quantity: 2 }],
    amount: 99.99,
    address: '123 Main St'
  });
} catch (error) {
  console.error('Order processing failed:', error);
}
```

**3. Event Sourcing with CQRS**

```javascript
class EventSourcing {
  constructor(eventStore) {
    this.eventStore = eventStore;
    this.projections = new Map();
    this.subscribers = [];
  }

  async saveEvent(streamId, eventType, data, expectedVersion = null) {
    const event = {
      id: uuid(),
      streamId,
      eventType,
      data,
      timestamp: Date.now(),
      version: expectedVersion ? expectedVersion + 1 : null
    };

    // Append to event store (with optimistic concurrency)
    await this.eventStore.appendEvent(streamId, event, expectedVersion);

    // Notify subscribers
    await this.notifySubscribers(event);

    return event;
  }

  async getEvents(streamId) {
    return this.eventStore.getStream(streamId);
  }

  subscribe(handler) {
    this.subscribers.push(handler);
    return () => {
      const index = this.subscribers.indexOf(handler);
      this.subscribers.splice(index, 1);
    };
  }

  async notifySubscribers(event) {
    const promises = this.subscribers.map(handler => 
      handler(event).catch(error => {
        console.error('Event handler failed:', error);
      })
    );

    await Promise.allSettled(promises);
  }

  // Rebuild projection from events
  async rebuildProjection(streamId, projectionFn) {
    const events = await this.getEvents(streamId);
    let state = null;

    for (const event of events) {
      state = projectionFn(state, event);
    }

    return state;
  }
}

// Example: Order aggregate
class OrderAggregate {
  constructor(eventSourcing) {
    this.eventSourcing = eventSourcing;
  }

  async createOrder(orderId, userId, items) {
    const orderCreatedEvent = await this.eventSourcing.saveEvent(
      orderId,
      'OrderCreated',
      { userId, items },
      null // New stream
    );

    return this.buildFromEvents([orderCreatedEvent]);
  }

  async addItem(orderId, productId, quantity, price) {
    const events = await this.eventSourcing.getEvents(orderId);
    const order = this.buildFromEvents(events);

    if (order.status === 'cancelled') {
      throw new Error('Cannot add items to cancelled order');
    }

    const itemAddedEvent = await this.eventSourcing.saveEvent(
      orderId,
      'ItemAdded',
      { productId, quantity, price },
      events[events.length - 1].version
    );

    return this.buildFromEvents([...events, itemAddedEvent]);
  }

  async cancelOrder(orderId, reason) {
    const events = await this.eventSourcing.getEvents(orderId);
    const order = this.buildFromEvents(events);

    if (order.status === 'cancelled') {
      throw new Error('Order already cancelled');
    }

    if (order.status === 'shipped') {
      throw new Error('Cannot cancel shipped order');
    }

    const orderCancelledEvent = await this.eventSourcing.saveEvent(
      orderId,
      'OrderCancelled',
      { reason },
      events[events.length - 1].version
    );

    return this.buildFromEvents([...events, orderCancelledEvent]);
  }

  buildFromEvents(events) {
    return events.reduce((order, event) => {
      switch (event.eventType) {
        case 'OrderCreated':
          return {
            id: event.streamId,
            userId: event.data.userId,
            items: event.data.items,
            status: 'created',
            total: event.data.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
            version: event.version
          };
        case 'ItemAdded':
          return {
            ...order,
            items: [...order.items, event.data],
            total: order.total + event.data.price * event.data.quantity,
            version: event.version
          };
        case 'OrderCancelled':
          return {
            ...order,
            status: 'cancelled',
            cancelReason: event.data.reason,
            version: event.version
          };
        default:
          return order;
      }
    }, null);
  }
}

// CQRS: Separate read model
class OrderProjection {
  constructor(readDatabase) {
    this.readDatabase = readDatabase;
  }

  handle(event) {
    switch (event.eventType) {
      case 'OrderCreated':
        return this.handleOrderCreated(event);
      case 'ItemAdded':
        return this.handleItemAdded(event);
      case 'OrderCancelled':
        return this.handleOrderCancelled(event);
    }
  }

  async handleOrderCreated(event) {
    await this.readDatabase.query(`
      INSERT INTO orders_read_model (order_id, user_id, status, total, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [event.streamId, event.data.userId, 'created', 0, new Date(event.timestamp)]);
  }

  async handleItemAdded(event) {
    await this.readDatabase.query(`
      UPDATE orders_read_model
      SET total = total + $1
      WHERE order_id = $2
    `, [event.data.price * event.data.quantity, event.streamId]);
  }

  async handleOrderCancelled(event) {
    await this.readDatabase.query(`
      UPDATE orders_read_model
      SET status = 'cancelled', cancelled_at = $1
      WHERE order_id = $2
    `, [new Date(event.timestamp), event.streamId]);
  }

  async getOrder(orderId) {
    const result = await this.readDatabase.query(
      'SELECT * FROM orders_read_model WHERE order_id = $1',
      [orderId]
    );
    return result.rows[0];
  }

  async getUserOrders(userId) {
    const result = await this.readDatabase.query(
      'SELECT * FROM orders_read_model WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }
}

// Usage
const eventStore = new EventStore(db);
const eventSourcing = new EventSourcing(eventStore);
const orderAggregate = new OrderAggregate(eventSourcing);
const readDatabase = db;
const orderProjection = new OrderProjection(readDatabase);

// Subscribe to events
eventSourcing.subscribe(event => orderProjection.handle(event));

// Create order
const order = await orderAggregate.createOrder('order-123', 'user-456', [
  { productId: 'prod-1', quantity: 2, price: 49.99 }
]);

// Read from projection (optimized for reads)
const readOrder = await orderProjection.getOrder('order-123');
```

---

## Distributed Transactions

### Q5: How do you handle distributed transactions across multiple services?

**Answer:**

**1. Distributed Transaction Patterns**

```javascript
class DistributedTransactionManager {
  constructor(participants, coordinator) {
    this.participants = participants;
    this.coordinator = coordinator;
  }

  // Pattern 1: 2PC (Two-Phase Commit) - Strong consistency
  async executeWith2PC(transactionId, operations) {
    try {
      // Phase 1: Prepare
      const prepareResults = await this.prepareAll(transactionId, operations);
      
      if (!prepareResults.allSuccess) {
        throw new Error('Prepare phase failed');
      }

      // Phase 2: Commit
      const commitResults = await this.commitAll(transactionId, operations);
      
      return { status: 'COMMITTED', results: commitResults };
    } catch (error) {
      // Rollback on failure
      await this.rollbackAll(transactionId, operations);
      throw error;
    }
  }

  async prepareAll(transactionId, operations) {
    const preparePromises = operations.map(op => 
      this.participants[op.service].prepare(op.operation).catch(err => ({
        success: false,
        error: err.message
      }))
    );

    const results = await Promise.all(preparePromises);
    const allSuccess = results.every(r => r.success !== false);

    return { allSuccess, results };
  }

  async commitAll(transactionId, operations) {
    const commitPromises = operations.map(op => 
      this.participants[op.service].commit(op.operation).catch(err => ({
        success: false,
        error: err.message
      }))
    );

    return Promise.all(commitPromises);
  }

  async rollbackAll(transactionId, operations) {
    const rollbackPromises = operations.map(op => 
      this.participants[op.service].rollback(op.operation).catch(err => {
        console.error('Rollback failed:', err);
      })
    );

    await Promise.allSettled(rollbackPromises);
  }

  // Pattern 2: Saga - Eventual consistency
  async executeWithSaga(sagaId, steps) {
    const saga = {
      id: sagaId,
      steps: steps.map(step => ({ ...step, status: 'PENDING' })),
      status: 'STARTED'
    };

    try {
      for (let i = 0; i < saga.steps.length; i++) {
        const step = saga.steps[i];
        
        try {
          await this.executeStep(step);
          step.status = 'COMPLETED';
        } catch (error) {
          step.status = 'FAILED';
          step.error = error.message;
          throw error;
        }
      }

      saga.status = 'COMPLETED';
      return saga;
    } catch (error) {
      saga.status = 'COMPENSATING';
      await this.compensateSaga(saga);
      throw error;
    }
  }

  async executeStep(step) {
    const service = this.participants[step.service];
    return service.execute(step.operation);
  }

  async compensateSaga(saga) {
    // Compensate completed steps in reverse order
    const completedSteps = saga.steps.filter(s => s.status === 'COMPLETED');
    
    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const step = completedSteps[i];
      
      if (step.compensate) {
        try {
          await this.executeStep({ ...step, operation: step.compensate });
          step.status = 'COMPENSATED';
        } catch (error) {
          console.error('Compensation failed:', error);
          step.status = 'COMPENSATION_FAILED';
        }
      }
    }

    saga.status = 'COMPENSATED';
  }

  // Pattern 3: Outbox Pattern - Reliable messaging
  async executeWithOutbox(transactionId, operations, events) {
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Execute operations
      for (const op of operations) {
        await client.query(op.sql, op.params);
      }

      // Store events in outbox table (atomic with operations)
      for (const event of events) {
        await client.query(`
          INSERT INTO outbox (transaction_id, event_type, payload, created_at)
          VALUES ($1, $2, $3, NOW())
        `, [transactionId, event.type, JSON.stringify(event.payload)]);
      }

      await client.query('COMMIT');

      // Publish events asynchronously
      this.publishEvents(transactionId);

      return { status: 'COMMITTED' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async publishEvents(transactionId) {
    // Get unpublished events
    const events = await db.query(`
      SELECT * FROM outbox 
      WHERE transaction_id = $1 AND published = false
      ORDER BY created_at
    `, [transactionId]);

    // Publish each event
    for (const event of events.rows) {
      try {
        await messageBus.publish(event.event_type, event.payload);
        
        // Mark as published
        await db.query(`
          UPDATE outbox 
          SET published = true, published_at = NOW() 
          WHERE id = $1
        `, [event.id]);
      } catch (error) {
        console.error('Failed to publish event:', error);
        // Will be retried
      }
    }
  }
}

// Outbox table cleanup (scheduled job)
async function cleanupOutbox() {
  await db.query(`
    DELETE FROM outbox 
    WHERE published = true AND published_at < NOW() - INTERVAL '7 days'
  `);
}

// Retry unpublished events
async function retryUnpublishedEvents() {
  const unpublished = await db.query(`
    SELECT * FROM outbox 
    WHERE published = false AND created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at
  `);

  for (const event of unpublished.rows) {
    try {
      await messageBus.publish(event.event_type, event.payload);
      
      await db.query(`
        UPDATE outbox 
        SET published = true, published_at = NOW() 
        WHERE id = $1
      `, [event.id]);
    } catch (error) {
      console.error('Retry failed for event:', event.id);
    }
  }
}
```

---

## Consistency in Practice

### Q6: How do you design for consistency in real-world Node.js applications?

**Answer:**

**1. Domain-Driven Consistency**

```javascript
class ConsistencyByDomain {
  // Determine consistency requirements per domain
  static analyzeDomainRequirements(domain) {
    const consistencyMatrix = {
      financial: {
        consistency: 'STRONG',
        patterns: ['2PC', 'Pessimistic Locking'],
        latency: 'High (acceptable)',
        availability: 'Medium',
        example: 'Bank transfers, payments'
      },
      
      inventory: {
        consistency: 'STRONG',
        patterns: ['Distributed Locks', 'Optimistic Concurrency'],
        latency: 'Medium',
        availability: 'High',
        example: 'Stock management, reservations'
      },
      
      orders: {
        consistency: 'EVENTUAL',
        patterns: ['Saga', 'Event Sourcing'],
        latency: 'Low',
        availability: 'High',
        example: 'Order processing, fulfillment'
      },
      
      userProfiles: {
        consistency: 'EVENTUAL',
        patterns: ['Read-After-Write', 'Cache-Aside'],
        latency: 'Low',
        availability: 'High',
        example: 'Profile updates, preferences'
      },
      
      analytics: {
        consistency: 'EVENTUAL',
        patterns: ['Append-Only Logs', 'Stream Processing'],
        latency: 'Very Low',
        availability: 'High',
        example: 'Metrics, dashboards'
      },
      
      social: {
        consistency: 'EVENTUAL',
        patterns: ['CRDTs', 'Vector Clocks'],
        latency: 'Low',
        availability: 'High',
        example: 'Posts, comments, likes'
      }
    };

    return consistencyMatrix[domain];
  }
}

// Example: Multi-consistency application
class ApplicationArchitect {
  constructor() {
    this.services = {
      financial: new FinancialService(),
      inventory: new InventoryService(),
      orders: new OrderService(),
      profiles: new ProfileService(),
      analytics: new AnalyticsService(),
      social: new SocialService()
    };
  }

  async processOrder(orderData) {
    // Step 1: Strong consistency for inventory check
    const inventoryReserved = await this.services.inventory.reserve(
      orderData.items
    );
    
    if (!inventoryReserved) {
      throw new Error('Items out of stock');
    }

    // Step 2: Eventual consistency for order creation
    const order = await this.services.orders.create(orderData);
    
    // Step 3: Strong consistency for payment
    try {
      const paymentResult = await this.services.financial.charge(
        orderData.userId,
        orderData.amount
      );
    } catch (error) {
      // Compensate inventory reservation
      await this.services.inventory.release(orderData.items);
      throw error;
    }

    // Step 4: Async analytics update (eventual consistency)
    this.services.analytics.trackOrderCreated(order).catch(console.error);
    
    // Step 5: Async social notification (eventual consistency)
    this.services.social.notifyOrderCreated(order).catch(console.error);

    return order;
  }
}
```

**2. Hybrid Consistency Strategy**

```javascript
class HybridConsistencyManager {
  constructor() {
    this.strongCache = new RedisCache({ consistency: 'strong' });
    this.eventualCache = new RedisCache({ consistency: 'eventual' });
    this.database = db;
  }

  // Strong consistency read
  async readStrong(key) {
    // Read from leader replica
    const cached = await this.strongCache.get(key);
    
    if (cached) {
      return cached;
    }

    const data = await this.database.query('SELECT * FROM data WHERE key = $1', [key]);
    
    // Cache with short TTL
    await this.strongCache.set(key, data, 60);
    
    return data;
  }

  // Strong consistency write
  async writeStrong(key, value) {
    const client = await this.database.connect();
    
    try {
      await client.query('BEGIN');
      
      await client.query('UPDATE data SET value = $1 WHERE key = $2', [value, key]);
      
      // Invalidate cache synchronously
      await this.strongCache.del(key);
      
      await client.query('COMMIT');
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Eventual consistency read
  async readEventual(key) {
    // Read from any replica
    const cached = await this.eventualCache.get(key);
    
    if (cached) {
      return cached;
    }

    const data = await this.database.query('SELECT * FROM data WHERE key = $1', [key]);
    
    // Cache with longer TTL
    await this.eventualCache.set(key, data, 3600);
    
    return data;
  }

  // Eventual consistency write
  async writeEventual(key, value) {
    // Write to database asynchronously
    setImmediate(async () => {
      await this.database.query('UPDATE data SET value = $1 WHERE key = $2', [value, key]);
    });

    // Update cache immediately
    await this.eventualCache.set(key, value, 3600);
    
    return true;
  }
}
```

**3. Consistency Monitoring**

```javascript
class ConsistencyMonitor {
  constructor() {
    this.inconsistencies = [];
    this.metrics = {
      totalReads: 0,
      inconsistentReads: 0,
      maxLag: 0,
      avgLag: 0
    };
  }

  // Monitor replication lag
  async checkReplicationLag() {
    const leaderData = await this.readFromLeader();
    const replicaData = await this.readFromReplica();

    if (JSON.stringify(leaderData) !== JSON.stringify(replicaData)) {
      this.metrics.inconsistentReads++;
      this.inconsistencies.push({
        timestamp: Date.now(),
        leader: leaderData,
        replica: replicaData,
        lag: this.calculateLag(leaderData, replicaData)
      });

      console.warn('Replication inconsistency detected:', {
        key: leaderData.key,
        lag: this.calculateLag(leaderData, replicaData)
      });

      return false;
    }

    return true;
  }

  async readFromLeader() {
    return await db.query('SELECT * FROM data WHERE key = $1', ['test-key']);
  }

  async readFromReplica() {
    return await replicaDb.query('SELECT * FROM data WHERE key = $1', ['test-key']);
  }

  calculateLag(leader, replica) {
    // Simple lag calculation based on version or timestamp
    const leaderVersion = leader.version || leader.updated_at;
    const replicaVersion = replica.version || replica.updated_at;
    return Math.abs(leaderVersion - replicaVersion);
  }

  // Get consistency metrics
  getMetrics() {
    this.metrics.totalReads++;
    this.metrics.consistencyRate = 1 - (this.metrics.inconsistentReads / this.metrics.totalReads);
    
    return this.metrics;
  }

  // Alert on high inconsistency rate
  async checkConsistencyHealth() {
    const metrics = this.getMetrics();
    const inconsistencyRate = 1 - metrics.consistencyRate;

    if (inconsistencyRate > 0.05) {
      // More than 5% inconsistency rate
      await this.sendAlert({
        severity: 'WARNING',
        message: `High inconsistency rate: ${(inconsistencyRate * 100).toFixed(2)}%`,
        metrics
      });
    }

    if (inconsistencyRate > 0.1) {
      // More than 10% inconsistency rate
      await this.sendAlert({
        severity: 'CRITICAL',
        message: `Critical inconsistency rate: ${(inconsistencyRate * 100).toFixed(2)}%`,
        metrics
      });
    }
  }

  async sendAlert(alert) {
    // Send to monitoring system
    console.error('ALERT:', alert);
    // await monitoringService.alert(alert);
  }
}
```
```

---

## Resiliency Patterns for Consistency

### Q7: How do you build resilient systems that handle consistency failures gracefully?

**Answer:**

**1. Circuit Breaker Pattern**

```javascript
class ConsistencyCircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.failureThreshold = threshold;
    this.resetTimeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(operation, fallback = null) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        console.warn('Circuit breaker OPEN - using fallback');
        return fallback ? await fallback() : this.getDefaultResponse();
      } else {
        this.state = 'HALF_OPEN';
        console.info('Circuit breaker HALF_OPEN - attempting recovery');
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.onSuccess();
      }
      
      return result;
    } catch (error) {
      this.onFailure();
      
      if (fallback) {
        console.warn('Operation failed, using fallback');
        return await fallback();
      }
      
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    console.info('Circuit breaker reset to CLOSED');
  }

  onFailure() {
    this.failureCount++;
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.error('Circuit breaker OPEN');
    }
  }

  getDefaultResponse() {
    return {
      status: 'degraded',
      data: null,
      message: 'Service temporarily unavailable'
    };
  }
}

// Usage: Wrap consistency-critical operations
const circuitBreaker = new ConsistencyCircuitBreaker(5, 60000);

async function getConsistentData(key) {
  return circuitBreaker.execute(
    // Primary operation with strong consistency
    async () => {
      return await database.query('SELECT * FROM data WHERE key = $1', [key]);
    },
    // Fallback with eventual consistency
    async () => {
      return await cache.get(key) || await readReplica.query('SELECT * FROM data WHERE key = $1', [key]);
    }
  );
}
```

**2. Retry with Exponential Backoff**

```javascript
class ResilientOperation {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialDelay = options.initialDelay || 100;
    this.maxDelay = options.maxDelay || 10000;
    this.jitter = options.jitter !== false;
  }

  async execute(operation, context = {}) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation(attempt);
        
        if (attempt > 0) {
          console.info(`Operation succeeded after ${attempt} retries`);
        }
        
        return result;
      } catch (error) {
        lastError = error;

        // Don't retry non-transient errors
        if (!this.isTransientError(error)) {
          throw error;
        }

        if (attempt < this.maxRetries) {
          const delay = this.calculateDelay(attempt);
          console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Operation failed after ${this.maxRetries + 1} attempts: ${lastError.message}`);
  }

  isTransientError(error) {
    const transientErrors = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'EPIPE',
      'EAI_AGAIN',
      'ECONNABORTED',
      'Network timeout',
      'Connection lost',
      'Temporary failure'
    ];

    return transientErrors.some(err => 
      error.code === err || error.message.includes(err)
    );
  }

  calculateDelay(attempt) {
    // Exponential backoff
    const delay = Math.min(
      this.initialDelay * Math.pow(2, attempt),
      this.maxDelay
    );

    // Add jitter to avoid thundering herd
    if (this.jitter) {
      const jitter = delay * 0.1 * Math.random();
      return delay + jitter;
    }

    return delay;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage for distributed transactions
async function executeDistributedTransaction(transaction) {
  const resilient = new ResilientOperation({
    maxRetries: 3,
    initialDelay: 100,
    maxDelay: 5000
  });

  return resilient.execute(
    async (attempt) => {
      console.log(`Executing transaction attempt ${attempt + 1}`);
      
      // Execute 2PC with retry
      await transaction.prepare();
      await transaction.commit();
      
      return { status: 'completed' };
    },
    { transactionId: transaction.id }
  );
}
```

**3. Bulkhead Pattern - Isolation**

```javascript
class ConsistencyBulkhead {
  constructor(concurrencyLimit = 10) {
    this.concurrencyLimit = concurrencyLimit;
    this.runningOperations = 0;
    this.queue = [];
  }

  async execute(operation, priority = 'normal') {
    return new Promise((resolve, reject) => {
      if (this.runningOperations < this.concurrencyLimit) {
        this.executeNow(operation, resolve, reject);
      } else {
        this.queue.push({ operation, resolve, reject, priority });
        console.warn(`Bulkhead queue full, queued operations: ${this.queue.length}`);
      }
    });
  }

  async executeNow(operation, resolve, reject) {
    this.runningOperations++;
    
    try {
      const result = await operation();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.runningOperations--;
      this.processQueue();
    }
  }

  processQueue() {
    if (this.queue.length > 0 && this.runningOperations < this.concurrencyLimit) {
      // Sort by priority
      this.queue.sort((a, b) => {
        const priorityOrder = { 'high': 0, 'normal': 1, 'low': 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      const next = this.queue.shift();
      this.executeNow(next.operation, next.resolve, next.reject);
    }
  }

  getStats() {
    return {
      running: this.runningOperations,
      queued: this.queue.length,
      utilization: (this.runningOperations / this.concurrencyLimit) * 100
    };
  }
}

// Separate bulkheads for different consistency levels
class ConsistencyBulkheads {
  constructor() {
    this.strongBulkhead = new ConsistencyBulkhead(5); // Limited concurrency for strong consistency
    this.eventualBulkhead = new ConsistencyBulkhead(50); // Higher for eventual consistency
  }

  async executeStrong(operation) {
    return this.strongBulkhead.execute(operation, 'high');
  }

  async executeEventual(operation) {
    return this.eventualBulkhead.execute(operation, 'normal');
  }

  getHealth() {
    return {
      strong: this.strongBulkhead.getStats(),
      eventual: this.eventualBulkhead.getStats()
    };
  }
}

// Usage
const bulkheads = new ConsistencyBulkheads();

// Strong consistency operations (limited)
async function updateFinancialData(data) {
  return bulkheads.executeStrong(async () => {
    return await database.transaction(async (client) => {
      // Financial transaction with strong consistency
    });
  });
}

// Eventual consistency operations (higher throughput)
async function updateUserProfile(data) {
  return bulkheads.executeEventual(async () => {
    return await cache.set(`user:${data.id}`, data);
  });
}
```

**4. Timeout and Deadlock Detection**

```javascript
class TimeoutWrapper {
  async execute(operation, timeoutMs, timeoutError = 'Operation timed out') {
    return Promise.race([
      operation(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(timeoutError)), timeoutMs)
      )
    ]);
  }
}

class DeadlockDetector {
  constructor(deadlockTimeout = 10000) {
    this.deadlockTimeout = deadlockTimeout;
    this.locks = new Map();
    this.waitGraph = new Map();
  }

  async acquireLock(resource, transactionId) {
    const startTime = Date.now();

    while (this.locks.has(resource)) {
      const holder = this.locks.get(resource);
      
      // Check for potential deadlock
      if (this.detectDeadlock(transactionId, resource)) {
        throw new Error(`Potential deadlock detected for transaction ${transactionId}`);
      }

      // Check timeout
      if (Date.now() - startTime > this.deadlockTimeout) {
        throw new Error(`Deadlock timeout waiting for resource ${resource}`);
      }

      // Wait and retry
      await this.sleep(100);
    }

    // Acquire lock
    this.locks.set(resource, transactionId);
    console.info(`Transaction ${transactionId} acquired lock on ${resource}`);
  }

  detectDeadlock(transactionId, resource) {
    const holder = this.locks.get(resource);
    
    // Check if holder is waiting for a resource held by current transaction
    const holderWaiting = this.waitGraph.get(holder);
    
    if (holderWaiting) {
      for (const waitingFor of holderWaiting) {
        if (this.locks.get(waitingFor) === transactionId) {
          console.error(`Deadlock detected: ${transactionId} <-> ${holder}`);
          return true;
        }
      }
    }

    return false;
  }

  releaseLock(resource, transactionId) {
    if (this.locks.get(resource) === transactionId) {
      this.locks.delete(resource);
      this.waitGraph.delete(transactionId);
      console.info(`Transaction ${transactionId} released lock on ${resource}`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const timeout = new TimeoutWrapper();
const deadlockDetector = new DeadlockDetector();

async function executeTransactionWithTimeout(txId) {
  return timeout.execute(
    async () => {
      await deadlockDetector.acquireLock('resource1', txId);
      await deadlockDetector.acquireLock('resource2', txId);
      
      try {
        // Execute transaction
        await performTransaction();
      } finally {
        deadlockDetector.releaseLock('resource2', txId);
        deadlockDetector.releaseLock('resource1', txId);
      }
    },
    30000, // 30 second timeout
    'Transaction timed out after 30 seconds'
  );
}
```

**5. Graceful Degradation**

```javascript
class ConsistencyDegradation {
  constructor() {
    this.healthStatus = 'healthy';
    this.degradedConsistency = false;
  }

  async read(key) {
    if (this.healthStatus === 'healthy') {
      // Strong consistency path
      return this.readStrong(key);
    } else if (this.degradedConsistency) {
      // Degraded to eventual consistency
      console.warn(`Degraded mode: using eventual consistency for ${key}`);
      return this.readEventual(key);
    } else {
      // Partial degradation: try strong, fallback to eventual
      try {
        return await this.readStrongWithTimeout(key, 1000);
      } catch (error) {
        console.warn(`Strong consistency failed, falling back to eventual: ${error.message}`);
        return this.readEventual(key);
      }
    }
  }

  async readStrong(key) {
    return await database.query('SELECT * FROM data WHERE key = $1', [key]);
  }

  async readStrongWithTimeout(key, timeout) {
    return timeout.execute(
      () => this.readStrong(key),
      timeout
    );
  }

  async readEventual(key) {
    // Try cache first
    const cached = await cache.get(key);
    if (cached) return cached;

    // Fallback to replica
    return await replicaDb.query('SELECT * FROM data WHERE key = $1', [key]);
  }

  setDegradedMode(consistency = true) {
    this.degradedConsistency = consistency;
    console.warn(`Degraded mode activated: ${consistency ? 'eventual consistency' : 'partial degradation'}`);
  }

  setHealthyMode() {
    this.healthStatus = 'healthy';
    this.degradedConsistency = false;
    console.info('System returned to healthy mode');
  }
}

// Usage with health checks
const degradation = new ConsistencyDegradation();

// Monitor and adapt based on health
setInterval(async () => {
  const health = await checkSystemHealth();
  
  if (health.replicationLag > 10000) {
    degradation.setDegradedMode(false); // Partial degradation
  } else if (health.databaseUnavailable) {
    degradation.setDegradedMode(true); // Full degradation
  } else {
    degradation.setHealthyMode();
  }
}, 5000);
```

**6. Idempotency for Safe Retries**

```javascript
class IdempotentOperation {
  constructor(idempotencyStore) {
    this.idempotencyStore = idempotencyStore;
  }

  async execute(operationId, operation, ttl = 3600) {
    // Check if operation already executed
    const cachedResult = await this.idempotencyStore.get(operationId);
    
    if (cachedResult) {
      console.info(`Returning cached result for operation ${operationId}`);
      return cachedResult;
    }

    // Execute operation
    const result = await operation();
    
    // Cache result for idempotency
    await this.idempotencyStore.set(operationId, result, ttl);
    
    return result;
  }
}

// Usage for distributed transactions
const idempotencyStore = new RedisCache();
const idempotentOp = new IdempotentOperation(idempotencyStore);

async function transferMoney(fromAccount, toAccount, amount) {
  const operationId = `transfer:${fromAccount}:${toAccount}:${amount}:${Date.now()}`;
  
  return idempotentOp.execute(
    operationId,
    async () => {
      // Actual transfer logic
      await database.query('BEGIN');
      await database.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromAccount]);
      await database.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toAccount]);
      await database.query('COMMIT');
      
      return { success: true, fromAccount, toAccount, amount };
    },
    86400 // 24 hour TTL
  );
}

// Safe to retry multiple times
for (let i = 0; i < 5; i++) {
  try {
    const result = await transferMoney('alice', 'bob', 100);
    console.log('Transfer successful:', result);
    break;
  } catch (error) {
    console.error(`Retry ${i + 1}:`, error);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

**7. Consistency Checkpointing**

```javascript
class ConsistencyCheckpoint {
  constructor(checkpointStore) {
    this.checkpointStore = checkpointStore;
  }

  async saveCheckpoint(processId, data, version) {
    const checkpoint = {
      processId,
      data,
      version,
      timestamp: Date.now()
    };

    await this.checkpointStore.set(
      `checkpoint:${processId}`,
      checkpoint,
      86400 // 24 hour TTL
    );
  }

  async loadCheckpoint(processId) {
    return await this.checkpointStore.get(`checkpoint:${processId}`);
  }

  async executeWithCheckpoint(processId, operation) {
    // Check for existing checkpoint
    const checkpoint = await this.loadCheckpoint(processId);
    
    if (checkpoint) {
      console.info(`Resuming from checkpoint for ${processId}`, { version: checkpoint.version });
      
      try {
        // Resume from checkpoint
        return await operation(checkpoint);
      } catch (error) {
        console.error('Failed to resume from checkpoint:', error);
        throw error;
      }
    }

    // Execute from scratch with periodic checkpoints
    return await this.executeWithPeriodicCheckpoints(processId, operation);
  }

  async executeWithPeriodicCheckpoints(processId, operation) {
    let currentData = null;
    let version = 0;
    const checkpointInterval = 5000; // Checkpoint every 5 seconds
    let lastCheckpoint = Date.now();

    try {
      // Execute operation
      const result = await operation({
        data: currentData,
        version,
        onProgress: async (update) => {
          currentData = update;
          version++;
          
          // Save periodic checkpoint
          if (Date.now() - lastCheckpoint > checkpointInterval) {
            await this.saveCheckpoint(processId, currentData, version);
            lastCheckpoint = Date.now();
            console.info(`Checkpoint saved for ${processId}`, { version });
          }
        }
      });

      // Final checkpoint
      await this.saveCheckpoint(processId, result, version);

      // Clean up checkpoint after success
      await this.checkpointStore.del(`checkpoint:${processId}`);

      return result;
    } catch (error) {
      console.error('Operation failed, checkpoint preserved for recovery');
      throw error;
    }
  }
}

// Usage for long-running distributed operations
const checkpoint = new ConsistencyCheckpoint(new RedisCache());

async function processLargeDataset(datasetId) {
  return checkpoint.executeWithCheckpoint(
    `process:${datasetId}`,
    async (context) => {
      if (context.version > 0) {
        // Resume from checkpoint
        console.info(`Resuming from version ${context.version}`);
      }

      const data = context.data || await loadInitialData();
      let processed = 0;

      for (const item of data.items) {
        await processItem(item);
        processed++;

        // Report progress
        await context.onProgress({
          ...data,
          processed,
          lastProcessedId: item.id
        });
      }

      return { ...data, processed, status: 'completed' };
    }
  );
}
```

---

## Trade-offs & Decision Making

### Q8: How do you make trade-off decisions between consistency, availability, and performance?

**Answer:**

**Decision Framework:**

```javascript
class ConsistencyDecisionFramework {
  // Step 1: Analyze Requirements
  static analyzeRequirements(useCase) {
    return {
      business: {
        criticality: this.assessCriticality(useCase),
        revenueImpact: this.assessRevenueImpact(useCase),
        userExperience: this.assessUserExperience(useCase)
      },
      technical: {
        scale: this.assessScale(useCase),
        latency: this.assessLatencyRequirement(useCase),
        availability: this.assessAvailabilityRequirement(useCase)
      }
    };
  }

  static assessCriticality(useCase) {
    const criticalityMap = {
      financial: 'CRITICAL',
      inventory: 'HIGH',
      orders: 'MEDIUM',
      profiles: 'LOW',
      analytics: 'LOW',
      social: 'LOW'
    };
    return criticalityMap[useCase] || 'MEDIUM';
  }

  static assessRevenueImpact(useCase) {
    const impactMap = {
      financial: 'DIRECT',
      inventory: 'DIRECT',
      orders: 'DIRECT',
      profiles: 'INDIRECT',
      analytics: 'NONE',
      social: 'INDIRECT'
    };
    return impactMap[useCase] || 'INDIRECT';
  }

  static assessScale(useCase) {
    const scaleMap = {
      financial: 'MEDIUM',
      inventory: 'HIGH',
      orders: 'HIGH',
      profiles: 'VERY_HIGH',
      analytics: 'VERY_HIGH',
      social: 'VERY_HIGH'
    };
    return scaleMap[useCase] || 'MEDIUM';
  }

  static assessLatencyRequirement(useCase) {
    const latencyMap = {
      financial: 'HIGH',
      inventory: 'MEDIUM',
      orders: 'LOW',
      profiles: 'LOW',
      analytics: 'VERY_LOW',
      social: 'LOW'
    };
    return latencyMap[useCase] || 'MEDIUM';
  }

  static assessAvailabilityRequirement(useCase) {
    const availabilityMap = {
      financial: 'HIGH',
      inventory: 'HIGH',
      orders: 'HIGH',
      profiles: 'VERY_HIGH',
      analytics: 'MEDIUM',
      social: 'VERY_HIGH'
    };
    return availabilityMap[useCase] || 'HIGH';
  }

  // Step 2: Choose Consistency Model
  static chooseConsistencyModel(requirements) {
    if (requirements.business.criticality === 'CRITICAL' && 
        requirements.business.revenueImpact === 'DIRECT') {
      return {
        model: 'STRONG',
        pattern: '2PC or Pessimistic Locking',
        rationale: 'Financial transactions require strong consistency'
      };
    }

    if (requirements.technical.scale === 'VERY_HIGH' && 
        requirements.technical.latency === 'LOW') {
      return {
        model: 'EVENTUAL',
        pattern: 'Saga or Event Sourcing',
        rationale: 'High scale requires eventual consistency for performance'
      };
    }

    if (requirements.business.criticality === 'HIGH' && 
        requirements.technical.scale === 'HIGH') {
      return {
        model: 'CAUSAL',
        pattern: 'Vector Clocks or CRDTs',
        rationale: 'Balance between consistency and performance'
      };
    }

    return {
      model: 'READ_AFTER_WRITE',
      pattern: 'Write-Through Cache',
      rationale: 'Good balance for most use cases'
    };
  }

  // Step 3: Implementation Strategy
  static designImplementation(requirements, model) {
    const design = {
      dataStorage: this.chooseDataStorage(requirements, model),
      caching: this.chooseCachingStrategy(requirements, model),
      replication: this.chooseReplicationStrategy(requirements, model),
      monitoring: this.chooseMonitoringStrategy(requirements, model)
    };

    return design;
  }

  static chooseDataStorage(requirements, model) {
    if (model.model === 'STRONG') {
      return {
        primary: 'PostgreSQL with synchronous replication',
        fallback: 'None - use synchronous failover'
      };
    }

    if (model.model === 'EVENTUAL') {
      return {
        primary: 'Cassandra or DynamoDB',
        fallback: 'Multi-region active-active'
      };
    }

    return {
      primary: 'PostgreSQL with read replicas',
      fallback: 'Async replication to secondary region'
    };
  }

  static chooseCachingStrategy(requirements, model) {
    if (model.model === 'STRONG') {
      return {
        strategy: 'Write-Through with short TTL',
        invalidation: 'Event-based'
      };
    }

    if (model.model === 'EVENTUAL') {
      return {
        strategy: 'Cache-Aside with long TTL',
        invalidation: 'TTL-based'
      };
    }

    return {
      strategy: 'Multi-level cache (local + distributed)',
      invalidation: 'Hybrid (event + TTL)'
    };
  }

  static chooseReplicationStrategy(requirements, model) {
    if (model.model === 'STRONG') {
      return {
        sync: true,
        quorum: 'majority',
        regions: 'Single region with sync replicas'
      };
    }

    if (model.model === 'EVENTUAL') {
      return {
        sync: false,
        quorum: 'local',
        regions: 'Multi-region with async replication'
      };
    }

    return {
      sync: 'partial',
      quorum: 'quorum',
      regions: 'Primary region sync, secondary async'
    };
  }

  static chooseMonitoringStrategy(requirements, model) {
    return {
      replicationLag: model.model !== 'STRONG',
      consistencyChecks: model.model === 'STRONG',
      staleReadAlerts: model.model === 'EVENTUAL',
      performanceMetrics: true
    };
  }
}

// Example: Decision framework for e-commerce order processing
const requirements = ConsistencyDecisionFramework.analyzeRequirements('orders');
const model = ConsistencyDecisionFramework.chooseConsistencyModel(requirements);
const design = ConsistencyDecisionFramework.designImplementation(requirements, model);

console.log('Order Processing System Design:', {
  requirements,
  model,
  design
});

// Output:
// {
//   requirements: {
//     business: { criticality: 'MEDIUM', revenueImpact: 'DIRECT', ... },
//     technical: { scale: 'HIGH', latency: 'LOW', ... }
//   },
//   model: {
//     model: 'EVENTUAL',
//     pattern: 'Saga or Event Sourcing',
//     rationale: 'High scale requires eventual consistency for performance'
//   },
//   design: {
//     dataStorage: {
//       primary: 'Cassandra or DynamoDB',
//       fallback: 'Multi-region active-active'
//     },
//     caching: {
//       strategy: 'Cache-Aside with long TTL',
//       invalidation: 'TTL-based'
//     },
//     replication: {
//       sync: false,
//       quorum: 'local',
//       regions: 'Multi-region with async replication'
//     },
//     monitoring: {
//       replicationLag: true,
//       consistencyChecks: false,
//       staleReadAlerts: true,
//       performanceMetrics: true
//     }
//   }
// }
```

**Real-World Decision Matrix:**

```javascript
const consistencyMatrix = {
  financialTransactions: {
    consistency: 'STRONG',
    pattern: '2PC',
    storage: 'PostgreSQL',
    replication: 'Synchronous',
    tradeoffs: {
      latency: 'High',
      availability: 'Medium',
      complexity: 'High'
    }
  },

  inventoryManagement: {
    consistency: 'STRONG',
    pattern: 'Distributed Locks',
    storage: 'PostgreSQL + Redis',
    replication: 'Synchronous for writes',
    tradeoffs: {
      latency: 'Medium',
      availability: 'High',
      complexity: 'Medium'
    }
  },

  orderProcessing: {
    consistency: 'EVENTUAL',
    pattern: 'Saga',
    storage: 'Event Store + Read DB',
    replication: 'Asynchronous',
    tradeoffs: {
      latency: 'Low',
      availability: 'High',
      complexity: 'High'
    }
  },

  userProfiles: {
    consistency: 'READ_AFTER_WRITE',
    pattern: 'Write-Through Cache',
    storage: 'PostgreSQL + Redis',
    replication: 'Asynchronous',
    tradeoffs: {
      latency: 'Low',
      availability: 'High',
      complexity: 'Low'
    }
  },

  socialFeeds: {
    consistency: 'EVENTUAL',
    pattern: 'Fan-out on Write',
    storage: 'Cassandra',
    replication: 'Asynchronous',
    tradeoffs: {
      latency: 'Low',
      availability: 'Very High',
      complexity: 'Medium'
    }
  },

  analytics: {
    consistency: 'EVENTUAL',
    pattern: 'Stream Processing',
    storage: 'Kafka + ClickHouse',
    replication: 'Asynchronous',
    tradeoffs: {
      latency: 'Very Low',
      availability: 'High',
      complexity: 'High'
    }
  },

  search: {
    consistency: 'EVENTUAL',
    pattern: 'Near Real-Time Sync',
    storage: 'Elasticsearch',
    replication: 'Asynchronous',
    tradeoffs: {
      latency: 'Medium',
      availability: 'High',
      complexity: 'Medium'
    }
  },

  configuration: {
    consistency: 'STRONG',
    pattern: 'ZooKeeper/Etcd',
    storage: 'ZooKeeper/Etcd',
    replication: 'Synchronous',
    tradeoffs: {
      latency: 'High',
      availability: 'High',
      complexity: 'Medium'
    }
  }
};
```

---

## Summary

**Key Takeaways for 10+ Years Experienced Developers:**

### 1. **CAP Theorem**
- **CP**: Strong consistency, reduced availability during partitions
- **AP**: High availability, eventual consistency
- **CA**: Not viable in distributed systems

### 2. **Consistency Levels**
- **Eventual**: No ordering/timeline guarantees (Cassandra, DynamoDB)
- **Read-after-Write**: Immediate consistency for writer
- **Monotonic Reads**: No going back in time per session
- **Bounded Staleness**: Maximum lag guarantees
- **Causal**: Preserves cause-effect relationships
- **Strong**: Linearizable, immediate global consistency

### 3. **Implementation Patterns**
- **2PC**: Strong consistency, blocking, complex
- **Saga**: Eventual consistency, non-blocking, compensation-based
- **Event Sourcing**: Immutable event log, replayable state
- **Outbox Pattern**: Reliable event delivery, exactly-once semantics

### 4. **Decision Framework**
1. Analyze business requirements (criticality, revenue impact)
2. Assess technical constraints (scale, latency, availability)
3. Choose appropriate consistency model
4. Design implementation strategy
5. Monitor and iterate

### 5. **Best Practices**
- Use strong consistency for financial/transactional data
- Use eventual consistency for high-scale, non-critical data
- Monitor consistency metrics continuously
- Design for failure and inconsistency
- Document consistency guarantees and trade-offs
- Use hybrid approaches for different domains

### 6. **Common Pitfalls to Avoid**
- Assuming ACID in distributed systems
- Ignoring CAP theorem trade-offs
- Over-engineering for consistency when not needed
- Not monitoring consistency health
- Poor compensation logic in sagas
- Race conditions in distributed transactions
- Inadequate testing of failure scenarios

### 7. **Production Considerations**
- Implement health checks for consistency
- Set up alerts for replication lag
- Plan for disaster recovery
- Test partition scenarios
- Monitor stale read rates
- Implement graceful degradation
- Have rollback procedures ready

---

## Interview Questions to Practice

1. How would you design a payment system that requires strong consistency?
2. Compare and contrast 2PC and Saga patterns with real-world examples.
3. How do you handle distributed transactions across microservices?
4. Explain how you'd implement read-after-write consistency in a global system.
5. When would you choose eventual consistency over strong consistency?
6. How do you monitor and detect consistency issues in production?
7. Design a social media feed system with appropriate consistency guarantees.
8. How do you handle network partitions in a CP system?
9. Explain the difference between causal and sequential consistency.
10. How would you implement a distributed lock for inventory management?
