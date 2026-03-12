# URL Shortening Service - Design Patterns Documentation

## Overview

This URL shortening service is built using Node.js and follows best practices with multiple design patterns to ensure modularity, maintainability, and scalability.

---

## Design Patterns Used

### 1. **Singleton Pattern**

**Location:** `src/config/database.js`, `src/config/redis.js`

**Purpose:** Ensures only one instance of database and Redis connections exists throughout the application lifecycle.

**Implementation:**
```javascript
class Database {
  constructor() {
    if (!Database.instance) {
      this.prisma = new PrismaClient();
      Database.instance = this;
    }
    return Database.instance;
  }
}
```

**Benefits:**
- Prevents multiple connection instances
- Conserves system resources
- Provides global access point
- Thread-safe connection management

**Drawbacks:**
- Can make testing difficult (need to reset singleton state)
- Global state can lead to hidden dependencies
- Reduces flexibility in some scenarios

---

### 2. **Strategy Pattern**

**Location:** `src/strategies/`

**Purpose:** Allows interchangeable algorithms for short code generation at runtime.

**Implementation:**
- Abstract strategy: `ShortCodeStrategy.js`
- Concrete strategies: `RandomShortCodeStrategy.js`, `HashShortCodeStrategy.js`
- Context: `UrlShorteningService.js`

**Benefits:**
- Easy to add new generation algorithms
- Switch strategies without modifying service code
- Promotes Open/Closed Principle
- Each algorithm is encapsulated independently

**Drawbacks:**
- Increases number of classes
- Client must be aware of different strategies
- May add complexity for simple use cases

---

### 3. **Repository Pattern**

**Location:** `src/repositories/UrlRepository.js`

**Purpose:** Abstracts data access logic and provides a clean interface for database operations.

**Implementation:**
```javascript
class UrlRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data) { /* ... */ }
  async findByShortCode(shortCode) { /* ... */ }
  // ... other methods
}
```

**Benefits:**
- Separates business logic from data access
- Easier to mock for testing
- Centralized data access logic
- Can switch database implementations easily
- Promotes single responsibility

**Drawbacks:**
- Adds an extra layer of abstraction
- May over-engineer simple applications
- Can lead to generic repositories that don't leverage ORM features

---

### 4. **Service Pattern**

**Location:** `src/services/UrlShorteningService.js`

**Purpose:** Encapsulates business logic and coordinates between different components.

**Implementation:**
- Contains core business rules
- Coordinates repository and strategy patterns
- Implements caching logic
- Handles URL shortening, resolution, and management

**Benefits:**
- Clear separation of concerns
- Business logic is reusable
- Easy to test in isolation
- Controllers remain thin
- Promotes DRY principle

**Drawbacks:**
- Can become bloated if not careful
- May lead to anemic domain models
- Additional layer to maintain

---

### 5. **Controller Pattern**

**Location:** `src/controllers/urlController.js`

**Purpose:** Handles HTTP requests/responses and delegates to service layer.

**Implementation:**
```javascript
class UrlController {
  constructor(urlShorteningService) {
    this.urlShorteningService = urlShorteningService;
  }

  shortenUrl = async (req, res, next) => {
    // Handle request, delegate to service
  };
}
```

**Benefits:**
- Clear separation of HTTP handling and business logic
- Easy to test with mocked services
- Follows MVC architecture
- Promotes single responsibility

**Drawbacks:**
- Additional layer of indirection
- Can be overkill for simple APIs
- May lead to many small controller files

---

### 6. **Factory Pattern**

**Location:** `src/utils/logger.js`, `src/server.js`

**Purpose:** Creates objects without specifying the exact class.

**Implementation:**
- `LoggerFactory` creates different logger configurations
- `createApp()` factory function creates configured Express app
- `createUrlRoutes()` factory creates router with controller

**Benefits:**
- Centralized object creation logic
- Easy to modify object creation process
- Can return different types based on conditions
- Reduces coupling between creator and created objects

**Drawbacks:**
- Adds complexity to object creation
- Can be overkill for simple cases
- May violate single responsibility if factory does too much

---

### 7. **Dependency Injection Pattern**

**Location:** Throughout the application (constructor injection)

**Purpose:** Provides dependencies to objects rather than creating them internally.

**Implementation:**
```javascript
const urlShorteningService = new UrlShorteningService(
  urlRepository,
  redis.getClient(),
  process.env.SHORT_CODE_STRATEGY
);
```

**Benefits:**
- Loose coupling between components
- Easy to test with mock dependencies
- Flexible and configurable
- Promotes single responsibility

**Drawbacks:**
- Can complicate code structure
- Requires understanding of dependency graph
- May be overkill for small applications

---

### 8. **Middleware Pattern**

**Location:** `src/middleware/`

**Purpose:** Processes requests before they reach route handlers.

**Implementation:**
- Error handling middleware
- Validation middleware
- Rate limiting middleware
- Security middleware (helmet, cors)

**Benefits:**
- Reusable request processing logic
- Chainable processing pipeline
- Separation of concerns
- Easy to add/remove functionality

**Drawbacks:**
- Can be hard to debug order issues
- May add latency if not careful
- Requires understanding of middleware chain

---

### 9. **Cache-Aside Pattern**

**Location:** `src/services/UrlShorteningService.js`

**Purpose:** Manages caching strategy for frequently accessed data.

