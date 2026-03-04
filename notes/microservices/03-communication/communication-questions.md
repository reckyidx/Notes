# Microservices Communication Interview Questions

## Table of Contents
1. [Synchronous vs Asynchronous](#synchronous-vs-asynchronous)
2. [REST vs gRPC vs GraphQL](#rest-vs-grpc-vs-graphql)
3. [Message Brokers](#message-brokers)
4. [Resilience Patterns](#resilience-patterns)
5. [Service Discovery](#service-discovery)

---

## Synchronous vs Asynchronous

### Q1. What is the difference between synchronous and asynchronous communication?

**Answer:**

| Aspect | Synchronous | Asynchronous |
|--------|------------|--------------|
| **Definition** | Caller waits for response | Caller doesn't wait |
| **Coupling** | Tight coupling | Loose coupling |
| **Latency** | Higher (wait time) | Lower (fire and forget) |
| **Reliability** | Less (timeout issues) | More (message queuing) |
| **Scalability** | Limited by caller resources | Better (decoupled) |
| **Debugging** | Easier (request-response) | Harder (distributed tracing) |
| **Examples** | HTTP/REST, gRPC | Message queues, events |

**Synchronous example:**
```javascript
const response = await fetch('http://inventory-service/items');
const items = await response.json();
```

**Asynchronous example:**
```javascript
// Publish event, don't wait
eventBus.publish('OrderCreated', { orderId, items });
```

### Q2. When should you use synchronous vs asynchronous communication?

**Answer:**

**Use Synchronous when:**
- Need immediate response for client
- Transaction requires atomicity
- Simple request-response pattern
- Real-time requirements (user waiting)
- Command operations that must succeed before proceeding

**Examples:**
- User login (need token immediately)
- Payment processing (need confirmation)
- Product availability check
- Real-time chat messages

**Use Asynchronous when:**
- Don't need immediate response
- Long-running operations
- High volume, bursty traffic
- Need loose coupling
- Event-driven workflows
- Notification/push operations

**Examples:**
- Sending emails
- Generating reports
- Updating analytics
- Order processing workflow
- Cache invalidation

### Q3. What are the drawbacks of synchronous communication in microservices?

**Answer:**

1. **Tight Coupling**: Services become dependent on each other's availability
2. **Cascading Failures**: One service failure propagates to callers
3. **Latency Accumulation**: Multiple synchronous calls add up
4. **Resource Blocking**: Thread waits for response
5. **Limited Scalability**: Caller resources tied up waiting
6. **Brittle Architecture**: Changes in one service affect callers
7. **Timeout Management**: Complex to handle timeouts properly

**Example of cascading failure:**
```
Client → Order Service → Inventory Service (down)
              ↓
         Timeout → Client error
         ↓
    Order Service resources blocked
```

---

## REST vs gRPC vs GraphQL

### Q4. Compare REST, gRPC, and GraphQL.

**Answer:**

| Aspect | REST | gRPC | GraphQL |
|--------|------|------|---------|
| **Protocol** | HTTP/1.1 | HTTP/2 | HTTP (typically) |
| **Format** | JSON | Protobuf | JSON |
| **Performance** | Good | Excellent | Variable |
| **Code Generation** | No | Yes | Partial |
| **Browser Support** | Excellent | Limited | Good |
| **Streaming** | Limited | Yes | Yes (subscriptions) |
| **Schema** | Optional | Required | Required |
| **Overfetching** | Common | No | No |
| **Learning Curve** | Low | Medium | High |

### Q5. What are the benefits of gRPC over REST?

**Answer:**

**1. Performance**
- Binary protocol (Protocol Buffers) smaller than JSON
- HTTP/2 multiplexing (multiple requests over one connection)
- Built-in compression

**2. Code Generation**
- Auto-generate client and server code from .proto files
- Type-safe APIs
- Less boilerplate code

**3. Streaming**
- Unary (request-response)
- Server streaming
- Client streaming
- Bidirectional streaming

**4. Strong Contracts**
- .proto files define API contract
- Breaking changes detected at compile time
- Versioning built-in

**Example:**
```protobuf
// user.proto
service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc GetUsers(stream GetUserRequest) returns (stream GetUserResponse);
}

message GetUserRequest {
  int32 user_id = 1;
}

message GetUserResponse {
  int32 user_id = 1;
  string name = 2;
  string email = 3;
}
```

### Q6. What are the benefits of GraphQL over REST?

**Answer:**

**1. Single Endpoint**
- One endpoint for all queries
- No versioning needed

**2. No Overfetching/Underfetching**
- Clients request exactly what they need
- No unnecessary data transfer

**3. Strong Typing**
- Schema defines all types
- Self-documenting (introspection)
- Type validation

**4. Flexibility**
- Clients control data shape
- Multiple resources in one request
- Better for mobile (bandwidth efficient)

**Example:**
```graphql
# Client requests exactly what they need
query {
  user(id: 1) {
    name
    email
    orders {
      id
      total
    }
  }
}

# Response
{
  "data": {
    "user": {
      "name": "John Doe",
      "email": "john@example.com",
      "orders": [
        { "id": 1, "total": 99.99 }
      ]
    }
  }
}
```

### Q7. What is the best practice for API versioning in microservices?

**Answer:**

**1. URL Versioning**
```
/api/v1/users
/api/v2/users
```
- Pros: Clear, easy to understand
- Cons: Version in URL is unnecessary

**2. Header Versioning**
```
GET /api/users
Accept: application/vnd.myapi.v1+json
```
- Pros: Clean URLs, supports multiple versions simultaneously
- Cons: Harder to test in browser

**3. Content Negotiation**
```
Accept: application/json; version=1
```
- Pros: Standard HTTP approach
- Cons: Can be confusing

**Best Practice:**
- Use header-based versioning for new APIs
- Maintain backward compatibility when possible
- Deprecate old versions gradually
- Document version lifecycle

**Example of backward compatibility:**
```javascript
// Add new fields, don't remove old ones
{
  "userId": 1,          // Old field
  "id": 1,              // New preferred field
  "userName": "john",   // Old field
  "name": "John Doe"    // New field
}
```

---

## Message Brokers

### Q8. What is a message broker and why use it?

**Answer:** A message broker is an intermediary that enables asynchronous communication between services by receiving, storing, and delivering messages.

**Key benefits:**

1. **Decoupling**: Services don't need to know about each other
2. **Buffering**: Handles traffic spikes and uneven production/consumption rates
3. **Reliability**: Messages are stored until delivered
4. **Scalability**: Easy to add consumers/producers
5. **Flexibility**: Multiple patterns (pub/sub, point-to-point)

**Popular message brokers:**
- **RabbitMQ**: Feature-rich, flexible routing
- **Kafka**: High throughput, log-based, stream processing
- **Redis Streams**: Lightweight, in-memory
- **AWS SQS/SNS**: Managed cloud services

**Example flow:**
```
Producer → Message Broker → Consumer 1
                          → Consumer 2
                          → Consumer 3
```

### Q9. What are the different messaging patterns?

**Answer:**

**1. Point-to-Point (Queue)**
- One producer, one consumer
- Message consumed by one receiver only
- Load balancing across multiple consumers

**2. Publish-Subscribe (Topic)**
- One producer, multiple consumers
- All consumers receive the message
- Fan-out pattern

**3. Request-Reply**
- Producer sends request
- Consumer sends response to reply queue
- Correlation ID matches requests and responses

**4. Competing Consumers**
- Multiple consumers for load balancing
- Messages distributed among consumers
- Only one consumer processes each message

**Example:**
```javascript
// Publish-Subscribe (RabbitMQ)
channel.publish('exchange', 'topic', Buffer.from(message));

// Point-to-Point (Queue)
channel.sendToQueue('order-queue', Buffer.from(message));
```

### Q10. What is the difference between RabbitMQ and Kafka?

**Answer:**

| Aspect | RabbitMQ | Kafka |
|--------|----------|-------|
| **Model** | Message broker | Event streaming platform |
| **Message Storage** | Transient (mostly) | Persistent log |
| **Retention** | After consumption | Configurable time/size |
| **Consumption** | Pull/Push | Pull only |
| **Throughput** | High (~20K/sec) | Very High (~1M/sec) |
| **Latency** | Low | Ultra-low |
| **Features** | Flexible routing, plugins | Streams, KSQL |
| **Use Case** | Messaging, routing | Event sourcing, analytics |
| **Complexity** | Simpler | More complex |

**When to use RabbitMQ:**
- Complex routing needs
- Request-reply patterns
- Per-message acknowledgments
- Traditional messaging patterns

**When to use Kafka:**
- Event sourcing
- Stream processing
- High throughput requirements
- Log aggregation
- Real-time analytics

### Q11. How do you ensure message delivery reliability?

**Answer:**

**1. Message Acknowledgment**
- Consumer acknowledges successful processing
- Broker redelivers unacknowledged messages
- Manual acknowledgment gives more control

```javascript
// RabbitMQ manual ACK
channel.consume('orders', (msg) => {
  try {
    processOrder(msg.content);
    channel.ack(msg);  // Acknowledge success
  } catch (error) {
    channel.nack(msg, false, true);  // Requeue
  }
});
```

**2. Idempotent Consumers**
- Handle duplicate messages gracefully
- Use unique message IDs
- Check if message already processed

```javascript
async function processMessage(message) {
  if (await isProcessed(message.id)) {
    return;  // Already processed
  }
  
  await doWork(message);
  await markProcessed(message.id);
}
```

**3. Dead Letter Queues (DLQ)**
- Move failed messages to separate queue
- Manual inspection and retry
- Prevent infinite loops

```javascript
// Configure DLQ
channel.assertQueue('orders-dlq');
channel.bindQueue('orders-dlq', 'dlq-exchange', 'orders');
```

**4. Persistence**
- Mark messages as persistent
- Store messages on disk
- Survive broker restart

### Q12. What is the Exactly Once delivery semantic?

**Answer:** Exactly Once means each message is delivered and processed exactly one time—no duplicates, no losses.

**Challenges:**
- Network failures cause duplicates (retries)
- Consumer crashes before acknowledgment
- Broker failures

**Implementation strategies:**

**1. Idempotent producers**
- Deduplicate messages at producer
- Use sequence numbers

**2. Idempotent consumers**
- Track processed message IDs
- Ignore duplicates

**3. Transactional processing**
```javascript
// Kafka transactions
producer.beginTransaction();
producer.send(message1);
producer.send(message2);
producer.commitTransaction();
```

**Reality check:**
- Exactly Once is difficult to achieve
- Most systems use "At Least Once" with idempotent consumers
- Accept eventual consistency in distributed systems

---

## Resilience Patterns

### Q13. What are the key resilience patterns in microservices?

**Answer:**

**1. Circuit Breaker**
- Prevents cascading failures
- Fails fast when downstream service is down
- Automatically retries after cooldown

**2. Retry**
- Retry failed requests automatically
- Exponential backoff
- Limit retry attempts

**3. Timeout**
- Set reasonable timeouts
- Prevent hanging requests
- Different timeouts for different operations

**4. Bulkhead**
- Isolate resources per service
- Limit concurrent requests
- Prevent resource exhaustion

**5. Fallback**
- Provide alternative behavior on failure
- Return cached/default values
- Graceful degradation

### Q14. How do you implement retry logic with exponential backoff?

**Answer:**

Exponential backoff increases delay between retries exponentially to avoid overwhelming the service.

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  let delay = 100; // Initial delay: 100ms
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw lastError;  // Final attempt failed
      }
      
      // Exponential backoff with jitter
      const jitter = Math.random() * delay * 0.1;
      await sleep(delay + jitter);
      delay *= 2;  // Double the delay
    }
  }
}

// Usage
const result = await retryWithBackoff(async () => {
  return await fetch('http://service/api/data');
}, 3);

// Retry sequence: 100ms, 200ms, 400ms
```

**Best practices:**
- Add jitter to avoid thundering herd
- Max retry limit (infinite retries are bad)
- Retry only on specific errors (5xx, timeouts)
- Don't retry on 4xx errors (client errors)

### Q15. What is the Retry pattern and when to use it?

**Answer:** Retry pattern automatically re-executes failed operations with the expectation that the failure is transient.

**When to use:**
- Network issues (temporary outages)
- Service temporarily unavailable
- Rate limiting (429 Too Many Requests)
- Timeout errors
- Database connection issues

**When NOT to use:**
- Client errors (4xx) - retrying won't help
- Business logic errors - won't fix with retry
- Non-idempotent operations - might cause duplicates
- Known permanent failures

**Implementation:**
```javascript
class RetryPolicy {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialDelay = options.initialDelay || 100;
    this.multiplier = options.multiplier || 2;
    this.retryableErrors = options.retryableErrors || [
      503, 504, 429, 'ETIMEDOUT', 'ECONNRESET'
    ];
  }
  
  shouldRetry(error, attempt) {
    if (attempt >= this.maxRetries) return false;
    return this.retryableErrors.some(err => 
      error.toString().includes(err.toString())
    );
  }
  
  async execute(fn) {
    let delay = this.initialDelay;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }
        
        await this.sleep(delay);
        delay *= this.multiplier;
      }
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Q16. What are the anti-patterns in service communication?

