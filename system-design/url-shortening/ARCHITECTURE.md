# URL Shortening Service - Architecture Documentation

## System Overview

This URL shortening service is a production-ready, scalable application built with Node.js that demonstrates best practices in software architecture, design patterns, and engineering principles.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Layer                           │
│                  (Web, Mobile, CLI)                         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│                   (Express.js Server)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Security   │  │ Validation   │  │ Rate Limit   │      │
│  │  Middleware  │  │  Middleware  │  │  Middleware  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Controller Layer                           │
│              (HTTP Request/Response)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│               (Business Logic)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ URL Shorten  │  │ URL Resolve  │  │  Statistics  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│ Repository Layer    │       │ Cache Layer         │
│ (Data Access)       │       │ (Redis)             │
│ ┌─────────────────┐ │       │                     │
│ │ UrlRepository   │ │       │                     │
│ └─────────────────┘ │       │                     │
└──────────┬──────────┘       └─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ Database Layer      │
│ (PostgreSQL)        │
│                     │
│ ┌─────────────────┐ │
│ │ Urls Table      │ │
│ │ Users Table     │ │
│ └─────────────────┘ │
└─────────────────────┘
```

## Component Interaction Flow

### URL Shortening Flow

```
1. Client → POST /api/shorten
   ↓
2. Express Router → Routes to urlController.shortenUrl
   ↓
3. Controller → urlShorteningService.shortenUrl(url)
   ↓
4. Service → Validates URL
   ↓
5. Service → urlRepository.findByOriginalUrl(url)
   ↓
6. Repository → Prisma query to PostgreSQL
   ↓
7. Service → Generates short code (Strategy Pattern)
   ↓
8. Service → urlRepository.create(data)
   ↓
9. Repository → Inserts into PostgreSQL
   ↓
10. Service → Returns result to Controller
    ↓
11. Controller → Sends JSON response to Client
```

### URL Resolution Flow

```
1. Client → GET /:shortCode
   ↓
2. Express Router → Routes to urlController.resolveUrl
   ↓
3. Controller → urlShorteningService.resolveUrl(shortCode)
   ↓
4. Service → redis.get(cacheKey)
   ↓
5a. Cache HIT → Return cached data
   ↓
5b. Cache MISS → Continue to database
   ↓
6. Service → urlRepository.findByShortCode(shortCode)
   ↓
7. Repository → Prisma query to PostgreSQL
   ↓
8. Service → Check expiration
   ↓
9. Service → urlRepository.incrementClicks(shortCode)
   ↓
10. Service → redis.setEx(cacheKey, data)
    ↓
11. Controller → HTTP 301 Redirect to original URL
```

## Design Pattern Integration

### 1. Singleton Pattern
**Purpose:** Ensure single instance of database/Redis connections

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
- Connection pooling
- Resource management
- Global access point

### 2. Strategy Pattern
**Purpose:** Interchangeable short code generation algorithms

**Implementation:**
```
ShortCodeStrategy (Abstract)
├── RandomShortCodeStrategy
└── HashShortCodeStrategy
```

**Benefits:**
- Runtime algorithm selection
- Easy to add new strategies
- Open/Closed Principle

### 3. Repository Pattern
**Purpose:** Abstract data access logic

**Implementation:**
```javascript
class UrlRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }
  
  async findByShortCode(shortCode) {
    return this.prisma.url.findUnique({ where: { shortCode } });
  }
}
```

**Benefits:**
- Testable data access
- Switch database implementations
- Centralized queries

### 4. Service Pattern
**Purpose:** Business logic layer

**Implementation:**
```javascript
class UrlShorteningService {
  constructor(urlRepository, redisClient, strategy) {
    this.urlRepository = urlRepository;
    this.redisClient = redisClient;
    this.shortCodeStrategy = strategy;
  }
}
```

**Benefits:**
- Reusable business logic
- Transaction management
- Coordinated operations

### 5. Dependency Injection
**Purpose:** Loose coupling between components

**Implementation:**
```javascript
const urlShorteningService = new UrlShorteningService(
  urlRepository,
  redis.getClient(),
  process.env.SHORT_CODE_STRATEGY
);
```

**Benefits:**
- Easy testing with mocks
- Flexible configuration
- Clear dependencies

## Data Models

### URL Model
```javascript
{
  id: String (UUID),
  originalUrl: String,
  shortCode: String (Unique, Indexed),
  clicks: Integer (Default: 0),
  createdAt: DateTime,
  expiresAt: DateTime (Optional),
  userId: String (Optional, Foreign Key)
}
```

### User Model
```javascript
{
  id: String (UUID),
  email: String (Unique),
  name: String (Optional),
  password: String (Hashed),
  createdAt: DateTime,
  urls: Array[Url] (Relation)
}
```

## Caching Strategy

### Cache-Aside Pattern

```
┌─────────┐     1. Get     ┌─────────┐
│ Client  │ ──────────────> │  Cache  │
└─────────┘                └─────────┘
     │                             │
     │                             │ Cache Miss
     │                             ▼
     │                    2. Get    ┌──────────┐
     │                   ──────────> │ Database │
     │                             └──────────┘
     │                                  │
     │                             3. Return
     │                                  │
     │                             4. Set   ┌─────────┐
     │                            <──────── │  Cache  │
     │                                  │  └─────────┘
     │                             5. Return
     └──────────────────────────────────┘
