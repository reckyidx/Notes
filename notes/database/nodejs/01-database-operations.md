# Node.js Database Operations

## Basic CRUD with PostgreSQL (pg)

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mydb',
  password: 'password',
  port: 5432,
  max: 20, // connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create
async function createUser(name, email) {
  const query = `
    INSERT INTO users (name, email, created_at)
    VALUES ($1, $2, NOW())
    RETURNING id, name, email
  `;
  const result = await pool.query(query, [name, email]);
  return result.rows[0];
}

// Read
async function getUserById(id) {
  const query = `
    SELECT id, name, email, created_at
    FROM users
    WHERE id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
}

// Update
async function updateUser(id, updates) {
  const fields = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
  
  const query = `
    UPDATE users
    SET ${setClause}, updated_at = NOW()
    WHERE id = $1
    RETURNING id, name, email, updated_at
  `;
  const result = await pool.query(query, [id, ...values]);
  return result.rows[0];
}

// Delete
async function deleteUser(id) {
  const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
  const result = await pool.query(query, [id]);
  return result.rows[0];
}
```

## Using ORM (Sequelize)

```javascript
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('mydb', 'postgres', 'password', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  }
});

// Define User model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  }
}, {
  tableName: 'users',
  timestamps: true
});

// Create
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  balance: 1000
});

// Read
const foundUser = await User.findByPk(1);
const users = await User.findAll({
  where: { balance: { [Op.gte]: 500 } },
  limit: 10
});

// Update
await user.update({ balance: 1500 });
// Or
await User.update({ balance: 1500 }, { where: { id: 1 } });

// Delete
await user.destroy();
// Or
await User.destroy({ where: { id: 1 } });
```

## Transactions with Sequelize

```javascript
const { Op } = require('sequelize');

async function transferMoney(fromId, toId, amount) {
  const transaction = await sequelize.transaction();
  
  try {
    // Lock sender row
    const sender = await User.findByPk(fromId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    
    const receiver = await User.findByPk(toId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    
    if (!sender || !receiver) {
      throw new Error('User not found');
    }
    
    if (sender.balance < amount) {
      throw new Error('Insufficient funds');
    }
    
    // Perform transfer
    await sender.decrement('balance', { by: amount, transaction });
    await receiver.increment('balance', { by: amount, transaction });
    
    await transaction.commit();
    return { success: true, senderBalance: sender.balance, receiverBalance: receiver.balance };
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

---

# Handling Concurrent Updates

## 1. Optimistic Locking with Version Field

```javascript
// Add version column to schema
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  name: DataTypes.STRING,
  balance: DataTypes.DECIMAL(10, 2),
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// Update with optimistic locking
async function updateBalanceOptimistic(userId, newBalance, currentVersion) {
  try {
    const result = await User.update(
      { balance: newBalance, version: sequelize.literal('version + 1') },
      {
        where: {
          id: userId,
          version: currentVersion
        }
      }
    );
    
    if (result[0] === 0) {
      throw new Error('Concurrent update detected - record was modified');
    }
    
    return await User.findByPk(userId);
    
  } catch (error) {
    console.error('Update failed:', error.message);
    throw error;
  }
}

// Usage
async function safeTransfer(fromId, toId, amount) {
  const sender = await User.findByPk(fromId);
  const receiver = await User.findByPk(toId);
  
  const senderVersion = sender.version;
  const receiverVersion = receiver.version;
  
  try {
    await updateBalanceOptimistic(fromId, sender.balance - amount, senderVersion);
    await updateBalanceOptimistic(toId, receiver.balance + amount, receiverVersion);
    
  } catch (error) {
    // Retry logic
    console.log('Retrying due to concurrent update...');
    await new Promise(resolve => setTimeout(resolve, 100));
    return safeTransfer(fromId, toId, amount);
  }
}
```

## 2. Pessimistic Locking with Row-Level Locks

```javascript
// Using SELECT FOR UPDATE
async function transferMoneyWithLock(fromId, toId, amount) {
  const transaction = await sequelize.transaction();
  
  try {
    // Lock rows for update (prevents concurrent modifications)
    const [sender, receiver] = await Promise.all([
      User.findByPk(fromId, {
        transaction,
        lock: true // SELECT FOR UPDATE
      }),
      User.findByPk(toId, {
        transaction,
        lock: true
      })
    ]);
    
    if (sender.balance < amount) {
      throw new Error('Insufficient funds');
    }
    
    sender.balance -= amount;
    receiver.balance += amount;
    
    await Promise.all([
      sender.save({ transaction }),
      receiver.save({ transaction })
    ]);
    
    await transaction.commit();
    return { success: true };
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Using SELECT FOR SHARE (allows reads but prevents writes)
async function getUserForShare(userId) {
  const user = await User.findByPk(userId, {
    lock: transaction.LOCK.SHARE
  });
  return user;
}
```

## 3. Database-Level Constraints

```javascript
// Add CHECK constraint to prevent negative balance
async function addConstraints() {
  await sequelize.query(`
    ALTER TABLE users 
    ADD CONSTRAINT check_balance_positive 
    CHECK (balance >= 0)
  `);
}

// Add UNIQUE constraint to prevent duplicate emails
const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true // Database-level unique constraint
  }
});
```

## 4. Advisory Locks (PostgreSQL)

```javascript
// PostgreSQL advisory locks for application-level coordination
async function transferWithAdvisoryLock(fromId, toId, amount) {
  const transaction = await sequelize.transaction();
  
  try {
    // Acquire advisory lock (unique integer key)
    const lockKey = Math.min(fromId, toId) * 1000000 + Math.max(fromId, toId);
    
    await sequelize.query(
      'SELECT pg_advisory_xact_lock($1)',
      { 
        transaction,
        bind: [lockKey]
      }
    );
    
    // Now safe to perform operations
    const [sender, receiver] = await Promise.all([
      User.findByPk(fromId, { transaction }),
      User.findByPk(toId, { transaction })
    ]);
    
    if (sender.balance < amount) {
      throw new Error('Insufficient funds');
    }
    
    await sender.decrement('balance', { by: amount, transaction });
    await receiver.increment('balance', { by: amount, transaction });
    
    await transaction.commit();
    // Lock automatically released on commit/rollback
    
    return { success: true };
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

## 5. Implementing Retry with Exponential Backoff

```javascript
async function executeWithRetry(fn, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
      
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable (deadlock, serialization failure, etc.)
      const isRetryable = error.message.includes('deadlock') ||
                        error.message.includes('serialization failure') ||
                        error.message.includes('concurrent update');
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
      const jitter = Math.random() * 100;
      
      console.log(`Attempt ${attempt} failed, retrying in ${backoffMs + jitter}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs + jitter));
    }
  }
  
  throw lastError;
}

