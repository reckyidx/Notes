# SQL & NoSQL Interview Questions & Answers
## For 10+ Years Experienced Node.js Developer

---

## Table of Contents
1. [SQL Fundamentals](#sql-fundamentals)
2. [PostgreSQL with Node.js](#postgresql-with-nodejs)
3. [MySQL with Node.js](#mysql-with-nodejs)
4. [NoSQL Databases](#nosql-databases)
5. [MongoDB with Node.js](#mongodb-with-nodejs)
6. [Redis Data Structures](#redis-data-structures)
7. [Database Design Patterns](#database-design-patterns)
8. [Performance Optimization](#performance-optimization)
9. [Database Scaling Patterns](#database-scaling-patterns)

---

## SQL Fundamentals

### Q1: Explain ACID properties and database transactions.

**Answer:**

**ACID Properties:**

```
ACID stands for:
A - Atomicity
C - Consistency
I - Isolation
D - Durability
```

**Implementation in Node.js:**

```javascript
// database/transaction.js
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

class TransactionManager {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Execute a transaction with ACID properties
   */
  async executeTransaction(callback) {
    const client = await this.pool.connect();
    
    try {
      // BEGIN - Start transaction
      await client.query('BEGIN');
      
      // Execute callback within transaction
      const result = await callback(client);
      
      // COMMIT - Make changes permanent
      await client.query('COMMIT');
      
      return result;
    } catch (error) {
      // ROLLBACK - Undo all changes if error occurs
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Example: Transfer money between accounts (Atomicity)
   */
  async transferMoney(fromAccountId, toAccountId, amount) {
    return this.executeTransaction(async (client) => {
      // Check if fromAccount has sufficient balance (Consistency)
      const { rows: [fromAccount] } = await client.query(
        'SELECT id, balance FROM accounts WHERE id = $1 FOR UPDATE',
        [fromAccountId]
      );

      if (!fromAccount) {
        throw new Error('Source account not found');
      }

      if (fromAccount.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Deduct from source account
      await client.query(
        'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
        [amount, fromAccountId]
      );

      // Add to destination account
      await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
        [amount, toAccountId]
      );

      // Create transaction record
      await client.query(
        `INSERT INTO transactions (from_account_id, to_account_id, amount, status)
         VALUES ($1, $2, $3, 'completed')`,
        [fromAccountId, toAccountId, amount]
      );

      return { success: true, transactionId: generateId() };
    });
  }

  /**
   * Example: Place order with multiple items (Isolation)
   */
  async placeOrder(userId, orderItems) {
    return this.executeTransaction(async (client) => {
      // Calculate total
      let total = 0;
      for (const item of orderItems) {
        const { rows: [product] } = await client.query(
          'SELECT id, price, stock FROM products WHERE id = $1 FOR UPDATE',
          [item.productId]
        );

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }

        total += product.price * item.quantity;

        // Update stock
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.productId]
        );
      }

      // Create order
      const { rows: [order] } = await client.query(
        `INSERT INTO orders (user_id, total, status)
         VALUES ($1, $2, 'pending')
         RETURNING *`,
        [userId, total]
      );

      // Create order items
      for (const item of orderItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES ($1, $2, $3, (
             SELECT price FROM products WHERE id = $2
           ))`,
          [order.id, item.productId, item.quantity]
        );
      }

      return order;
    });
  }

  /**
   * Nested transactions (SAVEPOINT)
   */
  async executeWithSavepoints(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Example with savepoints
   */
  async processBatchOrders(orders) {
    return this.executeWithSavepoints(async (client) => {
      const results = [];

      for (const order of orders) {
        // Create savepoint for each order
        const savepointName = `order_${order.id}`;
        await client.query(`SAVEPOINT ${savepointName}`);

        try {
          const result = await this.processOrder(client, order);
          results.push({ orderId: order.id, success: true, result });
        } catch (error) {
          // Rollback to savepoint only for this order
          await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
          results.push({ orderId: order.id, success: false, error: error.message });
        }
      }

      return results;
    });
  }
}

module.exports = TransactionManager;
```

---

## PostgreSQL with Node.js

### Q2: Implement a robust PostgreSQL connection with connection pooling.

**Answer:**

```javascript
// database/postgres.js
const { Pool } = require('pg');
const { promisify } = require('util');

class PostgreSQL {
  constructor(config) {
    this.config = {
      host: config.host || process.env.DB_HOST,
      port: config.port || process.env.DB_PORT || 5432,
      database: config.database || process.env.DB_NAME,
      user: config.user || process.env.DB_USER,
      password: config.password || process.env.DB_PASSWORD,
      max: config.max || 20, // Maximum pool size
      min: config.min || 2,  // Minimum pool size
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
      ...config
    };

    this.pool = new Pool(this.config);
    this.setupEventListeners();
  }

  setupEventListeners() {
    // When a new client connects
    this.pool.on('connect', (client) => {
      console.log('New PostgreSQL client connected');
    });

    // When a client is acquired from the pool
    this.pool.on('acquire', (client) => {
      console.log('Client acquired from pool');
    });

    // When a client is returned to the pool
    this.pool.on('release', (client) => {
      console.log('Client released to pool');
    });

    // When an error occurs on a client
    this.pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  /**
   * Execute a query
   */
  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      console.log('Executed query', { text, duration, rows: result.rowCount });
      
      return result;
    } catch (error) {
      console.error('Query error', { text, error });
      throw error;
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  /**
   * Close all connections in the pool
   */
  async close() {
    await this.pool.end();
    console.log('PostgreSQL pool closed');
  }
}

// Repository Pattern Example
class UserRepository {
  constructor(db) {
    this.db = db;
  }

  async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0];
  }

  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.db.query(query, [email]);
    return result.rows[0];
  }

  async create(userData) {
    const query = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await this.db.query(query, [
      userData.name,
      userData.email,
      userData.password,
      userData.role || 'user'
    ]);
    return result.rows[0];
  }

  async update(id, userData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(userData)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }

    const query = `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
    const result = await this.db.query(query, [id]);
    return result.rows[0];
  }

  async findAll(options = {}) {
    const { page = 1, limit = 10, sort = 'created_at', order = 'DESC' } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT * FROM users
      ORDER BY ${sort} ${order}
      LIMIT $1 OFFSET $2
    `;

    const countQuery = 'SELECT COUNT(*) FROM users';

    const [result, countResult] = await Promise.all([
      this.db.query(query, [limit, offset]),
      this.db.query(countQuery)
    ]);

    return {
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    };
  }
}

// Usage Example
const db = new PostgreSQL({
  host: 'localhost',
  database: 'myapp',
  user: 'postgres',
  password: 'password'
});

const userRepo = new UserRepository(db);

async function main() {
  try {
    // Create user
    const user = await userRepo.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpassword',
      role: 'user'
    });

    console.log('Created user:', user);

    // Find user
    const foundUser = await userRepo.findById(user.id);
    console.log('Found user:', foundUser);

    // Update user
    const updatedUser = await userRepo.update(user.id, {
      name: 'John Smith'
    });
    console.log('Updated user:', updatedUser);

    // List users with pagination
    const users = await userRepo.findAll({ page: 1, limit: 10 });
    console.log('Users:', users);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.close();
  }
}
```

---

## MySQL with Node.js

### Q3: Implement MySQL connection with connection pooling and query builder.

**Answer:**

```javascript
// database/mysql.js
const mysql = require('mysql2/promise');
const { QueryBuilder } = require('knex');

