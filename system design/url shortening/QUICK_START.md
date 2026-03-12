# Quick Start Guide

Get the URL shortening service up and running in minutes!

## Prerequisites

Ensure you have the following installed:
- Node.js (>=18.0.0)
- PostgreSQL
- Redis

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/urlshortener"
REDIS_URL="redis://localhost:6379"
```

### 3. Setup Database

Generate Prisma client and run migrations:
```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Start Services

Make sure PostgreSQL and Redis are running, then:

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### 5. Test the Service

**Health Check:**
```bash
curl http://localhost:3000/api/health
```

**Shorten a URL:**
```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very/long/url"}'
```

**Get Statistics:**
```bash
curl http://localhost:3000/api/stats/YOUR_SHORT_CODE
```

**Resolve Short URL:**
```bash
curl -L http://localhost:3000/YOUR_SHORT_CODE
```

## Common Issues

### Database Connection Error
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Start if needed
sudo service postgresql start
```

### Redis Connection Error
```bash
# Check Redis is running
redis-cli ping

# Start if needed
redis-server
```

### Port Already in Use
```bash
# Find process on port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

## Next Steps

- Read [README.md](README.md) for detailed documentation
- Check [DESIGN_PATTERNS.md](DESIGN_PATTERNS.md) to learn about architecture
- Explore [ARCHITECTURE.md](ARCHITECTURE.md) for system design details
- Run tests with `npm test`

## Support

For issues or questions, please open an issue on GitHub.
