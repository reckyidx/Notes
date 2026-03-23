# Kotak Job Crawler - Scalable Web Crawling System

A production-ready, highly scalable web crawler designed to fetch and aggregate job listings from Kotak's career pages. Built with Node.js, featuring advanced design patterns for optimization and scalability.

## 🎯 Features

- **Scalable Architecture**: Horizontal scaling support with distributed workers
- **Rate Limiting**: Token bucket algorithm to respect server limits
- **Circuit Breaker**: Prevents cascading failures
- **Connection Pooling**: Optimized database and HTTP connections
- **Smart Retry Logic**: Exponential backoff with jitter
- **Flexible Parsing**: CSS selector-based data extraction
- **Comprehensive Logging**: Structured logging with Winston
- **Metrics & Monitoring**: Built-in performance tracking
- **Bulk Operations**: Efficient batch processing for data storage

## 📋 Requirements

- Node.js 18+
- MongoDB 6+
- Redis 7+

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd web-crawler-kotak-jobs
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Services

```bash
# Start MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:6

# Start Redis
docker run -d -p 6379:6379 --name redis redis:7
```

### 4. Run the Crawler

```bash
npm start
```

## 📁 Project Structure

```
web-crawler-kotak-jobs/
├── src/
│   ├── config/           # Configuration management
│   ├── fetchers/         # HTTP fetchers with decorators
│   ├── parsers/          # Job data parsers
│   ├── patterns/         # Design patterns implementation
│   ├── queues/           # Queue management
│   ├── repositories/     # Data access layer
│   ├── orchestrator/     # Crawl orchestration
│   ├── utils/            # Utilities (logger, etc.)
│   └── index.js          # Application entry point
├── logs/                 # Log files
├── .env.example         # Environment variables template
├── package.json         # Dependencies
├── ARCHITECTURE.md      # System architecture
├── REQUIREMENTS.md      # Functional & non-functional requirements
├── DESIGN_PATTERNS.md   # Design patterns documentation
└── README.md           # This file
```

## 🏗️ Architecture

The system follows a distributed, event-driven architecture with the following components:

1. **Orchestrator Service**: Manages crawl scheduling and coordination
2. **Fetcher Service**: Handles HTTP requests with smart retry logic
3. **Parser Service**: Extracts structured data from HTML
4. **Queue System**: Manages URL processing with Redis
5. **Storage Layer**: Persists job data with MongoDB
6. **Rate Limiter**: Prevents overwhelming target servers
7. **Circuit Breaker**: Handles service failures gracefully

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture documentation.

## 🔧 Configuration

Key configuration options in `.env`:

| Option | Description | Default |
|--------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/kotak-jobs` |
| `REDIS_HOST` | Redis host | `localhost` |
| `KOTAK_CAREER_URL` | Starting URL for crawling | `https://www.kotak.com/careers` |
| `RATE_LIMIT_CAPACITY` | Token bucket capacity | 100 |
| `RATE_LIMIT_REFILL_RATE` | Tokens per second | 10 |
| `MAX_RETRIES` | Maximum retry attempts | 3 |
| `WORKER_COUNT` | Number of parallel workers | 10 |

## 📊 Design Patterns Used

This system implements multiple design patterns for optimization:

### Creational Patterns
- **Singleton**: Logger, database connections
- **Factory**: Parser creation
- **Builder**: Complex object construction

### Structural Patterns
- **Adapter**: Data format transformation
- **Decorator**: Adding retry, caching, monitoring
- **Facade**: Simplified API interface

### Behavioral Patterns
- **Strategy**: Interchangeable algorithms
- **Observer**: Event notifications
- **Command**: Encapsulated operations
- **Chain of Responsibility**: Validation pipeline

### Architectural Patterns
- **Producer-Consumer**: URL queue processing
- **Circuit Breaker**: Failure handling
- **Repository**: Data access abstraction

### Optimization Patterns
- **Connection Pool**: Reused connections
- **Caching**: Multi-level caching strategy
- **Batching**: Bulk operations
- **Worker Pool**: Parallel processing
- **Rate Limiter**: Token bucket algorithm