class MySQL {
  constructor(config) {
    this.config = {
      host: config.host || process.env.DB_HOST,
      port: config.port || process.env.DB_PORT || 3306,
      user: config.user || process.env.DB_USER,
      password: config.password || process.env.DB_PASSWORD,
      database: config.database || process.env.DB_NAME,
      waitForConnections: config.waitForConnections !== false,
      connectionLimit: config.connectionLimit || 10,
      queueLimit: config.queueLimit || 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      ...config
    };

    this.pool = mysql.createPool(this.config);
  }

  /**
   * Execute a query
   */
  async query(sql, params) {
    try {
      const [rows, fields] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('MySQL query error:', error);
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction(callback) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const result = await callback(connection);
      
      await connection.commit();
      
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get pool status
   */
  getPoolStatus() {
    return {
      allConnections: this.pool.pool.allConnections.length,
      freeConnections: this.pool.pool.freeConnections.length,
      acquiringConnections: this.pool.pool.connectionQueue.length
    };
  }

  /**
   * Close pool
   */
  async close() {
    await this.pool.end();
    console.log('MySQL pool closed');
  }
}

/**
 * Query Builder for MySQL
 */
class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.selects = [];
    this.wheres = [];
    this.joins = [];
    this.orderBys = [];
    this.limit = null;
    this.offset = null;
    this.params = [];
  }

  select(...columns) {
    this.selects = columns.length ? columns : ['*'];
    return this;
  }

  where(column, operator, value) {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }
    this.wheres.push({ column, operator, value, logic: 'AND' });
    return this;
  }

  orWhere(column, operator, value) {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }
    this.wheres.push({ column, operator, value, logic: 'OR' });
    return this;
  }

  whereIn(column, values) {
    this.wheres.push({ column, operator: 'IN', value: values, logic: 'AND' });
    return this;
  }

  join(table, first, operator, second) {
    this.joins.push({ table, first, operator, second, type: 'INNER' });
    return this;
  }

  leftJoin(table, first, operator, second) {
    this.joins.push({ table, first, operator, second, type: 'LEFT' });
    return this;
  }

  orderBy(column, direction = 'ASC') {
    this.orderBys.push({ column, direction });
    return this;
  }

  limit(value) {
    this.limit = value;
    return this;
  }

  offset(value) {
    this.offset = value;
    return this;
  }

  build() {
    const params = [];
    
    let sql = `SELECT ${this.selects.join(', ')} FROM ${this.table}`;

    // Joins
    for (const join of this.joins) {
      sql += ` ${join.type} JOIN ${join.table} ON ${join.first} ${join.operator} ${join.second}`;
    }

    // Where clauses
    if (this.wheres.length > 0) {
      sql += ' WHERE';
      for (let i = 0; i < this.wheres.length; i++) {
        const where = this.wheres[i];
        
        if (i > 0) {
          sql += ` ${where.logic}`;
        }

        if (where.operator === 'IN') {
          sql += ` ${where.column} IN (${where.value.map(() => '?').join(',')})`;
          params.push(...where.value);
        } else {
          sql += ` ${where.column} ${where.operator} ?`;
          params.push(where.value);
        }
      }
    }

    // Order by
    if (this.orderBys.length > 0) {
      sql += ` ORDER BY ${this.orderBys.map(ob => `${ob.column} ${ob.direction}`).join(', ')}`;
    }

    // Limit
    if (this.limit !== null) {
      sql += ` LIMIT ?`;
      params.push(this.limit);
    }

    // Offset
    if (this.offset !== null) {
      sql += ` OFFSET ?`;
      params.push(this.offset);
    }

    return { sql, params };
  }
}

// Repository Example for MySQL
class ProductRepository {
  constructor(db) {
    this.db = db;
  }

  async findById(id) {
    const sql = 'SELECT * FROM products WHERE id = ?';
    const [product] = await this.db.query(sql, [id]);
    return product;
  }

