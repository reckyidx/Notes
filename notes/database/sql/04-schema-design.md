# SQL Schema Design

## Advanced Level Interview Questions

### Q: Normalization vs Denormalization - when to use each?

**Answer:**

**Normalization (1NF, 2NF, 3NF)**: 
- Eliminates data redundancy
- Ensures data integrity
- Best for OLTP (transactional) systems
- Example: E-commerce order system with customer, product, order tables

**Denormalization**:
- Intentionally adds redundancy
- Improves read performance
- Best for OLAP (analytical) systems
- Example: Data warehouse with pre-aggregated metrics

---

## Normalization Examples

### 1NF (First Normal Form) - No Repeating Groups
```sql
-- Bad: Repeating columns
CREATE TABLE orders_bad (
    order_id INT,
    customer_id INT,
    product1_name VARCHAR,
    product1_quantity INT,
    product2_name VARCHAR,
    product2_quantity INT
);

-- Good: Proper normalization
CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    name VARCHAR,
    email VARCHAR
);

CREATE TABLE products (
    product_id INT PRIMARY KEY,
    name VARCHAR,
    price DECIMAL
);

CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    order_date DATE,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    quantity INT,
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

### 2NF (Second Normal Form) - No Partial Dependencies
```sql
-- Bad: Product attributes depend on product_id, not order_id
CREATE TABLE order_items_bad (
    order_id INT,
    product_id INT,
    product_name VARCHAR,  -- Depends only on product_id
    product_price DECIMAL,  -- Depends only on product_id
    quantity INT
);

-- Good: Separate product table
CREATE TABLE products (
    product_id INT PRIMARY KEY,
    name VARCHAR,
    price DECIMAL
);

CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    quantity INT,
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

### 3NF (Third Normal Form) - No Transitive Dependencies
```sql
-- Bad: Non-key attributes depend on other non-key attributes
CREATE TABLE orders_bad (
    order_id INT PRIMARY KEY,
    customer_id INT,
    customer_name VARCHAR,  -- Depends on customer_id, not order_id
    customer_email VARCHAR,  -- Depends on customer_id, not order_id
    order_date DATE
);

-- Good: Normalize customer data
CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    name VARCHAR,
    email VARCHAR
);

CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    order_date DATE,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);
```

---

## Denormalization Examples

### Read Performance Optimization
```sql
-- Denormalized for read performance
CREATE TABLE products_with_stats (
    product_id INT PRIMARY KEY,
    name VARCHAR,
    price DECIMAL,
    total_sales INT,           -- Denormalized
    total_revenue DECIMAL,     -- Denormalized
    average_rating DECIMAL,    -- Denormalized
    last_updated TIMESTAMP
);

-- Update statistics periodically
CREATE OR REPLACE FUNCTION update_product_stats(product_id INT)
RETURNS VOID AS $$
BEGIN
    UPDATE products_with_stats
    SET total_sales = (
            SELECT COALESCE(SUM(quantity), 0)
            FROM order_items
            WHERE product_id = $1
        ),
        total_revenue = (
            SELECT COALESCE(SUM(quantity * price), 0)
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            WHERE oi.product_id = $1
        ),
        average_rating = (
            SELECT AVG(rating)
            FROM reviews
            WHERE product_id = $1
        ),
        last_updated = NOW()
    WHERE product_id = $1;
END;
$$ LANGUAGE plpgsql;
```

### Materialized Views
```sql
-- Materialized view for fast reporting
CREATE MATERIALIZED VIEW order_summary AS
SELECT 
    DATE_TRUNC('month', order_date) as month,
    COUNT(*) as total_orders,
    SUM(order_total) as total_revenue,
    AVG(order_total) as avg_order_value
FROM orders
GROUP BY DATE_TRUNC('month', order_date);

-- Refresh materialized view
REFRESH MATERIALIZED VIEW order_summary;

-- Query materialized view (very fast)
SELECT * FROM order_summary ORDER BY month DESC;
```

---

## Hybrid Approach

