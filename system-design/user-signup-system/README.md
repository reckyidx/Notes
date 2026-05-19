# Race-Condition-Safe User Signup System

A Node.js user signup system designed to handle concurrent requests safely across multiple servers/pods, preventing duplicate user creation with the same phone number.

## Problem Statement

Design a signup flow where:
- Phone number is mandatory and must be unique
- Multiple concurrent requests for the same phone number can hit different servers/pods
- System should not create duplicate users

## Solution Overview

This system uses a **multi-layer defense strategy** to prevent race conditions:

### Layer 1: Distributed Lock (Redis + Redlock)
- Acquires a distributed lock for the phone number before any operation
- Prevents concurrent requests across multiple servers/pods
- Lock has TTL to prevent deadlocks
- Uses Redlock algorithm for distributed locking

### Layer 2: Database Unique Constraint
- Database enforces unique constraint on phone number
- Acts as final safety net if lock somehow fails

### Layer 3: Double-Check Pattern
- Check if user exists before attempting creation
- Prevents unnecessary database operations

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Requests                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Load Balancer / API Gateway                   │
└─────────────────────────────────────────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │   Server 1    │   │   Server 2    │   │   Server 3    │
    │   (Pod 1)     │   │   (Pod 2)     │   │   (Pod 3)     │
    └───────────────┘   └───────────────┘   └───────────────┘
            │                   │                   │
            └───────────────────┼───────────────────┘
                                │
                                ▼
                ┌───────────────────────────────┐
                │         Redis Cluster         │
                │    (Distributed Locking)      │
                └───────────────────────────────┘
                                │
                                ▼
                ┌───────────────────────────────┐
                │          Database             │
                │   (Unique Constraint on       │
                │        Phone Number)          │
                └───────────────────────────────┘
```

## Flow Diagram

```
Request Arrives
      │
      ▼
┌─────────────────┐
│ Validate Input  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Acquire Distributed Lock│◄─────── If lock acquisition fails
│    for Phone Number     │        (another request in progress)
└────────┬────────────────┘        return 429 (Too Many Requests)
         │
         ▼
┌─────────────────────────┐
│ Check if User Exists    │◄─────── If exists, return 409
│   (Double-Check)        │         (Conflict)
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Create User in Database │◄─────── DB unique constraint as
│                         │         final safety net
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Release Distributed Lock│
└────────┬────────────────┘
         │
         ▼
    Return Success (201)
```

## Installation

```bash
# Clone the repository
cd user-signup-system

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

## Configuration

Edit `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Redis Configuration (for distributed locking)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Lock Configuration
LOCK_TTL_MS=10000
LOCK_RETRY_DELAY_MS=200
LOCK_RETRY_COUNT=3

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/userdb
```

## Running the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### POST /api/auth/signup
Register a new user.

**Request Body:**
```json
{
  "phoneNumber": "+919876543210",
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "phoneNumber": "+919876543210",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**

- `400` - Invalid input / Missing phone number
- `409` - Phone number already registered
- `429` - Concurrent request in progress

### GET /api/auth/check-phone/:phoneNumber
Check if a phone number is already registered.

**Success Response:**
```json
{
  "success": true,
  "data": {
    "exists": false,
    "phoneNumber": "+919876543210"
  }
}
```

### GET /api/users/:id
Get user by ID.

### GET /health
Health check endpoint.

## Testing Concurrent Requests

You can test the race condition handling using concurrent requests:

```bash
# Using curl with background processes
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "name": "Test User"}' &

curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "name": "Test User"}' &

wait
```

Or using a tool like `ab` (Apache Bench):

```bash
ab -n 10 -c 10 -p payload.json -T application/json \
  http://localhost:3000/api/auth/signup
```

Where `payload.json` contains:
```json
{"phoneNumber": "+919876543210", "name": "Test User"}
```

## Project Structure

```
user-signup-system/
├── src/
│   ├── config/
│   │   ├── config.js          # Application configuration
│   │   ├── database.js        # Database connection (in-memory for demo)
│   │   └── redis.js           # Redis connection management
│   ├── controllers/
│   │   └── authController.js  # HTTP request handlers
│   ├── middleware/
│   │   ├── errorHandler.js    # Error handling middleware
│   │   └── validator.js       # Request validation
│   ├── repositories/
│   │   └── UserRepository.js  # Database operations
│   ├── routes/
│   │   ├── authRoutes.js      # Auth routes
│   │   └── userRoutes.js      # User routes
│   ├── services/
│   │   ├── DistributedLockService.js  # Redis-based distributed locking
│   │   └── SignupService.js   # Business logic for signup
│   ├── utils/
│   │   └── logger.js          # Winston logger
│   └── server.js              # Express app entry point
├── tests/
│   └── signup.test.js         # Test cases
├── .env.example
├── package.json
└── README.md
```

## Key Design Decisions

### Why Redlock?
- Provides distributed locking across multiple Redis instances
- Fault-tolerant: works even if some Redis nodes fail
- Prevents deadlocks with automatic TTL
- Well-tested algorithm for distributed systems

### Why Multiple Layers?
1. **Distributed Lock**: First line of defense, prevents concurrent operations
2. **Double-Check Pattern**: Quick check before expensive operations
3. **Database Constraint**: Final safety net, guarantees data integrity

### Lock TTL Considerations
- Default TTL: 10 seconds
- Should be longer than expected signup operation
- Auto-expires to prevent deadlocks if server crashes

## Running Tests

```bash
npm test
```

## Production Considerations

1. **Redis Cluster**: Use multiple Redis nodes for high availability
2. **Database**: Replace in-memory DB with PostgreSQL/MySQL with unique constraint
3. **Rate Limiting**: Add rate limiting to prevent abuse
4. **Monitoring**: Add metrics for lock acquisition, wait times
5. **Circuit Breaker**: Add circuit breaker for Redis failures

## License

MIT