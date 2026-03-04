# Microservices Fundamentals Interview Questions

## Table of Contents
1. [Basic Concepts](#basic-concepts)
2. [Monolith vs Microservices](#monolith-vs-microservices)
3. [Service Decomposition](#service-decomposition)
4. [CAP Theorem & Consistency](#cap-theorem--consistency)
5. [Domain-Driven Design](#domain-driven-design)

---

## Basic Concepts

### Q1. What are microservices?

**Answer:** Microservices is an architectural style that structures an application as a collection of small, loosely coupled, and independently deployable services. Each microservice:
- Runs in its own process
- Communicates with other services through well-defined APIs (typically HTTP/REST or messaging)
- Is built around a specific business capability
- Can be developed, deployed, and scaled independently
- Often uses different programming languages and databases

### Q2. What are the key characteristics of microservices?

**Answer:**
1. **Single Responsibility**: Each service focuses on one business capability
2. **Decentralized**: Different services can use different technologies
3. **Independent Deployment**: Services can be deployed independently
4. **Failure Isolation**: Failure in one service doesn't bring down the entire system
5. **Scalability**: Individual services can be scaled based on demand
6. **Organizational Alignment**: Teams are organized around services (Conway's Law)

### Q3. What are the benefits of microservices architecture?

**Answer:**
- **Scalability**: Scale individual components independently
- **Faster Development**: Smaller teams work in parallel
- **Technology Diversity**: Use the right tool for each service
- **Fault Isolation**: One service failure doesn't crash the entire system
- **Easier Maintenance**: Smaller codebases are easier to understand and maintain
- **Independent Deployment**: Deploy updates without affecting other services
- **Better Resource Utilization**: Allocate resources based on service needs

### Q4. What are the drawbacks of microservices?

**Answer:**
- **Complexity**: Increased operational complexity in distributed systems
- **Network Latency**: Inter-service communication adds overhead
- **Data Consistency**: Maintaining consistency across services is challenging
- **Testing Complexity**: End-to-end testing is more difficult
- **Infrastructure Overhead**: Need for monitoring, logging, and service discovery
- **DevOps Maturity**: Requires mature DevOps practices and tooling
- **Cultural Changes**: Teams need to be organized differently

---

## Monolith vs Microservices

### Q5. Compare monolithic and microservices architecture.

**Answer:**

| Aspect | Monolithic | Microservices |
|--------|-----------|---------------|
| **Structure** | Single deployable unit | Multiple independent services |
| **Scalability** | Scale entire application | Scale individual services |
| **Deployment** | One deployment | Multiple deployments |
| **Technology** | Single technology stack | Multiple technologies possible |
| **Team Structure** | Large teams | Small, autonomous teams |
| **Failure Impact** | Entire app can fail | Isolated failures |
| **Development Speed** | Slower for large apps | Faster parallel development |
| **Complexity** | Simple infrastructure | Complex distributed system |
| **Data Management** | Single database | Multiple databases |
| **Debugging** | Easier | More challenging |

### Q6. When should you use microservices instead of monolith?

**Answer:** Microservices are appropriate when:
- Application is large and complex with multiple business domains
- Teams need to work independently and deploy at different rates
- Different parts of the system have different scaling requirements
- You need to use multiple technologies/languages
- You have the organizational maturity and DevOps capabilities
- The application requires high availability and fault isolation
- Business domains are well-defined and have clear boundaries

**When to stick with monolith:**
- Small to medium applications
- Early-stage startups (start with monolith, extract services later)
- Limited DevOps expertise
- Simple business requirements
- Tight deadlines and limited resources

### Q7. What is the Strangler Fig pattern?

**Answer:** The Strangler Fig pattern is a migration strategy where you gradually replace a monolithic application with microservices. The pattern involves:
1. **Identify** a feature to extract from the monolith
2. **Create** a new microservice for that feature
3. **Route** requests through a facade/API gateway
4. **Redirect** traffic from monolith to the new service incrementally
5. **Remove** the extracted functionality from the monolith
6. **Repeat** until the monolith is completely replaced

Benefits:
- No big-bang rewrite
- Zero downtime migration
- Incremental value delivery
- Risk is spread across multiple deployments

---

## Service Decomposition

### Q8. How do you decompose a monolith into microservices?

**Answer:** Decomposition strategies include:

1. **Decompose by Business Capability**
   - Identify business capabilities
   - Group related functionality
   - Example: Order Management, Inventory, Shipping

2. **Decompose by Subdomain (DDD)**
   - Use Domain-Driven Design bounded contexts
   - Define ubiquitous language per subdomain
   - Align services with business domains

3. **Decompose by Data**
   - Identify data ownership boundaries
   - Create services around database entities
   - Consider data isolation needs

4. **Decompose by Transaction/Verb**
   - Group related operations
   - Example: GetOrder, CreateOrder, CancelOrder

Best Practices:
- Start with coarse-grained services, split if needed
- Identify natural boundaries in the system
- Consider team structure and communication patterns
- Plan for data migration and consistency

### Q9. What is a bounded context in Domain-Driven Design?

**Answer:** A bounded context is a distinct part of the domain logic where:
- All terms have specific, unambiguous meanings
- A ubiquitous language is defined and used
- Models are internally consistent
- The boundary separates it from other contexts

Example:
- In "Sales" context, "Customer" means someone who buys
- In "Support" context, "Customer" means someone with an issue
- These are different bounded contexts with different definitions

Bounded contexts help identify microservice boundaries and prevent conceptual confusion.

### Q10. How do you identify service boundaries?

**Answer:** Techniques for identifying service boundaries:

1. **Domain-Driven Design (DDD)**
   - Identify bounded contexts
   - Map domain relationships
   - Use event storming to discover boundaries

2. **Data Ownership**
   - Services should own their data
   - Avoid shared databases
   - Look for natural data boundaries

3. **Team Structure (Conway's Law)**
   - Align services with team communication patterns
   - Consider team cognitive load
   - Optimize for team autonomy

4. **Change Velocity**
   - Group code that changes together
   - Separate code with different release cycles
   - Consider deployment frequency

5. **Business Capabilities**
   - Map to business capabilities
   - Consider organizational structure
   - Focus on business value delivery

---

## CAP Theorem & Consistency

### Q11. What is the CAP theorem?

**Answer:** CAP theorem states that in a distributed data store, you can only simultaneously guarantee two out of the following three properties:

1. **Consistency (C)**: Every read receives the most recent write or an error
   - All nodes see the same data at the same time
   - Strong consistency guarantees

2. **Availability (A)**: Every request receives a (non-error) response, without the guarantee that it contains the most recent write
   - System remains operational even during partitions
   - Always responds to requests

3. **Partition Tolerance (P)**: The system continues to operate despite an arbitrary number of messages being dropped or delayed by the network between nodes
   - Essential for distributed systems
   - Must be handled in microservices

**Practical Implications:**
- **CP Systems**: Prioritize consistency over availability (e.g., HBase, MongoDB)
- **AP Systems**: Prioritize availability over consistency (e.g., Cassandra, DynamoDB)
- **CA Systems**: Not truly distributed (e.g., single-node RDBMS)

### Q12. What is eventual consistency?

**Answer:** Eventual consistency is a consistency model where:
- If no new updates are made to a given data item, all accesses will eventually return the last updated value
- The system guarantees that all replicas will converge to the same state
- There is a window of inconsistency where replicas may have different values

**When to use eventual consistency:**
- High availability requirements
- Geographically distributed systems
- Operations that can tolerate temporary inconsistency
- Social media likes, comments, analytics data

**Trade-offs:**
- Lower latency
- Better availability
- Harder to reason about system state
- Complex conflict resolution needed

### Q13. What is strong consistency vs eventual consistency?

**Answer:**

| Aspect | Strong Consistency | Eventual Consistency |
|--------|-------------------|---------------------|
| **Definition** | All nodes see same data simultaneously | Nodes converge over time |
| **Latency** | Higher (requires coordination) | Lower (no coordination needed) |
| **Availability** | May be compromised during partitions | Higher availability |
| **Complexity** | Easier to reason about | Harder to reason about |
| **Use Cases** | Financial transactions, inventory | Social feeds, analytics |
| **Examples** | ACID transactions, etcd | Cassandra, DynamoDB |

**Example:**
- **Strong**: Bank balance must be accurate immediately
- **Eventual**: Number of likes on a post can be slightly off temporarily

### Q14. What is BASE in database theory?

**Answer:** BASE is an alternative to ACID for distributed systems:

- **B**asically **A**vailable: System guarantees availability
- **S**oft state: State may change over time even without input
- **E**ventual consistency: System becomes consistent over time

**Comparison with ACID:**

| Property | ACID | BASE |
|----------|------|------|
| **Atomicity** | Yes | No |
| **Consistency** | Strong | Eventual |
| **Isolation** | Yes | Limited |
| **Durability** | Yes | Yes |
| **Availability** | May be compromised | High |
| **Focus** | Data correctness | Availability and scalability |

**When to use:**
- **ACID**: Financial systems, inventory management, critical transactions
- **BASE**: Social media, analytics, content delivery, high-scale systems

---

## Domain-Driven Design

### Q15. What is Domain-Driven Design (DDD)?

**Answer:** Domain-Driven Design is an approach to software development that:
- Focuses on the core domain and domain logic
- Bases complex designs on a model of the domain
- Initiates a creative collaboration between technical and domain experts

**Key concepts:**
- **Ubiquitous Language**: Shared language used by both developers and domain experts
- **Bounded Contexts**: Distinct boundaries where specific models apply
- **Aggregates**: Clusters of domain objects treated as a unit
- **Domain Events**: Something that happened in the domain that other services need to know about
- **Repositories**: Collections-like interfaces for accessing aggregates

**Why DDD for microservices:**
- Helps identify service boundaries
- Ensures services are aligned with business domains
- Reduces coupling between services
- Improves communication between teams

### Q16. What are aggregates in DDD?

**Answer:** An aggregate is a cluster of domain objects that:
- Can be treated as a single unit
- Has one root object (aggregate root)
- Maintains consistency boundaries
- Is accessed through the aggregate root only

**Example - Order Aggregate:**
```
Order (Aggregate Root)
├── OrderItems (Entities)
│   ├── Product
│   └── Quantity
├── ShippingAddress (Value Object)
└── PaymentInfo (Value Object)
```

**Rules:**
- External objects can only hold references to the aggregate root
- Aggregates guarantee consistency within their boundaries
- Transactions should not span multiple aggregates
- Aggregates should be kept small

### Q17. What is the difference between entities and value objects in DDD?

**Answer:**

| Aspect | Entities | Value Objects |
|--------|----------|---------------|
| **Identity** | Have unique identity | No identity, defined by attributes |
| **Equality** | Based on ID | Based on all attributes |
| **Mutability** | Can change state | Immutable |
| **Lifecycle** | Long-lived | Often short-lived |
| **Examples** | User, Order, Product | Money, Address, DateRange |

**Example:**
```javascript
// Entity - has ID
class User {
  constructor(id, name, email) {
    this.id = id;  // Identity
    this.name = name;
    this.email = email;
  }
  
  equals(other) {
    return this.id === other.id;
  }
}

// Value Object - no ID, immutable
class Money {
  constructor(amount, currency) {
    this.amount = amount;
    this.currency = currency;
  }
  
  equals(other) {
    return this.amount === other.amount && 
           this.currency === other.currency;
  }
}
```

### Q18. What are domain events?

**Answer:** Domain events represent something that happened in the domain that other parts of the system need to know about.

**Characteristics:**
- Named in past tense (e.g., OrderPlaced, PaymentCompleted)
- Contain all relevant information about the event
- Are immutable
- Trigger side effects in other services

**Benefits:**
- Loose coupling between services
- Event-driven architecture
- Better audit trail
- Easy to implement event sourcing

**Example:**
```javascript
// Domain Event
class OrderPlaced {
  constructor(orderId, customerId, items, totalAmount, timestamp) {
    this.eventType = 'OrderPlaced';
    this.orderId = orderId;
    this.customerId = customerId;
    this.items = items;
    this.totalAmount = totalAmount;
    this.timestamp = timestamp;
  }
}

// Publishing event
const event = new OrderPlaced(orderId, customerId, items, total, Date.now());
eventBus.publish(event);
```

**Use Cases:**
- Order placed → Inventory service reserves items
- Payment completed → Order service updates status
- User registered → Notification service sends welcome email