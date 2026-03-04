# NoSQL Database Types

## Advanced Level Interview Questions

### Q: Explain the four types of NoSQL databases with use cases.

**Answer:**

---

## 1. Document Stores

**Examples**: MongoDB, CouchDB, DocumentDB

**Characteristics:**
- Store semi-structured data (JSON, BSON)
- Flexible schema, nested documents
- Rich query capabilities

**Use cases**: Content management, catalogs, user profiles, product catalogs

```javascript
// MongoDB Example
db.users.insertOne({
  name: "John Doe",
  email: "john@example.com",
  address: {
    street: "123 Main St",
    city: "New York",
    country: "USA"
  },
  tags: ["vip", "premium"]
});

// Query nested documents
db.users.find({"address.city": "New York"});

// Array queries
db.users.find({tags: "premium"});
```

---

## 2. Key-Value Stores

**Examples**: Redis, DynamoDB, Memcached

**Characteristics:**
- Simple key-value pairs
- Fast in-memory operations
- Low latency

**Use cases**: Caching, session storage, real-time bidding, leaderboards

```javascript
// Redis Example with Node.js
const redis = require('redis');
const client = redis.createClient();

// Set value
await client.set('user:123', JSON.stringify({
  id: 123,
  name: 'John',
  lastLogin: new Date()
}));

// Get value
const user = await client.get('user:123');
console.log(JSON.parse(user));

// Set with expiration
await client.set('session:abc123', JSON.stringify(sessionData), 'EX', 3600);

// Increment counter (leaderboards)
await client.incr('leaderboard:user:123:score');
await client.zadd('global_leaderboard', 1500, 'user:123');

// Get top 10
const topUsers = await client.zrevrange('global_leaderboard', 0, 9);
```

---

## 3. Column-Family Stores

**Examples**: Cassandra, HBase, Bigtable

**Characteristics:**
- Wide-column storage with dynamic columns
- Write-optimized, distributed
- Linear scalability

**Use cases**: Time series data, IoT data, log storage, metrics

```cql
-- Cassandra Example
CREATE TABLE time_series (
    sensor_id UUID,
    timestamp TIMESTAMP,
    temperature DOUBLE,
    humidity DOUBLE,
    pressure DOUBLE,
    PRIMARY KEY ((sensor_id), timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC);

-- Insert data
INSERT INTO time_series (sensor_id, timestamp, temperature, humidity)
VALUES (uuid(), '2024-01-15 10:00:00', 23.5, 65.2);

-- Query recent data
SELECT * FROM time_series 
WHERE sensor_id = 123e4567-e89b-12d3-a456-426614174000
  AND timestamp > '2024-01-15 00:00:00'
LIMIT 100;
```

```java
// HBase Java Example
Connection connection = ConnectionFactory.createConnection(config);
Table table = connection.getTable(TableName.valueOf("metrics"));

Put put = new Put(Bytes.toBytes("sensor_123_20240115"));
put.addColumn(Bytes.toBytes("cf"), Bytes.toBytes("temperature"), Bytes.toBytes(23.5));
put.addColumn(Bytes.toBytes("cf"), Bytes.toBytes("humidity"), Bytes.toBytes(65.2));
table.put(put);

// Scan data
Scan scan = new Scan();
scan.setRowPrefixFilter(Bytes.toBytes("sensor_123"));
ResultScanner scanner = table.getScanner(scan);
for (Result result : scanner) {
    byte[] temp = result.getValue(Bytes.toBytes("cf"), Bytes.toBytes("temperature"));
    System.out.println("Temperature: " + Bytes.toDouble(temp));
}
```

---

## 4. Graph Databases

**Examples**: Neo4j, Amazon Neptune, ArangoDB

**Characteristics:**
- Store nodes and relationships
- Optimized for complex joins and traversals
- Perfect for connected data

**Use cases**: Social networks, fraud detection, recommendation engines, knowledge graphs

```cypher
// Neo4j Cypher Example

// Create nodes and relationships
CREATE (john:Person {name: 'John', age: 30})
CREATE (jane:Person {name: 'Jane', age: 25})
CREATE (bob:Person {name: 'Bob', age: 35})

CREATE (john)-[:FRIENDS_WITH]->(jane)
CREATE (jane)-[:FRIENDS_WITH]->(bob)
CREATE (john)-[:WORKS_WITH]->(bob);

// Find friends of friends
MATCH (me:Person {name: 'John'})-[:FRIENDS_WITH]->(friend)-[:FRIENDS_WITH]->(fof)
RETURN fof.name AS friends_of_friends;

// Find shortest path
MATCH path = shortestPath(
  (start:Person {name: 'John'})-[*]-(end:Person {name: 'Bob'})
)
RETURN path;

// Recommend products based on graph
MATCH (user:User {id: 123})-[:PURCHASED]->(:Product)-[:RELATED_TO]->(recommended:Product)
WHERE NOT (user)-[:PURCHASED]->(recommended)
RETURN recommended.name, COUNT(*) AS score
ORDER BY score DESC
LIMIT 10;
```

```javascript
// Neo4j JavaScript Driver
const neo4j = require('neo4j-driver');
const driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('user', 'pass'));

const session = driver.session();
const result = await session.run(
  'MATCH (u:User {id: $userId})-[:FRIENDS_WITH]->(friend:User) RETURN friend.name',
  { userId: 123 }
);

for (const record of result.records) {
  console.log(record.get('friend.name'));
}
```

---

## Comparison Table

| Type | Schema | Best For | Query Pattern | Scaling |
|------|--------|----------|---------------|---------|
| Document | Flexible | Nested data | Document queries | Horizontal |
| Key-Value | None | Simple lookups | Key-based operations | Horizontal |
| Column-Family | Dynamic | Time series | Wide row scans | Horizontal |
| Graph | Schemaful | Connected data | Traversals | Limited |

---

## Key Takeaways

1. **Document stores**: Best for hierarchical, nested data
2. **Key-Value stores**: Fastest for simple key lookups
3. **Column-Family stores**: Excellent for write-heavy workloads
4. **Graph databases**: Ideal for relationships and connections
5. **Choose based on data model**, not just performance