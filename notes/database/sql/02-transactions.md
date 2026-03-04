# SQL Transaction Management

## Advanced Level Interview Questions

### Q: Explain ACID properties and their importance.

**Answer:**
- **Atomicity**: All operations in a transaction succeed or all fail (no partial state)
- **Consistency**: Database transitions from one valid state to another
- **Isolation**: Concurrent transactions don't interfere with each other
- **Durability**: Committed transactions survive system failures

### Q: What are the different isolation levels and their trade-offs?

**Answer:**
- **Read Uncommitted**: Allows dirty reads, lowest isolation
- **Read Committed**: No dirty reads, but allows non-repeatable reads
- **Repeatable Read**: Prevents dirty and non-repeatable reads, but allows phantom reads
- **Serializable**: Highest isolation, prevents all anomalies, most locking overhead

---

## Transaction Examples

### Basic Transaction
```sql
BEGIN;

-- Check balance
SELECT balance FROM accounts WHERE id = 1;

-- Deduct amount
UPDATE accounts SET balance = balance - 100 WHERE id = 1;

-- Add to recipient
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

-- Commit if successful
COMMIT;

-- Or rollback if error
ROLLBACK;
```

### Setting Isolation Level
```sql
-- PostgreSQL
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- MySQL
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

### Isolation Level Examples

```sql
-- Read Uncommitted (allows dirty reads)
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
-- Transaction A:
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- Transaction B can read the uncommitted change

-- Read Committed (no dirty reads)
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
-- Transaction A:
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
-- Transaction B only sees committed data

-- Repeatable Read (no non-repeatable reads)
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- Transaction A:
BEGIN;
SELECT balance FROM accounts WHERE id = 1;
-- Same balance guaranteed for duration of transaction
COMMIT;

-- Serializable (highest isolation)
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- Prevents all anomalies but may cause more serialization failures
```

---

## Practical Examples

### Money Transfer with Transaction
```sql
CREATE OR REPLACE FUNCTION transfer_money(
    from_account INT,
    to_account INT,
    amount DECIMAL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Start transaction
    BEGIN
        -- Check sufficient balance
        IF (SELECT balance FROM accounts WHERE id = from_account) < amount THEN
            RAISE EXCEPTION 'Insufficient funds';
        END IF;
        
        -- Deduct from sender
        UPDATE accounts 
        SET balance = balance - amount 
        WHERE id = from_account;
        
        -- Add to receiver
        UPDATE accounts 
        SET balance = balance + amount 
        WHERE id = to_account;
        
        -- Commit transaction
        RETURN TRUE;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback on error
            RAISE;
    END;
END;
$$ LANGUAGE plpgsql;
```

### Handling Deadlocks
```sql
-- Retry logic with exponential backoff
DO $$
DECLARE
    max_attempts INTEGER := 3;
    attempt INTEGER := 0;
    success BOOLEAN := FALSE;
BEGIN
    WHILE attempt < max_attempts AND NOT success LOOP
        BEGIN
            -- Your transaction here
            PERFORM transfer_money(1, 2, 100);
            success := TRUE;
            
        EXCEPTION
            WHEN deadlock_detected THEN
                attempt := attempt + 1;
                IF attempt < max_attempts THEN
                    -- Exponential backoff
                    PERFORM pg_sleep(POWER(2, attempt));
                ELSE
                    RAISE;
                END IF;
        END;
    END LOOP;
    
    IF NOT success THEN
        RAISE EXCEPTION 'Transaction failed after % attempts', max_attempts;
    END IF;
END;
$$;
```

---

## Key Takeaways

1. **Use appropriate isolation level** based on consistency requirements
2. **Keep transactions short** to reduce lock contention
3. **Handle serialization failures** with retry logic
4. **Use SAVEPOINT** for partial rollbacks
5. **Monitor long-running transactions** that can cause locks