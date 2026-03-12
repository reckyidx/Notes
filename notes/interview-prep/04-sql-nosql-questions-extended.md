# Database Optimization, Indexing, Replication & Sharding
## Extended Content for SQL & NoSQL Interview Questions

---

## Database Indexing

### Types of Indexes and When to Use Them

```javascript
/**
 * 1. B-Tree Index (Most Common)
 * Use cases: Equality queries, range queries, sorting
 * Best for: High selectivity columns (many unique values)
 */

// Create B-Tree index
const createBTreeIndex = `
-- Single column index
CREATE INDEX idx_users_email ON users(email);

-- Composite index (multiple columns)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- Unique index (enforces uniqueness)
CREATE UNIQUE INDEX idx_users_username ON users(username);

-- Partial index (filtered)
CREATE INDEX idx_active_users ON users(id) WHERE status = 'active';

-- Expression index (index function result)
CREATE INDEX idx_users_lower_email ON users(LOWER(email));
`;

/**
 * 2. Hash Index
 * Use cases: Equality queries only
 * Best for: Fast lookups on exact matches
 * PostgreSQL specific
 */

const createHashIndex = `
-- Hash index for exact matches
CREATE INDEX idx_hash_username ON users USING HASH(username);

-- Good for: WHERE username = 'john'
-- Bad for: WHERE username LIKE '%john%' or range queries
`;

/**
 * 3. GIN Index (Generalized Inverted Index)
 * Use cases: Arrays, JSON, full-text search
 * Best for: Contains queries, array operations
 */

const createGINIndex = `
-- For array columns
CREATE INDEX idx_user_tags ON users USING GIN(tags);

-- For JSONB columns
CREATE INDEX idx_product_metadata ON products USING GIN(metadata);

-- Contains query
SELECT * FROM users WHERE tags @> ARRAY['developer'];

-- JSONB contains query
SELECT * FROM products WHERE metadata @> '{"color": "red"}';
`;

/**
 * 4. GiST Index (Generalized Search Tree)
 * Use cases: Geospatial, ranges, full-text search
 * Best for: Geometry, range queries
 */

const createGiSTIndex = `
-- For geometry/postgis
CREATE INDEX idx_location_gist ON locations USING GIST(coordinates);

-- For range types
CREATE INDEX idx_price_range ON products USING GIST(price_range);

-- Range query
SELECT * FROM products WHERE price_range @> '[100, 500]'::int4range;
`;

/**
 * 5. BRIN Index (Block Range INdex)
 * Use cases: Large tables with sorted data
 * Best for: Time series, append-only tables
 */

const createBRINIndex = `
-- For time-series data
CREATE INDEX idx_logs_created ON logs USING BRIN(created_at);

