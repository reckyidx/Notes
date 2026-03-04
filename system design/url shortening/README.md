# URL Shortening Service

A production-ready URL shortening service built with Node.js, following best practices and design patterns for modularity, maintainability, and scalability.

## Features

- 🚀 Fast URL shortening with configurable strategies
- 🔍 URL resolution with automatic redirection
- 📊 Click tracking and statistics
- ⚡ Redis caching for high performance
- 🔒 Rate limiting and security features
- 🎯 Custom short code support
- ⏰ URL expiration management
- 🏗️ Modular architecture with design patterns

## Tech Stack

- **Runtime:** Node.js (>=18.0.0)
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Cache:** Redis
- **Validation:** Joi
- **Logging:** Winston
- **Security:** Helmet, CORS, rate-limit-redis

## Design Patterns Used

This service implements multiple design patterns for clean, maintainable code:

- **Singleton Pattern** - Database and Redis connections
- **Strategy Pattern** - Short code generation algorithms
- **Repository Pattern** - Data access abstraction
- **Service Pattern** - Business logic layer
- **Controller Pattern** - HTTP request handling
- **Factory Pattern** - Object creation
- **Dependency Injection** - Loose coupling
- **Middleware Pattern** - Request processing pipeline
- **Cache-Aside Pattern** - Caching strategy

See [DESIGN_PATTERNS.md](DESIGN_PATTERNS.md) for detailed documentation.

## Project Structure

```
url-shortening/
├── src/
│   ├── config/          # Configuration (Singleton)
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── repositories/    # Data access
│   ├── strategies/      # Short code algorithms
│   ├── middleware/      # Request processing
│   ├── routes/          # API endpoints
│   ├── utils/           # Utilities
│   └── server.js        # Application entry
├── prisma/
│   └── schema.prisma    # Database schema
├── tests/               # Test files
├── logs/                # Log files
└── package.json
```

## Installation

### Prerequisites

- Node.js (>=18.0.0)
- PostgreSQL
- Redis

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd url-shortening
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/urlshortener"
REDIS_URL="redis://localhost:6379"
BASE_URL="http://localhost:3000"
SHORT_CODE_LENGTH=6
SHORT_CODE_STRATEGY=random  # or 'hash'
EXPIRY_DAYS=30
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

4. Set up the database:
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Optional: Seed database
npx prisma db seed
```

5. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Endpoints

### Shorten a URL
```http
POST /api/shorten
Content-Type: application/json

{
  "url": "https://example.com/very/long/url",
  "customCode": "mylink"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "originalUrl": "https://example.com/very/long/url",
    "shortCode": "abc123",
    "shortUrl": "http://localhost:3000/abc123",
    "clicks": 0,
    "createdAt": "2024-02-24T10:00:00.000Z",
    "expiresAt": "2024-03-25T10:00:00.000Z"
  }
}
```

### Resolve a Short URL
```http
GET /:shortCode
```
Redirects to the original URL.

### Get URL Statistics
```http
GET /api/stats/:shortCode
```

**Response:**
```json
{
  "success": true,
  "data": {
    "originalUrl": "https://example.com/very/long/url",
    "shortCode": "abc123",
    "shortUrl": "http://localhost:3000/abc123",
    "clicks": 42,
    "createdAt": "2024-02-24T10:00:00.000Z",
    "expiresAt": "2024-03-25T10:00:00.000Z"
  }
}
```

### Get User URLs (Requires Authentication)
```http
GET /api/urls
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "originalUrl": "https://example.com",
      "shortCode": "abc123",
      "shortUrl": "http://localhost:3000/abc123",
      "clicks": 42,
      "createdAt": "2024-02-24T10:00:00.000Z",
      "expiresAt": "2024-03-25T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Delete a URL
```http
DELETE /api/urls/:shortCode
```

**Response:**
```json
{
  "success": true,
  "message": "URL deleted successfully"
}
```

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "message": "URL Shortening Service is running",
  "timestamp": "2024-02-24T10:00:00.000Z"
}
```

## Usage Examples

### Using cURL

**Shorten a URL:**
```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very/long/url"}'
```

**Shorten with custom code:**
```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "customCode": "mylink"}'
```

**Get statistics:**
```bash
curl http://localhost:3000/api/stats/abc123
```

**Resolve short URL (redirects):**
```bash
curl -L http://localhost:3000/abc123
```

**Delete URL:**
```bash
curl -X DELETE http://localhost:3000/api/urls/abc123
```

### Using JavaScript/Fetch

```javascript
// Shorten a URL
const response = await fetch('http://localhost:3000/api/shorten', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com/very/long/url',
  }),
});

const data = await response.json();
console.log(data);
// Output: { success: true, data: { shortUrl: 'http://localhost:3000/abc123', ... } }

// Get statistics
const stats = await fetch('http://localhost:3000/api/stats/abc123');
const statsData = await stats.json();
console.log(statsData);
// Output: { success: true, data: { clicks: 42, ... } }
```

### Using Node.js

```javascript
const fetch = require('node-fetch');

async function shortenUrl(url) {
  const response = await fetch('http://localhost:3000/api/shorten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return response.json();
}

// Usage
shortenUrl('https://example.com/very/long/url')
  .then(result => console.log(result.shortUrl))
  .catch(error => console.error(error));
```

## Configuration

### Short Code Generation Strategies

The service supports two short code generation strategies:

1. **Random Strategy** (default)
   - Uses cryptographically secure random characters
   - Better for high-volume scenarios
   - Configuration: `SHORT_CODE_STRATEGY=random`

2. **Hash Strategy**
   - Uses SHA-256 hash algorithm
   - Deterministic generation
   - Configuration: `SHORT_CODE_STRATEGY=hash`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `BASE_URL` | Base URL for short URLs | http://localhost:3000 |
| `SHORT_CODE_LENGTH` | Length of short codes | 6 |
| `SHORT_CODE_STRATEGY` | Generation strategy (random/hash) | random |
| `EXPIRY_DAYS` | URL expiry in days | 30 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |
| `LOG_LEVEL` | Logging level | info |

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## Deployment

### Production Setup

1. Set environment variables:
```bash
export NODE_ENV=production
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export REDIS_URL="redis://host:6379"
```

2. Run migrations:
```bash
npx prisma migrate deploy
```

3. Start the server:
```bash
npm start
```

### Docker Deployment

```bash
# Build image
docker build -t url-shortener .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  url-shortener
```

### PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start src/server.js --name url-shortener

# View logs
pm2 logs url-shortener

# Monitor
pm2 monit

# Restart
pm2 restart url-shortener
```

## Monitoring and Logs

Logs are stored in the `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only

View logs:
```bash
# Tail logs
tail -f logs/combined.log

# View errors
tail -f logs/error.log
```

## Performance Optimization

1. **Caching:** Redis caches frequently accessed URLs
2. **Connection Pooling:** Prisma manages database connections efficiently
3. **Rate Limiting:** Prevents abuse with Redis-backed rate limiting
4. **Indexing:** Database indexes on short codes and user IDs
5. **Cleanup:** Automatic cleanup of expired URLs

## Security Features

- **Helmet:** Security headers
- **CORS:** Cross-origin resource sharing control
- **Rate Limiting:** DDoS protection
- **Input Validation:** Joi schema validation
- **SQL Injection Prevention:** Prisma ORM
- **XSS Protection:** Input sanitization

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql $DATABASE_URL
```

### Redis Connection Issues
```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

## Acknowledgments

- Built with modern Node.js best practices
- Follows SOLID principles
- Implements multiple design patterns
- Production-ready architecture
