# Architecture Document: Race-Condition-Safe User Signup System

## Table of Contents
1. [Overview](#overview)
2. [Problem Analysis](#problem-analysis)
3. [Solution Architecture](#solution-architecture)
4. [Component Design](#component-design)
5. [Data Flow](#data-flow)
6. [Race Condition Prevention](#race-condition-prevention)
7. [Failure Scenarios](#failure-scenarios)
8. [Scalability Considerations](#scalability-considerations)

---

## Overview

This document describes the architecture of a user signup system designed to handle concurrent registration requests safely in a distributed environment.

### Key Requirements
- Phone number is mandatory and must be unique
- Multiple concurrent requests for the same phone number can hit different servers/pods
- System must not create duplicate users

---

## Problem Analysis

### The Race Condition Problem

In a distributed system with multiple servers, race conditions can occur when:

```
Time    Server 1                    Server 2
─────────────────────────────────────────────────────────
T0      Request for phone A arrives
T1                                  Request for phone A arrives
T2      Check: Does A exist? No
T3                                  Check: Does A exist? No
T4      Create user with phone A
T5                                  Create user with phone A
T6      Success (User created)
T7                                  Success (DUPLICATE!)
```

Without proper synchronization, both requests pass the existence check and create users, resulting in duplicate phone numbers.

### Why Traditional Solutions Fail

1. **Database Unique Constraint Alone**: 
   - Works but returns database errors to users
   - No control over error messages
   - Can cause database connection pool exhaustion under high concurrency

2. **Application-Level Locking**:
   - Only works within a single process
   - Fails in multi-server/pod deployments

3. **Database Transactions**:
   - Doesn't prevent concurrent reads
   - Still allows race conditions between check and insert

---

## Solution Architecture

### Multi-Layer Defense Strategy

We implement a three-layer defense strategy:

```
┌─────────────────────────────────────────────────────────────┐
│                     Layer 1: Distributed Lock                │
│         Prevents concurrent operations across servers        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Layer 2: Double-Check Pattern               │
│           Verify user doesn't exist before creation          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Layer 3: Database Unique Constraint           │
│              Final safety net for data integrity            │
└─────────────────────────────────────────────────────────────┘
```

### System Architecture

```
                              ┌─────────────────┐
                              │    Clients      │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │  Load Balancer   │
                              └────────┬────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
     ┌────────▼────────┐      ┌───────▼────────┐      ┌────────▼────────┐
     │   Node.js Pod   │      │  Node.js Pod   │      │   Node.js Pod   │
     │       (1)       │      │      (2)       │      │       (3)       │
     │                 │      │                │      │                │
     │  ┌───────────┐  │      │  ┌───────────┐  │      │  ┌───────────┐  │
     │  │  Signup   │  │      │  │  Signup   │  │      │  │  Signup   │  │
     │  │  Service  │  │      │  │  Service  │  │      │  │  Service  │  │
     │  └─────┬─────┘  │      │  └─────┬─────┘  │      │  └─────┬─────┘  │
     │        │        │      │        │        │      │        │        │
     │  ┌─────▼─────┐  │      │  ┌─────▼─────┐  │      │  ┌─────▼─────┐  │
     │  │   Lock    │  │      │  │   Lock    │  │      │  │   Lock    │  │
     │  │  Service  │  │      │  │  Service  │  │      │  │  Service  │  │
     │  └─────┬─────┘  │      │  └─────┬─────┘  │      │  └─────┬─────┘  │
     └────────┼────────┘      └────────┼────────┘      └────────┼────────┘
              │                        │                        │
              └────────────────────────┼────────────────────────┘
                                       │
                              ┌────────▼────────┐
                              │  Redis Cluster   │
                              │ (Distributed     │
                              │    Locking)      │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │     Database     │
                              │  (PostgreSQL)    │
                              └─────────────────┘
```

---

## Component Design

### 1. DistributedLockService

**Purpose**: Provides distributed locking using Redis and the Redlock algorithm.

**Key Features**:
- Acquires locks atomically across Redis instances
- Automatic lock expiration (TTL) to prevent deadlocks
- Retry mechanism for lock acquisition
- Lock extension support for long operations

**Implementation**:

```javascript
class DistributedLockService {
  // Acquire lock for a phone number
  async acquireLock(phoneNumber, ttl) {
    const lockKey = `lock:signup:${phoneNumber}`;
    return await this.redlock.acquire([lockKey], ttl);
  }

  // Release lock
  async releaseLock(phoneNumber, lock) {
    await this.redlock.release(lock);
  }

  // Execute function with lock (auto-acquire/release)
  async withLock(phoneNumber, fn, ttl) {
    let lock = await this.acquireLock(phoneNumber, ttl);
    try {
      return await fn();
    } finally {
      await this.releaseLock(phoneNumber, lock);
    }
  }
}
```

**Lock Key Design**:
- Format: `lock:signup:{phoneNumber}`
- TTL: 10 seconds (configurable)
- Retry: 3 attempts with 200ms delay

### 2. SignupService

**Purpose**: Implements the signup business logic with race condition prevention.

**Flow**:

```javascript
async signup(userData) {
  // 1. Validate input
  validatePhoneNumber(userData.phoneNumber);

  // 2. Use distributed lock
  return await lockService.withLock(phoneNumber, async () => {
    // 3. Double-check: Verify user doesn't exist
    const existing = await userRepository.findByPhoneNumber(phoneNumber);
    if (existing) {
      throw new Error('Phone number already registered');
    }

    // 4. Create user
    return await userRepository.create({
      id: uuid(),
      phoneNumber,
      name,
      email,
    });
  });
}
```

### 3. UserRepository

**Purpose**: Abstracts database operations for user data.

**Methods**:
- `findByPhoneNumber(phoneNumber)` - Find user by phone
- `findById(id)` - Find user by ID
- `create(userData)` - Create new user
- `phoneExists(phoneNumber)` - Quick existence check

### 4. Database Layer

**Schema**:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone_number);
```

**Unique Constraint**: The `UNIQUE` constraint on `phone_number` serves as the final safety net.

---

## Data Flow

### Successful Signup Flow

```
Client                Server              Lock Service         Database
  │                     │                      │                  │
  │ POST /signup        │                      │                  │
  │────────────────────►│                      │                  │
  │                     │                      │                  │
  │                     │ acquireLock(phone)   │                  │
  │                     │─────────────────────►│                  │
  │                     │                      │                  │
  │                     │ lock acquired        │                  │
  │                     │◄─────────────────────│                  │
  │                     │                      │                  │
  │                     │ findByPhoneNumber()  │                  │
  │                     │─────────────────────────────────────────►│
  │                     │                      │                  │
  │                     │ null (not found)     │                  │
  │                     │◄─────────────────────────────────────────│
  │                     │                      │                  │
  │                     │ create(user)         │                  │
  │                     │─────────────────────────────────────────►│
  │                     │                      │                  │
  │                     │ user created         │                  │
  │                     │◄─────────────────────────────────────────│
  │                     │                      │                  │
  │                     │ releaseLock(phone)   │                  │
  │                     │─────────────────────►│                  │
  │                     │                      │                  │
  │  201 Created        │                      │                  │
  │◄────────────────────│                      │                  │
```

### Concurrent Request Flow

```
Client1    Client2    Server1    Server2    Redis    Database
   │          │         │          │          │         │
   │ signup    │         │          │          │         │
   │──────────►│         │          │          │         │
   │          │ signup  │          │          │         │
   │          │─────────┼─────────►│          │         │
   │          │         │ acquire  │          │         │
   │          │         │─────────┼──────────►│         │
   │          │         │         │ acquire   │         │
   │          │         │         │─────────►│         │
   │          │         │         │          │         │
   │          │         │ LOCKED   │ WAIT...  │         │
   │          │         │◄─────────┼──────────│         │
   │          │         │         │          │         │
   │          │         │ create user        │         │
   │          │         │─────────┼──────────┼────────►│
   │          │         │         │          │         │
   │          │         │ release │          │         │
   │          │         │─────────┼─────────►│         │
   │          │         │         │          │         │
   │          │         │         │ LOCKED   │         │
   │          │         │         │◄─────────│         │
   │          │         │         │          │         │
   │          │         │         │ find     │         │
   │          │         │         │─────────┼────────►│
   │          │         │         │          │         │
   │          │         │         │ EXISTS!  │         │
   │          │         │         │◄─────────┼─────────│
   │          │         │         │          │         │
   │          │ 409     │         │          │         │
   │          │◄────────┼─────────│          │         │
   │ 201      │         │         │          │         │
   │◄─────────│         │         │          │         │
```

---

## Race Condition Prevention

### How the Lock Prevents Race Conditions

The Redlock algorithm ensures mutual exclusion:

1. **Atomic Lock Acquisition**: Uses Redis SET with NX and PX flags
2. **Quorum-Based**: Requires majority of Redis nodes to acknowledge
3. **Clock-Drift Tolerant**: Accounts for system clock differences

### Lock Implementation Details

```javascript
// Redis command for lock acquisition
SET lock:signup:+919876543210 <random_value> NX PX 10000

// NX - Only set if not exists
// PX - Expire after 10000ms
```

### Why This Works

1. **Single Winner**: Only one request can acquire the lock
2. **Automatic Expiry**: Lock expires after TTL (prevents deadlocks)
3. **Cross-Server**: Works across multiple Node.js instances
4. **Retry Logic**: Failed requests retry with backoff

---

## Failure Scenarios

### Scenario 1: Redis Unavailable

**Impact**: Cannot acquire distributed locks

**Mitigation**:
- Use Redis Cluster for high availability
- Implement circuit breaker pattern
- Fallback to database unique constraint (degraded mode)

```javascript
// Circuit breaker pattern
if (circuitBreaker.isOpen) {
  // Fallback: Rely on database constraint only
  return await directDatabaseSignup(userData);
}
```

### Scenario 2: Lock Acquisition Timeout

**Impact**: User receives 429 error

**Response**:
```json
{
  "success": false,
  "message": "A signup request is already in progress for this phone number",
  "code": "CONCURRENT_REQUEST"
}
```

**Client Action**: Retry after delay

### Scenario 3: Server Crashes While Holding Lock

**Impact**: Lock is held until TTL expires

**Mitigation**: TTL ensures automatic lock release after 10 seconds

### Scenario 4: Database Constraint Violation

**Impact**: Last-resort error

**Response**:
```json
{
  "success": false,
  "message": "Phone number already registered",
  "code": "PHONE_EXISTS"
}
```

---

## Scalability Considerations

### Horizontal Scaling

- **Stateless Servers**: Each Node.js instance is stateless
- **Shared Redis**: All instances use same Redis cluster
- **Shared Database**: All instances connect to same database

### Performance Optimization

1. **Connection Pooling**: Reuse Redis and database connections
2. **Lock Granularity**: Lock only on phone number, not global
3. **Short TTL**: Minimize lock hold time

### Capacity Planning

| Metric | Value |
|--------|-------|
| Lock TTL | 10 seconds |
| Lock acquisition timeout | 600ms (3 retries × 200ms) |
| Max concurrent signups | Unlimited (different phones) |
| Max same-phone attempts | 1 at a time |

### Monitoring Metrics

- Lock acquisition success rate
- Lock wait time
- Signup latency
- Database connection pool usage
- Redis connection health

---

## Summary

This architecture provides robust race condition prevention through:

1. **Distributed Locking**: First line of defense using Redis/Redlock
2. **Double-Check Pattern**: Efficient existence check within lock
3. **Database Constraint**: Final safety net for data integrity

The multi-layer approach ensures that even if one layer fails, the system maintains data consistency and provides appropriate error responses to users.