-- Very small index size, good for tables > 100M rows
-- Best when data is naturally ordered
`;

/**
 * Index Selection Strategy
 */

class IndexSelector {
  /**
   * Decision matrix for index type
   */
  static selectIndexType(column, queryPattern) {
    // B-Tree - Default choice
    if (queryPattern.includes('=') || 
        queryPattern.includes('>') || 
        queryPattern.includes('<') ||
        queryPattern.includes('BETWEEN') ||
        queryPattern.includes('ORDER BY')) {
      return 'B-Tree';
    }

    // Hash - Equality only
    if (queryPattern.includes('=') && !queryPattern.match(/LIKE|>|</)) {
      return 'Hash';
    }

    // GIN - Arrays, JSON, contains
    if (queryPattern.includes('@>') || 
        queryPattern.includes('ANY') ||
        queryPattern.includes('?') || // JSONB operators
        queryPattern.includes('?|') ||
        queryPattern.includes('?&')) {
      return 'GIN';
    }

    // GiST - Geospatial, ranges
    if (queryPattern.includes('&&') || // Overlap
        queryPattern.includes('<<') || // Left of
        queryPattern.includes('>>')) { // Right of
      return 'GiST';
    }

    // BRIN - Large sorted tables
    if (queryPattern.includes('created_at') && 
        column.table.rows > 100000000) {
      return 'BRIN';
    }

    return 'B-Tree'; // Default
  }

  /**
   * Index cardinality check
   */
  static shouldIndex(column, table) {
    const cardinality = column.uniqueValues / table.totalRows;
    
    // High cardinality (many unique values) - Good for B-Tree
    if (cardinality > 0.1) {
      return true;
    }

    // Low cardinality (few unique values) - Consider partial index
    if (cardinality < 0.01) {
      return { partial: true, filter: `status = 'active'` };
    }

    return true;
  }
}

/**
 * Best Practices for Indexing
 */

const indexingBestPractices = {
  // 1. Index columns used in WHERE, JOIN, ORDER BY
  rule1: 'CREATE INDEX idx_order_user ON orders(user_id) WHERE created_at > NOW() - INTERVAL \'30 days\'',

  // 2. Use composite indexes for multiple column queries
  rule2: 'CREATE INDEX idx_product_category_price ON products(category_id, price) WHERE status = \'active\'',

  // 3. Put most selective column first in composite index
  rule3: 'SELECT * FROM users WHERE status = ? AND created_at > ?', // status first if more selective

  // 4. Use partial indexes to reduce size
  rule4: 'CREATE INDEX idx_active_users ON users(email) WHERE active = true',

  // 5. Avoid over-indexing (indexes slow down writes)
  rule5: 'Keep index count reasonable (typically 5-10 per table)',

  // 6. Use covering indexes for common queries
  rule6: 'CREATE INDEX idx_order_covering ON orders(user_id, status, total) INCLUDE (created_at)'
};

/**
 * Index Maintenance
 */

class IndexManager {
  constructor(pool) {
    this.pool = pool;
  }

  async analyzeTable(tableName) {
    await this.pool.query(`ANALYZE ${tableName}`);
  }

  async vacuumTable(tableName) {
    await this.pool.query(`VACUUM ANALYZE ${tableName}`);
  }

  async reindexTable(tableName) {
    await this.pool.query(`REINDEX TABLE ${tableName}`);
  }

  async getIndexUsage(tableName) {
    const query = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      WHERE tablename = $1
      ORDER BY idx_scan DESC;
    `;
    return await this.pool.query(query, [tableName]);
  }

  async findUnusedIndexes() {
    const query = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND indexname NOT LIKE '%_pkey'
      ORDER BY schemaname, tablename, indexname;
    `;
    return await this.pool.query(query);
  }
}
```

---

## Database Query Optimization

```javascript
class QueryOptimizer {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * 1. Use EXPLAIN ANALYZE to understand query execution
   */
  async analyzeQuery(query, params = []) {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, VERBOSE) ${query}`;
    const result = await this.pool.query(explainQuery, params);
    
    console.log('Query Execution Plan:');
    result.rows.forEach(row => {
      console.log(row['QUERY PLAN']);
    });
    
    return result.rows;
  }

  /**
   * 2. Identify slow queries
   */
  async getSlowQueries(threshold = 1000) { // milliseconds
    const query = `
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        max_time
      FROM pg_stat_statements
      WHERE mean_time > $1
      ORDER BY mean_time DESC
      LIMIT 10;
    `;
    return await this.pool.query(query, [threshold]);
  }

  /**
   * 3. Optimize SELECT queries
   */
  async optimizeSelect(originalQuery) {
    const optimizations = [];

    // Check for SELECT *
    if (originalQuery.includes('SELECT *')) {
      optimizations.push({
        issue: 'Using SELECT *',
        recommendation: 'Select only required columns',
        impact: 'Reduces data transfer and memory usage',
        example: 'SELECT id, name, email FROM users'
      });
    }

    // Check for missing WHERE clause
    if (!originalQuery.includes('WHERE') && originalQuery.includes('FROM')) {
      optimizations.push({
        issue: 'Missing WHERE clause',
        recommendation: 'Add WHERE to filter rows',
        impact: 'Reduces rows scanned',
        example: 'SELECT * FROM orders WHERE created_at > NOW() - INTERVAL \'7 days\''
      });
    }

    // Check for LIMIT
    if (!originalQuery.includes('LIMIT')) {
      optimizations.push({
        issue: 'No LIMIT clause',
        recommendation: 'Add LIMIT for pagination',
        impact: 'Prevents fetching all rows',
        example: 'SELECT * FROM users LIMIT 20 OFFSET 0'
      });
    }

    return optimizations;
  }

  /**
   * 4. Optimize JOIN queries
   */
  async optimizeJoin(table1, table2, joinColumn) {
    const recommendations = [];

    // Check if join column is indexed
    const indexCheck = await this.pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = $1 OR tablename = $2
    `);
    
    recommendations.push({
      action: 'Ensure join columns are indexed',
      sql: `CREATE INDEX idx_${table1}_${joinColumn} ON ${table1}(${joinColumn})`,
      reason: 'Speeds up JOIN operations'
    });

    return recommendations;
  }

  /**
   * 5. Use CTEs (Common Table Expressions) for complex queries
   */
  async optimizeWithCTE() {
    const optimizedQuery = `
      WITH user_orders AS (
        SELECT 
          user_id,
          COUNT(*) as order_count,
          SUM(total) as total_spent
        FROM orders
        WHERE status = 'completed'
          AND created_at > NOW() - INTERVAL '90 days'
        GROUP BY user_id
      ),
      user_stats AS (
        SELECT 
          u.id,
          u.name,
          u.email,
          COALESCE(uo.order_count, 0) as order_count,
          COALESCE(uo.total_spent, 0) as total_spent
        FROM users u
        LEFT JOIN user_orders uo ON u.id = uo.user_id
      )
      SELECT * FROM user_stats
      WHERE order_count > 0
      ORDER BY total_spent DESC
      LIMIT 100;
    `;

    return await this.pool.query(optimizedQuery);
  }

  /**
   * 6. Use prepared statements to prevent SQL injection and improve performance
   */
  async executePreparedQuery() {
    const query = 'SELECT * FROM users WHERE id = $1 AND status = $2';
    const params = [123, 'active'];
    
    // Query plan is cached and reused
    return await this.pool.query(query, params);
  }

  /**
   * 7. Batch inserts instead of single inserts
   */
  async batchInsert(tableName, data) {
    const columns = Object.keys(data[0]);
    const placeholders = data.map((_, i) => {
      const paramPlaceholders = columns.map((_, j) => `$${i * columns.length + j + 1}`);
      return `(${paramPlaceholders.join(', ')})`;
    });

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
    `;

    const flatParams = data.flatMap(item => Object.values(item));
    return await this.pool.query(query, flatParams);
  }

  /**
   * 8. Use connection pooling effectively
   */
  async executeWithOptimizedPooling(queries) {
    const results = [];
    
    // Execute queries in parallel when possible
    const promises = queries.map(async ({ text, params }) => {
      try {
        const result = await this.pool.query(text, params);
        return { success: true, result };
      } catch (error) {
        return { success: false, error };
      }
    });

    const resolved = await Promise.all(promises);
    return resolved;
  }

  /**
   * 9. Optimize subqueries with JOINs
   */
  async optimizeSubquery() {
    // Bad: Subquery in WHERE
    const badQuery = `
      SELECT * FROM orders 
      WHERE user_id IN (SELECT id FROM users WHERE status = 'active')
    `;

    // Good: JOIN
    const goodQuery = `
      SELECT o.*
      FROM orders o
      INNER JOIN users u ON o.user_id = u.id
      WHERE u.status = 'active'
    `;

    return await this.pool.query(goodQuery);
  }

  /**
   * 10. Use appropriate data types
   */
  async optimizeDataTypes() {
    const recommendations = [
      {
        bad: 'VARCHAR(255) for email',
        good: 'VARCHAR(255) - use TEXT instead in PostgreSQL',
        reason: 'TEXT has same performance, no length limit'
      },
      {
        bad: 'VARCHAR(10) for phone',
        good: 'VARCHAR(15) - account for country codes',
        reason: 'International phone numbers'
      },
      {
        bad: 'VARCHAR for numbers',
        good: 'INTEGER, BIGINT, DECIMAL',
        reason: 'Faster comparisons and sorting'
      },
      {
        bad: 'DATE and TIME separately',
        good: 'TIMESTAMP or TIMESTAMPTZ',
        reason: 'Single column, better performance'
      },
      {
        bad: 'BOOLEAN stored as VARCHAR',
        good: 'BOOLEAN type',
        reason: 'Native boolean, faster'
      }
    ];

    return recommendations;
  }

  /**
   * 11. Partition large tables
   */
  async createPartitionedTable() {
    const createPartitionedTable = `
      CREATE TABLE orders (
        id BIGSERIAL,
        user_id BIGINT NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id, created_at)
      ) PARTITION BY RANGE (created_at);

      -- Create partitions
      CREATE TABLE orders_2024_01 PARTITION OF orders
        FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

      CREATE TABLE orders_2024_02 PARTITION OF orders
        FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

      -- Index on partition key
      CREATE INDEX idx_orders_created_at ON orders(created_at);
      
      -- Local index on each partition
      CREATE INDEX idx_orders_user_id ON orders(user_id);
      CREATE INDEX idx_orders_status ON orders(status);
    `;

    return await this.pool.query(createPartitionedTable);
  }
}
```

---

## Database Replication

```
Database Replication: Copying data from one database (primary) to one or more databases (replicas)
```

### Types of Replication

```javascript
/**
 * 1. Master-Slave Replication (One-way)
 * Primary accepts writes, replicas handle reads
 */