  async findAll(filters = {}) {
    const qb = new QueryBuilder('products')
      .select('id', 'name', 'price', 'stock', 'category_id', 'created_at');

    if (filters.categoryId) {
      qb.where('category_id', filters.categoryId);
    }

    if (filters.minPrice) {
      qb.where('price', '>=', filters.minPrice);
    }

    if (filters.maxPrice) {
      qb.where('price', '<=', filters.maxPrice);
    }

    if (filters.search) {
      qb.where('name', 'LIKE', `%${filters.search}%`);
    }

    if (filters.inStock) {
      qb.where('stock', '>', 0);
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    qb.orderBy('created_at', 'DESC');
    qb.limit(limit);
    qb.offset((page - 1) * limit);

    const { sql, params } = qb.build();
    const products = await this.db.query(sql, params);

    // Get total count
    const countQb = new QueryBuilder('products').select('COUNT(*) as total');
    
    if (filters.categoryId) {
      countQb.where('category_id', filters.categoryId);
    }
    
    if (filters.minPrice) {
      countQb.where('price', '>=', filters.minPrice);
    }
    
    if (filters.maxPrice) {
      countQb.where('price', '<=', filters.maxPrice);
    }

    const countSql = countQb.build().sql;
    const [countResult] = await this.db.query(countSql, []);

    return {
      data: products,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    };
  }

  async create(productData) {
    const sql = `
      INSERT INTO products (name, description, price, stock, category_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await this.db.query(sql, [
      productData.name,
      productData.description,
      productData.price,
      productData.stock,
      productData.categoryId
    ]);
    
    return await this.findById(result.insertId);
  }

  async update(id, productData) {
    const fields = [];
    const params = [];

    for (const [key, value] of Object.entries(productData)) {
      fields.push(`${key} = ?`);
      params.push(value);
    }

    params.push(id);

    const sql = `
      UPDATE products
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `;

    await this.db.query(sql, params);
    return await this.findById(id);
  }

  async delete(id) {
    const sql = 'DELETE FROM products WHERE id = ?';
    await this.db.query(sql, [id]);
    return true;
  }
}
```

---

## NoSQL Databases

### Q4: Explain when to use NoSQL vs SQL databases.

**Answer:**

**Comparison Table:**

| Aspect | SQL (Relational) | NoSQL (Non-Relational) |
|--------|------------------|------------------------|
| **Data Model** | Structured, tables with schemas | Flexible, document, key-value, graph |
| **Schema** | Fixed schema, requires migration | Dynamic schema, schemaless |
| **Scalability** | Vertical scaling (mostly) | Horizontal scaling (easy) |
| **Consistency** | Strong consistency (ACID) | Eventual consistency (BASE) |
| **Query Language** | SQL (standardized) | Vendor-specific APIs |
| **Relationships** | Foreign keys, JOINs | Embedding, referencing |
| **Transactions** | ACID transactions | Limited transaction support |
| **Use Cases** | Financial systems, ERP | Social media, real-time apps |

**When to Use SQL:**

```javascript
// SQL is best for:
// 1. Complex queries with JOINs
// 2. Data integrity is critical (financial, banking)
// 3. Structured data with clear relationships
// 4. Need for transactions (ACID)
// 5. Reporting and analytics
// 6. Known, stable schema

// Example: E-commerce order system
class OrderSystem {
  constructor(db) {
    this.db = db;
  }

  // Complex query with JOINs
  async getOrderWithDetails(orderId) {
    const query = `
      SELECT 
        o.*,
        oi.quantity,
        oi.price as item_price,
        p.name as product_name,
        u.name as customer_name,
        u.email as customer_email
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `;
    return await this.db.query(query, [orderId]);
  }

  // Transaction for data integrity
  async createOrder(orderData) {
    return await this.db.transaction(async (client) => {
      // Create order
      const { rows: [order] } = await client.query(
        'INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3) RETURNING *',
        [orderData.userId, orderData.total, 'pending']
      );

      // Create order items
      for (const item of orderData.items) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
          [order.id, item.productId, item.quantity, item.price]
        );

        // Update product stock
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.productId]
        );
      }

      // Create payment record
      await client.query(
        'INSERT INTO payments (order_id, amount, status) VALUES ($1, $2, $3)',
        [order.id, orderData.total, 'pending']
      );

      return order;
    });
  }
}
```

**When to Use NoSQL:**

```javascript
// NoSQL is best for:
// 1. Unstructured or semi-structured data
// 2. Rapid iteration, changing schema
// 3. High write throughput
// 4. Horizontal scaling requirements
// 5. Real-time analytics
// 6. Social media feeds, user profiles
// 7. IoT data, logs
// 8. Content management systems

// Example: User activity tracking with MongoDB
const { MongoClient } = require('mongodb');

class ActivityTracker {
  constructor(uri) {
    this.client = new MongoClient(uri);
    this.db = null;
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db('analytics');
  }

  // Flexible schema - different activity types
  async trackActivity(userId, activityType, data) {
    const activities = this.db.collection('activities');
    
    await activities.insertOne({
      userId,
      activityType, // 'view', 'click', 'purchase', 'search', etc.
      data,         // Flexible data structure based on activity type
      timestamp: new Date(),
      metadata: {
        ip: data.ip,
        userAgent: data.userAgent,
        device: data.device
      }
    });
  }

  // Query flexible data
  async getUserActivities(userId, filters = {}) {
    const activities = this.db.collection('activities');
    const query = { userId };

    if (filters.activityType) {
      query.activityType = filters.activityType;
    }

    if (filters.startDate && filters.endDate) {
      query.timestamp = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    return await activities.find(query).sort({ timestamp: -1 }).limit(100).toArray();
  }

  // Aggregation pipeline for analytics
  async getActivityStats(userId, days = 30) {
    const activities = this.db.collection('activities');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const pipeline = [
      { $match: { userId, timestamp: { $gte: startDate } } },
      { $group: {
        _id: '$activityType',
        count: { $sum: 1 },
        lastActivity: { $max: '$timestamp' }
      }},
      { $sort: { count: -1 } }
    ];

    return await activities.aggregate(pipeline).toArray();
  }
}
```

---

## MongoDB with Node.js

### Q5: Implement MongoDB connection with proper connection management.

**Answer:**

```javascript
// database/mongodb.js
const { MongoClient, ObjectId } = require('mongodb');

class MongoDB {
  constructor(uri, options = {}) {
    this.uri = uri;
    this.options = {
      maxPoolSize: options.maxPoolSize || 10,
      minPoolSize: options.minPoolSize || 2,
      maxIdleTimeMS: options.maxIdleTimeMS || 60000,
      serverSelectionTimeoutMS: options.serverSelectionTimeoutMS || 5000,
      socketTimeoutMS: options.socketTimeoutMS || 45000,
      connectTimeoutMS: options.connectTimeoutMS || 10000,
      ...options
    };
    this.client = null;
    this.db = null;
  }

  async connect(databaseName) {
    try {
      this.client = await MongoClient.connect(this.uri, this.options);
      this.db = this.client.db(databaseName);
      console.log('Connected to MongoDB');
      return this;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('Disconnected from MongoDB');
    }
  }

  getDatabase() {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Transaction support
   */
  async withTransaction(callback) {
    const session = this.client.startSession();
    
    try {
      await session.withTransaction(async () => {
        await callback(session);
      });
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

// Repository Pattern for MongoDB
class MongoRepository {
  constructor(db, collectionName) {
    this.db = db;
    this.collection = db.collection(collectionName);
  }

  async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findOne(filter) {
    return await this.collection.findOne(filter);
  }

  async find(filter = {}, options = {}) {
    return await this.collection.find(filter, options).toArray();
  }

  async create(data) {
    const result = await this.collection.insertOne(data);
    return await this.findById(result.insertedId);
  }

  async update(id, data) {
    const result = await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } }
    );
    return await this.findById(id);
  }

  async delete(id) {
    await this.collection.deleteOne({ _id: new ObjectId(id) });
    return true;
  }

  async count(filter = {}) {
    return await this.collection.countDocuments(filter);
  }

  async paginate(filter = {}, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.collection
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort(options.sort || { createdAt: -1 })
        .toArray(),
      this.collection.countDocuments(filter)
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async aggregate(pipeline) {
    return await this.collection.aggregate(pipeline).toArray();
  }
}

// Example: Product Repository with MongoDB
class ProductRepository extends MongoRepository {
  async searchProducts(searchQuery, filters = {}) {
    const pipeline = [];

    // Match stage
    const match = {};
    
    if (searchQuery) {
      match.$text = { $search: searchQuery };
    }

    if (filters.category) {
      match.category = filters.category;
    }

    if (filters.minPrice || filters.maxPrice) {
      match.price = {};
      if (filters.minPrice) match.price.$gte = filters.minPrice;
      if (filters.maxPrice) match.price.$lte = filters.maxPrice;
    }

    if (filters.inStock) {
      match.stock = { $gt: 0 };
    }

    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    // Text score for relevance
    if (searchQuery) {
      pipeline.push({
        $addFields: {
          score: { $meta: 'textScore' }
        }
      });
      pipeline.push({
        $sort: { score: { $meta: 'textScore' } }
      });
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Get total count
    const totalPipeline = pipeline.filter(stage => !['$skip', '$limit'].includes(Object.keys(stage)[0]));
    totalPipeline.push({ $count: 'total' });

    const [products, totalResult] = await Promise.all([
      this.collection.aggregate(pipeline).toArray(),
      this.collection.aggregate(totalPipeline).toArray()
    ]);

    const total = totalResult[0]?.total || 0;

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getProductStatistics() {
    const pipeline = [
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          totalStock: { $sum: '$stock' }
        }
      },
      {
        $sort: { totalProducts: -1 }
      }
    ];

    return await this.aggregate(pipeline);
  }

  async updateStock(productId, quantity) {
    return await this.collection.updateOne(
      { _id: new ObjectId(productId) },
      { $inc: { stock: -quantity } }
    );
  }
}

// Usage Example
async function main() {
  const mongo = new MongoDB('mongodb://localhost:27017', {
    maxPoolSize: 10
  });

  await mongo.connect('myapp');

  const productRepo = new ProductRepository(mongo.getDatabase(), 'products');

  // Create product
  const product = await productRepo.create({
    name: 'Laptop',
    description: 'High-performance laptop',
    price: 999.99,
    stock: 50,
    category: 'Electronics',
    createdAt: new Date()
  });

  console.log('Created product:', product);

  // Search products
  const searchResults = await productRepo.searchProducts('laptop', {
    category: 'Electronics',
    minPrice: 500,
    maxPrice: 1500,
    page: 1,
    limit: 10
  });

  console.log('Search results:', searchResults);

  // Get statistics
  const stats = await productRepo.getProductStatistics();
  console.log('Product statistics:', stats);

  await mongo.disconnect();
}
```

---

## Redis Data Structures

### Q6: Explain Redis data structures and use cases.

**Answer:**

```javascript
const Redis = require('ioredis');

class RedisDataStructures {
  constructor() {
    this.redis = new Redis();
  }

  /**
   * 1. Strings
   * Use cases: Caching, counters, sessions
   */
  async stringOperations() {
    // SET
    await this.redis.set('user:1001', JSON.stringify({ name: 'John', age: 30 }));

    // GET
    const user = JSON.parse(await this.redis.get('user:1001'));
    console.log('User:', user);

    // SETEX - Set with expiration
    await this.redis.setex('session:abc123', 3600, JSON.stringify({ userId: 1001 }));

    // INCR - Counter
    await this.redis.incr('page:home:views');
    const views = await this.redis.get('page:home:views');
    console.log('Page views:', views);

    // INCRBY
    await this.redis.incrby('product:1001:likes', 5);

    // MGET - Get multiple values
    const values = await this.redis.mget('user:1001', 'user:1002', 'user:1003');
  }

  /**
   * 2. Lists
   * Use cases: Queues, timelines, recent activity
   */
  async listOperations() {
    // LPUSH - Add to left (head)
    await this.redis.lpush('recent:activity', JSON.stringify({ type: 'login', user: 1001 }));
    await this.redis.lpush('recent:activity', JSON.stringify({ type: 'view', product: 200 }));

    // RPUSH - Add to right (tail)
    await this.redis.rpush('queue:email', JSON.stringify({ to: 'user@example.com', subject: 'Welcome' }));

    // LPOP - Remove from left
    const email = JSON.parse(await this.redis.lpop('queue:email'));

    // RPOP - Remove from right
    const activity = JSON.parse(await this.redis.rpop('recent:activity'));

    // LRANGE - Get range
    const activities = await this.redis.lrange('recent:activity', 0, 9);
    console.log('Recent activities:', activities);

    // LLEN - Get length
    const queueLength = await this.redis.llen('queue:email');

    // LTRIM - Trim list
    await this.redis.ltrim('recent:activity', 0, 99); // Keep last 100
  }

  /**
   * 3. Sets
   * Use cases: Unique values, tags, relationships
   */
  async setOperations() {
    // SADD - Add members
    await this.redis.sadd('user:1001:tags', 'developer', 'javascript', 'nodejs');

    // SMEMBERS - Get all members
    const tags = await this.redis.smembers('user:1001:tags');

    // SISMEMBER - Check if member exists
    const isDeveloper = await this.redis.sismember('user:1001:tags', 'developer');

    // SREM - Remove member
    await this.redis.srem('user:1001:tags', 'nodejs');

    // SINTER - Intersection
    await this.redis.sadd('post:1:liked_by', 1001, 1002, 1003);
    await this.redis.sadd('post:2:liked_by', 1002, 1003, 1004);
    const commonLikes = await this.redis.sinter('post:1:liked_by', 'post:2:liked_by');

    // SUNION - Union
    const allLikes = await this.redis.sunion('post:1:liked_by', 'post:2:liked_by');

    // SCARD - Get count
    const likeCount = await this.redis.scard('post:1:liked_by');
  }

  /**
   * 4. Hashes
   * Use cases: Object storage, user profiles, product details
   */
  async hashOperations() {
    // HSET - Set field
    await this.redis.hset('user:1001', 'name', 'John Doe');
    await this.redis.hset('user:1001', 'email', 'john@example.com');
    await this.redis.hset('user:1001', 'age', 30);

    // HMSET - Set multiple fields
    await this.redis.hmset('user:1002', {
      name: 'Jane Smith',
      email: 'jane@example.com',
      age: 25
    });

    // HGET - Get field
    const name = await this.redis.hget('user:1001', 'name');

    // HGETALL - Get all fields
    const user = await this.redis.hgetall('user:1001');

    // HMGET - Get multiple fields
    const fields = await this.redis.hmget('user:1001', 'name', 'email');

    // HINCRBY - Increment field
    await this.redis.hincrby('user:1001', 'login_count', 1);

    // HDEL - Delete field
    await this.redis.hdel('user:1001', 'age');

    // HKEYS - Get all keys
    const keys = await this.redis.hkeys('user:1001');

    // HVALS - Get all values
    const values = await this.redis.hvals('user:1001');
  }

  /**
   * 5. Sorted Sets
   * Use cases: Leaderboards, rankings, priority queues
   */
  async sortedSetOperations() {
    // ZADD - Add member with score
    await this.redis.zadd('leaderboard:scores', 1000, 'player1');
    await this.redis.zadd('leaderboard:scores', 950, 'player2');
    await this.redis.zadd('leaderboard:scores', 1050, 'player3');

    // ZRANGE - Get range (ascending)
    const bottomPlayers = await this.redis.zrange('leaderboard:scores', 0, 2);

    // ZREVRANGE - Get range (descending)
    const topPlayers = await this.redis.zrevrange('leaderboard:scores', 0, 2, 'WITHSCORES');

    // ZRANK - Get rank
    const rank = await this.redis.zrank('leaderboard:scores', 'player1');

    // ZSCORE - Get score
    const score = await this.redis.zscore('leaderboard:scores', 'player1');

    // ZINCRBY - Increment score
    await this.redis.zincrby('leaderboard:scores', 50, 'player1');

    // ZRANGE with pagination
    const leaderboard = await this.redis.zrevrange('leaderboard:scores', 0, 9, 'WITHSCORES');
    console.log('Leaderboard:', leaderboard);
  }

  /**
   * 6. Bitmaps
   * Use cases: Attendance, binary flags, counting
   */
  async bitmapOperations() {
    const date = '2024-01-01';
    const userId = 1001;

    // SETBIT - Set bit
    await this.redis.setbit(`attendance:${date}`, userId, 1);

    // GETBIT - Get bit
    const attended = await this.redis.getbit(`attendance:${date}`, userId);

    // BITCOUNT - Count set bits
    const attendanceCount = await this.redis.bitcount(`attendance:${date}`);

    // BITOP - Bitwise operations
    await this.redis.bitop('AND', 'result:attendance', 'attendance:2024-01-01', 'attendance:2024-01-02');
  }

  /**
   * 7. HyperLogLog
   * Use cases: Unique count with low memory
   */
  async hyperLogLogOperations() {
    // PFADD - Add element
    await this.redis.pfadd('daily:unique:visitors', 'user1', 'user2', 'user3');

    // PFCOUNT - Count unique elements
    const uniqueVisitors = await this.redis.pfcount('daily:unique:visitors');
    console.log('Unique visitors:', uniqueVisitors);

    // PFMERGE - Merge multiple HLLs
    await this.redis.pfadd('day1:visitors', 'user1', 'user2');
    await this.redis.pfadd('day2:visitors', 'user2', 'user3');
    await this.redis.pfmerge('week:visitors', 'day1:visitors', 'day2:visitors');
  }

  /**
   * 8. Geo
   * Use cases: Location-based services, geospatial queries
   */
  async geoOperations() {
    // GEOADD - Add location
    await this.redis.geoadd('stores:locations', -122.4194, 37.7749, 'store1');
    await this.redis.geoadd('stores:locations', -118.2437, 34.0522, 'store2');

    // GEODIST - Calculate distance
    const distance = await this.redis.geodist('stores:locations', 'store1', 'store2', 'km');

    // GEORADIUS - Find nearby locations
    const nearby = await this.redis.georadius(
      'stores:locations',
      -122.4194,
      37.7749,
      100,
      'km',
      'WITHDIST',
      'WITHCOORD'
    );

    console.log('Nearby stores:', nearby);
  }
}

// Usage Example
const redisStructures = new RedisDataStructures();
async function main() {
  await redisStructures.stringOperations();
  await redisStructures.listOperations();
  await redisStructures.setOperations();
  await redisStructures.hashOperations();
  await redisStructures.sortedSetOperations();
  await redisStructures.bitmapOperations();
  await redisStructures.hyperLogLogOperations();
  await redisStructures.geoOperations();
}
```

---

## Database Scaling Patterns

### Q7: Implement database sharding strategy for massive scale

**Answer:**

```javascript
/**
 * Database Sharding - Horizontal Partitioning
 * Problem: Single database cannot scale beyond a point
 * Solution: Divide data across multiple databases by key
 */

class ShardingStrategy {
  constructor(shards) {
    // Array of database connections, one per shard
    this.shards = shards;
    this.shardCount = shards.length;
  }

  /**
   * 1. Range-based Sharding
   * Users 1-1M -> Shard 0
   * Users 1M-2M -> Shard 1
   * Problem: Uneven distribution, hotspots
   */
  rangeBasedShard(userId) {
    const shardIndex = Math.floor(userId / 1000000);
    return Math.min(shardIndex, this.shardCount - 1);
  }

  /**
   * 2. Hash-based Sharding (Consistent)
   * hash(userId) % num_shards
   * Pros: Even distribution
   * Cons: Resharding on shard changes is hard
   */
  hashBasedShard(userId) {
    let hash = 0;
    const userIdStr = String(userId);
    
    for (let char of userIdStr) {
      hash = ((hash << 5) - hash) + char.charCodeAt(0);
      hash = hash & hash; // 32-bit integer
    }

    return Math.abs(hash) % this.shardCount;
  }

  /**
   * 3. Consistent Hashing (Better than hash-based)
   * Maps to hash ring - minimal redistribution on changes
   */
  consistentHash(userId) {
    const ring = new Map();
    const virtualNodes = 160; // Replicas for better distribution

    // Build ring (simplified example)
    const hash = this.hashFunction(String(userId));
    
    // Find first shard with hash >= key hash
    for (let i = 0; i < this.shardCount; i++) {
      const shardHash = this.hashFunction(`shard:${i}`);
      if (shardHash >= hash) {
        return i;
      }
    }

    return 0;
  }

  /**
   * 4. Directory/Lookup-based Sharding
   * Store mapping in metadata database
   * Pros: Most flexible, can rebalance easily
   * Cons: Extra lookup overhead
   */
  directoryBasedShard(userId) {
    // Lookup in metadata service
    // userId -> shardId mapping
    return this.lookupShardId(userId);
  }

  hashFunction(key) {
    let hash = 0;
    for (let char of key) {
      hash = ((hash << 5) - hash) + char.charCodeAt(0);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Get database for a user
   */
  getShardForUser(userId) {
    // Use consistent hashing in production
    const shardIndex = this.hashBasedShard(userId);
    return this.shards[shardIndex];
  }

  /**
   * Insert user across shards
   */
  async insertUser(user) {
    const shard = this.getShardForUser(user.id);
    
    return shard.query(
      'INSERT INTO users (id, name, email) VALUES ($1, $2, $3)',
      [user.id, user.name, user.email]
    );
  }

  /**
   * Query user by ID
   */
  async getUserById(userId) {
    const shard = this.getShardForUser(userId);
    
    const result = await shard.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    return result.rows[0];
  }

  /**
   * Range query across shards (problematic)
   */
  async getUsersByEmailDomain(domain) {
    // Must query ALL shards (cannot use shard key)
    const promises = this.shards.map(shard =>
      shard.query(
        'SELECT * FROM users WHERE email ILIKE $1',
        [`%@${domain}`]
      )
    );

    const results = await Promise.all(promises);
    return results.flatMap(r => r.rows);
  }
}

/**
 * Sharding Challenges & Solutions
 */

const ShardingChallenges = {
  hotspot: {
    problem: 'Some shards get more traffic than others',
    solution: 'Monitor shard utilization, use consistent hashing, reshard',
    example: 'Popular user with millions of followers'
  },

  crossShardQuery: {
    problem: 'Queries spanning multiple shards are expensive',
    solution: 'Design schema to minimize cross-shard queries',
    example: 'Search by non-shard key requires querying all shards'
  },

  resharding: {
    problem: 'Adding/removing shards requires data migration',
    solution: 'Use consistent hashing, double-write during migration',
    example: 'From 4 shards to 8 shards'
  },

  transactions: {
    problem: 'ACID transactions across shards are complex',
    solution: 'Use 2-phase commit or accept eventual consistency',
    example: 'Transfer money between users on different shards'
  },

  join: {
    problem: 'Joins across shard boundaries are expensive',
    solution: 'Denormalize or implement application-layer joins',
    example: 'Get user and their posts (different shards)'
  }
};

// Shard migration example
class ShardMigrator {
  async migrateData(sourceShards, targetShards) {
    // 1. Double-write phase: Write to both old and new shards
    this.doubleWriteEnabled = true;

    // 2. Read from both, compare, fix discrepancies
    for (const userId of this.getAllUserIds()) {
      const source = await this.readFromShard(sourceShards, userId);
      const target = await this.readFromShard(targetShards, userId);

      if (!this.deepEqual(source, target)) {
        // Fix inconsistency
        await this.writeShard(targetShards, userId, source);
      }
    }

    // 3. Switch reads to new shards
    this.switchReadShards(targetShards);

    // 4. Switch writes to new shards
    this.switchWriteShards(targetShards);

    // 5. Verify all data copied
    // 6. Delete old shard data
  }
}
```

---

### Q8: Implement database replication & high availability

**Answer:**

```javascript
/**
 * Database Replication - Master-Slave, Master-Master, Multi-Region
 */

class DatabaseReplication {
  constructor(masterDb, slaveDb) {
    this.master = masterDb;
    this.slaves = Array.isArray(slaveDb) ? slaveDb : [slaveDb];
    this.replicationLag = 0;
  }

  /**
   * 1. Master-Slave Replication (Leader-Follower)
   * 
   * Writes go to master
   * Reads can go to slaves
   * 
   * Flow:
   * Client write -> Master writes to log -> Slaves read log and replicate
   */
  
  async writeData(query, params) {
    // All writes go to master
    const result = await this.master.query(query, params);
    
    // Write is replicated asynchronously to slaves
    this.replicateToSlaves(query, params);

    return result;
  }

  async readData(query, params, options = {}) {
    if (options.consistency === 'strong') {
      // Strong consistency: read from master
      return this.master.query(query, params);
    } else {
      // Eventual consistency: read from slave (load balanced)
      const slave = this.selectSlave();
      return slave.query(query, params);
    }
  }

  selectSlave() {
    // Load balance across slaves
    return this.slaves[Math.floor(Math.random() * this.slaves.length)];
  }

  async replicateToSlaves(query, params) {
    // Send query to all slaves asynchronously
    const promises = this.slaves.map(slave =>
      slave.query(query, params).catch(err => {
        console.error('Replication failed:', err);
        // Alert monitoring system
      })
    );

    // Fire and forget
    Promise.all(promises);
  }

  /**
   * 2. Master-Master Replication (Multi-Master)
   * Both masters accept writes, replicate to each other
   * 
   * Risk: Conflict resolution needed (same row modified on both)
   */
}

/**
 * Replication Lag Handling
 */

class ReplicationLagHandler {
  constructor(master, slaves) {
    this.master = master;
    this.slaves = slaves;
    this.replicationLag = new Map(); // slave -> lag in ms
  }

  async readAfterWrite(userId, query, params) {
    // User just wrote data, should read their own write
    // But slave might not be replicated yet (replication lag)
    
    // Strategy 1: Read from master
    return this.master.query(query, params);

    // Strategy 2: Sticky reads - remember which slave wrote to master
    // const slaveThatWrote = await this.master.query(...);
    // return this.queryWithLag(query, params, waitTime);

    // Strategy 3: Global monotonic read - track read version
    // const version = await this.master.query('SELECT version()');
    // return this.queryAtVersion(query, params, version);
  }

  async queryWithLag(query, params, maxLagMs = 1000) {
    // Find slaves that are caught up enough
    const currentTime = Date.now();
    const freshSlaves = this.slaves.filter(slave => {
      const lag = this.replicationLag.get(slave.id) || 0;
      return lag <= maxLagMs;
    });

    if (freshSlaves.length > 0) {
      // Query fresh slave
      return freshSlaves[0].query(query, params);
    } else {
      // All slaves are lagged, read from master
      return this.master.query(query, params);
    }
  }

  // Monitor replication lag
  startLagMonitoring() {
    setInterval(() => {
      this.measureReplicationLag();
    }, 5000);
  }

  async measureReplicationLag() {
    // Insert timestamp in master, check when visible in slave
    const timestamp = Date.now();
    const id = `test:${timestamp}`;

    await this.master.query(
      'INSERT INTO replication_test (id, timestamp) VALUES ($1, $2)',
      [id, timestamp]
    );

    for (const slave of this.slaves) {
      let found = false;
      const checkStart = Date.now();

      while (!found && Date.now() - checkStart < 5000) {
        const result = await slave.query(
          'SELECT * FROM replication_test WHERE id = $1',
          [id]
        );

        if (result.rows.length > 0) {
          const lag = Date.now() - timestamp;
          this.replicationLag.set(slave.id, lag);
          found = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (!found) {
        console.warn(`Slave ${slave.id} not replicating`);
        this.replicationLag.set(slave.id, Infinity);
      }
    }
  }
}

/**
 * Failover Handling
 */

class DatabaseFailover {
  constructor(primaryDb, secondaryDb) {
    this.primary = primaryDb;
    this.secondary = secondaryDb;
    this.currentPrimary = primaryDb;
    this.healthCheckInterval = 5000;
    this.failureThreshold = 3;
    this.consecutiveFailures = 0;
  }

  startHealthCheck() {
    setInterval(() => this.checkHealthAndFailover(), this.healthCheckInterval);
  }

  async checkHealthAndFailover() {
    try {
      await this.primary.query('SELECT 1');
      this.consecutiveFailures = 0;
      
      if (this.currentPrimary !== this.primary) {
        console.log('Primary recovered, switching back');
        this.currentPrimary = this.primary;
      }
    } catch (error) {
      this.consecutiveFailures++;

      if (this.consecutiveFailures >= this.failureThreshold) {
        console.error('Primary failed, promoting secondary');
        this.performFailover();
      }
    }
  }

  async performFailover() {
    // Check secondary is replicating
    const lag = await this.checkSecondaryLag();
    
    if (lag > 5000) {
      console.error('Secondary lag too high, refusing failover');
      return;
    }

    // Promote secondary to primary
    this.currentPrimary = this.secondary;
    
    // Update DNS/connection strings
    this.updateConnectionStrings();

    // Alert operations team
    this.alertOperations('Database failover executed');
  }

  async checkSecondaryLag() {
    // Check how far behind secondary is
    // Returns lag in milliseconds
  }

  updateConnectionStrings() {
    // Update environment, config, or service discovery
  }

  alertOperations(message) {
    // Send to PagerDuty, Slack, etc.
  }
}
```

---

### Q9: Advanced PostgreSQL features for 10+ years experience

**Answer:**

```javascript
/**
 * Advanced PostgreSQL Features
 */

const AdvancedPostgreSQLFeatures = {
  jsonb: {
    description: 'Native JSON support with binary storage',
    benefits: ['Efficient storage', 'Query JSON fields', 'Index JSON paths'],
    
    example: `
    CREATE TABLE products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      metadata JSONB -- Binary JSON
    );

    -- Query JSON
    SELECT * FROM products WHERE metadata->>'color' = 'red';
    SELECT * FROM products WHERE metadata @> '{"size": "large"}';
    
    -- Index JSON path
    CREATE INDEX idx_metadata ON products USING GIN (metadata);
    
    -- Extract and aggregate
    SELECT name, metadata->'price'->>0 as price
    FROM products;
    `
  },

  partitioning: {
    description: 'Divide large tables for performance',
    types: ['Range', 'List', 'Hash'],
    
    example: `
    -- Range partitioning by date
    CREATE TABLE events (
      id BIGSERIAL,
      timestamp TIMESTAMP,
      event_data JSONB
    ) PARTITION BY RANGE (timestamp);

    CREATE TABLE events_2024_q1 PARTITION OF events
      FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

    CREATE TABLE events_2024_q2 PARTITION OF events
      FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

    -- Queries automatically use correct partition
    SELECT * FROM events WHERE timestamp BETWEEN '2024-02-01' AND '2024-02-28';
    `
  },

  windowFunctions: {
    description: 'Rank, aggregate over partitions',
    uses: ['Running totals', 'Ranking', 'LAG/LEAD'],
    
    example: `
    -- Rank products by sales
    SELECT 
      product_name,
      sales,
      RANK() OVER (ORDER BY sales DESC) as rank,
      LAG(sales) OVER (ORDER BY sales DESC) as prev_sales,
      LEAD(sales) OVER (ORDER BY sales DESC) as next_sales
    FROM products;

    -- Running total
    SELECT 
      date,
      revenue,
      SUM(revenue) OVER (ORDER BY date) as running_total
    FROM daily_revenue;
    `
  },

  fullTextSearch: {
    description: 'Powerful text search in PostgreSQL',
    features: ['Stemming', 'Phrase search', 'Multiple languages'],
    
    example: `
    CREATE TABLE documents (
      id SERIAL,
      title VARCHAR,
      content TEXT,
      search_vector TSVECTOR
    );

    -- Create index for fast search
    CREATE INDEX idx_search ON documents USING GIN (search_vector);

    -- Search
    SELECT * FROM documents 
    WHERE search_vector @@ to_tsquery('english', 'database & query');
    `
  },

  materialized_views: {
    description: 'Pre-computed query results',
    use: 'Complex aggregations that are queried frequently',
    
    example: `
    -- Materialized view
    CREATE MATERIALIZED VIEW user_stats AS
    SELECT 
      user_id,
      COUNT(*) as order_count,
      SUM(amount) as total_spent,
      AVG(amount) as avg_order_value
    FROM orders
    GROUP BY user_id;

    -- Pre-computed, instant queries
    SELECT * FROM user_stats WHERE user_id = 123;

    -- Refresh when data changes
    REFRESH MATERIALIZED VIEW user_stats;
    `
  },

  extensions: {
    description: 'PostgreSQL extensibility (PostGIS, pgvector, etc.)',
    popular: ['PostGIS (spatial)', 'pgvector (AI embeddings)', 'uuid-ossp', 'pg_trgm (similarity)'],
    
    example: `
    -- UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    SELECT uuid_generate_v4();

    -- PostGIS for location data
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE TABLE locations (
      id SERIAL,
      geom GEOMETRY(POINT, 4326)
    );

    -- Query nearby locations
    SELECT * FROM locations 
    WHERE ST_DWithin(geom, ST_Point(-122.4194, 37.7749), 1000);

    -- pgvector for embeddings
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE TABLE embeddings (
      id SERIAL,
      embedding vector(1536)
    );
    `
  },

  unlogged_tables: {
    description: 'Tables not logged to WAL (faster, not durable)',
    use: 'Temporary data, caches, session storage',
    
    example: `
    CREATE UNLOGGED TABLE session_cache (
      session_id VARCHAR PRIMARY KEY,
      user_id INTEGER,
      data JSONB,
      expires_at TIMESTAMP
    );

    -- Much faster but lost on server restart
    `
  }
};

class AdvancedPostgreSQLPatterns {
  async jsonbQuery(pool) {
    // Query nested JSON structures
    const result = await pool.query(`
      SELECT 
        id,
        name,
        metadata->>'color' as color,
        (metadata->'price')::numeric as price,
        metadata->'tags' as tags
      FROM products
      WHERE metadata->>'available' = 'true'
        AND (metadata->'price')::numeric > $1
    `, [100]);

    return result.rows;
  }

  async partitionedQuery(pool) {
    // PostgreSQL automatically selects correct partition
    const result = await pool.query(`
      SELECT * FROM events
      WHERE timestamp >= $1 AND timestamp < $2
    `, ['2024-02-01', '2024-02-28']);

    return result.rows;
  }

  async windowFunctionQuery(pool) {
    // Get ranking with gaps/previous/next
    const result = await pool.query(`
      SELECT 
        product_id,
        sales,
        RANK() OVER (ORDER BY sales DESC) as sales_rank,
        PERCENT_RANK() OVER (ORDER BY sales) as percentile,
        LAG(sales, 1, 0) OVER (ORDER BY sales) as prev_sales,
        LEAD(sales, 1, 0) OVER (ORDER BY sales) as next_sales
      FROM monthly_sales
      WHERE month = $1
      ORDER BY sales DESC
    `, ['2024-02']);

    return result.rows;
  }

  async fullTextSearch(pool) {
    // Full text search with ranking
    const query = 'database query';
    
    const result = await pool.query(`
      SELECT 
        id,
        title,
        content,
        ts_rank(search_vector, to_tsquery($1)) as relevance
      FROM documents
      WHERE search_vector @@ to_tsquery($1)
      ORDER BY relevance DESC
      LIMIT 20
    `, [query]);

    return result.rows;
  }

  async cachedAggregation(pool) {
    try {
      // Try materialized view first
      const cached = await pool.query('SELECT * FROM user_stats WHERE user_id = $1', [123]);
      if (cached.rows.length > 0) return cached.rows[0];
    } catch (e) {
      // Fallback if view doesn't exist
      const result = await pool.query(`
        SELECT 
          user_id,
          COUNT(*) as order_count,
          SUM(amount) as total_spent
        FROM orders
        WHERE user_id = $1
        GROUP BY user_id
      `, [123]);
      return result.rows[0];
    }
  }
}
```

---

### Q10: NoSQL scalability patterns (MongoDB, Cassandra, DynamoDB)

**Answer:**

```javascript
/**
 * NoSQL Scalability Patterns
 */

const NoSQLPatterns = {
  mongodb_sharding: {
    description: 'Horizontal scaling via sharding key',
    
    config: `
    // Shard by user_id for user-centric data
    db.adminCommand({
      enableSharding: "myapp"
    });

    db.collection("users").createIndex({ user_id: 1 });
    
    db.adminCommand({
      shardCollection: "myapp.users",
      key: { user_id: 1 }
    });

    // Shard by hash for better distribution
    db.adminCommand({
      shardCollection: "myapp.events",
      key: { event_id: "hashed" }
    });
    `,

    pros: ['Automatic rebalancing', 'Transparent to application', 'Flexible chunk size'],
    cons: ['Cannot unshard', 'Shard key is immutable', 'Query non-shard key hits all shards']
  },

  cassandra_consistency: {
    description: 'Tunable consistency in distributed NoSQL',
    
    levels: {
      ONE: 'Write acks from 1 node (fastest, risky)',
      QUORUM: 'Write acks from majority (balanced)',
      ALL: 'Write acks from all replicas (slowest, safest)'
    },

    example: `
    // Cassandra consistency tradeoff
    
    // FAST WRITE (may lose data)
    INSERT INTO users (id, name) VALUES (123, 'John')
    USING CONSISTENCY ONE;

    // BALANCED
    INSERT INTO users (id, name) VALUES (123, 'John')
    USING CONSISTENCY LOCAL_QUORUM;

    // STRONG CONSISTENCY (slower)
    INSERT INTO users (id, name) VALUES (123, 'John')
    USING CONSISTENCY ALL;

    // Eventual consistency read
    SELECT * FROM users WHERE id = 123;
    `
  },

  dynamodb_design: {
    description: 'DynamoDB is limited to 2 queries (Query, GetItem)',
    
    patterns: [
      'Use partition key + sort key for range queries',
      'Global Secondary Index (GSI) for alternate access patterns',
      'Local Secondary Index (LSI) for sorts on different attribute  '
    ],

    example: `
    // User table with partition + sort key
    PK: user_id (String)
    SK: timestamp (Number)

    // Query all events for a user between dates
    SELECT * FROM events
    WHERE user_id = '123'
      AND timestamp BETWEEN 1000000 AND 2000000;

    // Need to query by event_type? Create GSI
    GSI:
      PK: event_type
      SK: timestamp

    // Now can query by type
    SELECT * FROM events_by_type
    WHERE event_type = 'login'
      AND timestamp > 1000000;
    `
  }
};

class MongoDBShardingImplementation {
  constructor(mongoClient) {
    this.client = mongoClient;
  }

  async getShardKey(collection) {
    // Determine optimal shard key
    const stats = await collection.stats();
    
    return {
      recommendation: 'Shard by field with high cardinality and uniform distribution',
      check: {
        cardinality: 'Use DISTINCT to check unique values',
        distribution: 'Check if evenly distributed',
        monotonicity: 'Avoid monotonic shards (time-based)',
        frequency: 'Analyze query patterns'
      }
    };
  }

  async shardCollection(dbName, collectionName, shardKey) {
    // Enable sharding on database
    await this.client.admin().command({
      enableSharding: dbName
    });

    // Create shard key index
    const db = this.client.db(dbName);
    const collection = db.collection(collectionName);
    await collection.createIndex(shardKey);

    // Shard the collection
    const result = await this.client.admin().command({
      shardCollection: `${dbName}.${collectionName}`,
      key: shardKey
    });

    return result;
  }

  async splitChunks(dbName, collectionName) {
    // Manually split chunks if unbalanced
    const admin = this.client.admin();

    return admin.command({
      split: `${dbName}.${collectionName}`,
      find: { user_id: 'middle_value' }
    });
  }

  async analyzeShardBalance() {
    // Check if data is evenly distributed
    const admin = this.client.admin();
    const status = await admin.command({ serverStatus: 1 });

    return {
      chunkSize: '64MB (default)',
      autoBalance: true,
      balanced: 'If chunks per shard similar'
    };
  }
}

class CassandraPartitioningStrategy {
  constructor(client) {
    this.client = client;
  }

  /**
   * Cassandra replication strategy
   */
  createKeyspace() {
    const cql = `
      CREATE KEYSPACE users WITH replication = {
        'class': 'SimpleStrategy',
        'replication_factor': 3
      };

      -- Multi-datacenter replication
      CREATE KEYSPACE users WITH replication = {
        'class': 'NetworkTopologyStrategy',
        'DC1': 3,
        'DC2': 3
      };
    `;

    return cql;
  }

  /**
   * Partition key must be sortable and distributed
   */
  createTable() {
    const cql = `
      CREATE TABLE users (
        partition_key INT,     -- Hash value to distribute across nodes
        user_id UUID,          -- Username or email (wide row)
        name TEXT,
        email TEXT,
        created_at TIMESTAMP,
        PRIMARY KEY (partition_key, user_id)
      );

      -- Query by partition
      SELECT * FROM users WHERE partition_key = 5;

      -- Query within partition
      SELECT * FROM users 
      WHERE partition_key = 5 AND user_id = abc-123;

      -- Reverse sort (descending)
      CREATE TABLE events (
        user_id UUID,
        event_time TIMESTAMP,
        event_type TEXT,
        PRIMARY KEY (user_id, event_time)
      ) WITH CLUSTERING ORDER BY (event_time DESC);
    `;

    return cql;
  }

  /**
   * Token-aware routing
   * Client knows which node has partition
   */
  tokenAwareRouting() {
    return {
      benefit: 'Direct to node with data, no extra hops',
      result: 'Lower latency, higher throughput',
      driver: 'cassandra-driver detects partition key and routes'
    };
  }
}
```

---

## Summary

**Key Takeaways:**
1. **ACID properties** - Atomicity, Consistency, Isolation, Durability
2. **SQL transactions** - Use BEGIN, COMMIT, ROLLBACK for data integrity
3. **Connection pooling** - Manage database connections efficiently
4. **Repository pattern** - Abstraction layer for database operations
5. **NoSQL vs SQL** - Choose based on data structure and requirements
6. **MongoDB aggregation** - Powerful for analytics and complex queries
7. **Redis data structures** - Choose the right structure for the use case
8. **Query optimization** - Use indexes, explain plans, and proper queries
9. **Data modeling** - Normalize in SQL, denormalize in NoSQL when needed
10. **Database Sharding** - Horizontal partitioning for massive scale
11. **Replication** - Master-slave for HA and load distribution
12. **Advanced PostgreSQL** - JSONB, partitioning, window functions, extensions
13. **NoSQL Scaling** - Cassandra consistency, MongoDB sharding, DynamoDB GSI
14. **Eventual Consistency** - Trade consistency for availability/latency
10. **Transactions** - Critical for data consistency in distributed systems