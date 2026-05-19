# Software Development Terminology for Interviews

A comprehensive guide to software development terminology that every backend developer must master for technical interviews.

---

## 📚 Table of Contents

1. [Database Terms](#database-terms)
2. [API Design Terms](#api-design-terms)
3. [Performance Terms](#performance-terms)
4. [Architecture Terms](#architecture-terms)
5. [Messaging & Async Processing Terms](#messaging--async-processing-terms)
6. [Security Terms](#security-terms)
7. [DevOps & Deployment Terms](#devops--deployment-terms)
8. [Reliability & Observability Terms](#reliability--observability-terms)
9. [Advanced Terms for Senior Discussions](#advanced-terms-for-senior-discussions)
10. [Distributed Systems Terms](#distributed-systems-terms)
11. [Code Quality & Design Patterns](#code-quality--design-patterns)
12. [Testing & Quality Assurance](#testing--quality-assurance)
13. [Common Jargon & Interview Lingo](#common-jargon--interview-lingo)
14. [Quick Reference: Before vs After](#quick-reference-before-vs-after)

---

## Database Terms

| Term | Definition | Interview Context |
|------|------------|-------------------|
| **Query** | A request to retrieve or manipulate data from a database | "I optimized the query by adding an index on the frequently filtered column." |
| **Index** | A data structure that improves the speed of data retrieval operations | "We added a composite index on (user_id, created_at) to speed up the dashboard query." |
| **Migration** | A version-controlled script to modify database schema | "We use database migrations to track schema changes across all environments." |
| **Transaction** | A sequence of operations treated as a single logical unit of work | "We wrapped the order creation and inventory update in a transaction to ensure atomicity." |
| **Schema** | The structure definition of a database (tables, columns, relationships) | "We designed the schema to support both OLTP and analytical queries." |
| **ORM (Object-Relational Mapping)** | A technique to convert data between incompatible type systems (OOP & relational DB) | "We use Prisma as our ORM, but for complex queries, we drop down to raw SQL." |
| **Replication** | The process of copying data across multiple database servers | "We use master-slave replication to handle read-heavy workloads." |
| **Sharding** | Horizontal database partitioning across multiple machines | "We implemented sharding based on user_id to distribute the load across 10 database instances." |
| **Normalization** | Organizing data to reduce redundancy and improve integrity | "The database is normalized to 3NF, but we denormalized some tables for read performance." |
| **ACID** | Atomicity, Consistency, Isolation, Durability - properties of reliable transactions | "Our payment system requires ACID compliance, so we chose PostgreSQL over MongoDB." |
| **Connection Pool** | A cache of database connections maintained for reuse | "We configured the connection pool size to 20 to handle concurrent requests efficiently." |
| **N+1 Problem** | A performance issue where N additional queries are executed for N records | "I identified an N+1 problem in the user-orders relationship and fixed it with eager loading." |
| **Deadlock** | A situation where two or more transactions are waiting for each other to release locks | "We implemented a retry mechanism to handle deadlocks in our booking system." |
| **Explain Plan** | A tool to analyze how a database executes a query | "I used EXPLAIN ANALYZE to identify the full table scan and added an index to fix it." |

---

## API Design Terms

| Term | Definition | Interview Context |
|------|------------|-------------------|
| **Endpoint** | A specific URL where an API can be accessed | "We exposed a REST endpoint `/api/v1/users` for user management." |
| **Payload** | The data sent in the body of an API request or response | "The webhook payload contains the order details and customer information." |
| **Status Code** | HTTP codes indicating the result of a request | "We return a 201 Created for successful resource creation and 409 for conflicts." |
| **Authentication vs Authorization** | Authentication verifies identity; Authorization determines access rights | "After authentication via JWT, we check authorization through role-based access control." |
| **Rate Limiting** | Controlling the number of requests a client can make in a time period | "We implemented rate limiting at 100 requests per minute per API key." |
| **Pagination** | Breaking large datasets into smaller, manageable chunks | "The API supports cursor-based pagination for efficient large dataset traversal." |
| **Idempotency** | Operations that produce the same result when executed multiple times | "Payment endpoints are idempotent, so duplicate requests don't charge twice." |
| **Webhook** | User-defined HTTP callbacks triggered by specific events | "We use webhooks to notify third-party systems about order status changes." |
| **REST (Representational State Transfer)** | An architectural style for designing networked applications | "Our API follows REST principles with proper use of HTTP methods and status codes." |
| **GraphQL** | A query language for APIs that allows clients to request exactly what they need | "We chose GraphQL for our mobile app to reduce over-fetching and under-fetching." |
| **HATEOAS** | Hypermedia As The Engine Of Application State - a REST constraint | "Our API includes HATEOAS links so clients can discover available actions dynamically." |
| **Versioning** | Managing API changes over time while maintaining backward compatibility | "We use URL versioning (/v1/, /v2/) and maintain both versions for 6 months." |
| **CORS (Cross-Origin Resource Sharing)** | A mechanism allowing restricted resources on a web page to be requested from another domain | "We configured CORS to allow requests only from our frontend domain." |
| **Request/Response Cycle** | The complete flow of an HTTP request from client to server and back | "We added middleware to log the entire request/response cycle for debugging." |

---

## Performance Terms

| Term | Definition | Interview Context |
|------|------------|-------------------|
| **Latency** | Time taken for a request to travel from source to destination | "We reduced API latency from 500ms to 50ms by implementing caching." |
| **Throughput** | Amount of data processed per unit of time | "Our system handles 10,000 requests per second at peak load." |
| **Bottleneck** | A point of congestion that limits system performance | "The database was the bottleneck, so we implemented read replicas." |
| **Caching** | Storing frequently used data in fast-access memory | "We use Redis as a distributed cache with a TTL of 5 minutes." |
| **Profiling** | Analyzing program behavior to identify performance issues | "I used Node.js profiler to identify the CPU-intensive function causing slowdown." |
| **Memory Leak** | Unreleased memory that gradually reduces available memory | "We discovered a memory leak in the event listener that wasn't properly cleaned up." |
| **Contention** | When multiple processes compete for the same resource | "We saw lock contention on the shared counter, so we switched to an atomic operation." |
| **Optimization** | Making code run faster or use fewer resources | "We optimized the algorithm from O(n²) to O(n log n), reducing processing time by 80%." |
| **Thrashing** | Excessive swapping of data between memory and disk | "The server was thrashing due to insufficient RAM, causing a severe performance drop." |
| **Time Complexity** | How the runtime of an algorithm grows with input size | "This approach has O(1) time complexity for lookups using a hash map." |
| **Space Complexity** | How memory usage grows with input size | "We traded space complexity for time complexity by pre-computing the results." |
| **Cold Start** | Initial delay when a system or function is invoked for the first time | "Lambda cold starts were adding 2-3 seconds, so we implemented provisioned concurrency." |

---

## Architecture Terms

| Term | Definition | Interview Context |
|------|------------|-------------------|
| **Microservices** | An architectural style where applications are built as small, independent services | "We migrated from a monolith to microservices, with each service owning its database." |
| **Monolith** | A single unified codebase handling all application functionality | "We started with a modular monolith and extracted services as scaling requirements emerged." |
| **Load Balancer** | A device that distributes network traffic across multiple servers | "We use Nginx as a load balancer with health checks to route traffic to healthy instances." |
| **Scalability** | The ability of a system to handle increased load by adding resources | "Our architecture supports horizontal scaling - we can add more nodes during peak traffic." |
| **Technical Debt** | Short-term shortcuts that create future rework | "We allocated 20% of each sprint to address technical debt accumulated from the launch crunch." |
| **Service Layer** | A layer containing business logic that coordinates application activities | "The service layer orchestrates calls to the repository and external APIs." |
| **Separation of Concerns** | Dividing a program into distinct sections handling specific concerns | "We follow separation of concerns - controllers handle HTTP, services handle business logic." |
| **Coupling** | The degree of interdependence between software modules | "We aimed for loose coupling between services, communicating through message queues." |
| **Cohesion** | How closely related the responsibilities of a single module are | "We refactored to achieve high cohesion - each module has a single, well-defined purpose." |
| **Abstraction** | Hiding implementation details while exposing functionality | "We created an abstraction layer for storage, allowing us to switch from S3 to GCS easily." |
| **Encapsulation** | Bundling data and methods that operate on that data within a single unit | "The Order class encapsulates all order-related logic and data validation." |
| **Domain-Driven Design (DDD)** | An approach focusing on modeling software based on business domain | "We applied DDD principles, defining bounded contexts for each business capability." |
| **Event Sourcing** | Storing state changes as a sequence of events | "We implemented event sourcing for the audit trail, replaying events to reconstruct state." |
| **CQRS** | Command Query Responsibility Segregation - separating read and write operations | "We use CQRS with separate read and write models for our reporting system." |

---

## Messaging & Async Processing Terms

| Term | Definition | Interview Context |
|------|------------|-------------------|
| **Message Queue** | A system for asynchronous communication between services | "We use RabbitMQ as a message queue to decouple the order service from inventory service." |
| **Dead-Letter Queue (DLQ)** | A queue for messages that cannot be processed | "Poison messages are moved to the DLQ after 3 failed processing attempts." |
| **Event-Driven Architecture** | A pattern where services communicate through events | "We adopted event-driven architecture for real-time notifications across services." |
| **Retry Logic** | The mechanism to reprocess failed operations | "We implemented exponential backoff retry logic with a maximum of 5 attempts." |
| **Circuit Breaker** | A pattern preventing cascading failures in distributed systems | "We use a circuit breaker to fail fast when the downstream service is unavailable." |
| **Backpressure** | A mechanism to handle overwhelming data flow | "Our stream processor applies backpressure when the consumer can't keep up with the producer." |
| **Pub/Sub (Publish-Subscribe)** | A messaging pattern where publishers broadcast to subscribers | "We use Google Pub/Sub for broadcasting inventory updates to multiple consumers." |
| **Consumer Group** | A set of consumers that divide work among themselves | "Kafka consumer groups allow us to parallelize message processing across instances." |
| **At-Least-Once Delivery** | A guarantee that each message is delivered at least once | "We handle at-least-once delivery by making our consumers idempotent." |
| **Exactly-Once Processing** | A guarantee that each message is processed exactly once | "We achieved exactly-once processing using transactional outbox pattern with Kafka." |
| **Message Broker** | Software that enables applications to communicate via messages | "RabbitMQ acts as our message broker, routing messages between producers and consumers." |

---

## Security Terms

| Term | Definition | Interview Context |
|------|------------|-------------------|
| **JWT (JSON Web Token)** | A compact, URL-safe token for securely transmitting information | "We use JWT with short expiration times and refresh tokens for session management." |
| **SQL Injection** | A code injection technique exploiting security vulnerabilities in database queries | "We use parameterized queries to prevent SQL injection attacks." |
| **Encryption at Rest / in Transit** | Protecting data stored on disk / transmitted over network | "All sensitive data is encrypted at rest using AES-256 and in transit using TLS 1.3." |
| **Secrets Management** | Securely storing and accessing sensitive configuration | "We use HashiCorp Vault for secrets management instead of hardcoding credentials." |
| **XSS (Cross-Site Scripting)** | An attack injecting malicious scripts into web pages | "We sanitize all user input and use Content Security Policy to mitigate XSS." |
| **CSRF (Cross-Site Request Forgery)** | An attack tricking users into executing unwanted actions | "We implement CSRF tokens for all state-changing operations." |
| **OAuth 2.0** | An authorization framework enabling third-party access | "We implemented OAuth 2.0 for third-party integrations with proper scope limitations." |
| **RBAC (Role-Based Access Control)** | Access control based on user roles | "Our system uses RBAC with granular permissions for each role." |
| **Zero Trust Architecture** | Security model requiring verification at every access request | "We're moving towards zero trust, validating every request regardless of source." |
| **Principle of Least Privilege** | Giving users only the minimum access necessary | "We apply the principle of least privilege for all service accounts." |
| **Salt** | Random data added to passwords before hashing | "We use bcrypt with a unique salt for each password to prevent rainbow table attacks." |
| **Hashing vs Encryption** | Hashing is one-way; encryption is two-way | "We hash passwords with bcrypt, but encrypt sensitive user data that needs to be retrieved." |

---

## DevOps & Deployment Terms

| Term | Definition | Interview Context |
|------|------------|-------------------|
| **CI/CD** | Continuous Integration and Continuous Deployment | "Our CI/CD pipeline runs tests, builds Docker images, and deploys to production automatically." |
| **Blue/Green Deployment** | Two identical production environments for zero-downtime deployment | "We use blue-green deployment to switch traffic instantly with zero downtime." |
| **Container** | A lightweight, standalone executable package including code and dependencies | "We containerized our application with Docker for consistent environments across stages." |
| **Environment Variable** | Dynamic values that affect process behavior | "Database credentials are injected via environment variables, never hardcoded." |
| **Rollback** | Reverting to a previous version after failed deployment | "Our deployment pipeline supports automatic rollback if health checks fail." |
| **Canary Release** | Rolling out changes to a small subset first | "We use canary releases to test new features with 5% of traffic before full rollout." |
| **Rolling Update** | Gradually replacing instances with new versions | "Kubernetes rolling updates ensure zero downtime during deployments." |
| **Infrastructure as Code (IaC)** | Managing infrastructure through code definitions | "We use Terraform for IaC, version-controlling all infrastructure changes." |
| **GitOps** | Using Git as single source of truth for infrastructure | "ArgoCD implements GitOps, automatically syncing cluster state with our Git repository." |
| **Hotfix** | Urgent fix applied directly to production | "We followed the hotfix workflow: fix in release branch, merge to main and release." |
| **Configuration Drift** | Inconsistencies between environments over time | "We eliminated configuration drift by using IaC and immutable infrastructure." |
| **Orchestration** | Automated coordination of multiple services | "Kubernetes handles orchestration - scheduling, scaling, and managing containers." |

---

## Reliability & Observability Terms

| Term | Definition | Interview Context |
|------|------------|-------------------|
| **SLA (Service Level Agreement)** | Contractual commitment for service availability | "Our SLA guarantees 99.9% uptime, measured monthly." |
| **SLO (Service Level Objective)** | Target level for service reliability | "We set SLOs at 99.95% availability and track this with error budget burn rate." |
| **SLI (Service Level Indicator)** | Metric used to measure service level | "Our SLI is the percentage of successful requests within the latency threshold." |
| **Observability** | Ability to understand internal state from external outputs | "Our observability stack includes Prometheus for metrics, Loki for logs, and Tempo for traces." |
| **Graceful Degradation** | Maintaining partial functionality when components fail | "When the recommendation service is down, we gracefully degrade to showing popular items." |
| **Post-Mortem** | A document analyzing an incident and its resolution | "After every incident, we conduct a blameless post-mortem to identify root causes." |
| **MTTR (Mean Time to Recovery)** | Average time to restore service after an incident | "We reduced MTTR from 2 hours to 15 minutes by implementing automated recovery." |
| **MTBF (Mean Time Between Failures)** | Average time between system failures | "We track MTBF to measure system reliability improvements." |
| **Error Budget** | Allowed amount of unreliability within an SLO | "We've consumed 80% of our error budget this month, so we're freezing new features." |
| **Runbook** | Documented procedures for operations | "Every alert links to a runbook with step-by-step remediation instructions." |
| **Alert Fatigue** | Desensitization due to too many alerts | "We reduced alert fatigue by consolidating alerts and setting meaningful thresholds." |
| **Health Check** | An endpoint or mechanism to verify service health | "Kubernetes uses our /health endpoint to determine if a pod should receive traffic." |

---

## Advanced Terms for Senior Discussions

| Term | Definition | Interview Context |
|------|------------|-------------------|
| **Eventual Consistency** | System becomes consistent over time if no updates occur | "We chose eventual consistency for the shopping cart - a brief inconsistency is acceptable." |
| **CAP Theorem** | Trade-off between Consistency, Availability, Partition tolerance | "According to CAP theorem, we chose AP for our CDN and CP for our payment system." |
| **Feature Flag** | A toggle to enable/disable features without deployment | "We use feature flags for canary releases and to quickly disable problematic features." |
| **Idempotent Consumer** | A consumer that can safely process the same message multiple times | "We designed idempotent consumers using message IDs to track processed messages." |
| **Saga Pattern** | Managing distributed transactions through a sequence of local transactions | "We implemented the saga pattern with compensation actions for our booking workflow." |
| **Outbox Pattern** | Ensuring reliable event publishing alongside database updates | "The outbox pattern guarantees we don't lose events even if the message broker is down." |
| **Consistent Hashing** | A technique for distributing data/requests across servers | "We use consistent hashing for cache distribution, minimizing rebalancing when nodes change." |
| **Bloom Filter** | A space-efficient probabilistic data structure for set membership | "We use a Bloom filter to check if a URL exists in our crawler's visited set." |
| **Leader Election** | The process of designating a single node as the coordinator | "We use etcd for leader election among our scheduler instances." |
| **Vector Clock** | A data structure for capturing causality in distributed systems | "Vector clocks help us detect and resolve conflicts in our distributed database." |
| **Split Brain** | A scenario where a cluster has multiple leaders | "We prevent split brain by requiring a quorum for leader election." |

---

## Distributed Systems Terms

| Term | Definition | Interview Context |
|------|------------|-------------------|
| **Consistency** | All nodes see the same data at the same time | "We chose strong consistency for the inventory service to prevent overselling." |
| **Partition Tolerance** | System continues to operate despite network partitions | "In distributed systems, network partitions are inevitable, so we must handle them gracefully." |
| **Replication Lag** | Delay between writing to primary and replicating to secondaries | "We account for replication lag by reading from the primary for critical operations." |
| **Quorum** | Minimum number of nodes required to agree on an operation | "We require a quorum of 3 out of 5 nodes for write operations." |
| **Heartbeat** | A periodic signal to indicate a node is still active | "Nodes send heartbeats every 5 seconds; missing 3 heartbeats triggers failover." |
| **Gossip Protocol** | A method for spreading information in distributed systems | "Cassandra uses gossip protocol for peer-to-peer cluster membership." |
| **Two-Phase Commit (2PC)** | A protocol for distributed transaction commit | "2PC is blocking, so we use Saga pattern for long-running distributed transactions." |
| **Service Mesh** | Infrastructure layer for service-to-service communication | "Istio service mesh handles mutual TLS, traffic management, and observability." |
| **Sidecar** | Helper container running alongside main application | "We use the Envoy sidecar proxy for traffic routing and mTLS." |
| **Write-Ahead Log (WAL)** | Logging changes before applying them | "PostgreSQL uses WAL for crash recovery and replication." |

---

## Code Quality & Design Patterns

| Term | Definition | Interview Context |
|------|------------|-------------------|
| **SOLID** | Five principles for maintainable OOP design (SRP, OCP, LSP, ISP, DIP) | "We applied SOLID principles, making the codebase more maintainable and testable." |
| **DRY (Don't Repeat Yourself)** | Avoid duplicating code | "We extracted common validation logic into a shared utility, following DRY." |
| **KISS (Keep It Simple, Stupid)** | Simplicity should be a key goal | "We chose the simpler solution - it's easier to maintain and debug." |
| **YAGNI (You Aren't Gonna Need It)** | Don't add functionality until needed | "We avoided premature optimization - YAGNI reminded us not to overengineer." |
| **Single Source of Truth** | Centralized data management | "The database is the single source of truth; cache is for performance." |
| **Immutability** | Data that cannot be changed after creation | "We use immutable data structures to prevent unexpected mutations." |
| **Side Effect** | Modification of state outside function scope | "Pure functions have no side effects, making them easier to test and reason about." |
| **Dependency Injection** | A technique where dependencies are provided rather than created | "We use dependency injection for better testability and loose coupling." |
| **Factory Pattern** | A creational pattern for object creation | "We implemented the factory pattern for creating different payment processors." |
| **Strategy Pattern** | A behavioral pattern for selecting algorithms at runtime | "The strategy pattern lets us switch sorting algorithms based on data size." |
| **Observer Pattern** | A pattern where objects subscribe to events | "We use the observer pattern for event handling in our notification system." |
| **Singleton** | A pattern ensuring only one instance exists | "We use dependency injection instead of singletons for better testability." |

---

## Testing & Quality Assurance

| Term | Definition | Interview Context |
|------|------------|-------------------|
| **Unit Test** | Testing individual components in isolation | "We have 80% code coverage with unit tests for business logic." |
| **Integration Test** | Testing interactions between components | "Integration tests verify the service correctly interacts with the database." |
| **End-to-End (E2E) Test** | Testing complete user flows | "E2E tests cover critical paths like user registration and checkout." |
| **Regression** | A bug that reappears after previously working correctly | "We added a regression test to ensure this bug never resurfaces." |
| **Edge Case** | Situation occurring only at extreme parameters | "We handle edge cases like empty inputs, null values, and maximum limits." |
| **Corner Case** | Problem that occurs outside normal operating parameters | "Corner cases like simultaneous requests from the same user required special handling." |
| **Smoke Test** | Basic tests to verify critical functionality works | "Smoke tests run first in our pipeline to catch major issues early." |
| **Sanity Test** | Quick evaluation to determine if further testing is worthwhile | "After hotfix deployment, we run sanity tests before announcing the fix." |
| **Flaky Test** | Test that sometimes passes and sometimes fails | "We track flaky tests in a quarantine suite and prioritize fixing them." |
| **Mock** | Simulated object for testing purposes | "We mock the database layer to test service logic in isolation." |
| **Stub** | Minimal implementation for testing | "The stub returns predefined responses for testing edge cases." |
| **Code Coverage** | Percentage of code executed during testing | "We aim for 80% code coverage but focus on testing critical paths thoroughly." |
| **TDD (Test-Driven Development)** | Writing tests before implementation | "We practice TDD for core business logic, ensuring testability." |
| **Test Double** | Any object that stands in for a real dependency | "We use test doubles - mocks, stubs, and spies - for unit testing." |

---

## Common Jargon & Interview Lingo

| Term | Definition | Interview Context |
|------|------------|-------------------|
| **Hack** | Quick, often inelegant solution to a problem | "I wrote a hack to unblock the release, but we properly fixed it in the next sprint." |
| **Workaround** | Alternative method to bypass a problem | "We implemented a workaround while waiting for the vendor's bug fix." |
| **Glue Code** | Code connecting incompatible components | "We wrote glue code to integrate the legacy SOAP service with our REST API." |
| **Shim** | Small library intercepting calls to adapt behavior | "We created a shim to maintain backward compatibility with the old API." |
| **Wrapper** | Code that encapsulates another component | "We built a wrapper around the payment SDK to standardize error handling." |
| **Magic** | Code that works without clear explanation | "There's too much magic in this framework - we can't debug it when it fails." |
| **Leaky Abstraction** | Abstraction exposing underlying complexity | "The ORM is a leaky abstraction - we still need to understand SQL for complex queries." |
| **Gold Plating** | Adding unnecessary features beyond requirements | "We avoided gold plating by strictly following the acceptance criteria." |
| **Analysis Paralysis** | Overthinking leading to no progress | "We time-boxed the design discussion to avoid analysis paralysis." |
| **Rubber Ducking** | Explaining problem aloud to find solution | "I solved it by rubber ducking - explaining the code line by line revealed the bug." |
| **Dogfooding** | Using your own product internally | "We dogfood our API internally before releasing to external customers." |
| **Boilerplate** | Repetitive code that adds little value | "We created code generators to reduce boilerplate in our CRUD services." |
| **Spaghetti Code** | Code with complex, tangled structure | "The legacy codebase was spaghetti - we refactored it into clean modules." |
| **Dead Code** | Code that is never executed | "We used static analysis to identify and remove dead code." |
| **Code Smell** | Surface indication of deeper problems in code | "Long methods and large classes are code smells indicating need for refactoring." |
| **Technical Spike** | Time-boxed investigation to reduce uncertainty | "We did a technical spike to evaluate which message queue would work best." |
| **Boiling the Ocean** | Trying to solve too many problems at once | "Let's not boil the ocean - we'll tackle this in phases." |

---

## Quick Reference: Before vs After

How Backend Engineers Actually Speak in Interviews:

| Before (Junior) | After (Senior) |
|-----------------|----------------|
| "It's slow" | "The latency is 2 seconds, primarily due to N+1 queries" |
| "It crashed" | "The service experienced a cascade failure due to missing circuit breakers" |
| "We should add more servers" | "We need horizontal scaling with auto-scaling based on CPU utilization" |
| "The data is sometimes wrong" | "We have eventual consistency with a replication lag of ~100ms" |
| "It handles a lot of traffic" | "We handle 10,000 requests per second with 99.9th percentile latency under 100ms" |
| "We test the code" | "We have 85% code coverage with unit, integration, and E2E tests in our CI pipeline" |
| "It's not working" | "The service is returning 500 errors due to a database connection pool exhaustion" |
| "We'll fix it later" | "We've documented this as technical debt and scheduled it for Q2 with proper estimates" |
| "The server can't handle it" | "We've hit a vertical scaling limit and need to implement horizontal scaling" |
| "Users are complaining" | "Our SLO dropped below 99.9%, triggering an incident response" |
| "Let's rewrite everything" | "We'll use the strangler fig pattern to incrementally migrate to the new architecture" |

---

## Scenario-Based Practice

### Scenario 1: Handling High Traffic
**Interviewer:** "How would you handle a sudden spike in traffic?"

**Strong Answer:** "I'd implement a multi-layered approach. First, I'd ensure we have auto-scaling configured based on CPU and memory metrics. I'd add a load balancer with health checks to distribute traffic. For the database layer, I'd implement read replicas to handle read-heavy workloads. I'd also add caching with Redis for frequently accessed data and implement rate limiting to prevent abuse. Finally, I'd use a CDN for static assets and consider implementing circuit breakers to prevent cascade failures."

### Scenario 2: Database Performance Issues
**Interviewer:** "Your API is slow. How do you debug it?"

**Strong Answer:** "I'd start by measuring - using APM tools to identify the bottleneck. If it's database-related, I'd run EXPLAIN ANALYZE on slow queries to check for full table scans or missing indexes. I'd look for N+1 query problems and check connection pool metrics. Based on findings, I'd add appropriate indexes, implement query optimization, add caching for frequently queried data, or implement read replicas for read-heavy operations."

### Scenario 3: System Design Discussion
**Interviewer:** "Design a URL shortener like bit.ly"

**Strong Answer:** "Let me break this down. For the core functionality, I'd use a unique ID generator - either a distributed system like Snowflake or a database sequence with base62 encoding. For storage, a NoSQL database like DynamoDB for high write throughput, with the short code as the partition key. I'd implement caching for frequently accessed URLs. For analytics, I'd use an event-driven architecture with a message queue to decouple click tracking from the main service. For reliability, I'd deploy across multiple availability zones with health checks and circuit breakers."

### Scenario 4: Debugging Production Issues
**Interviewer:** "How do you handle a production incident?"

**Strong Answer:** "First, I'd assess the severity and impact. I'd check our observability dashboards for error rates, latency spikes, and resource utilization. I'd review recent deployments and configuration changes. If there's a clear rollback path, I'd execute it immediately. Otherwise, I'd use distributed tracing to identify the failing component. I'd implement a fix, deploy through our CI/CD pipeline, and verify recovery. Post-incident, I'd conduct a blameless post-mortem to identify root causes and prevent recurrence."

---

## Key Terms to Remember for Interviews

### When Discussing Performance
- Latency, Throughput, Bottleneck
- Caching strategies (write-through, write-back, write-around)
- Connection pooling, Thread pooling
- Time/Space complexity trade-offs

### When Discussing Reliability
- SLA/SLO/SLI metrics
- Circuit Breaker, Retry with exponential backoff
- Graceful degradation, Failover strategies
- MTTR, MTBF, Error Budget

### When Discussing Architecture
- Microservices vs Monolith trade-offs
- CAP Theorem, Eventual Consistency
- Synchronous vs Asynchronous communication
- Coupling (tight vs loose), Cohesion

### When Discussing Security
- Authentication vs Authorization
- JWT, OAuth 2.0, RBAC
- Encryption (at rest, in transit)
- Common vulnerabilities (SQL Injection, XSS, CSRF)

---

## Final Tips for Interview Success

1. **Be Specific with Numbers**: Instead of "improved performance", say "reduced latency from 2s to 200ms"

2. **Use Industry Terminology**: Replace "fixed the bug" with "identified root cause through observability and implemented a fix with proper test coverage"

3. **Show System Thinking**: Connect individual decisions to broader system goals (scalability, maintainability, cost)

4. **Acknowledge Trade-offs**: Every architectural decision has pros and cons - demonstrate awareness

5. **Quantify Impact**: Use metrics like throughput, latency percentiles, error rates, cost savings

---

*This document covers essential software development terminology for backend interviews. Review regularly and practice using these terms in context during mock interviews.*