**Implementation:**
```javascript
async resolveUrl(shortCode) {
  // 1. Check cache
  const cachedUrl = await this.redisClient.get(cacheKey);
  if (cachedUrl) return cachedUrl;
  
  // 2. Fetch from database
  const url = await this.urlRepository.findByShortCode(shortCode);
  
  // 3. Update cache
  await this.redisClient.setEx(cacheKey, this.cacheTTL, JSON.stringify(url));
}
```

**Benefits:**
- Reduces database load
- Improves response time
- Simple to implement
- Cache misses still work correctly

**Drawbacks:**
- Stale data possible
- Cache stampede under high load
- Additional infrastructure complexity

---

## Architecture Layers

```
┌─────────────────────────────────────────┐
│         Controllers Layer               │
│   (HTTP Request/Response Handling)      │
├─────────────────────────────────────────┤
│         Services Layer                  │
│      (Business Logic)                   │
├─────────────────────────────────────────┤
│      Repositories Layer                 │
│       (Data Access)                     │
├─────────────────────────────────────────┤
│     Database & Cache Layer              │
│  (PostgreSQL & Redis)                   │
└─────────────────────────────────────────┘
```

---

## Project Structure

```
url-shortening/
├── src/
│   ├── config/          # Configuration (Singleton)
│   │   ├── database.js
│   │   └── redis.js
│   ├── controllers/     # Request handlers (Controller Pattern)
│   │   └── urlController.js
│   ├── services/        # Business logic (Service Pattern)
│   │   └── UrlShorteningService.js
│   ├── repositories/    # Data access (Repository Pattern)
│   │   └── UrlRepository.js
│   ├── strategies/      # Short code algorithms (Strategy Pattern)
│   │   ├── ShortCodeStrategy.js
│   │   ├── RandomShortCodeStrategy.js
│   │   └── HashShortCodeStrategy.js
│   ├── middleware/      # Request processing (Middleware Pattern)
│   │   ├── errorHandler.js
│   │   └── validator.js
│   ├── routes/          # API endpoints
│   │   └── urlRoutes.js
│   ├── utils/           # Utilities (Factory Pattern)
│   │   └── logger.js
│   └── server.js        # Application entry point (Factory Pattern)
├── prisma/
│   └── schema.prisma    # Database schema
├── tests/               # Test files
├── logs/                # Log files
└── package.json
```

---

## Pros of This Architecture

### Maintainability
- **Clear separation of concerns** - Each layer has a specific responsibility
- **Modular design** - Easy to locate and modify specific functionality
- **Consistent patterns** - Follows established software engineering practices

### Scalability
- **Caching layer** - Redis reduces database load
- **Rate limiting** - Prevents abuse
- **Connection pooling** - Efficient database connections
- **Horizontal scaling ready** - Stateless design allows multiple instances

### Testability
- **Dependency injection** - Easy to mock dependencies
- **Isolated layers** - Test each layer independently
- **Clear interfaces** - Well-defined contracts between components

### Flexibility
- **Strategy pattern** - Easy to swap short code generation algorithms
- **Repository pattern** - Can switch database implementations
- **Factory pattern** - Easy to create configured objects

### Security
- **Helmet** - Security headers
- **CORS** - Cross-origin control
- **Rate limiting** - DDoS protection
- **Input validation** - Joi schemas

---

## Cons of This Architecture

### Complexity
- **Many layers** - May be overkill for simple applications
- **Learning curve** - Requires understanding of multiple patterns
- **Initial setup** - More boilerplate code

### Performance Overhead
- **Additional layers** - Each layer adds some overhead
- **Dependency injection** - Slight performance cost
- **Middleware chain** - Each middleware adds processing time

### Maintenance Burden
- **More files** - More code to maintain
- **Pattern management** - Need to ensure patterns are used correctly
- **Documentation** - Requires good documentation

### Potential Over-Engineering
- **Small scale** - Too complex for simple use cases
- **Rapid prototyping** - Slower initial development
- **Team size** - May be too much for small teams

---

## Best Practices Followed

1. **SOLID Principles**
   - Single Responsibility: Each class has one reason to change
   - Open/Closed: Open for extension, closed for modification
   - Liskov Substitution: Subtypes are substitutable for base types
   - Interface Segregation: Clients don't depend on unused interfaces
   - Dependency Inversion: Depend on abstractions, not concretions

2. **DRY (Don't Repeat Yourself)**
   - Reusable components
   - Shared utilities
   - Centralized configuration

3. **Separation of Concerns**
   - Controllers handle HTTP
   - Services handle business logic
   - Repositories handle data access

4. **Error Handling**
   - Centralized error handler
   - Proper error propagation
   - Meaningful error messages

5. **Logging**
   - Structured logging
   - Multiple log levels
   - File and console output

6. **Security**
   - Input validation
   - Rate limiting
   - Security headers
   - Environment variables

---

## When to Use This Architecture

**Use this architecture when:**
- Building production-grade applications
- Team with multiple developers
- Application expected to grow
- Need for maintainability and scalability
- Requirements for comprehensive testing

**Consider simpler approach when:**
- Building MVP/prototype
- Single developer working on small project
- Simple CRUD operations
- Tight deadlines
- Learning Node.js basics

---

## Conclusion

This URL shortening service demonstrates professional software engineering practices through the strategic use of design patterns. While it adds complexity compared to a simple implementation, it provides significant benefits in terms of maintainability, testability, and scalability that are essential for production applications.

The choice of patterns and architecture should always be guided by the specific requirements of your project, team size, and expected growth.
