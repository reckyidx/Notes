# BookMyShow System Design - Review Feedback

## Executive Summary

As a 10-year experienced developer, your system design covers the basics but has several critical gaps that need to be addressed for a production-ready system. This document provides detailed feedback on what's missing and how to improve.

---

## 1. Functional Requirements - Gaps Identified

### 1.1 Missing Core Entities

| Missing Entity | Description | Impact |
|---------------|-------------|--------|
| **Movies** | No movie management mentioned | Cannot have shows without movies |
| **Shows** | No show entity defined | Critical for linking movie + screen + time |
| **Screens** | Implicitly mentioned but not designed | Cannot manage theater screens |
| **Seats** | No seat map/selection mechanism | Cannot implement seat booking |
| **Bookings** | Confused with tickets | Separate concerns: booking vs ticket |
| **Payments** | No payment entity | Cannot track payment status |

### 1.2 Missing Functional Flows

#### A. Movie & Show Management (CRITICAL)
```
MISSING:
- Create/Update/Delete movies (Admin)
- Create shows for a movie in a screen
- Configure show timings
- Manage show status (active/inactive)
```

#### B. Seat Selection Flow (CRITICAL)
```
MISSING:
- View seat map for a show
- Select seats
- Temporary seat hold/lock
- Release seat lock on timeout
- Confirm seat booking
```

#### C. Booking Lifecycle (CRITICAL)
```
CURRENT: Direct ticket booking
SHOULD BE:
1. Select Movie → Select Theater → Select Show → Select Seats
2. Lock Seats (5 min TTL)
3. Proceed to Payment
4. On Success: Create Booking → Generate Ticket
5. On Failure/Timeout: Release Seats
```

#### D. Cancellation & Refund (IMPORTANT)
```
MISSING:
- Cancel booking flow
- Refund processing
- Cancellation window rules
- Partial cancellation (reduce tickets)
```

#### E. User Profile Management
```
MISSING:
- View/Update profile
- Booking history
- Saved addresses (for delivery if applicable)
```

### 1.3 Notification System - Incomplete

**Current:** "Add a reminder before the show (min 5 hours)"

**Missing:**
- Notification preferences (email/SMS/push)
- Booking confirmation notification
- Payment success/failure notification
- Cancellation notification
- Show reminder scheduling mechanism

---

## 2. Database Design - Critical Issues

### 2.1 Missing Tables

```sql
-- MISSING: Movies Table
CREATE TABLE movies (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INT,
    genre VARCHAR(100),
    language VARCHAR(50),
    release_date DATE,
    poster_url VARCHAR(500),
    rating DECIMAL(3,1),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- MISSING: Screens Table
CREATE TABLE screens (
    id UUID PRIMARY KEY,
    theater_id UUID REFERENCES theaters(id),
    name VARCHAR(50),
    total_seats INT,
    screen_type VARCHAR(50), -- IMAX, 3D, 2D
    seat_layout JSONB, -- Seat map configuration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- MISSING: Shows Table
CREATE TABLE shows (
    id UUID PRIMARY KEY,
    movie_id UUID REFERENCES movies(id),
    screen_id UUID REFERENCES screens(id),
    theater_id UUID REFERENCES theaters(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    price DECIMAL(10,2),
    status VARCHAR(20), -- SCHEDULED, RUNNING, COMPLETED, CANCELLED
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- MISSING: Seats Table
CREATE TABLE seats (
    id UUID PRIMARY KEY,
    screen_id UUID REFERENCES screens(id),
    row_number INT,
    seat_number INT,
    seat_type VARCHAR(20), -- NORMAL, PREMIUM, RECLINER
    is_active BOOLEAN DEFAULT true
);

-- MISSING: Show_Seats Table (for seat status per show)
CREATE TABLE show_seats (
    id UUID PRIMARY KEY,
    show_id UUID REFERENCES shows(id),
    seat_id UUID REFERENCES seats(id),
    status VARCHAR(20), -- AVAILABLE, LOCKED, BOOKED
    locked_by UUID, -- user_id
    locked_at TIMESTAMP,
    lock_expiry TIMESTAMP,
    booking_id UUID,
    UNIQUE(show_id, seat_id)
);

-- MISSING: Bookings Table
CREATE TABLE bookings (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    show_id UUID REFERENCES shows(id),
    total_amount DECIMAL(10,2),
    status VARCHAR(20), -- PENDING, CONFIRMED, CANCELLED
    payment_status VARCHAR(20),
    booked_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- MISSING: Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id),
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(20), -- PENDING, SUCCESS, FAILED, REFUNDED
    payment_gateway VARCHAR(50),
    gateway_transaction_id VARCHAR(100),
    gateway_response JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- MISSING: Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    type VARCHAR(50), -- BOOKING_CONFIRMATION, SHOW_REMINDER, CANCELLATION
    channel VARCHAR(20), -- EMAIL, SMS, PUSH
    status VARCHAR(20), -- PENDING, SENT, FAILED
    content JSONB,
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP
);
```