const masterSlaveConfig = {
  primary: {
    host: 'db-primary.example.com',
    role: 'primary',
    accepts: ['read', 'write']
  },
  replicas: [
    {
      host: 'db-replica-1.example.com',
      role: 'replica',
      accepts: ['read']
    },
    {
      host: 'db-replica-2.example.com',
      role: 'replica',
      accepts: ['read']
    }
  ]
};

/**
 * 2. Master-Master Replication (Two-way)
 * Both servers accept writes, synchronize with each other
 */

const masterMasterConfig = {
  servers: [
    {
      host: 'db-node-1.example.com',
      role: 'master',
      accepts: ['read', 'write'],
      peer: 'db-node-2.example.com'
    },
    {
      host: 'db-node-2.example.com',
      role: 'master',
      accepts: ['read', 'write'],
      peer: 'db-node-1.example.com'
    }
  ]
};

/**
 * 3. Streaming Replication
 * Real-time replication using WAL (Write-Ahead Log)
 */

const streamingReplication = {
  method: 'Streaming',
  technology: 'WAL Shipping',
  latency: 'Low (milliseconds)',
  consistency: 'Near real-time',
  setup: `
    -- On primary
    postgresql.conf:
    wal_level = replica
    max_wal_senders = 3
    wal_keep_size = 1GB
    
    pg_hba.conf:
    host    replication     replicator      192.168.1.0/24      md5
    
    -- Create replication user
    CREATE ROLE replicator WITH REPLICATION PASSWORD 'password' LOGIN;
    
    -- On replica
    recovery.conf:
    standby_mode = 'on'
    primary_conninfo = 'host=db-primary user=replicator password=password'
  `
};