See [DESIGN_PATTERNS.md](DESIGN_PATTERNS.md) for detailed implementation.

## 🚀 Scaling & Optimization

### Horizontal Scaling

1. **Add More Workers**:
   ```bash
   WORKER_COUNT=50 npm start
   ```

2. **Distributed Deployment**:
   - Deploy multiple instances behind a load balancer
   - Use Redis for distributed queue and rate limiting
   - MongoDB replica sets for high availability

3. **Kubernetes Deployment**:
   ```yaml
   # deployment.yaml
   replicas: 10
   resources:
     requests:
       memory: "512Mi"
       cpu: "500m"
   ```

### Performance Optimization

1. **Connection Pooling**:
   - MongoDB: 50 connections max
   - HTTP: 100 sockets max
   - Redis: Connection reuse

2. **Caching**:
   - Redis-based distributed caching
   - L1 in-memory cache for hot data
   - TTL-based expiration

3. **Batch Processing**:
   - Bulk database operations
   - Batch size: 100 operations
   - Auto-flush on timeout

4. **Rate Limiting**:
   - Token bucket algorithm
   - Per-domain limits
   - Adaptive throttling

### Performance Targets

- **Throughput**: 10,000+ jobs per hour
- **Latency**: < 2 seconds average response time
- **Availability**: 99.9% uptime
- **Error Rate**: < 0.1% failed requests

## 📈 Monitoring & Logging

### Logging

Logs are written to:
- Console (formatted output)
- `logs/app.log` (all logs)
- `logs/error.log` (errors only)

Log levels: `error`, `warn`, `info`, `debug`, `verbose`

### Metrics

The crawler tracks:
- Total URLs processed
- Successful/failed fetches
- Jobs extracted and saved
- Processing time
- Success rate

## 🔒 Security Considerations

1. **Rate Limiting**: Respects server limits
2. **User Agent Rotation**: Configurable headers
3. **Connection Security**: TLS for all connections
4. **Credential Management**: Environment variables only
5. **Data Privacy**: PII sanitization

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## 📝 API Usage

```javascript
import { MongoClient } from 'mongodb';
import Redis from 'ioredis';
import CrawlerOrchestrator from './src/orchestrator/CrawlerOrchestrator.js';

// Initialize
const mongoClient = await MongoClient.connect('mongodb://localhost:27017');
const redisClient = new Redis({ host: 'localhost' });
const orchestrator = new CrawlerOrchestrator(mongoClient, redisClient);
await orchestrator.initialize();

// Start crawl
const metrics = await orchestrator.startCrawl('https://kotak.com/careers');

// Query jobs
const jobs = await orchestrator.getJobs({
  location: 'Mumbai',
  limit: 50
});

// Search jobs
const results = await orchestrator.searchJobs('Software Engineer');

// Get statistics
const stats = await orchestrator.getJobStatistics();
```

## 🛠️ Troubleshooting

### Connection Issues

**MongoDB Connection Failed**:
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# View logs
docker logs mongodb
```

**Redis Connection Failed**:
```bash
# Check Redis status
redis-cli ping

# View logs
docker logs redis
```

### Rate Limiting

If you encounter 429 errors:
1. Increase `RATE_LIMIT_CAPACITY`
2. Decrease `RATE_LIMIT_REFILL_RATE`
3. Increase `RATE_LIMIT_MIN_DELAY`

### Memory Issues

If the crawler runs out of memory:
1. Decrease `WORKER_COUNT`
2. Decrease `HTTP_MAX_SOCKETS`
3. Decrease `MONGO_MAX_POOL_SIZE`

## 📚 Documentation

- [Architecture](ARCHITECTURE.md) - System architecture and components
- [Requirements](REQUIREMENTS.md) - Functional and non-functional requirements
- [Design Patterns](DESIGN_PATTERNS.md) - Design patterns implementation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 👥 Authors

System Design Team

## 🙏 Acknowledgments

Built using industry best practices and design patterns for scalable distributed systems.