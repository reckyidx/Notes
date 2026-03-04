# SQL Window Functions

## Advanced Level Interview Questions

### Q: Explain Window Functions and give practical examples.

**Answer:**
Window functions perform calculations across a set of table rows related to the current row without grouping.

---

## Window Function Examples

### 1. Running Total
```sql
-- Running total of sales
SELECT 
    order_date,
    amount,
    SUM(amount) OVER (ORDER BY order_date) as running_total
FROM orders
ORDER BY order_date;

-- Result:
-- order_date  | amount | running_total
-- 2024-01-01  | 100    | 100
-- 2024-01-02  | 150    | 250
-- 2024-01-03  | 200    | 450
```

### 2. Ranking with Partitions
```sql
-- Rank employees by salary within department
SELECT 
    department,
    employee,
    salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) as dept_rank,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) as dense_rank,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as row_num
FROM employees;

-- RANK(): 1, 2, 2, 4 (gaps for ties)
-- DENSE_RANK(): 1, 2, 2, 3 (no gaps)
-- ROW_NUMBER(): 1, 2, 3, 4 (unique, no ties)
```

### 3. Moving Average
```sql
-- 3-day moving average
SELECT 
    date,
    sales,
    AVG(sales) OVER (
        ORDER BY date 
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) as moving_avg_3day
FROM sales_data;

-- ROWS BETWEEN options:
-- UNBOUNDED PRECEDING: From beginning of window
-- N PRECEDING: N rows before current
-- CURRENT ROW: Current row
-- N FOLLOWING: N rows after current
-- UNBOUNDED FOLLOWING: To end of window
```

### 4. Year-over-Year Comparison
```sql
-- Compare sales with previous year
SELECT 
    year,
    month,
    sales,
    LAG(sales) OVER (ORDER BY year, month) as prev_month_sales,
    sales - LAG(sales) OVER (ORDER BY year, month) as month_over_month,
    LAG(sales, 12) OVER (ORDER BY year, month) as prev_year_month,
    ROUND(
        (sales - LAG(sales, 12) OVER (ORDER BY year, month)) * 100.0 / 
        LAG(sales, 12) OVER (ORDER BY year, month), 
        2
    ) as yoy_growth_percent
FROM monthly_sales;
```

### 5. Percentile Calculation
```sql
-- Calculate percentile rank of salaries
SELECT 
    employee,
    salary,
    PERCENT_RANK() OVER (ORDER BY salary) as percentile_rank,
    NTILE(4) OVER (ORDER BY salary) as quartile,
    NTILE(10) OVER (ORDER BY salary) as decile
FROM employees
ORDER BY salary;

-- PERCENT_RANK(): 0.0 to 1.0 (relative rank)
-- NTILE(n): Divide rows into n buckets
```

### 6. First and Last Values
```sql
-- Get first and last order per customer
SELECT 
    order_date,
    customer_id,
    order_total,
    FIRST_VALUE(order_total) OVER (
        PARTITION BY customer_id 
        ORDER BY order_date
    ) as first_order_total,
    LAST_VALUE(order_total) OVER (
        PARTITION BY customer_id 
        ORDER BY order_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) as last_order_total
FROM orders;
```

### 7. Cumulative Distribution
```sql
-- Calculate cumulative distribution
SELECT 
    employee,
    salary,
    CUME_DIST() OVER (ORDER BY salary) as cumulative_dist,
    PERCENT_RANK() OVER (ORDER BY salary) as percentile_rank
FROM employees
ORDER BY salary;

-- CUME_DIST(): 0.0 to 1.0, proportion of rows ≤ current
-- PERCENT_RANK(): 0.0 to 1.0, rank / (n - 1)
```

---

## Practical Use Cases

### Top N Per Group
```sql
-- Get top 3 orders per customer
WITH ranked_orders AS (
    SELECT 
        customer_id,
        order_id,
        order_total,
        RANK() OVER (PARTITION BY customer_id ORDER BY order_total DESC) as rank
    FROM orders
)
SELECT customer_id, order_id, order_total
FROM ranked_orders
WHERE rank <= 3
ORDER BY customer_id, rank;
```

### Gaps and Islands
```sql
-- Find consecutive sequences
WITH numbered AS (
    SELECT 
        date,
        value,
        date - ROW_NUMBER() OVER (ORDER BY date) as grp
    FROM time_series
)
SELECT 
    grp,
    MIN(date) as start_date,
    MAX(date) as end_date,
    COUNT(*) as consecutive_days
FROM numbered
GROUP BY grp
ORDER BY grp;
```

---

## Key Takeaways

1. **Window functions don't collapse rows** like GROUP BY
2. **OVER clause** defines the window specification
3. **PARTITION BY** groups data like GROUP BY
4. **ORDER BY** defines row order within window
5. **Frame clause** (ROWS BETWEEN) defines window size