/**
 * 4. Logical Replication
 * Replicates data at the table/row level
 */

const logicalReplication = {
  method: 'Logical',
  granularity: 'Table/Row',
  flexibility: 'High',
  setup: `
    -- On primary
    postgresql.conf:
    wal_level = logical
    max_replication_slots = 4
    
    -- Create publication
    CREATE PUBLICATION users_pub FOR TABLE users;
    CREATE PUBLICATION orders_pub FOR TABLE orders;
    
    -- On replica
    CREATE SUBSCRIPTION users_sub 
    CONNECTION 'host=db-primary dbname=mydb user=postgres' 
    PUBLICATION users_pub;
  `
};

/**
 * 5. Synchronous vs Asynchronous Replication
 */

const replicationSync = {
  synchronous: {
    description: 'Primary waits for replica confirmation',
    latency: 'Higher',
    durability: 'Guaranteed',
    setup: `
      ALTER SYSTEM SET synchronous_commit = 'on';
      ALTER SYSTEM SET synchronous_standby_names = 'replica1,replica2';
    `
  },
  asynchronous: {
    description: 'Primary doesn\'t wait for replicas',
    latency: 'Lower',
    durability: 'Potential data loss',
    setup: `
      ALTER SYSTEM SET synchronous_commit = 'off';
      ALTER SYSTEM SET synchronous_standby_names = '';
    `
  }
};
```

### How Data is Shared to Replicas

```javascript
class DatabaseReplicationManager {
  constructor(config) {
    this.primary = config.primary;
    this.replicas = config.replicas;
    this.readWriteStrategy = config.readWriteStrategy || 'read-splitting';
  }

  /**
   * Route read operations
   */
  async routeRead(query, params) {
    if (this.readWriteStrategy === 'primary-only') {
      return await this.executeQuery(this.primary, query, params);
    }

    if (this.readWriteStrategy === 'read-splitting') {
      // Round-robin replica selection
      const replica = this.selectReplica();
      return await this.executeQuery(replica, query, params);
    }

    if (this.readWriteStrategy === 'smart') {
      // Use primary for recent writes, replicas for stale data
      if (this.requiresFreshData(query)) {
        return await this.executeQuery(this.primary, query, params);
      }
      const replica = this.selectReplica();
      return await this.executeQuery(replica, query, params);
    }
  }