```

**Cache Key Format:** `url:{shortCode}`  
**TTL:** 3600 seconds (1 hour)  
**Invalidation:** On URL deletion or update

## Security Architecture

### 1. Request Validation Layer
- Joi schema validation
- Input sanitization
- URL format validation

### 2. Rate Limiting Layer
- Redis-backed distributed rate limiting
- Configurable windows and limits
- IP-based throttling

### 3. Security Headers (Helmet)
- HSTS
- X-Frame-Options
- X-Content-Type-Options
- CSP headers

### 4. CORS Configuration
- Configurable allowed origins
- Preflight request handling

## Error Handling Architecture

```
┌─────────────┐
│   Error     │
│  Generated  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Error Middleware   │
│  - Prisma Errors    │
│  - Validation Errors│
│  - System Errors    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   Log Error         │
│   (Winston)         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   Format Response   │
│   - Status Code     │
│   - Error Message   │
│   - Stack Trace     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   Send to Client    │
└─────────────────────┘
```

## Performance Considerations

### 1. Database Optimization
- Indexed fields: shortCode, userId
- Connection pooling via Prisma
- Query optimization

### 2. Caching
- Redis for hot data
- Cache-aside pattern
- Configurable TTL

### 3. Connection Management
- Singleton pattern for connections
- Connection pooling
- Graceful shutdown

### 4. Async Operations
- Non-blocking I/O
- Promise-based operations
- Error propagation

## Scalability Considerations

### Horizontal Scaling
- Stateless application design
- Redis for shared cache
- External session storage

### Vertical Scaling
- Efficient resource usage
- Connection pooling
- Memory optimization

### Load Balancing
- Multiple instances support
- Health check endpoint
- Graceful degradation

## Monitoring and Observability

### Logging Strategy
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Console   │     │  File Log   │     │ Error Log   │
│   Output    │     │  (All)      │     │  (Errors)   │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                   ▲                   ▲
       └───────────────────┴───────────────────┘
                           │
                     ┌─────┴─────┐
                     │  Winston  │
                     │  Logger   │
                     └───────────┘
```

### Log Levels
- **Error:** Critical errors requiring attention
- **Warn:** Warning messages
- **Info:** General information
- **Debug:** Detailed debugging info

### Health Checks
- `/api/health` endpoint
- Database connection status
- Redis connection status
- Service availability

## Deployment Architecture

### Development Environment
```
┌─────────────┐
│ Development │
│   Server    │
└──────┬──────┘
       │
       ├─► PostgreSQL (Local)
       ├─► Redis (Local)
       └─► Node.js App
```

### Production Environment
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Load      │────►│  Instance 1 │     │ PostgreSQL  │
│  Balancer   │     │  Node.js    │◄────│  Cluster    │
└─────────────┘     └──────┬──────┘     └─────────────┘
       │                     │
       └────────────────────►│
                             │
                      ┌──────┴──────┐
                      │  Redis      │
                      │  Cluster    │
                      └─────────────┘
```

## Best Practices Implemented

### Code Organization
- **Separation of Concerns:** Each layer has single responsibility
- **DRY Principle:** Reusable components and utilities
- **Single Responsibility:** Classes do one thing well
- **Open/Closed:** Open for extension, closed for modification

### Error Handling
- **Centralized error handling**
- **Proper HTTP status codes**
- **Meaningful error messages**
- **Comprehensive logging**

### Security
- **Input validation**
- **SQL injection prevention** (via Prisma)
- **XSS protection**
- **Rate limiting**
- **Security headers**

### Performance
- **Caching strategy**
- **Connection pooling**
- **Indexed queries**
- **Efficient data structures**

### Maintainability
- **Clear code structure**
- **Comprehensive documentation**
- **Design patterns**
- **Testable architecture**

## Future Enhancements

### Scalability
- [ ] Add API gateway (Kong, AWS API Gateway)
- [ ] Implement read replicas
- [ ] Add CDN for static assets
- [ ] Implement distributed tracing

### Features
- [ ] User authentication and authorization
- [ ] URL analytics dashboard
- [ ] Custom domains
- [ ] QR code generation
- [ ] Bulk URL shortening
- [ ] URL expiration scheduling

### Monitoring
- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] APM integration (New Relic, Datadog)
- [ ] Alert system

### Infrastructure
- [ ] Kubernetes deployment
- [ ] Docker containers
- [ ] CI/CD pipeline
- [ ] Infrastructure as Code (Terraform)

## Conclusion

This architecture provides a solid foundation for a production-ready URL shortening service that is:
- **Scalable:** Can handle growth horizontally and vertically
- **Maintainable:** Clear structure and separation of concerns
- **Testable:** Modular design with dependency injection
- **Secure:** Multiple layers of security
- **Performant:** Caching and optimization strategies
- **Observable:** Comprehensive logging and monitoring

The use of design patterns and best practices ensures the codebase is professional, maintainable, and ready for production deployment.