**Answer:**

**1. Chatty Services**
- Too many synchronous calls between services
- Network latency accumulates
- Poor performance

**Example:**
```javascript
// Bad: Multiple calls
const user = await getUser(userId);
const orders = await getOrders(userId);
const payments = await getPayments(userId);

// Good: Aggregate in one call or use async
const userData = await getUserData(userId);
```

**2. Leaky Abstractions**
- Exposing internal service details
- Tight coupling between services
- Hard to change internal implementation

**3. Distributed Monolith**
- Services heavily depend on each other
- Can't deploy independently
- Defeats microservices purpose

**4. Blocking Calls**
- Long-running operations block threads
- Resource exhaustion
- Cascading failures

**5. No Idempotency**
- Retries cause duplicate operations
- Data inconsistency
- Money charged twice, etc.

**6. Ignoring Timeouts**
- Infinite waits
- Thread pool exhaustion
- System hangs

**7. Hardcoded Service URLs**
- Can't scale or relocate services
- Manual configuration changes
- Breaks service discovery

---

## Service Discovery

### Q17. What is service discovery?

**Answer:** Service discovery is the automatic detection of services and their network locations in a distributed system.

**Why needed:**
- Services have dynamic IP addresses (containers, cloud)
- Services scale up/down dynamically
- Don't want to hardcode addresses
- Need load balancing

