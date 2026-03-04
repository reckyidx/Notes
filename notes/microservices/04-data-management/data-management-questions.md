# Microservices Data Management Interview Questions

## Table of Contents
1. [Database Per Service](#database-per-service)
2. [Distributed Transactions](#distributed-transactions)
3. [Data Consistency](#data-consistency)
4. [Data Synchronization](#data-synchronization)
5. [Data Migration](#data-migration)

---

## Database Per Service

### Q1. What is the Database Per Service pattern?

**Answer:** Database Per Service is a pattern where each microservice has its own private database that other services cannot access directly.

**Key principles:**
- Each service owns its data
- No other service can access another service's database
- Services communicate via APIs, not direct database access
- Each service can choose its own database technology

**Benefits:**
- Loose coupling between services
- Independent scaling of databases
- Technology diversity (right database for the job)
- Clear data ownership
- Easier deployment and rollback

**Example:**
```
Order Service → Order Database (PostgreSQL)
Inventory Service → Inventory Database (MongoDB)
Payment Service → Payment Database (MySQL)
User Service → User Database (PostgreSQL)
```

### Q2. Why shouldn't microservices share a database?

**Answer:**

**Problems with shared database:**
1. **Tight Coupling**: Changes to schema affect all services
2. **Deployment Coupling**: Can't deploy services independently
3. **Data Ownership Confusion**: Who owns which data?
4. **Performance Issues**: Noisy neighbors affect each other
5. **Technology Lock-in**: All services use same database
6. **Scaling Issues**: Can't scale databases independently
7. **Transaction Complexity**: ACID transactions across business domains

**Example:**
```javascript
// Bad: Shared database
const order = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
const inventory = await db.query('SELECT * FROM inventory WHERE order_id = ?', [orderId]);

// Any schema change breaks both services
```

### Q3. What is the Shared Database antipattern?

**Answer:** Shared Database antipattern occurs when multiple microservices access the same database directly, violating the database per service principle.

**Why it's problematic:**

1. **Implicit Coupling**
- Services coupled through shared schema
- Schema changes require coordination across teams
- Hard to identify dependencies

2. **Deployment Dependencies**
- Can't deploy Order Service without checking Inventory Service
- Database migrations affect all services
- Rollbacks become complex

3. **Data Access Pattern Leakage**
- Services need to understand each other's data structures
- Business logic spreads across services
- Violates encapsulation

4. **Testing Challenges**
- Integration tests become complex
- Can't test services in isolation
- Data setup requires coordinating multiple services

**Example of the antipattern:**
```
Order Service ──┐
               ├─── Shared Database (PostgreSQL)
Inventory Service─┘
Payment Service───┘

All services access the same tables directly
```

**Correct approach:**
```
Order Service → Order DB (REST API)
Inventory Service → Inventory DB (REST API)
Payment Service → Payment DB (REST API)

Services communicate via APIs only
```

### Q4. How do services share data if they can't access each other's databases?

**Answer:** Services share data through well-defined communication patterns:

**1. API Calls**
- Service exposes REST/gRPC API
- Other services call the API to get data
- Synchronous, real-time access

```javascript
// Order Service needs user data
const user = await fetch('http://user-service/users/123');
```

**2. Domain Events**
- Service publishes events when data changes
- Other services subscribe and update their local data
- Asynchronous, eventual consistency

```javascript
// User Service publishes event
eventBus.publish('UserUpdated', { userId: 123, name: 'John' });

// Order Service subscribes and updates
eventBus.on('UserUpdated', async (event) => {
  await updateLocalUserData(event.userId, event);
});
```

**3. Data Replication**
- Service maintains read-only copy of frequently accessed data
- Updated via events or periodic sync
- Optimized for local queries

**4. API Composition**
- API Gateway composes data from multiple services
- Single response to client
- Gateway handles orchestration

```javascript
// API Gateway composes response
const order = await orderService.getOrder(orderId);
const user = await userService.getUser(order.userId);
const items = await orderService.getItems(orderId);

return { order, user, items };
```

---

## Distributed Transactions

### Q5. What is a distributed transaction?

**Answer:** A distributed transaction is a transaction that updates data across multiple microservices/databases as a single atomic operation.

**Challenges:**
- ACID properties are hard to maintain across services
- Network failures and partial commits
- No single transaction coordinator
- Different databases may not support distributed transactions

**Two approaches:**

**1. Two-Phase Commit (2PC)**
- Coordinator manages transaction
- All services must agree to commit
- Strong consistency
- Poor availability and performance

**2. Saga Pattern**
- Sequence of local transactions
- Compensating transactions on failure
- Eventual consistency
- Better availability and performance

### Q6. What is Two-Phase Commit (2PC)?

**Answer:** Two-Phase Commit is a protocol for ensuring atomicity in distributed transactions.

**Phases:**

**Phase 1: Prepare (Voting)**
- Coordinator asks all participants to prepare
- Participants execute transaction locally
- Participants vote: COMMIT or ABORT

**Phase 2: Commit**
- If all voted COMMIT: coordinator sends COMMIT to all
- If any voted ABORT: coordinator sends ABORT to all
- Participants finalize or rollback

**Diagram:**
```
Coordinator          Participant 1         Participant 2
    │                     │                    │
    │──── PREPARE ───────>│                    │
    │                     │                    │
    │──────────────────── PREPARE ────────────>│
    │                     │                    │
    │<──── VOTE(ABORT) ───│                    │
    │                     │                    │
    │──────────────────── VOTE(ABORT) ─────────│
    │                     │                    │
    │──── ABORT ─────────>│                    │
    │                     │                    │
    │──────────────────── ABORT ──────────────>│
    │                     │                    │
```

**Problems with 2PC:**
- Blocking protocol (participants locked during commit)
- Single point of failure (coordinator)
- Poor performance (many network round trips)
- Not suitable for high-scale systems

### Q7. Compare 2PC vs Saga pattern.

**Answer:**

| Aspect | Two-Phase Commit (2PC) | Saga Pattern |
|--------|----------------------|--------------|
| **Consistency** | Strong consistency | Eventual consistency |
| **Availability** | Poor (blocking) | Good (non-blocking) |
| **Performance** | Slow (synchronous) | Fast (asynchronous) |
| **Complexity** | Simpler (protocol) | More complex (compensation) |
| **Isolation** | Full isolation | Limited isolation |
| **Use Case** | Banking, critical data | E-commerce, workflows |
| **Locking** | Long-held locks | Short-lived locks |

**When to use 2PC:**
- Financial transactions requiring strong consistency
- Small number of participants
- Low transaction volume
- Strong consistency is critical

**When to use Saga:**
- High throughput requirements
- Eventual consistency is acceptable
- Many participants
- Long-running business processes

### Q8. What are compensating transactions?

**Answer:** Compensating transactions undo the effects of a previously completed local transaction when a saga fails.

**Key principles:**
- Compensating transaction must be idempotent
- Should be semantically opposite of original transaction
- Must handle failure gracefully
- May need to be retried

**Example - Order Saga:**

| Step | Transaction | Compensating Transaction |
|------|------------|------------------------|
| 1 | Create Order | Cancel Order |
| 2 | Reserve Inventory | Release Inventory |
| 3 | Process Payment | Refund Payment |
| 4 | Ship Order | Cancel Shipment |

**Implementation:**
```javascript
// Forward transaction
async function reserveInventory(orderId, items) {
  await inventoryDB.reserve(orderId, items);
  eventBus.emit('InventoryReserved', { orderId, items });
}

// Compensating transaction
async function releaseInventory(orderId, items) {
  await inventoryDB.release(orderId, items);
  eventBus.emit('InventoryReleased', { orderId, items });
}

// Saga orchestration
async function executeOrderSaga(orderData) {
  const steps = [
    { name: 'createOrder', forward: createOrder, compensate: cancelOrder },
    { name: 'reserveInventory', forward: reserveInventory, compensate: releaseInventory },
    { name: 'processPayment', forward: processPayment, compensate: refundPayment }
  ];
  
  const completedSteps = [];
  
  try {
    for (const step of steps) {
      await step.forward(orderData);
      completedSteps.push(step);
    }
  } catch (error) {
    // Compensate in reverse order
    for (const step of completedSteps.reverse()) {
      await step.compensate(orderData);
    }
    throw error;
  }
}
```

---

## Data Consistency

### Q9. How do you maintain data consistency across microservices?

**Answer:**

**Strategies for data consistency:**

**1. Eventual Consistency (Most Common)**
- Accept temporary inconsistency
- Services converge to consistent state over time
- Use domain events to propagate changes
- Implement Saga for distributed transactions

```javascript
// Order Service creates order
const order = await createOrder(orderData);
eventBus.emit('OrderCreated', order);

// Inventory Service updates asynchronously
eventBus.on('OrderCreated', async (order) => {
  await reserveInventory(order.id, order.items);
});
```

**2. Strong Consistency (When Required)**
- Use distributed transactions (2PC)
- Single database (not recommended)
- Compromise on availability
- Use for critical operations only

**3. Read-Your-Writes Consistency**
- User sees their own writes immediately
- Other users see eventual consistency
- Use session affinity or sticky sessions

**4. Causal Consistency**
- Maintain cause-effect relationships
- Use vector clocks or similar mechanisms
- Good for social media, messaging

**Best practices:**
- Default to eventual consistency
- Use strong consistency only when necessary
- Document consistency guarantees
- Monitor consistency gaps
- Provide tools to resolve inconsistencies

### Q10. What is the Outbox pattern?

**Answer:** Outbox pattern ensures that a service reliably publishes events when it updates its database.

**Problem:**
- Service updates database and publishes event in same transaction
- If database commits but event publish fails → data lost
- If event publishes but database commit fails → inconsistent state

**Solution - Outbox Pattern:**
1. Write to database and outbox table in same transaction
2. Separate process reads outbox and publishes events
3. Delete outbox entry after successful publish

**Schema:**
```sql
CREATE TABLE outbox (
  id BIGINT PRIMARY KEY,
  aggregate_type VARCHAR(100),
  aggregate_id BIGINT,
  event_type VARCHAR(100),
  event_data JSON,
  created_at TIMESTAMP,
  processed BOOLEAN DEFAULT FALSE
);

BEGIN TRANSACTION;
  INSERT INTO orders (id, user_id, total) VALUES (1, 123, 99.99);
  
  INSERT INTO outbox (aggregate_type, aggregate_id, event_type, event_data)
  VALUES ('Order', 1, 'OrderCreated', '{"orderId":1,"userId":123,"total":99.99}');
COMMIT;
```

**Publisher process:**
```javascript
async function publishOutboxEvents() {
  const events = await db.query(
    'SELECT * FROM outbox WHERE processed = FALSE LIMIT 100'
  );
  
  for (const event of events) {
    try {
      await messageBus.publish(event.event_type, event.event_data);
      await db.query('UPDATE outbox SET processed = TRUE WHERE id = ?', [event.id]);
    } catch (error) {
      log.error('Failed to publish event', error);
      // Will retry next cycle
    }
  }
}
```

**Benefits:**
- Guaranteed event publication
- Atomic update + event
- Retry mechanism built-in
- No data loss

### Q11. What is the Transactional Outbox pattern?

**Answer:** Transactional Outbox is an implementation of the Outbox pattern that ensures atomicity between database updates and event publication.

**Key components:**

**1. Outbox Table**
- Stores events in same database
- Transactional with business data

**2. Publisher Component**
- Polls outbox table
- Publishes events to message broker
- Marks events as processed

**3. Idempotency**
- Publisher must be idempotent
- Handle duplicate publishes
- Use unique event IDs

**Implementation with CDC (Change Data Capture):**
```
Application writes to outbox table
    ↓
CDC (Debezium, Kafka Connect)
    ↓
Message Broker (Kafka)
    ↓
Consumers process events
```

**Alternative - Polling:**
```javascript
async function outboxPublisher() {
  while (running) {
    const tx = await db.beginTransaction();
    try {
      const events = await tx.query(
        'SELECT * FROM outbox WHERE processed = FALSE ORDER BY id LIMIT 100 FOR UPDATE'
      );
      
      for (const event of events) {
        await messageBus.publish(event.event_type, event.event_data);
        await tx.query('UPDATE outbox SET processed = TRUE WHERE id = ?', [event.id]);
      }
      
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      log.error(error);
      await sleep(1000);
    }
  }
}
```

### Q12. How do you handle data inconsistencies?

**Answer:**

**Strategies for handling data inconsistencies:**

**1. Idempotent Operations**
- Make operations safe to retry
- Use unique identifiers
- Check before applying

```javascript
async function reserveInventory(orderId, items) {
  const existing = await inventoryDB.getReservation(orderId);
  if (existing) return existing;  // Already reserved
  
  return await inventoryDB.reserve(orderId, items);
}
```

**2. Reconciliation Jobs**
- Periodic jobs check and fix inconsistencies
- Compare data across services
- Apply corrective actions

```javascript
async function reconcileInventory() {
  const orders = await orderService.getPendingOrders();
  
  for (const order of orders) {
    const inventoryStatus = await inventoryService.checkStatus(order.id);
    
    if (inventoryStatus.mismatch) {
      await fixInventoryMismatch(order.id);
    }
  }
}
```

**3. Version Numbers / Optimistic Locking**
- Include version in data
- Check version before update
- Handle conflicts gracefully

```sql
UPDATE orders 
SET status = 'shipped', version = version + 1
WHERE id = ? AND version = ?;
```

**4. Compensation Logic**
- Undo previous operations
- Bring system back to consistent state
- Part of Saga pattern

**5. Conflict Resolution**
- Last write wins (timestamp based)
- Business rules based resolution
- Manual intervention for critical cases

**6. Monitoring and Alerting**
- Track consistency metrics
- Alert on anomalies
- Provide tools for investigation

---

## Data Synchronization

### Q13. How do you synchronize data between microservices?

**Answer:**

**Data synchronization strategies:**

**1. Event-Driven Synchronization**
- Source service publishes domain events
- Target services subscribe and update
- Asynchronous and decoupled

```javascript
// User Service publishes event
eventBus.emit('UserCreated', { userId, name, email });

// Notification Service subscribes and updates
eventBus.on('UserCreated', async (event) => {
  await notificationDB.createUserProfile(event.userId);
});
```

**2. API Polling**
- Target service polls source API periodically
- Simple to implement
- Higher latency and load

```javascript
async function syncUsers() {
  const users = await userServiceAPI.getUsers();
  await localDB.upsertUsers(users);
}

setInterval(syncUsers, 60000);  // Every minute
```

**3. Change Data Capture (CDC)**
- Capture database changes in real-time
- Stream changes to consumers
- No code changes needed in source service

```
Database (User)
    ↓
CDC Connector (Debezium)
    ↓
Kafka Topic
    ↓
Consumer Services
```

**4. Message Queue Sync**
- Write to message queue on data change
- Consumers process and update
- Guaranteed delivery

```javascript
async function updateUser(userId, data) {
  await db.update(userId, data);
  await messageQueue.send('user-update', { userId, data });
}
```

**5. ETL Jobs**
- Batch processing for large datasets
- Scheduled or triggered
- Good for analytics/reporting

### Q14. What is Change Data Capture (CDC)?

**Answer:** CDC is a technique to identify and capture changes made to data in a database and deliver those changes to downstream systems.

**Benefits:**
- No code changes in source application
- Real-time data streaming
- Reliable delivery
- Complete audit trail

**How it works:**

**1. Log-based CDC (Most Common)**
- Read database transaction log
- Capture INSERT, UPDATE, DELETE operations
- Stream to message broker

```
PostgreSQL WAL
    ↓
Debezium Connector
    ↓
Kafka Topic (user-changes)
    ↓
Consumer Services
```

**2. Query-based CDC**
- Query database for changes
- Use timestamp or version column
- Simpler but higher overhead

**Implementation with Debezium:**
```javascript
// Kafka Connect configuration
{
  "name": "user-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "dbz",
    "database.dbname": "userdb",
    "topic.prefix": "user",
    "table.include.list": "public.users"
  }
}
```

**Example event from CDC:**
```json
{
  "before": null,
  "after": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "op": "c",  // Create operation
  "ts_ms": 1234567890
}
```

### Q15. What is Data Replication?

**Answer:** Data replication is the process of copying and maintaining the same data in multiple locations/services for performance, availability, and reliability.

**Types:**

**1. Master-Slave Replication**
- One master handles writes
- Multiple slaves handle reads
- Asynchronous replication
- Good for read-heavy workloads

```
Write → Master DB
Read  ← Slave DB 1
Read  ← Slave DB 2
Read  ← Slave DB 3
```

**2. Multi-Master Replication**
- Multiple masters accept writes
- Conflicts must be resolved
- More complex
- Better availability

**3. Eventual Consistency Replication**
- Replication happens asynchronously
- Temporary inconsistency possible
- Better performance
- Common in microservices

**Use cases in microservices:**
- Local caching of frequently accessed data
- Read models for CQRS
- Analytics and reporting
- Backup and disaster recovery

**Implementation example:**
```javascript
// Order Service creates order
const order = await createOrder(orderData);

// Replicate to Read Model (async)
eventBus.emit('OrderCreated', order);

// Read Model service updates
eventBus.on('OrderCreated', async (order) => {
  await readModelDB.createOrder(order);
});
```

---

## Data Migration

### Q16. How do you migrate data from monolith to microservices?

**Answer:**

**Data migration strategies:**

**1. Strangler Fig Pattern (Incremental)**
- Extract data gradually
- Keep monolith and services running
- Route requests appropriately
- Remove from monolith as you go

**Steps:**
```
1. Identify data to migrate
2. Create new service with its own database
3. Implement sync mechanism (CDC, events)
4. Start routing reads to new service
5. Migrate writes to new service
6. Remove data from monolith
7. Repeat for next data set
```

**2. Dual-Write Strategy**
- Write to both monolith and microservice
- Eventually switch to microservice only
- Risk of inconsistencies

**3. CDC-Based Migration**
- Use CDC to stream changes
- Build read model in microservice
- Gradually migrate consumers

**Example migration plan:**
```javascript
// Phase 1: Set up CDC
// Monolith DB → Kafka → User Service DB

// Phase 2: Sync historical data
// Copy all users to User Service DB

// Phase 3: Route reads to User Service
const user = await userService.getUser(userId);

// Phase 4: Migrate writes
await userService.updateUser(userId, data);

// Phase 5: Remove from monolith
```

### Q17. What are the challenges of data migration?

**Answer:**

**Key challenges:**

**1. Data Consistency**
- Data in monolith vs microservice diverges
- Sync lag causes inconsistencies
- Need conflict resolution

**2. Downtime**
- Zero downtime migration is complex
- Need to keep both systems running
- Gradual cutover required

**3. Schema Differences**
- Monolith schema vs microservice schema
- Data transformation needed
- Referential integrity issues

**4. Performance Impact**
- CDC adds load to source database
- Dual writes slow down operations
- Need to monitor performance

**5. Data Validation**
- Verify data migrated correctly
- Compare row counts, checksums
- Test with real queries

**6. Rollback Planning**
- What if migration fails?
- Need rollback strategy
- Data restoration process

**7. Testing**
- Integration tests with both systems
- Performance tests
- Failover tests

**Mitigation strategies:**
- Incremental migration
- Feature flags for gradual cutover
- Comprehensive monitoring
- Thorough testing
- Clear rollback plan
- Data validation at each step

### Q18. How do you validate data migration?

**Answer:**

**Data validation strategies:**

**1. Row Count Validation**
```sql
-- Compare row counts
SELECT COUNT(*) FROM monolith.users;  -- 10,000
SELECT COUNT(*) FROM microservice.users;  -- 10,000
```

**2. Checksum Validation**
```javascript
const monolithHash = await calculateHash(monolithDB.users);
const microserviceHash = await calculateHash(microserviceDB.users);

if (monolithHash !== microserviceHash) {
  throw new Error('Data mismatch detected');
}
```

**3. Sample Validation**
- Compare random samples
- Verify specific records
- Check edge cases

```javascript
const sampleIds = getRandomUserIds(100);
for (const id of sampleIds) {
  const monolithUser = await monolithDB.getUser(id);
  const microserviceUser = await microserviceDB.getUser(id);
  
  if (!deepEqual(monolithUser, microserviceUser)) {
    log.error('Mismatch for user', id, monolithUser, microserviceUser);
  }
}
```

**4. Aggregate Validation**
- Compare SUM, AVG, COUNT
- Verify business metrics
- Check relationships

```sql
-- Compare totals
SELECT COUNT(*), SUM(amount) FROM monolith.orders;
SELECT COUNT(*), SUM(amount) FROM microservice.orders;
```

**5. Real Query Validation**
- Run actual application queries
- Compare results
- Test with production-like data

**6. Automated Validation Job**
```javascript
async function validateData() {
  const results = await runValidationChecks();
  
  if (results.mismatches > threshold) {
    alertTeam('Data migration validation failed');
    rollbackMigration();
  } else {
    log.info('Data validation passed');
  }
}
```

### Q19. What is the Dual-Write problem?

**Answer:** Dual-Write problem occurs when you need to write to two databases (e.g., monolith and microservice) and ensure both writes succeed atomically.

**The problem:**
```javascript
// This is NOT atomic!
await monolithDB.createOrder(order);
await microserviceDB.createOrder(order);  // If this fails, data is inconsistent
```

**Issues:**
1. No transaction across databases
2. Network failures cause inconsistencies
3. Partial commits possible
4. Hard to track state

**Solutions:**

**1. Outbox Pattern (Recommended)**
- Write to outbox table in main transaction
- Separate process publishes events
- Consumers update secondary database

**2. Two-Phase Commit**
- Strong consistency but poor performance
- Blocking and complex

**3. Event Sourcing**
- All changes as events
- Rebuild state from events
- Natural solution

**4. Eventual Consistency (Accept it)**
- Use reconciliation jobs
- Fix inconsistencies periodically
- Accept temporary inconsistency

**Example with Outbox:**
```javascript
BEGIN TRANSACTION;
  await monolithDB.createOrder(order);
  await outboxDB.insertEvent({ type: 'OrderCreated', data: order });
COMMIT;

// Separate process publishes event
await messageBus.publish('OrderCreated', order);

// Microservice consumes and creates
messageBus.on('OrderCreated', async (order) => {
  await microserviceDB.createOrder(order);
});