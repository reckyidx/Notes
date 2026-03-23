# Web Crawler Architecture - Kotak Job Fetching System

## Executive Summary

This document outlines the architecture for a scalable, production-ready web crawler designed to fetch job listings from Kotak's career pages. The system is built using Node.js with a focus on performance, reliability, and maintainability.

## System Overview

The crawler follows a distributed, event-driven architecture with the following core components:

1. **Orchestrator Service** - Manages crawl scheduling and coordination
2. **Fetcher Service** - Handles HTTP requests with smart retry logic
3. **Parser Service** - Extracts structured data from HTML
4. **Queue System** - Manages URL processing with Redis
5. **Storage Layer** - Persists job data with MongoDB
6. **Rate Limiter** - Prevents overwhelming target servers
7. **Error Handler** - Centralized error management and recovery
8. **Metrics Collector** - Tracks performance and health metrics

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Orchestrator Service                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Scheduler  │  │ Coordinator  │  │   Monitor    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Redis Queue System                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   URL Queue  │  │ Priority Q   │  │   Dedup Q    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Fetcher #1    │   │ Fetcher #2    │   │ Fetcher #N    │
│ (Worker)      │   │ (Worker)      │   │ (Worker)      │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                    ┌───────────────┐
                    │ Rate Limiter   │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Parser Service│
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ MongoDB       │   │ Elasticsearch │   │ S3/GCS       │
│ (Primary DB)  │   │ (Search)      │   │ (Raw HTML)   │
└───────────────┘   └───────────────┘   └───────────────┘
```

## Component Details

### 1. Orchestrator Service

**Responsibilities:**
- Schedule crawl jobs based on cron expressions
- Coordinate multiple worker instances
- Monitor crawler health and performance
- Handle failure recovery and retry logic
- Distribute work across workers

**Key Features:**
- Dynamic worker pool scaling
- Priority-based job scheduling
- Dead letter queue for failed jobs
- Graceful shutdown handling

### 2. Fetcher Service

**Responsibilities:**
- Execute HTTP requests with proper headers
- Handle authentication and cookies
- Manage connection pooling
- Implement exponential backoff
- Respect robots.txt

**Key Features:**
- Keep-alive connections
- HTTP/2 support
- Automatic decompression
- Proxy rotation support
- Request chaining

### 3. Parser Service

**Responsibilities:**
- Extract structured data from HTML
- Normalize job information
- Handle dynamic content (JavaScript-rendered)
- Validate data quality
- Transform to canonical format

**Key Features:**
- Configurable extraction rules
- Multiple parser strategies (CSS selectors, XPath)
- Schema validation
- Error recovery for malformed HTML
- Caching of parsed results

### 4. Queue System (Redis)

**Responsibilities:**
- Maintain URL queue for processing
- Track visited URLs (deduplication)
- Priority queue for important pages
- Rate limiting state
- Worker coordination

**Key Features:**
- Persistent storage
- Atomic operations
- Pub/Sub for notifications
- Memory-efficient data structures
- Expiration policies

### 5. Storage Layer (MongoDB)

**Responsibilities:**
- Store job listings
- Maintain crawl history
- Index for efficient querying
- Data retention policies

**Key Features:**
- Sharding support
- Replica sets for high availability
- Change streams for real-time updates
- TTL indexes for automatic cleanup
- Full-text search capabilities

## Data Flow

1. **Initialization Phase**
   - Orchestrator loads configuration
   - Initialize Redis queues and MongoDB connections
   - Seed initial URLs from configuration
   - Start worker pool

2. **Crawling Phase**
   - Worker fetches URL from Redis queue
   - Rate limiter checks token bucket
   - Fetcher executes HTTP request
   - Response stored to S3 (raw HTML)
   - Parser extracts structured data
   - Job data validated and stored in MongoDB
   - New URLs extracted and added to queue

3. **Completion Phase**
   - Queue becomes empty
   - Workers complete pending tasks
   - Metrics generated and stored
   - Orchestrator schedules next crawl

## Scaling Strategy

### Horizontal Scaling

**Worker Pool:**
- Stateless workers allow easy horizontal scaling
- Auto-scaling based on queue depth
- Load balancing through Redis queue
- No single point of failure

**Database Scaling:**
- MongoDB sharding for large datasets
- Read replicas for query performance
- Connection pooling to reduce overhead

**Caching Layer:**
- Redis cluster for distributed caching
- CDN for static assets
- In-memory caching of frequently accessed data

### Vertical Scaling

**Resource Optimization:**
- Worker thread pool configuration
- Connection pool tuning
- Memory-efficient data structures
- CPU-intensive operations in worker threads

## Fault Tolerance

### Failure Handling

- **Transient Failures:** Exponential backoff with jitter
- **Permanent Failures:** Dead letter queue for investigation
- **Service Degradation:** Graceful fallback mechanisms
- **Data Loss:** Periodic snapshots and backups

### Monitoring & Alerting

- Health checks for all services
- Performance metrics (latency, throughput, error rate)
- Alerting on abnormal patterns
- Log aggregation and analysis

## Security Considerations

1. **Request Headers:**
   - Rotate user agents
   - Set proper Accept headers
   - Handle cookies securely

2. **Rate Limiting:**
   - Token bucket algorithm
   - Per-domain limits
   - Adaptive throttling based on server responses

3. **Data Privacy:**
   - Sanitize PII before storage
   - Encrypt sensitive data at rest
   - Secure API keys and credentials

4. **Network Security:**
   - TLS for all external connections
   - Proxy rotation for IP obfuscation
   - DDoS protection mechanisms

## Technology Stack

- **Runtime:** Node.js 20+ (LTS)
- **Queue:** Redis 7+
- **Database:** MongoDB 6+
- **Search:** Elasticsearch 8+
- **Storage:** AWS S3 / Google Cloud Storage
- **HTTP Client:** Axios with custom adapter
- **Parsing:** Cheerio + Puppeteer (for JS-rendered content)
- **Monitoring:** Prometheus + Grafana
- **Logging:** Winston + ELK Stack
- **Container:** Docker + Kubernetes

## Performance Targets

- **Throughput:** 10,000+ jobs per hour
- **Latency:** < 2 seconds average response time
- **Availability:** 99.9% uptime
- **Error Rate:** < 0.1% failed requests
- **Data Freshness:** Crawls every 30 minutes

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                    │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Orchestrator│  │  Workers    │  │    API      │   │
│  │ (3 replicas)│  │  (HPA)      │  │   Gateway   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Redis     │  │  MongoDB    │  │ Elasticsearch│   │
│  │  Cluster    │  │  Replica Set│  │    Cluster  │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Next Steps

1. Implement core crawler components
2. Set up development environment
3. Create configuration management
4. Implement monitoring and logging
5. Add comprehensive testing
6. Deploy to staging environment
7. Performance tuning and optimization
8. Production deployment with CI/CD