# SQL Query Optimization

## Advanced Level Interview Questions

### Q: How would you optimize a slow SQL query? What steps do you take?

**Answer:**
- Analyze the query execution plan (EXPLAIN)
- Check proper indexing - create indexes on frequently queried columns
- Review JOIN operations - ensure proper join order
- Eliminate unnecessary columns in SELECT
- Use WHERE before HAVING for filtering
- Avoid SELECT * - specify only needed columns
- Use EXISTS instead of IN for subqueries
- Implement query caching where appropriate
- Consider denormalization for read-heavy workloads
- Use partitioning for large tables

### Q: Explain different types of indexes and when to use each.

**Answer:**
- **B-Tree Index**: Default for most databases, good for equality and range queries
- **Hash Index**: Best for equality operations only, faster than B-tree
- **Bitmap Index**: Ideal for low-cardinality columns (gender, status)
- **Full-Text Index**: For searching text content
- **GiST/SP-GiST**: For geometric data and full-text search
- **Composite Index**: Multiple columns, use leftmost prefix principle

---

## Examples

### Before Optimization
```sql
-- Slow query without index
SELECT * FROM orders 
WHERE customer_id = 123 
  AND order_date >= '2024-01-01'
  AND status = 'shipped';

-- Execution: Seq Scan on orders (slow!)
-- Time: 1500 ms
```

### After Optimization
```sql
-- Add composite index
CREATE INDEX idx_orders_optimized ON orders(customer_id, order_date, status);

-- Query now uses index
SELECT * FROM orders 
WHERE customer_id = 123 
  AND order_date >= '2024-01-01'
  AND status = 'shipped';

-- Execution: Index Scan on idx_orders_optimized
-- Time: 2.5 ms
```

### Using EXPLAIN
```sql
EXPLAIN ANALYZE
SELECT u.name, o.order_date, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active';

-- Analyze the output:
-- - Check for Sequential Scans (bad)
-- - Look for Index Scans (good)
-- - Review actual rows vs estimated rows
-- - Check execution time
```

### Index Best Practices

```sql
-- 1. Index on frequently filtered columns
CREATE INDEX idx_users_status ON users(status);

-- 2. Composite index for multi-column queries
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- 3. Covering index to avoid table access
CREATE INDEX idx_products_covering ON products(category_id, price, name);
SELECT category_id, price, name 
FROM products 
WHERE category_id = 5;

-- 4. Partial index for specific conditions
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- 5. Expression index
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';
```

---

## Key Takeaways

1. **Always analyze execution plans** before and after optimization
2. **Index selectively** - too many indexes slow down writes
3. **Use composite indexes** for queries with multiple WHERE conditions
4. **Covering indexes** eliminate table lookups
5. **Monitor index usage** and remove unused indexes