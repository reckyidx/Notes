# Microservices Architecture Patterns Interview Questions

## Table of Contents
1. [API Gateway Pattern](#api-gateway-pattern)
2. [Service Mesh](#service-mesh)
3. [Saga Pattern](#saga-pattern)
4. [CQRS Pattern](#cqrs-pattern)
5. [Event Sourcing](#event-sourcing)
6. [Other Patterns](#other-patterns)

---

## API Gateway Pattern

### Q1. What is the API Gateway pattern?

**Answer:** The API Gateway is a single entry point for all client requests in a microservices architecture. It acts as a reverse proxy that:
- Routes requests to appropriate backend services
- Handles cross-cutting concerns (authentication, logging, rate limiting)
- Aggregates responses from multiple services
- Provides a unified API interface to clients

**Key responsibilities:**
- Request routing
- Load balancing
- Authentication and authorization
- SSL termination
- Rate limiting and throttling
- Request/response transformation
- API composition/aggregation

**Popular implementations:**
- Kong, NGINX, Traefik, AWS API Gateway, Apigee, Spring Cloud Gateway

### Q2. What are the benefits of using an API Gateway?

**Answer:**
1. **Simplified Client Experience**: Clients don't need to know about individual services
2. **Cross-Cutting Concerns**: Centralized handling of auth, logging, monitoring
3. **Reduced Latency**: Multiple service calls can be aggregated into one
4. **Security**: Single point for authentication and authorization
5. **Protocol Translation**: Convert between different protocols (HTTP, gRPC, WebSocket)
6. **Load Balancing**: Distribute traffic across service instances
7. **Rate Limiting**: Protect services from being overwhelmed
8. **API Versioning**: Manage multiple API versions easily

### Q3. What are the drawbacks of API Gateway?

**Answer:**
1. **Single Point of Failure**: Gateway failure can bring down entire system
2. **Performance Bottleneck**: All traffic passes through gateway
3. **Increased Latency**: Extra hop for every request
4. **Complexity**: Gateway becomes a complex component itself
5. **Coupling**: Changes in backend may require gateway updates
6. **Deployment Complexity**: Need to coordinate gateway and service deployments

**Mitigation strategies:**
- Use multiple gateway instances for high availability
- Implement caching at gateway level
- Keep gateway logic simple and focused
- Use lightweight gateway implementations
- Consider backend for frontend (BFF) pattern

### Q4. What is the Backend for Frontend (BFF) pattern?

**Answer:** BFF is an extension of the API Gateway pattern where you create separate gateways for different client types:

**Example:**
- **Web BFF**: Optimized for web browsers
- **Mobile BFF**: Optimized for mobile apps
- **IoT BFF**: Optimized for IoT devices

**Benefits:**
- Tailored API responses for each client type
- Reduced payload size (mobile gets less data)
- Client-specific optimization (caching, compression)
- Independent evolution for different clients

**Implementation:**
```
Client Applications
    ├── Web App → Web BFF → Microservices
    ├── Mobile App → Mobile BFF → Microservices
    └── IoT Device → IoT BFF → Microservices
```

---

## Service Mesh

### Q5. What is a Service Mesh?

**Answer:** A Service Mesh is a dedicated infrastructure layer for handling service-to-service communication in microservices architectures. It consists of:
- **Control Plane**: Manages configuration and policies
- **Data Plane**: Lightweight proxies (sidecars) deployed alongside each service

**Key capabilities:**
- Service discovery
- Load balancing
- Traffic management
- Circuit breaking
- Retry logic
- Security (mTLS)
- Observability (metrics, logs, tracing)

**Popular implementations:**
- Istio, Linkerd, Consul Connect, AWS App Mesh

### Q6. How does a Service Mesh work?

**Answer:**

**Architecture:**
```
Service A (App) → Sidecar Proxy ←→ Sidecar Proxy ←→ Service B (App)
                                    (Control Plane manages all sidecars)
```

**Flow:**
1. Each service instance has a sidecar proxy injected
2. All inter-service traffic goes through sidecars
3. Control plane configures sidecars with policies
4. Sidecars handle: routing, retries, circuit breaking, security
5. Application code doesn't need to handle these concerns

**Example with Istio:**
- Envoy proxy as data plane sidecar
- Istiod as control plane
- Pilot for service discovery and traffic management
- Citadel for certificate management
- Galley for configuration validation

### Q7. What are the benefits of using a Service Mesh?

**Answer:**
1. **No Code Changes**: Traffic logic handled by infrastructure
2. **Consistent Policies**: Apply same rules across all services
3. **Observability**: Built-in metrics, logs, and tracing
4. **Security**: Automatic mTLS between services
5. **Traffic Management**: A/B testing, canary deployments
6. **Reliability**: Automatic retries, circuit breaking, timeouts
7. **Polyglot Support**: Works with any programming language
8. **Reduced Complexity**: Developers focus on business logic

### Q8. Compare API Gateway vs Service Mesh.

**Answer:**

| Aspect | API Gateway | Service Mesh |
|--------|-----------|--------------|
| **Scope** | Edge, client-facing | Internal, service-to-service |
| **Position** | Entry point to system | Between services |
| **Focus** | External API management | Internal communication |
| **Traffic** | Client → Services | Service → Service |
| **Protocol Translation** | Yes | Limited |
| **Rate Limiting** | Yes | Can be applied |
| **Observability** | Gateway-level | Per-service level |
| **Both can be used together** | ✓ | ✓ |

**Best practice**: Use both in production
- API Gateway for external clients
- Service Mesh for internal service communication

---

## Saga Pattern

### Q9. What is the Saga pattern?

**Answer:** The Saga pattern is a way to manage data consistency across multiple services in a distributed transaction. Instead of ACID transactions, Saga breaks the transaction into a sequence of local transactions:
- Each local transaction updates data within a single service
- If a step fails, compensating transactions undo previous steps
- Ensures eventual consistency across services

**Use case:** Order processing that spans Order, Inventory, and Payment services

### Q10. What are the two types of Saga implementations?

**Answer:**

**1. Choreography-based Saga**
- Each service emits events when it completes its local transaction
- Services listen for events and execute their local transactions
- No central coordinator
- Decentralized control

**Example flow:**
```
Order Service
  → emits OrderCreated event
    → Inventory Service (listens)
      → emits InventoryReserved event
        → Payment Service (listens)
          → emits PaymentCompleted event
```

**2. Orchestration-based Saga**
- Central orchestrator coordinates the saga
- Orchestrator tells each service what to do
- Services don't communicate directly
- Centralized control

**Example flow:**
```
Orchestrator
  → tells Order Service: createOrder()
  → tells Inventory Service: reserveInventory()
  → tells Payment Service: processPayment()
  → on failure: tells services to compensate
```

### Q11. Compare Choreography vs Orchestration Saga.

**Answer:**

| Aspect | Choreography | Orchestration |
|--------|-------------|---------------|
| **Complexity** | Simple to start, complex flows become messy | More complex initially, easier for complex flows |
| **Coupling** | Looser coupling | Tighter coupling with orchestrator |
| **Coordination** | Decentralized | Centralized |
| **Visibility** | Hard to track overall flow | Easy to see entire transaction |
| **Implementation** | Event-driven | Service calls orchestrator |
| **Best for** | Simple, few steps | Complex, many steps |
| **Debugging** | More difficult | Easier with centralized logs |

**When to use:**
- **Choreography**: 2-3 services, simple business logic
- **Orchestration**: Many services, complex business rules

### Q12. How do you handle compensating transactions in Saga?

**Answer:** Compensating transactions undo the effects of a previous local transaction.

**Key considerations:**
1. **Idempotent**: Compensating transactions must be idempotent
2. **Reverse Operation**: Compensating action must be semantically opposite
3. **No Rollback**: Can't roll back database, must apply inverse operation

**Example - Order Saga:**

| Step | Forward Transaction | Compensating Transaction |
|------|-------------------|-------------------------|
| 1 | Create Order | Cancel Order |
| 2 | Reserve Inventory | Release Inventory |
| 3 | Process Payment | Refund Payment |
| 4 | Ship Order | Cancel Shipment |

**Implementation:**
```javascript
// Forward transaction
async function reserveInventory(orderId, items) {
  await inventoryDB.reserve(orderId, items);
  emit(new InventoryReserved(orderId, items));
}

// Compensating transaction
async function releaseInventory(orderId, items) {
  await inventoryDB.release(orderId, items);
  emit(new InventoryReleased(orderId, items));
}
```

---

## CQRS Pattern

### Q13. What is CQRS (Command Query Responsibility Segregation)?

**Answer:** CQRS is a pattern that separates read and write operations into different models:
- **Command**: Create, Update, Delete operations
- **Query**: Read operations

**Traditional approach:**
```
Single Model → Single Database
  - CRUD operations
  - Same model for read and write
```

**CQRS approach:**
```
Command Model → Write Database
                  ↓
            (Synchronization)
                  ↓
Query Model ← Read Database
```

### Q14. What are the benefits of CQRS?

**Answer:**
1. **Scalability**: Scale read and write operations independently
2. **Performance**: Optimize read model for fast queries
3. **Flexibility**: Use different databases for reads and writes
4. **Simplified Logic**: Complex business logic stays in write model
5. **Separation of Concerns**: Clear separation between command and query
6. **Parallel Development**: Read and write models can evolve independently

**Example scenarios:**
- High read, low write ratio (news feeds, product catalogs)
- Complex queries, simple writes (reporting systems)
- Different data structures for read/write
- Need for optimized read performance

### Q15. What are the challenges of CQRS?

**Answer:**
1. **Complexity**: More complex architecture, more moving parts
2. **Eventual Consistency**: Read model is eventually consistent
3. **Data Synchronization**: Need sync mechanism between models
4. **Debugging**: Harder to trace data flow
5. **Learning Curve**: Team needs to understand the pattern
6. **Latency**: Delay between write and read availability
7. **Code Duplication**: Similar code in both models

**Mitigation:**
- Use event sourcing for write model
- Implement proper event handling
- Clear documentation of sync process
- Good monitoring for synchronization health

### Q16. How does CQRS relate to Event Sourcing?

**Answer:**

**Event Sourcing:**
- Stores all state changes as events
- Current state is derived by replaying events
- Natural audit trail
- Enables time travel

**Relationship:**
```
Events (Event Sourcing)
    ↓
Projectors/Handlers
    ↓
Read Model (CQRS)
```

**Example:**
```javascript
// Events stored in event store
[
  { type: 'OrderCreated', orderId: 1, amount: 100 },
  { type: 'PaymentCompleted', orderId: 1 },
  { type: 'OrderShipped', orderId: 1 }
]

// Query model built from events
ReadModel = {
  orderId: 1,
  status: 'shipped',
  amount: 100
}
```

**Benefits of using together:**
- Event sourcing provides natural sync mechanism
- Easy to rebuild read model from events
- Complete audit trail
- Temporal queries (state at any point in time)

---

## Event Sourcing

### Q17. What is Event Sourcing?

**Answer:** Event Sourcing is a pattern where all state changes are stored as a sequence of events instead of storing the current state.

**Traditional approach:**
```sql
-- Store current state
UPDATE orders SET status = 'shipped' WHERE id = 1;
```

**Event Sourcing approach:**
```json
// Store state change as event
{
  "eventType": "OrderShipped",
  "orderId": 1,
  "timestamp": "2024-01-01T10:00:00Z",
  "version": 3
}
```

**To get current state, replay all events:**
```javascript
const events = eventStore.getEvents(orderId);
const currentState = events.reduce((state, event) => {
  return applyEvent(state, event);
}, initialState);
```

### Q18. What are the benefits of Event Sourcing?

**Answer:**
1. **Complete Audit Trail**: Every change is recorded
2. **Temporal Queries**: Can see state at any point in time
3. **Debugging**: Easy to understand how state evolved
4. **Scalability**: Append-only operations are fast
5. **Event Replay**: Rebuild read models from events
6. **Event-driven**: Natural fit for event-driven architecture
7. **No Lost Updates**: All changes are preserved

**Use cases:**
- Financial systems (audit requirements)
- E-commerce (order history)
- Social media (activity feeds)
- Gaming (game state replay)

### Q19. What are the challenges of Event Sourcing?

**Answer:**
1. **Complexity**: More complex than traditional CRUD
2. **Event Schema Evolution**: Need to handle changing event schemas
3. **Performance**: Replaying many events can be slow
4. **Storage**: More storage required for event history
5. **Learning Curve**: Different mental model
6. **Snapshot Management**: Need snapshots for long event histories
7. **Consistency**: Handling out-of-order events

**Mitigation:**
- Use snapshots for aggregates with many events
- Implement event versioning
- Use event store with good performance
- Consider event compression for old events

### Q20. How do you handle schema evolution in Event Sourcing?

**Answer:** Event schema evolution strategies:

**1. Version events:**
```json
{
  "eventType": "OrderCreated",
  "version": 2,
  "data": {
    "orderId": 1,
    "amount": 100,
    "currency": "USD"  // New field in version 2
  }
}
```

**2. Upcasters:**
```javascript
// Transform old event format to new format
function upcastOrderCreatedV1toV2(event) {
  return {
    ...event,
    version: 2,
    data: {
      ...event.data,
      currency: 'USD'  // Default value for old events
    }
  };
}
```

**3. Multiple handlers:**
```javascript
// Different handlers for different versions
function handleOrderCreatedV1(event) {
  // Old logic
}

function handleOrderCreatedV2(event) {
  // New logic
}
```

**4. Event migration:**
- Migrate events to new version during off-peak hours
- Gradual migration strategy
- Maintain backward compatibility during migration

---

## Other Patterns

### Q21. What is the Circuit Breaker pattern?

**Answer:** Circuit Breaker is a design pattern to prevent cascading failures by detecting failures and wrapping failing calls.

**States:**
1. **Closed**: Requests pass through normally
2. **Open**: Requests fail immediately (no actual calls)
3. **Half-Open**: Limited requests test if service recovered

**Implementation:**
```javascript
class CircuitBreaker {
  constructor(threshold, timeout) {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.nextAttempt = Date.now();
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }
  
  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

### Q22. What is the Bulkhead pattern?

**Answer:** Bulkhead pattern isolates resources to prevent a single failing component from bringing down the entire system.

**Inspired by**: Ship bulkheads that prevent entire ship from flooding if one compartment is breached.

**Types:**
1. **Thread Pool Bulkhead**: Separate thread pools for different services
2. **Semaphore Bulkhead**: Limit concurrent calls to a service
3. **Connection Pool Bulkhead**: Separate connection pools

**Example:**
```javascript
// Separate thread pools for different services
const orderServicePool = new ThreadPool(10);
const inventoryServicePool = new ThreadPool(5);
const paymentServicePool = new ThreadPool(3);

// Payment service issues won't affect order service
orderServicePool.execute(() => createOrder());
paymentServicePool.execute(() => processPayment());
```

**Benefits:**
- Fault isolation
- Resource allocation control
- Prevents cascading failures
- Prioritization of critical services

### Q23. What is the Sidecar pattern?

**Answer:** Sidecar pattern deploys a helper service alongside the main application to handle cross-cutting concerns.

**Architecture:**
```
┌─────────────────────────┐
│    Application Pod      │
├─────────────┬───────────┤
│  Main App   │  Sidecar  │
│ (Business   │  (Proxy)  │
│   Logic)    │           │
├─────────────┴───────────┤
│      Shared Network     │
└─────────────────────────┘
```

**Sidecar responsibilities:**
- Service discovery
- Load balancing
- Circuit breaking
- Monitoring/metrics
- Logging
- Security (mTLS)

**Examples:**
- Envoy sidecar in Istio
- Dapr sidecar
- AWS X-Ray sidecar

**Benefits:**
- No application code changes
- Language agnostic
- Centralized management
- Easy updates/upgrades

### Q24. What is the Ambassador pattern?

**Answer:** Ambassador pattern uses a helper service to send requests on behalf of the main application, handling cross-cutting communication concerns.

**Use cases:**
- Request routing
- Retry logic
- Circuit breaking
- Authentication
- Monitoring

**Difference from Sidecar:**
- Sidecar: Handles incoming and outgoing traffic
- Ambassador: Focuses on outgoing requests
- Both can be used together

**Example:**
```javascript
// Ambassador handles all outbound calls
class ServiceAmbassador {
  async callService(url, data) {
    return this.retry(() => 
      this.circuitBreaker.execute(() =>
        this.makeRequest(url, data)
      )
    );
  }
}
```

### Q25. What is the Anti-Corruption Layer (ACL) pattern?

**Answer:** ACL prevents external systems' data models from polluting your own system's domain model.

**When to use:**
- Integrating with legacy systems
- Working with third-party APIs
- Merging systems with different domain models

**Components:**
1. **Facade**: Simplified interface to external system
2. **Adapter**: Translates between different models
3. **Translator**: Converts data formats

**Example:**
```
Your Microservice
    ↓
Anti-Corruption Layer
    ├── Facade
    ├── Adapter
    └── Translator
        ↓
External/Legacy System
```

**Benefits:**
- Clean domain model
- Isolates external changes
- Easy to replace external system
- Better testability