### 2.2 Issues with Current Tables

#### Users Table
```sql
-- CURRENT
Users: id, name, phone number, email id, salt

-- ISSUES:
1. Missing password_hash (salt alone is not enough)
2. Missing role (CUSTOMER, THEATER_OWNER, ADMIN)
3. Missing created_at, updated_at
4. Missing is_verified, is_active
5. Missing last_login

-- IMPROVED
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    phone VARCHAR(15) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    salt VARCHAR(100),
    role VARCHAR(20) DEFAULT 'CUSTOMER', -- CUSTOMER, THEATER_OWNER, ADMIN
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tickets Table
```sql
-- CURRENT
tickets: id, theater id, booking date, show timing (show timing on/off), screen time (json)

-- ISSUES:
1. Should be linked to booking, not standalone
2. Missing seat information
3. Missing QR code for entry
4. Missing ticket status
5. screen time as JSON is bad design

-- IMPROVED
CREATE TABLE tickets (
    id UUID PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id),
    seat_id UUID REFERENCES seats(id),
    qr_code VARCHAR(500),
    ticket_number VARCHAR(20) UNIQUE,
    status VARCHAR(20), -- ACTIVE, USED, CANCELLED
    issued_at TIMESTAMP,
    used_at TIMESTAMP
);
```

### 2.3 Missing Indexes

```sql
-- Critical indexes for performance
CREATE INDEX idx_shows_theater_date ON shows(theater_id, start_time);
CREATE INDEX idx_shows_movie ON shows(movie_id);
CREATE INDEX idx_show_seats_show ON show_seats(show_id);
CREATE INDEX idx_show_seats_status ON show_seats(status);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_notifications_user_scheduled ON notifications(user_id, scheduled_at);
```

---

## 3. API Design - Issues & Improvements

### 3.1 HTTP Method Issues

```
CURRENT:
post - /search-event    ❌ Should be GET
post - /view-ticket     ❌ Should be GET
post - /download-ticket ❌ Should be GET

