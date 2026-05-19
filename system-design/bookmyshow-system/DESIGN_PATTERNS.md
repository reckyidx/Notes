# Design Patterns Used in BookMyShow System

This document outlines the design patterns implemented in the BookMyShow movie ticket booking system.

---

## Table of Contents

1. [Repository Pattern](#1-repository-pattern)
2. [Service Layer Pattern](#2-service-layer-pattern)
3. [Factory Pattern](#3-factory-pattern)
4. [Strategy Pattern](#4-strategy-pattern)
5. [Saga Pattern](#5-saga-pattern)
6. [Distributed Lock Pattern](#6-distributed-lock-pattern)
7. [Observer Pattern](#7-observer-pattern)
8. [Middleware Pattern](#8-middleware-pattern)

---

## 1. Repository Pattern

### Purpose
Abstracts the data access layer from the business logic, providing a clean API for database operations.

### Implementation
All database operations are encapsulated in repository classes.

### Files
- `src/repositories/UserRepository.js`
- `src/repositories/MovieRepository.js`
- `src/repositories/TheaterRepository.js`
- `src/repositories/ShowRepository.js`
- `src/repositories/BookingRepository.js`

### Example
```javascript
// UserRepository.js
class UserRepository {
  async create(userData) {
    return prisma.user.create({ data: userData });
  }

  async findById(id) {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }
}

// Usage in service
const user = await UserRepository.findById(userId);
```

### Benefits
- Separation of concerns
- Easier unit testing with mock repositories
- Centralized data access logic
- Easy to switch database implementations

---

## 2. Service Layer Pattern

### Purpose
Contains business logic and orchestrates repository calls. Acts as an intermediary between controllers and repositories.

### Implementation
Each domain has a corresponding service class.

### Files
- `src/services/AuthService.js`
- `src/services/BookingService.js`
- `src/services/SeatLockService.js`
- `src/services/NotificationService.js`

### Example
```javascript
// AuthService.js
class AuthService {
  async signup(userData) {
    // Business logic
    if (!this.isValidEmail(userData.email)) {
      throw new Error('Invalid email format');
    }

    // Check if user exists
    const existingUser = await UserRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const salt = await bcrypt.genSalt(config.bcrypt.rounds);
    const passwordHash = await bcrypt.hash(userData.password + salt, 10);

    // Create user
    const user = await UserRepository.create({
      ...userData,
      passwordHash,
      salt,
    });

    // Generate tokens
    return this.generateTokens(user);
  }
}
```

### Benefits
- Single responsibility principle
- Reusable business logic
- Easy to test
- Clear separation between HTTP layer and business logic

---

## 3. Factory Pattern

### Purpose
Creates objects without specifying the exact class of object that will be created.

### Implementation
Used for creating notification objects based on type.

### Files
- `src/services/NotificationService.js`

### Example
```javascript
// Notification creation based on type
async sendBookingConfirmation(booking) {
  const notification = await prisma.notification.create({
    data: {
      userId: booking.user.id,
      type: 'BOOKING_CONFIRMATION',
      channel: 'EMAIL',
      status: 'PENDING',
      content: {
        bookingId: booking.id,
        movieTitle: booking.show.movie.title,
      },
      scheduledAt: new Date(),
    },
  });

  // Factory method to generate email content
  const emailContent = this.generateBookingConfirmationEmail(booking);
  await this.sendEmail({ to: booking.user.email, html: emailContent });
}
```

### Benefits
- Centralized object creation
- Easy to add new notification types
- Consistent notification structure

---

## 4. Strategy Pattern

### Purpose
Defines a family of algorithms, encapsulates each one, and makes them interchangeable.

### Implementation
Used for different notification channels and payment gateways.

### Files
- `src/services/NotificationService.js` (Email strategy)
- Future: `src/strategies/PaymentGatewayStrategy.js`

### Example
```javascript
// Different email generation strategies based on notification type
generateEmail(notification) {
  switch (notification.type) {
    case 'BOOKING_CONFIRMATION':
      return this.generateBookingConfirmationEmail(notification);
    case 'SHOW_REMINDER':
      return this.generateShowReminderEmail(notification);
    case 'CANCELLATION':
      return this.generateCancellationEmail(notification);
    default:
      return this.generateDefaultEmail(notification);
  }
}
```

### Future Implementation (Payment Gateways)
```javascript
// Payment strategy interface
interface IPaymentGateway {
  createOrder(amount: number): Promise<Order>;
  verifyPayment(paymentId: string): Promise<boolean>;
  refund(paymentId: string): Promise<Refund>;
}

// Concrete strategies
class RazorpayGateway implements IPaymentGateway { ... }
class StripeGateway implements IPaymentGateway { ... }
class PayPalGateway implements IPaymentGateway { ... }

// Context
class PaymentService {
  private gateway: IPaymentGateway;

  setGateway(gateway: IPaymentGateway) {
    this.gateway = gateway;
  }

  async processPayment(amount: number) {
    return this.gateway.createOrder(amount);
  }
}
```

### Benefits
- Easy to add new payment gateways
- Runtime strategy selection
- Clean separation of payment logic

---

## 5. Saga Pattern

### Purpose
Manages distributed transactions across multiple services, ensuring consistency with compensating actions.

### Implementation
Used for the booking flow: seat lock → payment → ticket generation.

### Files
- `src/services/BookingService.js`

### Example
```javascript
// Booking Saga
async createBooking(lockId, userId) {
  // Step 1: Validate lock
  const lockStatus = await SeatLockService.getLockStatus(lockId);
  if (!lockStatus || lockStatus.isExpired) {
    throw new Error('Lock not found or expired');
  }

  // Step 2: Create booking
  const booking = await BookingRepository.createBooking({
    userId,
    showId: lockStatus.showId,
    totalAmount: lockStatus.amount,
  });

  // Step 3: Confirm seat lock
  await SeatLockService.confirmLock(lockId, booking.id);

  return booking;
}

// Compensating action (rollback)
async cancelBooking(bookingId, userId) {
  const booking = await BookingRepository.findBookingById(bookingId);
  
  // Compensating transaction 1: Release seats
  await BookingRepository.cancelBookingWithSeats(bookingId);

  // Compensating transaction 2: Refund payment
  if (booking.paymentStatus === 'SUCCESS') {
    await this.initiateRefund(booking);
  }

  // Compensating transaction 3: Cancel tickets
  await BookingRepository.cancelTicketsByBooking(bookingId);
}
```

### Saga Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Lock Seats │────▶│   Payment   │────▶│   Tickets   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Release   │     │   Refund    │     │   Cancel    │
│    Seats    │     │  Payment    │     │  Tickets    │
└─────────────┘     └─────────────┘     └─────────────┘
   (Compensate)       (Compensate)       (Compensate)
```

### Benefits
- Maintains data consistency across services
- Handles failures gracefully
- Clear rollback path

---

## 6. Distributed Lock Pattern

### Purpose
Prevents concurrent access to shared resources (seats) in a distributed system.

### Implementation
Uses Redis for distributed locking with TTL.

### Files
- `src/services/SeatLockService.js`
- `src/config/redis.js`

### Example
```javascript
class SeatLockService {
  async lockSeats(showId, seatIds, userId) {
    const lockId = uuidv4();
    const acquiredLocks = [];

    // Sort seat IDs to prevent deadlocks
    const sortedSeatIds = [...seatIds].sort();

    for (const seatId of sortedSeatIds) {
      const lockKey = `seat_lock:${showId}:${seatId}`;
      const lockValue = `${lockId}:${userId}`;

      // Use Redis SET NX EX for atomic lock acquisition
      const acquired = await redis.set(
        lockKey,
        lockValue,
        'NX',  // Only set if not exists
        'EX', 300  // 5 minute TTL
      );

      if (acquired === 'OK') {
        acquiredLocks.push(seatId);
      } else {
        // Release all acquired locks on failure
        await this.releaseLocksInternal(showId, acquiredLocks, lockId);
        throw new Error('Could not acquire lock for seat');
      }
    }

    // Lock in database
    await ShowRepository.lockShowSeats(seatIds, userId, lockExpiry);

    return { lockId, seatIds, expiresAt };
  }
}
```

### Lock Flow
```
User A                    Redis                    Database
  │                        │                          │
  │──Lock Seat 1──────────▶│                          │
  │◀─OK────────────────────│                          │
  │                        │                          │
  │──Lock Seat 2──────────▶│                          │
  │◀─OK────────────────────│                          │
  │                        │                          │
  │────────────────────────Update DB Status───────────▶│
  │                        │                          │
  │◀───────────────────────Success────────────────────│
  │                        │                          │
  │                        │                          │
User B                    │                          │
  │──Lock Seat 1──────────▶│                          │
  │◀─FAIL (Already locked)│                          │
  │                        │                          │
```

### Benefits
- Prevents double booking
- Handles concurrent requests
- Automatic lock release with TTL
- Deadlock prevention with ordered locking

---

## 7. Observer Pattern

### Purpose
Defines a subscription mechanism to notify multiple objects about events.

### Implementation
Used for notifications triggered by booking events.

### Files
- `src/services/NotificationService.js`

### Example
```javascript
// Subject: Booking
async confirmBooking(bookingId) {
  // Update booking status
  await BookingRepository.updateBooking(bookingId, { status: 'CONFIRMED' });

  // Generate tickets
  const tickets = await this.generateTickets(booking);

  // Notify observers
  await NotificationService.sendBookingConfirmation(booking);
  await NotificationService.scheduleShowReminder(booking);

  return booking;
}

// Observer: Notification Service
class NotificationService {
  // Observer method
  async sendBookingConfirmation(booking) {
    // Send email notification
    await this.sendEmail({
      to: booking.user.email,
      subject: 'Booking Confirmed',
      html: this.generateBookingConfirmationEmail(booking),
    });
  }

  // Observer method
  async scheduleShowReminder(booking) {
    // Schedule reminder notification
    await prisma.notification.create({
      data: {
        type: 'SHOW_REMINDER',
        scheduledAt: reminderTime,
      },
    });
  }
}
```

### Event Flow
```
┌─────────────┐
│   Booking   │
│   Service   │
└──────┬──────┘
       │
       │ booking.confirmed
       ▼
┌──────────────────────────────────────┐
│           Notification Service       │
├──────────────────────────────────────┤
│  • sendBookingConfirmation()        │
│  • scheduleShowReminder()            │
│  • sendCancellationNotification()    │
└──────────────────────────────────────┘
```

### Benefits
- Decoupled event handling
- Easy to add new observers
- Asynchronous processing

---

## 8. Middleware Pattern

### Purpose
Provides a way to process requests through a chain of handlers.

### Implementation
Used for authentication, authorization, error handling, and logging.

### Files
- `src/middleware/auth.js`
- `src/middleware/errorHandler.js`
- `src/utils/logger.js`

### Example
```javascript
// Authentication middleware
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  const decoded = AuthService.verifyAccessToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = decoded;
  next(); // Pass to next middleware
};

// Authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  logger.error(err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message,
  });
};

// Usage
router.post('/bookings', authenticate, bookingController.createBooking);
router.delete('/movies/:id', authenticate, authorize('ADMIN'), movieController.deleteMovie);
```

### Middleware Chain
```
Request
   │
   ▼
┌─────────────┐
│   Helmet    │ Security headers
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    CORS    │ Cross-origin
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Logger    │ Request logging
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Rate Limit  │ Rate limiting
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Auth     │ Authentication
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Controller │ Business logic
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Error     │ Error handling
│  Handler    │
└──────┬──────┘
       │
       ▼
   Response
```

### Benefits
- Separation of concerns
- Reusable components
- Easy to add/remove functionality
- Clear request processing pipeline

---

## Summary

| Pattern | Use Case | File(s) |
|---------|----------|---------|
| Repository | Data access abstraction | `repositories/*.js` |
| Service Layer | Business logic | `services/*.js` |
| Factory | Object creation | `NotificationService.js` |
| Strategy | Interchangeable algorithms | `NotificationService.js` |
| Saga | Distributed transactions | `BookingService.js` |
| Distributed Lock | Concurrency control | `SeatLockService.js` |
| Observer | Event notification | `NotificationService.js` |
| Middleware | Request processing | `middleware/*.js` |

These patterns work together to create a maintainable, scalable, and testable codebase that follows SOLID principles and industry best practices.