### Eventual Consistency Pattern
```sql
-- Transactional tables (normalized)
CREATE TABLE products (
    product_id INT PRIMARY KEY,
    name VARCHAR,
    price DECIMAL,
    stock INT
);

CREATE TABLE product_stats (
    product_id INT PRIMARY KEY,
    view_count INT,
    purchase_count INT,
    last_updated TIMESTAMP,
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Update stats asynchronously
CREATE OR REPLACE FUNCTION increment_product_views(product_id INT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO product_stats (product_id, view_count, purchase_count, last_updated)
    VALUES (product_id, 1, 0, NOW())
    ON CONFLICT (product_id)
    DO UPDATE SET 
        view_count = product_stats.view_count + 1,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## Key Takeaways

1. **Normalize for writes**: Transactional systems need data integrity
2. **Denormalize for reads**: Analytical workloads benefit from performance
3. **Use materialized views**: Balance normalization and performance
4. **Consider hybrid approach**: Normalize source, denormalize for queries
5. **Trade-offs are inevitable**: Choose based on your use case

---

## Horizontal Partitioning (Sharding) vs Normalization

### What's the Difference?

**Normalization**: Splits tables **vertically** (by columns) based on functional dependencies to eliminate redundancy

**Horizontal Partitioning**: Splits tables **horizontally** (by rows) based on a partitioning key to improve performance and scalability

| Aspect | Normalization | Horizontal Partitioning |
|--------|--------------|-------------------------|
| **Direction** | Vertical (columns) | Horizontal (rows) |
| **Purpose** | Data integrity | Performance & scalability |
| **Schema** | Different tables with different columns | Same schema, different rows |
| **Relationship** | Foreign keys connect tables | Rows distributed across partitions |
| **Read Performance** | Slower (requires JOINs) | Faster (less data to scan) |
| **Write Performance** | Better (smaller tables) | Distributed across partitions |

### Horizontal Partitioning Examples

#### Range Partitioning (by Date)
```sql
-- Partition orders by year
CREATE TABLE orders (
    order_id INT,
    customer_id INT,
    order_date DATE,
    total_amount DECIMAL,
    PRIMARY KEY (order_id, order_date)
) PARTITION BY RANGE (order_date);

-- Create partitions for each year
CREATE TABLE orders_2022 PARTITION OF orders
    FOR VALUES FROM ('2022-01-01') TO ('2023-01-01');

CREATE TABLE orders_2023 PARTITION OF orders
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE orders_2024 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Query automatically hits correct partition
SELECT * FROM orders WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31';
-- Only scans orders_2024 partition!
```

#### List Partitioning (by Region)
```sql
-- Partition orders by geographic region
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    region VARCHAR(20),
    order_date DATE,
    total_amount DECIMAL
) PARTITION BY LIST (region);

-- Create regional partitions
CREATE TABLE orders_north PARTITION OF orders
    FOR VALUES IN ('North', 'Northeast', 'Northwest');

CREATE TABLE orders_south PARTITION OF orders
    FOR VALUES IN ('South', 'Southeast', 'Southwest');

CREATE TABLE orders_east PARTITION OF orders
    FOR VALUES IN ('East');

CREATE TABLE orders_west PARTITION OF orders
    FOR VALUES IN ('West');

-- Regional queries are very fast
SELECT * FROM orders WHERE region = 'North';
-- Only scans orders_north partition
```

#### Hash Partitioning
```sql
-- Partition by hash of user_id for even distribution
CREATE TABLE user_activities (
    activity_id INT,
    user_id INT,
    activity_type VARCHAR(50),
    timestamp TIMESTAMP
) PARTITION BY HASH (user_id);

-- Create 4 partitions for even distribution
CREATE TABLE user_activities_0 PARTITION OF user_activities
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);

CREATE TABLE user_activities_1 PARTITION OF user_activities
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);

CREATE TABLE user_activities_2 PARTITION OF user_activities
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);

CREATE TABLE user_activities_3 PARTITION OF user_activities
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- Query for specific user goes to exactly one partition
SELECT * FROM user_activities WHERE user_id = 12345;
```

### Normalization vs Vertical Sharding

**Vertical Sharding** is similar to normalization but with different goals:

| Aspect | Normalization | Vertical Sharding |
|--------|--------------|-------------------|
| **Purpose** | Data integrity | Performance optimization |
| **Basis** | Functional dependencies | Access patterns |
| **Primary Key** | Each table has own PK | Same PK across all shards |
| **Relationships** | Foreign keys | Same PK values |
| **Queries** | JOINs to reconstruct data | Query specific shard |

#### Normalization Example (Split by Dependencies)
```sql
-- Before: Single table with transitive dependency
CREATE TABLE employees_unnormalized (
    employee_id INT PRIMARY KEY,
    name VARCHAR,
    email VARCHAR,
    department_name VARCHAR,
    department_location VARCHAR  -- Depends on department_name, not employee_id
);

