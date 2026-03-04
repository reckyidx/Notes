# Microservices Advanced Interview Questions

## Table of Contents
1. [Event-Driven Architecture](#event-driven-architecture)
2. [Serverless Microservices](#serverless-microservices)
3. [Polyglot Persistence](#polyglot-persistence)
4. [Choreography vs Orchestration](#choreography-vs-orchestration)
5. [Event Sourcing Deep Dive](#event-sourcing-deep-dive)

---

## Event-Driven Architecture

### Q1. What is event-driven architecture in microservices?

**Answer:** Event-driven architecture (EDA) is a pattern where services communicate through events, enabling loose coupling and asynchronous processing.

**Key concepts:**

**1. Events**
- Represent something that happened
- Immutable and time-ordered
- Contain all relevant data

**2. Event Bus/Broker**
- Distributes events to subscribers
- Decouples publishers and consumers
- Examples: Kafka, RabbitMQ, Redis Streams

**3. Event Handlers**
- Process events
- React to state changes
- Can be multiple per event type

**Example with Event Bus:**
```javascript
// Publisher: Order Service
class OrderService {
  async createOrder(orderData) {
    const order = await this.db.createOrder(orderData);
    
    // Publish event
    await eventBus.publish('OrderCreated', {
      orderId: order.id,
      userId: order.userId,
      items: order.items,
      total: order.total,
      timestamp: new Date()
    });
    
    return order;
  }
}

// Consumer 1: Inventory Service
eventBus.subscribe('OrderCreated', async (event) => {
  await inventoryService.reserveItems(event.orderId, event.items);
});

// Consumer 2: Notification Service
eventBus.subscribe('OrderCreated', async (event) => {
  await notificationService.sendOrderConfirmation(event);
});

// Consumer 3: Analytics Service
eventBus.subscribe('OrderCreated', async (event) => {
  await analyticsService.trackOrder(event);
});
```

**Example with Event Emitter (Node.js):**
```javascript
const EventEmitter = require('events');

class OrderService extends EventEmitter {
  async createOrder(orderData) {
    const order = await this.db.createOrder(orderData);
    
    // Emit event using built-in EventEmitter
    this.emit('OrderCreated', {
      orderId: order.id,
      userId: order.userId,
      items: order.items,
      total: order.total
    });
    
    return order;
  }
}

// Create instance
const orderService = new OrderService();

// Subscribe to events (multiple listeners)
orderService.on('OrderCreated', async (order) => {
  console.log(`Inventory reserving for order ${order.orderId}`);
  await inventoryService.reserveItems(order.orderId, order.items);
});

orderService.on('OrderCreated', async (order) => {
  console.log(`Sending notification for order ${order.orderId}`);
  await notificationService.sendOrderConfirmation(order);
});

orderService.on('OrderCreated', async (order) => {
  console.log(`Tracking analytics for order ${order.orderId}`);
  await analyticsService.trackOrder(order);
});

// Trigger the flow
await orderService.createOrder({
  userId: 123,
  items: [{ productId: 1, quantity: 2 }],
  total: 99.99
});
```

**Event Emitter vs Message Broker:**

| Aspect | Event Emitter | Message Broker |
|--------|--------------|---------------|
| **Scope** | In-process/same machine | Cross-service/distributed |
| **Persistence** | In-memory only | Persistent storage |
| **Durability** | Non-persistent | Persistent |
| **Scalability** | Single instance | Distributed |
| **Use Case** | Internal service events | Inter-service communication |
| **Examples** | Node.js EventEmitter, RxJS | Kafka, RabbitMQ, Redis Streams |

**When to use Event Emitter:**
- Within a single microservice
- Decoupling internal components
- Plugin architectures
- Real-time UI updates
- Low-latency, in-memory events

**When to use Message Broker:**
- Cross-service communication
- Need durability and persistence
- Guaranteed delivery
- High-throughput, distributed systems
- Event replay capabilities

**Benefits:**
- Loose coupling
- Asynchronous processing
- Scalability
- Event sourcing friendly
- Natural audit trail

**Challenges:**
- Eventual consistency
- Debugging complexity
- Event ordering
- Duplicate events
- Schema evolution

### Q2. What is the difference between events and commands?

**Answer:**

| Aspect | Events | Commands |
|--------|--------|----------|
| **Purpose** | Notify that something happened | Request action |
| **Tense** | Past (OrderCreated) | Imperative (CreateOrder) |
| **Direction** | One-way (broadcast) | One-way (request) |
| **Cardinality** | Multiple consumers | Single consumer |
| **Failure Handling** | Fire and forget | May need response |
| **Idempotency** | Important | Less critical |

**Examples:**

**Events:**
```javascript
// Events - something happened
{ type: 'OrderCreated', data: { orderId: 123, userId: 456 } }
{ type: 'PaymentCompleted', data: { orderId: 123, amount: 99.99 } }
{ type: 'InventoryReserved', data: { orderId: 123, items: [...] } }
```

**Commands:**
```javascript
// Commands - request action
{ type: 'CreateOrder', data: { userId: 456, items: [...] } }
{ type: 'ProcessPayment', data: { orderId: 123 } }
{ type: 'ReserveInventory', data: { orderId: 123, items: [...] } }
```

**Usage:**
```javascript
// Command - Request action
await commandBus.send('CreateOrder', orderData);

// Event - Notify something happened
await eventBus.publish('OrderCreated', order);
```

### Q3. What is event schema evolution?

**Answer:** Event schema evolution is handling changes to event structure over time while maintaining backward compatibility.

**Challenges:**
- Producers and consumers may be on different versions
- Events stored in event store
- Long-lived event streams

**Strategies:**

**1. Additive Changes (Backward Compatible)**
```json
// Version 1
{
  "eventType": "OrderCreated",
  "orderId": 123,
  "userId": 456,
  "total": 99.99
}

// Version 2 (backward compatible)
{
  "eventType": "OrderCreated",
  "version": 2,
  "orderId": 123,
  "userId": 456,
  "total": 99.99,
  "currency": "USD",  // New field
  "metadata": {}     // New field
}
```

**2. Event Versioning**
```json
{
  "eventType": "OrderCreated",
  "version": 2,
  "data": {
    "orderId": 123,
    "userId": 456,
    "currency": "USD"
  }
}
```

**3. Upcasters**
```javascript
// Transform old event format to new format
function upcastOrderCreatedV1toV2(event) {
  return {
    eventType: event.eventType,
    version: 2,
    data: {
      ...event.data,
      currency: 'USD'  // Default for old events
    }
  };
}

// Usage
const event = await eventStore.getEvent(eventId);
const upcastedEvent = upcastOrderCreatedV1toV2(event);
```

**4. Schema Registry**
```javascript
// Using Confluent Schema Registry
const { SchemaRegistry } = require('@kafkajs/confluent-schema-registry');

const schemaRegistry = new SchemaRegistry({ host: 'http://schema-registry:8081' });

// Register schema
const schemaId = await schemaRegistry.register({
  subject: 'OrderCreated-value',
  type: 'AVRO',
  schema: JSON.stringify(schema)
});

// Validate events
const isValid = await schemaRegistry.validate(schemaId, event);
```

**Best practices:**
1. Additive changes only
2. Never remove fields
3. Use default values for new fields
4. Version events explicitly
5. Test backward compatibility
6. Document schema changes

---

## Serverless Microservices

### Q4. What is serverless microservices?

**Answer:** Serverless microservices deploy microservices as serverless functions (FaaS) without managing servers.

**Characteristics:**
- No server management
- Auto-scaling
- Pay-per-use
- Event-driven
- Stateless

**Popular platforms:**
- AWS Lambda
- Google Cloud Functions
- Azure Functions
- Cloudflare Workers

**Example: AWS Lambda**
```javascript
// Order creation function
exports.createOrder = async (event) => {
  const orderData = JSON.parse(event.body);
  
  // Create order in database
  const order = await dynamodb.put({
    TableName: 'orders',
    Item: orderData
  }).promise();
  
  // Publish event
  await eventbridge.putEvents({
    Entries: [{
      Source: 'order-service',
      DetailType: 'OrderCreated',
      Detail: JSON.stringify(order)
    }]
  }).promise();
  
  return {
    statusCode: 201,
    body: JSON.stringify(order)
  };
};

// Event handler for order created
exports.onOrderCreated = async (event) => {
  const order = JSON.parse(event.detail);
  
  // Reserve inventory
  await dynamodb.put({
    TableName: 'inventory-reservations',
    Item: {
      orderId: order.orderId,
      items: order.items,
      status: 'reserved'
    }
  }).promise();
};
```

**Benefits:**
- No infrastructure management
- Auto-scaling to zero
- Cost-effective for sporadic workloads
- Fast deployment
- Built-in integrations

**Challenges:**
- Cold starts
- Execution time limits
- State management (need external storage)
- Vendor lock-in
- Debugging complexity

### Q5. What are the best practices for serverless microservices?

**Answer:**

**1. Minimize Cold Starts**
```javascript
// Keep functions warm
const warm = setInterval(() => {
  // Ping every 4 minutes (AWS limit is 5 min)
  invokeKeepAlive();
}, 4 * 60 * 1000);

// Use provisioned concurrency
aws lambda put-provisioned-concurrency-config \
  --function-name my-function \
  --provisioned-concurrent-executions 5
```

**2. Optimize Bundle Size**
```javascript
// Use tree shaking
import { createOrder } from './services';  // Instead of *

// Use AWS Lambda Layers
const sharedCode = require('/opt/shared-code');

// Minimize dependencies
// Only include what you need
```

**3. Handle State Externally**
```javascript
// Don't store state in memory
// Use external storage (DynamoDB, S3, Redis)

class OrderService {
  async createOrder(orderData) {
    // Store in DynamoDB
    await dynamodb.put({
      TableName: 'orders',
      Item: orderData
    }).promise();
  }
}
```

**4. Use Async Processing**
```javascript
// Long-running tasks should be async
exports.processOrder = async (event) => {
  const orderId = event.orderId;
  
  // Start Step Function for async processing
  await stepfunctions.startExecution({
    stateMachineArn: 'order-processing-arn',
    input: JSON.stringify({ orderId })
  }).promise();
  
  return { status: 'processing' };
};
```

**5. Implement Retry Logic**
```javascript
// Use dead letter queues
exports.processPayment = async (event) => {
  try {
    await paymentService.charge(event.orderId, event.amount);
  } catch (error) {
    // Send to DLQ for retry
    await sqs.sendMessage({
      QueueUrl: process.env.DLQ_URL,
      MessageBody: JSON.stringify({ event, error })
    }).promise();
    throw error;
  }
};
```

**6. Use Event Bridges**
```javascript
// Event-driven architecture
exports.onOrderCreated = async (event) => {
  const order = JSON.parse(event.detail);
  
  await eventbridge.putEvents({
    Entries: [
      {
        Source: 'order-service',
        DetailType: 'InventoryReserved',
        Detail: JSON.stringify({ orderId: order.orderId })
      },
      {
        Source: 'order-service',
        DetailType: 'PaymentProcessed',
        Detail: JSON.stringify({ orderId: order.orderId })
      }
    ]
  }).promise();
};
```

---

## Polyglot Persistence

### Q6. What is polyglot persistence?

**Answer:** Polyglot persistence is using different database technologies for different microservices based on their specific requirements.

**Example:**
```
Order Service → PostgreSQL (ACID transactions)
Inventory Service → MongoDB (Document store)
Payment Service → PostgreSQL (ACID transactions)
User Service → PostgreSQL (Relational data)
Catalog Service → Elasticsearch (Search)
Analytics Service → Cassandra (Time-series data)
Cache Service → Redis (In-memory cache)
Session Service → Redis (Fast access)
```

**Database Selection Guide:**

| Database | Best For | Use Cases |
|----------|----------|-----------|
| PostgreSQL | ACID, relational data | Orders, payments |
| MongoDB | Document, flexible schema | Inventory, catalogs |
| Redis | Fast key-value, caching | Sessions, cache |
| Elasticsearch | Full-text search | Product search |
| Cassandra | High write throughput, time-series | Analytics, logs |
| Neo4j | Graph data | Social networks, recommendations |
| TimescaleDB | Time-series data | Metrics, monitoring |

**Example Implementation:**
```javascript
// Order Service - PostgreSQL
const orderService = new OrderService({
  client: new PostgreSQLClient()
});

// Inventory Service - MongoDB
const inventoryService = new InventoryService({
  client: new MongoClient()
});

// Catalog Service - Elasticsearch
const catalogService = new CatalogService({
  client: new ElasticsearchClient()
});

// Cache Service - Redis
const cacheService = new CacheService({
  client: new RedisClient()
});
```

**Benefits:**
- Right tool for the job
- Optimized performance
- Scalability per service needs
- Independence from other services

**Challenges:**
- Increased complexity
- Multiple database technologies to learn
- Operational overhead
- Cross-database queries (impossible)

**Mitigation:**
- Database expertise per team
- Standardize on a few databases
- Use API for cross-service data access
- Invest in monitoring and tooling

---

## Choreography vs Orchestration

### Q7. Compare choreography and orchestration in detail.

**Answer:**

**Choreography**
- Decentralized
- Event-driven
- No central coordinator
- Services react to events

**Orchestration**
- Centralized
- Command-driven
- Central coordinator
- Coordinator tells services what to do

**Comparison Table:**

| Aspect | Choreography | Orchestration |
|--------|-------------|---------------|
| **Control** | Decentralized | Centralized |
| **Communication** | Events (pub/sub) | Commands (RPC) |
| **Coordination** | Implicit | Explicit |
| **Flow Visibility** | Hard to see | Easy to see |
| **Complexity** | Simple flows, complex state | Complex flows easy |
| **Scalability** | Better | Limited |
| **Debugging** | Harder | Easier |
| **Implementation** | Event handlers | Workflow engine |
| **Use Case** | Simple workflows | Complex business logic |

**Example: Order Processing Flow**

**Choreography:**
```javascript
// Order Service publishes events
await eventBus.publish('OrderCreated', order);

// Inventory Service listens
eventBus.on('OrderCreated', async (order) => {
  await inventoryService.reserve(order);
  await eventBus.publish('InventoryReserved', order);
});

// Payment Service listens
eventBus.on('InventoryReserved', async (order) => {
  await paymentService.charge(order);
  await eventBus.publish('PaymentCompleted', order);
});

// Shipping Service listens
eventBus.on('PaymentCompleted', async (order) => {
  await shippingService.ship(order);
});
```

**Orchestration:**
```javascript
// Orchestrator coordinates everything
class OrderOrchestrator {
  async processOrder(orderData) {
    const order = await this.orderService.createOrder(orderData);
    
    try {
      await this.inventoryService.reserve(order.id);
      await this.paymentService.charge(order.id);
      await this.shippingService.ship(order.id);
    } catch (error) {
      await this.cancelOrder(order.id);
      throw error;
    }
  }
}
```

**When to use:**

**Choreography:**
- Simple workflows (2-3 steps)
- High scalability needed
- Loose coupling required
- Teams work independently

**Orchestration:**
- Complex workflows (many steps)
- Business logic is complex
- Need clear visibility
- Transaction coordination needed

### Q8. What is a saga orchestrator?

**Answer:** A saga orchestrator is a centralized coordinator that manages the execution of distributed transactions using the saga pattern.

**Responsibilities:**
1. Execute saga steps in order
2. Handle compensating transactions on failure
3. Manage saga state
4. Retry failed steps
5. Provide visibility into saga progress

**Implementation:**
```javascript
class SagaOrchestrator {
  constructor(sagaDefinition) {
    this.definition = sagaDefinition;
    this.stateStore = new StateStore();
  }
  
  async execute(sagaId, initialData) {
    const saga = this.createSaga(sagaId, initialData);
    await this.stateStore.save(saga);
    
    try {
      await this.executeSteps(saga);
      await this.complete(saga);
    } catch (error) {
      await this.compensate(saga);
      throw error;
    }
  }
  
  async executeSteps(saga) {
    for (const step of this.definition.steps) {
      const stepResult = await this.executeStep(saga, step);
      saga.completedSteps.push({ step, result });
      await this.stateStore.save(saga);
    }
  }
  
  async executeStep(saga, step) {
    const maxRetries = step.maxRetries || 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await step.execute(saga.data);
        return result;
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
        await this.sleep(1000 * Math.pow(2, attempt));  // Exponential backoff
      }
    }
  }
  
  async compensate(saga) {
    // Compensate in reverse order
    for (const { step, result } of saga.completedSteps.reverse()) {
      try {
        await step.compensate(saga.data, result);
        saga.compensatedSteps.push(step);
      } catch (error) {
        console.error(`Compensation failed for step ${step.name}:`, error);
        // Continue with other compensations
      }
    }
    
    saga.status = 'compensated';
    await this.stateStore.save(saga);
  }
}

// Usage
const orderSaga = new SagaOrchestrator({
  name: 'OrderProcessing',
  steps: [
    {
      name: 'createOrder',
      execute: (data) => orderService.createOrder(data),
      compensate: (data) => orderService.cancelOrder(data.orderId)
    },
    {
      name: 'reserveInventory',
      execute: (data) => inventoryService.reserve(data.orderId, data.items),
      compensate: (data) => inventoryService.release(data.orderId)
    },
    {
      name: 'processPayment',
      execute: (data) => paymentService.charge(data.orderId, data.total),
      compensate: (data) => paymentService.refund(data.orderId)
    }
  ]
});

await orderSaga.execute('saga-123', orderData);
```

**Benefits:**
- Clear visibility into process
- Easy to implement complex logic
- Centralized state management
- Easier debugging
- Retry and compensation built-in

**Challenges:**
- Single point of failure
- Tight coupling to orchestrator
- Scales less than choreography

---

## Event Sourcing Deep Dive

### Q9. What are the advanced patterns in event sourcing?

**Answer:**

**1. Snapshots**
- Store aggregate state at specific points
- Reduce number of events to replay
- Periodic snapshots

```javascript
class OrderAggregate {
  async rebuild(snapshotVersion = 0) {
    // Load latest snapshot
    const snapshot = await snapshotStore.load(this.id);
    
    // Replay events after snapshot
    const events = await eventStore.getEvents(this.id, snapshot.version);
    
    this.state = snapshot.state;
    events.forEach(event => this.applyEvent(event));
  }
  
  async createSnapshot() {
    await snapshotStore.save({
      aggregateId: this.id,
      version: this.version,
      state: this.state,
      timestamp: Date.now()
    });
  }
}
```

**2. Event Versioning**
- Multiple versions of events
- Upcasters for transformation
- Backward compatibility

```javascript
class EventStore {
  async getEvents(aggregateId, fromVersion = 0) {
    const events = await this.db.query(
      'SELECT * FROM events WHERE aggregate_id = ? AND version > ?',
      [aggregateId, fromVersion]
    );
    
    // Apply upcasters
    return events.map(event => this.upcastEvent(event));
  }
  
  upcastEvent(event) {
    switch (event.type) {
      case 'OrderCreated':
        return event.version < 2 
          ? this.upcastOrderCreatedV1toV2(event)
          : event;
      default:
        return event;
    }
  }
}
```

**3. Projections (Read Models)**
- Build multiple read models from events
- Optimized for different queries
- Eventual consistency

```javascript
class OrderSummaryProjection {
  async onOrderCreated(event) {
    await readModel.insert({
      orderId: event.orderId,
      userId: event.userId,
      status: 'created',
      total: event.total,
      itemCount: event.items.length
    });
  }
  
  async onPaymentCompleted(event) {
    await readModel.update(
      { orderId: event.orderId },
      { status: 'paid', paidAt: event.timestamp }
    );
  }
  
  async onOrderShipped(event) {
    await readModel.update(
      { orderId: event.orderId },
      { status: 'shipped', shippedAt: event.timestamp }
    );
  }
}
```

**4. CQRS with Event Sourcing**
- Write model: Event sourcing
- Read model: Projections
- Separate concerns

```
Write Model (Command)      Read Model (Query)
       │                          │
       ↓                          ↓
  Event Store                Projections
       │                          │
       ↓                          ↓
  Aggregates               Read Models
       │                          │
       └──────────┬───────────────┘
                  ↓
              Events
```

**5. Event Replay**
- Replay events to rebuild state
- Fix bugs by replaying with new logic
- Time travel queries

```javascript
class OrderService {
  async replayAggregate(orderId, targetVersion) {
    // Get all events
    const events = await eventStore.getEvents(orderId);
    
    // Rebuild state
    const aggregate = new OrderAggregate(orderId);
    for (const event of events) {
      if (event.version > targetVersion) break;
      aggregate.applyEvent(event);
    }
    
    return aggregate;
  }
  
  async fixBug(orderId) {
    // Get events
    const events = await eventStore.getEvents(orderId);
    
    // Replay with fixed logic
    const aggregate = new OrderAggregate(orderId);
    events.forEach(event => {
      aggregate.applyEvent(event);  // Fixed applyEvent logic
    });
    
    // Save corrected state
    await snapshotStore.save(aggregate.toSnapshot());
  }
}
```

### Q10. What are the challenges of event sourcing?

**Answer:**

**1. Event Schema Evolution**
- Need to handle changing schemas
- Upcasters required
- Backward compatibility

**Solution:**
```javascript
// Version events
{
  "eventType": "OrderCreated",
  "version": 2,
  "data": { ... }
}

// Upcasters
function upcastEvent(event) {
  const upcaster = upcasters[event.eventType][event.version];
  return upcaster ? upcaster(event) : event;
}
```

**2. Performance for Large Event Streams**
- Many events = slow replay
- Need snapshots
- Optimize queries

**Solution:**
```javascript
// Use snapshots
const snapshot = await snapshotStore.get(aggregateId);
const events = await eventStore.getEvents(aggregateId, snapshot.version);

// Lazy loading
class Aggregate {
  async loadEvents() {
    if (!this.events) {
      this.events = await eventStore.getEvents(this.id);
    }
  }
}
```

**3. Debugging Complexity**
- Hard to trace event flow
- Need good observability
- Event correlation

**Solution:**
```javascript
// Add correlation IDs
const event = {
  eventType: 'OrderCreated',
  data: { ... },
  correlationId: correlationId,
  causationId: causationId
};

// Event sourcing-friendly logging
logger.info('EventApplied', {
  eventType: event.eventType,
  aggregateId: event.aggregateId,
  version: event.version,
  correlationId: event.correlationId
});
```

**4. Duplicate Event Handling**
- Events may be delivered multiple times
- Need idempotency
- Exactly-once semantics

**Solution:**
```javascript
// Idempotent event handler
async function handleEvent(event) {
  const processed = await db.query(
    'SELECT * FROM processed_events WHERE event_id = ?',
    [event.eventId]
  );
  
  if (processed) {
    return;  // Already processed
  }
  
  // Process event
  await applyEvent(event);
  
  // Mark as processed
  await db.insert('processed_events', { eventId: event.eventId });
}
```

**5. Learning Curve**
- Different mental model
- Complex to understand
- Requires architectural buy-in

**Solution:**
- Start small
- Train team
- Use proven libraries
- Document patterns
- Pair programming