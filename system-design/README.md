# 🏗️ System Design Projects
## Complete System Design Implementations with Code & Documentation

---

## 📂 Project Index

### 1. [BookMyShow - Movie Ticket Booking System](./bookmyshow-system/)

A complete movie ticket booking system with distributed seat locking, real-time availability, and booking lifecycle management.

| Aspect | Details |
|--------|---------|
| **Tech Stack** | Node.js, Express, PostgreSQL (Prisma), Redis, JWT |
| **Key Patterns** | Repository, Service Layer, Distributed Lock (Redlock) |
| **Core Features** | Seat locking (5-min TTL), Booking lifecycle, Email notifications, Rate limiting |
| **Docs** | [README](./bookmyshow-system/README.md) · [Design Patterns](./bookmyshow-system/DESIGN_PATTERNS.md) · [Review Feedback](./bookmyshow-system/REVIEW_FEEDBACK.md) |

---

### 2. [Pub-Sub System (Multithreaded)](./pub-sub-system/)

A thread-safe Publisher-Subscriber messaging system with concurrent message processing support.

| Aspect | Details |
|--------|---------|
| **Type** | Conceptual / Pseudocode |
| **Key Patterns** | Observer, Strategy, Backpressure, Delivery semantics |
| **Core Features** | Topic-based pub/sub, Subscriber management, Message queuing, Multiple delivery guarantees |
| **Docs** | [README](./pub-sub-system/README.md) · [Architecture](./pub-sub-system/ARCHITECTURE.md) · [Design Patterns](./pub-sub-system/DESIGN_PATTERNS.md) · [Pseudocode](./pub-sub-system/src/pseudocode.md) |

---

### 3. [URL Shortening Service](./url-shortening/)

A production-ready URL shortening service with configurable strategies, caching, and analytics.

| Aspect | Details |
|--------|---------|
| **Tech Stack** | Node.js, Express, PostgreSQL (Prisma), Redis, Joi, Winston |
| **Key Patterns** | Strategy (hash/random short codes), Singleton, Repository, Service Layer |
| **Core Features** | Configurable short code strategies, Click tracking, URL expiration, Rate limiting |
| **Docs** | [README](./url-shortening/README.md) · [Architecture](./url-shortening/ARCHITECTURE.md) · [Design Patterns](./url-shortening/DESIGN_PATTERNS.md) · [Project Summary](./url-shortening/PROJECT_SUMMARY.md) · [Quick Start](./url-shortening/QUICK_START.md) |

---

### 4. [User Signup System (Race-Condition-Safe)](./user-signup-system/)

A signup system designed to handle concurrent requests safely across multiple servers, preventing duplicate user creation.

| Aspect | Details |
|--------|---------|
| **Tech Stack** | Node.js, Express, PostgreSQL (Prisma), Redis (Redlock) |
| **Key Patterns** | Distributed Lock (Redlock), Double-Check Pattern, Database Unique Constraint |
| **Core Features** | Multi-layer race condition prevention, Distributed locking, Phone number uniqueness |
| **Docs** | [README](./user-signup-system/README.md) · [Architecture](./user-signup-system/ARCHITECTURE.md) |

---

### 5. [Web Crawler - Kotak Jobs](./web-crawler-kotak-jobs/)

A production-ready, scalable web crawler for fetching and aggregating job listings with advanced design patterns.

| Aspect | Details |
|--------|---------|
| **Tech Stack** | Node.js, MongoDB, Redis, Winston |
| **Key Patterns** | Strategy, Circuit Breaker, Rate Limiter (Token Bucket), Orchestrator |
| **Core Features** | Rate limiting, Circuit breaker, Connection pooling, Smart retry, Bulk operations |
| **Docs** | [README](./web-crawler-kotak-jobs/README.md) · [Architecture](./web-crawler-kotak-jobs/ARCHITECTURE.md) · [Design Patterns](./web-crawler-kotak-jobs/DESIGN_PATTERNS.md) · [Requirements](./web-crawler-kotak-jobs/REQUIREMENTS.md) · [Project Summary](./web-crawler-kotak-jobs/PROJECT_SUMMARY.md) |

---

## 📋 Design Guidelines

### [Requirement Analysis Guidelines](./guidelines/REQUIREMENT_ANALYSIS_GUIDELINES.md)

Comprehensive guide for systematically analyzing functional and non-functional requirements before creating HLD and LLD.

**Covers:**
- Problem statement comprehension & clarification
- Functional requirements analysis (use cases, data requirements, integrations)
- Non-functional requirements (performance, scalability, availability, security, etc.)
- HLD & LLD readiness checklists
- Requirements gathering techniques
- Common pitfalls to avoid

---

## 🗺️ Project Comparison

| Project | Type | Database | Cache | Key Challenge |
|---------|------|----------|-------|---------------|
| BookMyShow | Full Implementation | PostgreSQL | Redis | Distributed seat locking |
| Pub-Sub | Pseudocode | N/A | N/A | Thread-safe concurrency |
| URL Shortening | Full Implementation | PostgreSQL | Redis | Configurable strategies |
| User Signup | Full Implementation | PostgreSQL | Redis | Race condition prevention |
| Web Crawler | Full Implementation | MongoDB | Redis | Rate limiting & resilience |

---

*← [Back to Main Index](../README.md)*