-- After: Normalized (split by functional dependencies)
CREATE TABLE departments (
    department_id INT PRIMARY KEY,
    name VARCHAR,
    location VARCHAR
);

CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    name VARCHAR,
    email VARCHAR,
    department_id INT,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);
```

#### Vertical Sharding Example (Split by Access Patterns)
```sql
-- Before: Single table with mixed access patterns
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    username VARCHAR,
    email VARCHAR,
    profile_picture BYTEA,        -- Large BLOB, rarely accessed
    bio TEXT,                      -- Rarely accessed
    login_count INT,               -- Frequently accessed
    last_login TIMESTAMP,          -- Frequently accessed
    device_info JSONB              -- Very rarely accessed
);

-- After: Vertically sharded (split by access frequency)
CREATE TABLE users_core (
    user_id INT PRIMARY KEY,
    username VARCHAR,
    email VARCHAR
);

CREATE TABLE users_profile (
    user_id INT PRIMARY KEY,
    profile_picture BYTEA,
    bio TEXT,
    FOREIGN KEY (user_id) REFERENCES users_core(user_id)
);

CREATE TABLE users_activity (
    user_id INT PRIMARY KEY,
    login_count INT,
    last_login TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users_core(user_id)
);

CREATE TABLE users_analytics (
    user_id INT PRIMARY KEY,
    device_info JSONB,
    FOREIGN KEY (user_id) REFERENCES users_core(user_id)
);

-- Queries hit minimal data
-- Login validation: Only query users_core
SELECT * FROM users_core WHERE username = 'john_doe';

-- Profile page: Query users_core + users_profile
SELECT c.username, c.email, p.bio 
FROM users_core c
JOIN users_profile p ON c.user_id = p.user_id
WHERE c.user_id = 123;

-- Analytics: Query users_core + users_analytics
SELECT c.username, a.device_info
FROM users_core c
JOIN users_analytics a ON c.user_id = a.user_id
WHERE c.user_id = 123;
```

### Combining All Approaches

```sql
-- Normalized schema (integrity)
CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    name VARCHAR,
    email VARCHAR
);

CREATE TABLE products (
    product_id INT PRIMARY KEY,
    name VARCHAR,
    price DECIMAL
);

-- Horizontal partitioning by year (scalability)
CREATE TABLE orders (
    order_id INT,
    customer_id INT,
    order_date DATE,
    total_amount DECIMAL,
    PRIMARY KEY (order_id, order_date)
) PARTITION BY RANGE (order_date);

CREATE TABLE orders_2024 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE orders_2025 PARTITION OF orders
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Vertical sharding for order details (performance)
CREATE TABLE order_items_core (
    order_id INT,
    product_id INT,
    quantity INT,
    PRIMARY KEY (order_id, product_id)
);

CREATE TABLE order_items_analytics (
    order_id INT,
    product_id INT,
    discount_applied DECIMAL,
    coupon_code VARCHAR,
    PRIMARY KEY (order_id, product_id)
);
```

### When to Use Each Approach

**Use Normalization:**
- Default approach for database design
- When data integrity is critical
- For transactional systems (OLTP)
- To prevent update anomalies

**Use Horizontal Partitioning:**
- Tables with millions/billions of rows
- Time-series data
- Geographic distribution needs
- Archive old data efficiently
- Distribute load across servers

**Use Vertical Sharding:**
- Tables with large BLOBs/CLOBs
- Some columns accessed frequently, others rarely
- Want to cache hot data separately
- Need different storage for different data types
- Want to put analytics on cheaper storage

**Real-World Example - E-commerce Platform:**
```
1. Normalize: Customers, Products, Categories (data integrity)
2. Horizontal Partition: Orders by date (scale for millions of orders)
3. Vertical Sharding: 
   - Order core (ID, date, total) - fast access
   - Order analytics (click tracking, referrer) - slow access
   - Product images (BLOB) - separate storage
```

### Summary

```
Single Table
    │
    ├── Normalization (Vertical Split by Dependencies)
    │   └── Goal: Data Integrity
    │
    ├── Horizontal Partitioning (Horizontal Split by Rows)
    │   └── Goal: Scalability & Performance
    │
    └── Vertical Sharding (Vertical Split by Access Patterns)
        └── Goal: Performance Optimization
```

All three techniques can be combined: First normalize for integrity, then partition horizontally for scale, then shard vertically for performance optimization.