REASON: These are retrieval operations, not state-changing operations
```

### 3.2 Missing APIs

#### Authentication APIs
```
POST   /api/v1/auth/signup          - User registration
POST   /api/v1/auth/login           - User login
POST   /api/v1/auth/logout          - User logout
POST   /api/v1/auth/refresh-token   - Refresh access token
POST   /api/v1/auth/forgot-password - Initiate password reset
POST   /api/v1/auth/reset-password  - Complete password reset
```

#### Movie APIs
```
GET    /api/v1/movies               - List movies (with filters)
GET    /api/v1/movies/{id}          - Get movie details
POST   /api/v1/admin/movies         - Create movie (Admin)
PUT    /api/v1/admin/movies/{id}    - Update movie (Admin)
DELETE /api/v1/admin/movies/{id}    - Delete movie (Admin)
```

#### Theater APIs
```
GET    /api/v1/theaters            - List theaters (by city/location)
GET    /api/v1/theaters/{id}       - Get theater details
GET    /api/v1/theaters/{id}/screens - Get theater screens
GET    /api/v1/theaters/nearby     - Find theaters by location
```

#### Show APIs
```
GET    /api/v1/shows               - List shows (by movie/theater/date)
GET    /api/v1/shows/{id}           - Get show details
GET    /api/v1/shows/{id}/seats     - Get seat map for show
POST   /api/v1/admin/shows         - Create show (Admin/Theater Owner)
PUT    /api/v1/admin/shows/{id}    - Update show
DELETE /api/v1/admin/shows/{id}    - Delete/Cancel show
```

#### Seat Selection APIs
```
POST   /api/v1/seats/lock          - Lock seats (5 min TTL)
DELETE /api/v1/seats/lock/{lockId}  - Release seat lock
GET    /api/v1/seats/lock/{lockId}  - Get lock status
```

#### Booking APIs
```
POST   /api/v1/bookings            - Create booking
GET    /api/v1/bookings             - Get user bookings
GET    /api/v1/bookings/{id}        - Get booking details
POST   /api/v1/bookings/{id}/cancel - Cancel booking
```

#### Payment APIs
```
POST   /api/v1/payments/initiate   - Initiate payment
POST   /api/v1/payments/verify     - Verify payment (webhook)
POST   /api/v1/payments/refund     - Process refund
GET    /api/v1/payments/{id}       - Get payment status
```

#### Ticket APIs
```
GET    /api/v1/tickets             - Get user tickets
GET    /api/v1/tickets/{id}         - Get ticket details
GET    /api/v1/tickets/{id}/download - Download ticket PDF
```

#### Theater Owner APIs
```
POST   /api/v1/owner/theaters      - Register theater
PUT    /api/v1/owner/theaters/{id} - Update theater
POST   /api/v1/owner/screens       - Add screen
PUT    /api/v1/owner/screens/{id}  - Update screen
POST   /api/v1/owner/shows         - Create show
PUT    /api/v1/owner/shows/{id}/status - Open/close booking
```

---

## 4. Non-Functional Requirements - Gaps

### 4.1 Missing Performance Requirements

```
SHOULD DEFINE:
- API Response Time: p50 < 100ms, p95 < 500ms, p99 < 1s
- Seat Lock Response: < 200ms (critical for concurrency)
- Search Response: < 300ms
- Concurrent Users: 50,000 during peak (movie release)
- Requests Per Second: 10,000 RPS normal, 50,000 RPS peak
```

### 4.2 Missing Availability Requirements

```
SHOULD DEFINE:
- SLA: 99.9% uptime (8.77 hours downtime/year)
- RTO: 1 hour (Recovery Time Objective)
- RPO: 5 minutes (Recovery Point Objective)
- Multi-AZ deployment for HA
```

### 4.3 Missing Caching Strategy

```
SHOULD DEFINE:
- Redis for seat locks (TTL 5 min)
- Redis for session management
- Redis for show availability cache
- CDN for static assets (posters, seat maps)
- Cache invalidation strategy
```

### 4.4 Missing Rate Limiting

```
SHOULD DEFINE:
- API Rate Limits: 100 req/min per user
- Seat Lock Rate Limit: 10 locks/min per user
- Search Rate Limit: 60 req/min per user
- Payment Rate Limit: 5 req/min per user
```

### 4.5 Missing Observability

```
SHOULD DEFINE:
- Logging: Structured JSON logs, correlation IDs
- Metrics: Prometheus/Grafana dashboards
- Tracing: Distributed tracing (Jaeger/Zipkin)
- Alerting: PagerDuty integration
- Health Checks: /health, /ready endpoints
```

---

## 5. Architecture - Missing Components

### 5.1 Missing Infrastructure Components

```
1. API Gateway
   - Rate limiting
   - Authentication
   - Request routing
   - SSL termination

2. Message Queue (Kafka/RabbitMQ)
   - Async notification processing
   - Payment webhook handling
   - Event-driven communication

3. Cache Layer (Redis)
   - Seat locks with TTL
   - Session storage
   - Show availability cache
   - Rate limiting counters

