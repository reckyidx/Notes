# BookMyShow - Movie Ticket Booking System

A complete movie ticket booking system built with Node.js, Express, PostgreSQL, and Redis.

## Features

- User authentication (signup, login, JWT tokens)
- Movie management (CRUD operations)
- Theater and screen management
- Show scheduling and management
- Seat selection with real-time availability
- Distributed seat locking (5-minute TTL)
- Booking lifecycle management
- Ticket generation with QR codes
- Email notifications
- Rate limiting
- Caching with Redis

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis
- **Authentication**: JWT
- **Validation**: express-validator

## Project Structure

```
bookmyshow-system/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/
│   │   ├── database.js        # Prisma client
│   │   ├── redis.js           # Redis client & utilities
│   │   └── index.js           # App configuration
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── movieController.js
│   │   ├── showController.js
│   │   └── bookingController.js
│   ├── middleware/
│   │   ├── auth.js            # Authentication middleware
│   │   └── errorHandler.js    # Error handling
│   ├── repositories/
│   │   ├── UserRepository.js
│   │   ├── MovieRepository.js
│   │   ├── TheaterRepository.js
│   │   ├── ShowRepository.js
│   │   └── BookingRepository.js
│   ├── routes/
│   │   └── index.js           # API routes
│   ├── services/
│   │   ├── AuthService.js
│   │   ├── BookingService.js
│   │   ├── SeatLockService.js
│   │   └── NotificationService.js
│   ├── utils/
│   │   └── logger.js          # Winston logger
│   └── server.js              # Express app entry
├── .env.example
├── package.json
├── DESIGN_PATTERNS.md
└── README.md
```

## Design Patterns Used

1. **Repository Pattern** - Data access abstraction
2. **Service Layer Pattern** - Business logic
3. **Factory Pattern** - Object creation
4. **Strategy Pattern** - Interchangeable algorithms
5. **Saga Pattern** - Distributed transactions
6. **Distributed Lock Pattern** - Concurrency control
7. **Observer Pattern** - Event notifications
8. **Middleware Pattern** - Request processing

See [DESIGN_PATTERNS.md](./DESIGN_PATTERNS.md) for detailed documentation.

## API Endpoints

### Authentication
```
POST   /api/v1/auth/signup          - Register new user
POST   /api/v1/auth/login           - Login user
POST   /api/v1/auth/logout          - Logout user
POST   /api/v1/auth/refresh-token   - Refresh access token
GET    /api/v1/auth/me              - Get current user
```

### Movies
```
GET    /api/v1/movies               - List movies
GET    /api/v1/movies/running       - Get running movies
GET    /api/v1/movies/:id           - Get movie details
POST   /api/v1/movies               - Create movie (Admin)
PUT    /api/v1/movies/:id           - Update movie (Admin)
DELETE /api/v1/movies/:id           - Delete movie (Admin)
```

### Theaters
```
GET    /api/v1/theaters             - List theaters (by city/location)
GET    /api/v1/theaters/:id         - Get theater details
```

### Shows
```
GET    /api/v1/shows                - List shows
GET    /api/v1/shows/:id             - Get show with seat map
GET    /api/v1/shows/:id/seats       - Get show seats
POST   /api/v1/shows                 - Create show (Admin/Theater Owner)
PUT    /api/v1/shows/:id/status      - Update show status
DELETE /api/v1/shows/:id             - Cancel show
```

### Seat Locking
```
POST   /api/v1/seats/lock            - Lock seats
DELETE /api/v1/seats/lock/:lockId    - Release lock
GET    /api/v1/seats/lock/:lockId    - Get lock status
```

### Bookings
```
POST   /api/v1/bookings              - Create booking
GET    /api/v1/bookings              - Get user bookings
GET    /api/v1/bookings/:id          - Get booking details
POST   /api/v1/bookings/:id/cancel   - Cancel booking
```

### Tickets
```
GET    /api/v1/tickets/:ticketNumber  - Get ticket
POST   /api/v1/tickets/:ticketNumber/validate - Validate ticket
```

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Installation

1. Clone the repository
```bash
cd bookmyshow-system
```

2. Install dependencies
```bash
npm install
```

3. Copy environment file
```bash
cp .env.example .env
```

4. Update `.env` with your configuration

5. Run database migrations
```bash
npm run db:migrate
```

6. Start the server
```bash
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| DATABASE_URL | PostgreSQL connection string | - |
| REDIS_HOST | Redis host | localhost |
| REDIS_PORT | Redis port | 6379 |
| JWT_SECRET | JWT signing secret | - |
| JWT_ACCESS_TOKEN_EXPIRY | Access token expiry (seconds) | 900 |
| JWT_REFRESH_TOKEN_EXPIRY | Refresh token expiry (seconds) | 604800 |
| SEAT_LOCK_TTL | Seat lock duration (seconds) | 300 |

## Booking Flow

```
1. User selects movie and show
2. User views seat map
3. User selects seats
4. System locks seats (5 min TTL)
5. User proceeds to payment
6. On success: Booking created, tickets generated
7. On failure/timeout: Seats released
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  API Server │────▶│  PostgreSQL │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                          │
                    ┌─────┴─────┐
                    │   Redis   │
                    │  (Cache)  │
                    │  (Locks)  │
                    └───────────┘
```

## Key Features

### Seat Locking
- Distributed locking with Redis
- 5-minute TTL
- Deadlock prevention with ordered locking
- Automatic release on timeout

### Caching
- Movie list caching
- Show availability caching
- Theater list caching

### Rate Limiting
- 100 requests per minute per IP
- Configurable limits

### Error Handling
- Centralized error handling
- Custom error classes
- Prisma error mapping

## License

MIT