**Types:**

**1. Client-side discovery**
- Client queries service registry
- Client selects service instance
- Example: Netflix Eureka, Consul

```
Client → Service Registry → [Instance 1]
                        → [Instance 2]
                        → [Instance 3]
Client chooses one instance
```

**2. Server-side discovery**
- Client calls load balancer
- Load balancer routes to service instance
- Example: Kubernetes Service, AWS ALB

```
Client → Load Balancer → Service Instance
```

### Q18. How does service registration work?

**Answer:** Service registration is how services make themselves discoverable.

**Registration methods:**

**1. Self-registration**
- Service registers itself on startup
- Service de-registers on shutdown
- Sends periodic heartbeats

```javascript
// Self-register on startup
async function startService() {
  await server.start();
  
  await registry.register({
    name: 'order-service',
    address: 'order-service:3000',
    healthCheck: '/health'
  });
  
  // Heartbeat
  setInterval(async () => {
    await registry.heartbeat('order-service');
  }, 5000);
}

// Deregister on shutdown
process.on('SIGTERM', async () => {
  await registry.deregister('order-service');
  await server.stop();
});
```

**2. Third-party registration**
- Service doesn't know about registry
- Sidecar or orchestrator handles registration
- Example: Kubernetes, Consul agent

**Registration data:**
- Service name
- Network address (IP, port)
- Health check endpoint
- Metadata (version, region)
- Tags/labels