4. Search Service (Elasticsearch)
   - Movie search
   - Theater search
   - Autocomplete

5. CDN
   - Movie posters
   - Static assets
   - Seat map images
```

### 5.2 Missing Service Boundaries

```
RECOMMENDED MICROSERVICES:

1. User Service
   - Authentication
   - Profile management
   - User preferences

2. Movie Service
   - Movie CRUD
   - Movie search
   - Movie recommendations

3. Theater Service
   - Theater management
   - Screen management
   - Seat map management

4. Show Service
   - Show scheduling
   - Show availability
   - Show status management

5. Booking Service
   - Seat selection
   - Seat locking
   - Booking creation
   - Booking cancellation

6. Payment Service
   - Payment gateway integration
   - Payment status tracking
   - Refund processing

7. Notification Service
   - Email notifications
   - SMS notifications
   - Push notifications
   - Reminder scheduling

8. Ticket Service
   - Ticket generation
   - QR code generation
   - Ticket download
```

---

## 6. Security - Gaps

### 6.1 Authentication & Authorization

```
MISSING:
- JWT token mechanism
- Refresh token rotation
- Role-based access control (RBAC)
- API key management for theater owners
- Session management
```

### 6.2 Data Security

```
MISSING:
- PII encryption
- Payment data handling (PCI-DSS compliance)
- Audit logging
- IP whitelisting for admin APIs
- Input validation/sanitization
```

---

## 7. Concurrency Handling - Critical for Seat Booking

### 7.1 Seat Locking Mechanism

```
CURRENT: "seat locking applied for 5 minutes"

DETAILED DESIGN NEEDED:

1. Distributed Lock with Redis
   - Use SETNX with TTL
   - Lock key: seat_lock:{show_id}:{seat_id}
   - Lock value: {user_id}:{lock_id}
   - TTL: 300 seconds (5 min)

2. Optimistic Locking in Database
   - Version column in show_seats table
   - Compare-and-swap updates

3. Idempotency
   - Idempotency key for booking requests
   - Prevents duplicate bookings
```

### 7.2 Race Condition Handling

```
SCENARIO: Two users try to book same seat simultaneously

SOLUTION:
1. Redis distributed lock (first come first serve)
2. Database unique constraint on (show_id, seat_id)
3. Optimistic locking with version check
4. Retry mechanism with exponential backoff
```

---

## 8. Design Patterns - Recommendations

### 8.1 Patterns to Implement

| Pattern | Use Case | Benefit |
|---------|----------|---------|
| **Saga** | Booking flow (seat lock → payment → ticket) | Distributed transaction management |
| **Outbox** | Notification events | Reliable event delivery |
| **Repository** | Data access layer | Abstraction from database |
| **Strategy** | Payment gateways | Multiple payment providers |
| **Factory** | Notification channels | Email/SMS/Push abstraction |
| **Observer** | Booking events | Decoupled event handling |
| **State** | Booking status | State transition management |
| **CQRS** | Read/Write separation | Scalability for reads |

---

## 9. Summary of Improvements

### Critical (Must Fix)
- [ ] Add missing entities: Movies, Shows, Screens, Seats, Bookings, Payments
- [ ] Implement proper seat locking with Redis
- [ ] Add complete booking lifecycle flow
- [ ] Fix HTTP methods for APIs
- [ ] Add authentication/authorization

### Important (Should Fix)
- [ ] Add caching strategy
- [ ] Add rate limiting
- [ ] Add observability (logging, metrics, tracing)
- [ ] Add notification system design
- [ ] Add cancellation/refund flow

### Nice to Have
- [ ] Microservices boundaries
- [ ] Event-driven architecture
- [ ] Recommendation system
- [ ] Analytics dashboard

---

## 10. Next Steps

1. Review the pseudocode solutions in `/src/pseudocode.md`
2. Review the design patterns in `/DESIGN_PATTERNS.md`
3. Review the architecture in `/ARCHITECTURE.md`
4. Implement based on the improved design