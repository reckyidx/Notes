# Database Interview Guide

Comprehensive interview preparation notes for SQL, NoSQL, ORM, and senior-level database topics.

## Table of Contents

- [SQL (Advanced Level)](#sql-advanced-level)
- [NoSQL (Advanced Level)](#nosql-advanced-level)
- [ORM (Advanced Level)](#orm-advanced-level)
- [Senior Level: Sharding & Replication]((#senior-level-sharding--replication)
- [Advanced Topics](#advanced-topics)
- [Node.js Examples]((#nodejs-examples)

---

## SQL (Advanced Level)

### Query Optimization
**File:** [`sql/01-query-optimization.md`](sql/01-query-optimization.md)

Topics covered:
- Query optimization techniques
- Index types and when to use each
- EXPLAIN ANALYZE usage
- Index best practices
- Covering indexes

### Transaction Management
**File:** [`sql/02-transactions.md`](sql/02-transactions.md)

Topics covered:
- ACID properties
- Isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable)
- Transaction examples
- Deadlock handling
- Retry logic with exponential backoff

### Window Functions
**File:** [`sql/03-window-functions.md`](sql/03-window-functions.md)

Topics covered:
- Running totals
- Ranking with partitions
- Moving averages
- Year-over-year comparisons
- Percentile calculations
- Top N per group patterns

### Schema Design
**File:** [`sql/04-schema-design.md`](sql/04-schema-design.md)

Topics covered:
- Normalization (1NF, 2NF, 3NF)
- Denormalization strategies
- Materialized views
- Hybrid approaches
- Eventual consistency patterns

---

## NoSQL (Advanced Level)

### Database Types
**File:** [`nosql/01-database-types.md`](nosql/01-database-types.md)

Topics covered:
- Document Stores (MongoDB, CouchDB)
- Key-Value Stores (Redis, DynamoDB)
- Column-Family Stores (Cassandra, HBase)
- Graph Databases (Neo4j)
- Use cases and examples for each type

### CAP Theorem
- Consistency, Availability, Partition Tolerance trade-offs
- CP vs AP system examples
- BASE theorem for AP systems

### Eventual Consistency
- Read repair strategies
- Version vectors and CRDTs
- Conflict resolution patterns

---

## ORM (Advanced Level)

*Note: ORM topics are integrated throughout the SQL examples and Node.js sections.*

### Key Topics Covered:
- Advantages and disadvantages of ORMs
- N+1 query problem and solutions
- First-level and second-level caching
- Dirty checking mechanisms
- Transaction handling with ORMs
- Eager vs lazy loading strategies

---

## Senior Level: Sharding & Replication

*Note: Comprehensive sharding and replication content is in the main guide file.*

### Sharding Strategies
- Range-based sharding
- Hash-based sharding
- Directory-based sharding
- Geographic sharding
- Consistent hashing implementation

### Replication Topologies
- Master-Slave (Primary-Replica)
- Master-Master (Multi-Master)
- Ring replication
- Star replication

### Replication Types
- Synchronous replication
- Asynchronous replication
- Semi-synchronous replication

### Challenges & Solutions
- Cross-shard queries
- Rebalancing strategies
- Transactions across shards
- Global unique IDs (UUID, Snowflake)
- Handling replication lag

---

## Advanced Topics

*Note: Advanced topics are covered in the main guide file.*

### Connection Pooling
- Configuration parameters
- Pool lifecycle
- Monitoring and health checks

### Database Indexing
- Leftmost prefix principle
- Covering indexes
- Index design best practices

### Deadlocks
- Detection methods
- Prevention strategies (6 approaches)
- Monitoring and alerting

### Database Migrations
- Expand-contract pattern
- Blue-green deployment
- Phased migration
- Online schema change tools

### Query Execution Plans
- Reading EXPLAIN output
- Common plan node types
- Optimization checklist

---

## Node.js Examples

### Database Operations
**File:** [`nodejs/01-database-operations.md`](nodejs/01-database-operations.md)

Topics covered:
- Basic CRUD with PostgreSQL (pg driver)
- Using ORM (Sequelize)
- Transaction handling
- **Handling Concurrent Updates**:
  - Optimistic locking with version fields
  - Pessimistic locking with row-level locks
  - Database-level constraints
  - Advisory locks (PostgreSQL)
  - Retry with exponential backoff
  - Atomic operations
  - Event sourcing pattern

---

## How to Use This Guide

1. **Start with SQL Basics**: Review the SQL section for fundamentals
2. **Move to NoSQL**: Understand different database types and use cases
3. **Study ORM**: Learn ORM concepts and patterns
4. **Master Senior Topics**: Focus on sharding, replication, and distributed systems
5. **Practice with Code**: Implement the Node.js examples with concurrent updates

## Interview Preparation Tips

1. **Understand Trade-offs**: Every decision involves trade-offs (CP vs AP, normalization vs denormalization)
2. **Know Your Tools**: Understand when to use SQL vs NoSQL, ORM vs raw queries
3. **Practice Code**: Implement the examples, especially concurrent update handling
4. **Think Distributed**: Consider scalability, consistency, and availability
5. **Know the "Why"**: Don't just memorize patterns, understand why they work

## Recommended Study Order

1. SQL Query Optimization → 1-2 days
2. SQL Transactions & Window Functions → 1 day
3. NoSQL Database Types → 1 day
4. Node.js Database Operations & Concurrency → 2-3 days
5. Sharding & Replication → 2-3 days
6. Advanced Topics → 1-2 days

## Key Concepts to Master

### Must Know
- ACID properties
- Indexing strategies
- Transaction isolation levels
- CAP theorem
- Optimistic vs pessimistic locking
- Connection pooling
- Deadlock prevention

### Should Know
- Window functions
- Materialized views
- Event sourcing
- Consistent hashing
- Replication topologies
- Eventual consistency

### Nice to Have
- Graph databases
- Column-family stores
- Online schema migrations
- Query execution plans
- Advisory locks

---

## Additional Resources

- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **MongoDB University**: https://university.mongodb.com/
- **Redis Documentation**: https://redis.io/documentation
- **Sequelize ORM**: https://sequelize.org/
- **Database Internals**: "Designing Data-Intensive Applications" by Martin Kleppmann

---

## Contributing

This guide is a work in progress. Feel free to add examples, clarify concepts, or fix errors.

---

**Happy Interviewing! 📚**