### Q19. What are the health check best practices?

**Answer:**

**Health check levels:**

**1. Liveness Probe**
- Is the service alive?
- Restart if fails
- Check: process running, basic connectivity

**2. Readiness Probe**
- Is the service ready to serve traffic?
- Don't route traffic if fails
- Check: dependencies available, initialization complete

**Example:**
```javascript
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

app.get('/health/ready', async (req, res) => {
  try {
    await database.ping();
    await redis.ping();
    await externalService.healthCheck();
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not-ready', error: error.message });
  }
});
```

**Best practices:**
- **Fast**: Should return in < 100ms
- **Lightweight**: Don't do heavy operations
- **No side effects**: Shouldn't change state
- **Clear response**: Simple success/failure
- **Detailed info**: Include dependency health in ready probe
- **Circuit breaker**: Health check through circuit breaker
- **Timeout**: Always have timeout on health checks

**Example Kubernetes health checks:**
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 2
```

### Q20. What is DNS-based service discovery?

**Answer:** DNS-based service discovery uses DNS records to locate services.

**How it works:**
```
order-service.default.svc.cluster.local
    ↓
DNS lookup → 10.0.1.5, 10.0.1.6, 10.0.1.7
    ↓
Client chooses one (round-robin)
```

**Advantages:**
- Standard DNS protocol
- Works with any language
- Simple to implement
- Native caching

**Disadvantages:**
- DNS TTL issues (stale records)
- Limited load balancing
- No health checking
- Slow updates (DNS propagation)

**Example:**
```javascript
// Kubernetes DNS
const host = 'order-service.default.svc.cluster.local';
const address = await dns.lookup(host);

// Consul DNS
const host = 'order-service.service.consul';
const address = await dns.lookup(host);
```

**Best practices:**
- Use short TTL (5-30 seconds)
- Combine with health checks
- Don't rely on DNS for critical operations
- Consider service mesh for advanced features