  /**
   * Route write operations (always to primary)
   */
  async routeWrite(query, params) {
    return await this.executeQuery(this.primary, query, params);
  }

  /**
   * Select replica (round-robin)
   */
  selectReplica() {
    const index = Math.floor(Math.random() * this.replicas.length);
    return this.replicas[index];
  }

  /**
   * Check if query requires fresh data
   */
  requiresFreshData(query) {
    // Queries that need latest data
    const freshDataKeywords = [
      'INSERT',
      'UPDATE',
      'DELETE',
      'transactions',
      'inventory',
      'balance'
    ];

    return freshDataKeywords.some(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Execute query on specific database
   */
  async executeQuery(db, query, params) {
    try {
      return await db.query(query, params);
    } catch (error) {
      if (db.role === 'replica') {
        // Fallback to primary if replica fails
        console.warn('Replica failed, falling back to primary');
        return await this.executeQuery(this.primary, query, params);
      }
      throw error;
    }
  }

  /**
   * Monitor replication lag
   */
  async checkReplicationLag() {
    const lagChecks = [];

    for (const replica of this.replicas) {
      try {
        const result = await replica.query(`
          SELECT 
            NOW() - pg_last_xact_replay_timestamp() AS replication_lag
        `);
        lagChecks.push({
          host: replica.host,
          lag: result.rows[0].replication_lag
        });
      } catch (error) {
        lagChecks.push({
          host: replica.host,
          error: error.message
        });
      }
    }

    return lagChecks;
  }

  /**
   * Handle replica failover
   */
  async promoteReplica(replica) {
    // Promote replica to primary
    await replica.query('SELECT pg_promote();');
    
    // Update configuration
    this.primary = replica;
    this.replicas = this.replicas.filter(r => r !== replica);
    
    console.log(`Replica ${replica.host} promoted to primary`);
  }
}
```

---

## Database Sharding

```
Database Sharding: Partitioning data across multiple database instances
Each shard holds a subset of the data
```

### Types of Sharding

```javascript
/**
 * 1. Horizontal Sharding (Range-based)
 * Data divided by ranges of shard key
 */

const rangeSharding = {
  strategy: 'Horizontal Range',
  example: 'User ID ranges',
  shards: [
    {
      shardId: 'shard-1',
      keyRange: { min: 1, max: 1000000 },
      database: 'users_db_1',
      exampleData: 'Users with ID 1-1,000,000'
    },
    {
      shardId: 'shard-2',
      keyRange: { min: 1000001, max: 2000000 },
      database: 'users_db_2',
      exampleData: 'Users with ID 1,000,001-2,000,000'
    },
    {
      shardId: 'shard-3',
      keyRange: { min: 2000001, max: 3000000 },
      database: 'users_db_3',
      exampleData: 'Users with ID 2,000,001-3,000,000'
    }
  ],
 优点: 'Simple to implement, range queries efficient',
  缺点: 'Uneven data distribution if not balanced'
};

/**
 * 2. Vertical Sharding
 * Different tables on different shards
 */

const verticalSharding = {
  strategy: 'Vertical',
  example: 'Table-based partitioning',
  shards: [
    {
      shardId: 'shard-users',
      tables: ['users', 'profiles', 'preferences'],
      database: 'users_db',
      description: 'User-related tables'
    },
    {
      shardId: 'shard-products',
      tables: ['products', 'categories', 'inventory'],
      database: 'products_db',
      description: 'Product-related tables'
    },
    {
      shardId: 'shard-orders',
      tables: ['orders', 'order_items', 'payments'],
      database: 'orders_db',
      description: 'Order-related tables'
    }
  ],
  优点: 'Related data together, easier to scale specific services',
  缺点: 'Cross-shard joins are complex'
};

/**
 * 3. Hash-based Sharding
 * Data distributed using hash function
 */

const hashSharding = {
  strategy: 'Hash-based',
  algorithm: 'hash(key) % number_of_shards',
  shards: 4,
  example: `
    function getShard(userId) {
      return userId % 4;  // Returns 0, 1, 2, or 3
    }
    
    // User 1001 goes to shard 1
    // User 1002 goes to shard 2
    // User 1003 goes to shard 3
    // User 1004 goes to shard 0
  `,
  优点: 'Even data distribution, predictable location',
  缺点: 'Resharding requires redistributing all data'
};

/**
 * 4. Directory-based Sharding
 * Lookup service maps data to shards
 */

const directorySharding = {
  strategy: 'Directory/Lookup',
  components: [
    {
      name: 'Directory Service',
      purpose: 'Maps shard keys to shard locations',
      implementation: 'Redis, ZooKeeper, or dedicated database'
    },
    {
      name: 'Application Layer',
      purpose: 'Queries directory for shard location',
      example: 'GET user:1001 -> Returns shard-2'
    },
    {
      name: 'Shard Nodes',
      purpose: 'Actual database instances',
      example: 'shard-1, shard-2, shard-3'
    }
  ],
  优点: 'Flexible, easy to add/remove shards',
  缺点: 'Additional latency for directory lookup'
};

/**
 * 5. Consistent Hashing
 * Distributed hash ring
 */

const consistentHashing = {
  strategy: 'Consistent Hashing',
  concept: 'Nodes and keys placed on a ring',
  algorithm: `
    1. Place shards on ring: shard-1(0°), shard-2(90°), shard-3(180°), shard-4(270°)
    2. Hash data key to find position on ring
    3. Data goes to first shard clockwise from key position
  `,
  virtualNodes: 'Each shard has multiple virtual nodes for better distribution',
  优点: 'Minimal data movement when adding/removing shards',
  缺点: 'Complex implementation'
};
```

### Sharding Implementation

```javascript
class ShardingManager {
  constructor(config) {
    this.shards = config.shards;
    this.shardingStrategy = config.strategy || 'hash';
    this.directory = config.directory || null;
  }

  /**
   * Hash-based sharding
   */
  getShardByKey(key) {
    if (this.shardingStrategy === 'hash') {
      const hash = this.simpleHash(key.toString());
      const shardIndex = hash % this.shards.length;
      return this.shards[shardIndex];
    }

    if (this.shardingStrategy === 'range') {
      return this.getShardByRange(key);
    }

    if (this.shardingStrategy === 'directory' && this.directory) {
      return this.getShardFromDirectory(key);
    }

    throw new Error(`Unknown sharding strategy: ${this.shardingStrategy}`);
  }

  /**
   * Simple hash function
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Range-based sharding
   */
  getShardByRange(key) {
    const keyValue = parseInt(key);
    
    for (const shard of this.shards) {
      if (keyValue >= shard.min && keyValue <= shard.max) {
        return shard;
      }
    }
    
    throw new Error(`No shard found for key: ${key}`);
  }

  /**
   * Directory-based sharding
   */
  async getShardFromDirectory(key) {
    const shardId = await this.directory.get(`user:${key}`);
    return this.shards.find(s => s.id === shardId);
  }

  /**
   * Route query to appropriate shard
   */
  async routeQuery(query, shardKey) {
    const shard = await this.getShardByKey(shardKey);
    return await this.executeQuery(shard.connection, query);
  }

  /**
   * Cross-shard query (requires query on all shards)
   */
  async executeCrossShardQuery(query) {
    const results = [];
    
    // Execute query on all shards in parallel
    const promises = this.shards.map(async (shard) => {
      try {
        const result = await this.executeQuery(shard.connection, query);
        return { shardId: shard.id, result };
      } catch (error) {
        return { shardId: shard.id, error };
      }
    });

    const resolved = await Promise.all(promises);
    return resolved;
  }

  /**
   * Add new shard (resharding)
   */
  async addShard(newShard) {
    this.shards.push(newShard);
    
    if (this.shardingStrategy === 'directory') {
      // Update directory mappings
      await this.redistributeData(newShard);
    } else if (this.shardingStrategy === 'hash') {
      // Need to redistribute data based on new hash modulus
      await this.redistributeDataHashBased(newShard);
    }
  }

  /**
   * Remove shard
   */
  async removeShard(shardId) {
    const shardIndex = this.shards.findIndex(s => s.id === shardId);
    
    if (shardIndex === -1) {
      throw new Error(`Shard ${shardId} not found`);
    }

    const shard = this.shards[shardIndex];
    
    // Redistribute data from removed shard
    await this.redistributeDataFromShard(shard);
    
    this.shards.splice(shardIndex, 1);
  }

  /**
   * Resharding - move data between shards
   */
  async redistributeData(newShard) {
    console.log(`Redistributing data to new shard: ${newShard.id}`);
    
    // Implementation depends on strategy
    // For directory: update mappings
    // For hash: move data that now hashes to new shard
    // For range: adjust ranges
  }

  /**
   * Monitor shard health
   */
  async monitorShards() {
    const healthChecks = [];

    for (const shard of this.shards) {
      try {
        const result = await shard.connection.query('SELECT 1');
        healthChecks.push({
          shardId: shard.id,
          status: 'healthy',
          latency: result.latency || 0
        });
      } catch (error) {
        healthChecks.push({
          shardId: shard.id,
          status: 'unhealthy',
          error: error.message
        });
      }
    }

    return healthChecks;
  }
}

/**
 * Sharding Best Practices
 */

const shardingBestPractices = {
  // 1. Choose shard key carefully
  rule1: {
    guideline: 'Select evenly distributed shard key',
    example: 'User ID (good), Timestamp (bad - hot spots)',
    reason: 'Prevents uneven data distribution'
  },

  // 2. Avoid cross-shard queries
  rule2: {
    guideline: 'Design queries to hit single shard',
    example: 'Include shard key in WHERE clause',
    reason: 'Cross-shard queries are slow and complex'
  },

  // 3. Implement application-level routing
  rule3: {
    guideline: 'Route queries at application layer',
    example: 'Use middleware to determine shard',
    reason: 'Centralized control, easier to manage'
  },

  // 4. Plan for resharding
  rule4: {
    guideline: 'Design for future shard addition/removal',
    example: 'Use consistent hashing or directory',
    reason: 'Avoid massive data movement'
  },

  // 5. Monitor shard balance
  rule5: {
    guideline: 'Track data distribution across shards',
    example: 'Alert if shard has >50% more data than others',
    reason: 'Prevent hotspots and performance issues'
  },

  // 6. Backup each shard independently
  rule6: {
    guideline: 'Implement per-shard backup strategy',
    example: 'Stagger backups to avoid load spikes',
    reason: 'Reduce backup time and impact'
  }
};

/**
 * Sharding vs Replication
 */

const comparison = {
  sharding: {
    purpose: 'Scale write capacity',
    data: 'Different data on each shard',
    complexity: 'High',
    consistency: 'Per-shard ACID',
    useCase: 'High write throughput, large datasets'
  },
  replication: {
    purpose: 'Scale read capacity, improve availability',
    data: 'Same data on all replicas',
    complexity: 'Medium',
    consistency: 'Eventual (async) or Strong (sync)',
    useCase: 'Read-heavy workloads, high availability'
  },
  combined: {
    description: 'Use both for maximum scalability',
    architecture: 'Shard writes, replicate reads',
    example: '3 shards, each with 2 replicas'
  }
};
```

---

## Summary of Key Concepts

### Database Indexing
- **B-Tree**: Default, good for equality, range, ORDER BY queries
- **Hash**: Fast for exact matches only
- **GIN**: Arrays, JSONB, full-text search
- **GiST**: Geospatial, range queries
- **BRIN**: Large time-series tables with sorted data

### Query Optimization
- Use EXPLAIN ANALYZE to understand execution plans
- Select only required columns (avoid SELECT *)
- Add WHERE clauses to limit rows
- Use LIMIT for pagination
- Ensure join columns are indexed
- Use prepared statements
- Batch insert operations
- Use CTEs for complex queries
- Choose appropriate data types
- Partition large tables

### Database Replication
- **Master-Slave**: One-way, primary writes, replicas read
- **Master-Master**: Two-way, both accept writes
- **Streaming**: Real-time WAL shipping
- **Logical**: Table/row level replication
- **Sync**: Primary waits for replica (strong consistency)
- **Async**: Primary doesn't wait (potential data loss)

### Database Sharding
- **Range-based**: Divided by value ranges
- **Vertical**: Different tables on different shards
- **Hash-based**: Even distribution using hash function
- **Directory**: Lookup service for mapping
- **Consistent Hashing**: Distributed hash ring

### Sharding vs Replication
- **Sharding**: Scales writes, different data per shard
- **Replication**: Scales reads, same data on replicas
- **Combined**: Use both for maximum scalability