// Usage with retry
async function safeTransferWithRetry(fromId, toId, amount) {
  return executeWithRetry(async () => {
    return transferMoneyWithLock(fromId, toId, amount);
  });
}
```

## 6. Handling Concurrent Updates with Atomic Operations

```javascript
// Atomic increment/decrement
async function incrementBalance(userId, amount) {
  const [result] = await User.increment('balance', {
    by: amount,
    where: { id: userId }
  });
  
  return result > 0; // Returns true if update was successful
}

// Atomic update with condition
async function deductBalanceIfSufficient(userId, amount) {
  const [affectedCount] = await User.update(
    { balance: sequelize.literal(`balance - ${amount}`) },
    {
      where: {
        id: userId,
        balance: { [Op.gte]: amount }
      }
    }
  );
  
  return affectedCount > 0; // Returns true if sufficient balance
}

// Usage
async function purchaseItem(userId, itemCost) {
  const success = await deductBalanceIfSufficient(userId, itemCost);
  
  if (success) {
    console.log('Purchase successful');
    // Record order...
  } else {
    console.log('Insufficient funds');
  }
  
  return success;
}
```

## 7. Event Sourcing Pattern

```javascript
// Instead of storing current state, store events
const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  userId: DataTypes.INTEGER,
  eventType: DataTypes.ENUM('BALANCE_ADDED', 'BALANCE_DEDUCTED', 'TRANSFER'),
  amount: DataTypes.DECIMAL(10, 2),
  data: DataTypes.JSONB,
  timestamp: DataTypes.DATE,
  version: DataTypes.INTEGER
});

// Append-only event log
async function appendEvent(userId, eventType, amount, data = {}) {
  const lastVersion = await Event.max('version', { where: { userId } }) || 0;
  
  return Event.create({
    userId,
    eventType,
    amount,
    data,
    timestamp: new Date(),
    version: lastVersion + 1
  });
}

// Rebuild state from events
async function rebuildUserState(userId) {
  const events = await Event.findAll({
    where: { userId },
    order: [['version', 'ASC']]
  });
  
  let balance = 0;
  const history = [];
  
  for (const event of events) {
    switch (event.eventType) {
      case 'BALANCE_ADDED':
        balance += event.amount;
        break;
      case 'BALANCE_DEDUCTED':
        balance -= event.amount;
        break;
      case 'TRANSFER':
        if (event.data.from === userId) {
          balance -= event.amount;
        } else if (event.data.to === userId) {
          balance += event.amount;
        }
        break;
    }
    
    history.push({
      version: event.version,
      timestamp: event.timestamp,
      eventType: event.eventType,
      amount: event.amount,
      balanceAfter: balance
    });
  }
  
  return { balance, history };
}

// Transfer using event sourcing
async function transferEventSourcing(fromId, toId, amount) {
  const transaction = await sequelize.transaction();
  
  try {
    await appendEvent(
      fromId,
      'TRANSFER',
      amount,
      { from: fromId, to: toId },
      { transaction }
    );
    
    await appendEvent(
      toId,
      'TRANSFER',
      amount,
      { from: fromId, to: toId },
      { transaction }
    );
    
    await transaction.commit();
    
    // Rebuild state
    const senderState = await rebuildUserState(fromId);
    const receiverState = await rebuildUserState(toId);
    
    return { senderState, receiverState };
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

---

## Key Takeaways

1. **Optimistic locking**: Use version fields for low contention
2. **Pessimistic locking**: Use SELECT FOR UPDATE for high contention
3. **Atomic operations**: Use increment/decrement for simple updates
4. **Advisory locks**: Coordinate complex transactions
5. **Retry logic**: Implement exponential backoff for retryable errors
6. **Event sourcing**: Immutable event log for auditability and replay
7. **Database constraints**: Let the database enforce rules