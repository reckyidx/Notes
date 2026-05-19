// This file defines the structure and metadata for all content
// Markdown files are imported at build time using import.meta.glob

export const interviewPrepCategories = [
  {
    id: 'core-concepts',
    name: 'Core Concepts',
    description: 'Foundational backend concepts every senior developer must know.',
    files: [
      {
        name: '01-caching-questions.md',
        title: 'Caching',
        keyAreas: 'Redis strategies, Write-Through/Write-Behind, Cache stampede, Distributed locking',
      },
      {
        name: '02-rabbitmq-questions.md',
        title: 'RabbitMQ',
        keyAreas: 'Exchange types, Message patterns, Dead letter queues, Circuit breaker',
      },
      {
        name: '03-api-questions.md',
        title: 'API Design',
        keyAreas: 'RESTful design, Versioning, Rate limiting, Distributed tracing',
      },
      {
        name: 'backend-terms.md',
        title: 'Terminology',
        keyAreas: 'Database, API, Performance, Architecture, Security, DevOps terms',
      },
    ],
  },
  {
    id: 'architecture',
    name: 'Architecture',
    description: 'System architecture and distributed systems concepts.',
    files: [
      {
        name: '05-microservices-questions.md',
        title: 'Microservices',
        keyAreas: 'Service discovery, API Gateway, Database per service, Event-driven',
      },
      {
        name: '08-backend-architecture-questions.md',
        title: 'Backend Architecture',
        keyAreas: 'Monolithic vs Microservices, Scaling, Load balancing, HA patterns',
      },
      {
        name: '15-load-balancer-networking.md',
        title: 'Load Balancing & Networking',
        keyAreas: 'L4/L7 LB, Algorithms, Health checks, Failover',
      },
      {
        name: '16-consistency-models.md',
        title: 'Consistency Models',
        keyAreas: 'CAP theorem, PACELC, Distributed transactions, Saga pattern',
      },
    ],
  },
  {
    id: 'programming',
    name: 'Programming',
    description: 'Language and framework deep-dives.',
    files: [
      {
        name: '07-javascript-questions.md',
        title: 'JavaScript',
        keyAreas: 'Event loop, Closures, Async/Await, ES6+, Prototypes',
      },
      {
        name: '06-oops-nodejs-questions.md',
        title: 'OOP in Node.js',
        keyAreas: 'Classes, Inheritance, Design patterns, SOLID principles',
      },
      {
        name: '14-react-questions.md',
        title: 'React',
        keyAreas: 'Fiber architecture, Hooks, State management, SSR, Performance',
      },
    ],
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Authentication, authorization, and security patterns.',
    files: [
      {
        name: '09-auth-security-questions.md',
        title: 'Auth & Security',
        keyAreas: 'JWT, OAuth2/OIDC, Zero-trust, RBAC, Secrets management, Incident response',
      },
    ],
  },
  {
    id: 'devops-and-cloud',
    name: 'DevOps & Cloud',
    description: 'Containerization, cloud services, and infrastructure.',
    files: [
      {
        name: '10-docker-questions.md',
        title: 'Docker',
        keyAreas: 'Dockerfile optimization, Multi-stage builds, Docker Compose, Networking',
      },
      {
        name: '11-aws-cloud-questions.md',
        title: 'AWS Cloud',
        keyAreas: 'EC2, Lambda, S3, RDS, DynamoDB, API Gateway, Serverless',
      },
    ],
  },
  {
    id: 'data-and-search',
    name: 'Data & Search',
    description: 'Databases and search engines.',
    files: [
      {
        name: '04-sql-nosql-questions.md',
        title: 'SQL & NoSQL',
        keyAreas: 'PostgreSQL, MongoDB, Redis, ACID, Connection pooling, Aggregations',
      },
      {
        name: '04-sql-nosql-questions-extended.md',
        title: 'SQL & NoSQL (Extended)',
        keyAreas: 'Indexing strategies, Query optimization, Replication, Sharding',
      },
      {
        name: '12-elasticsearch-questions.md',
        title: 'Elasticsearch',
        keyAreas: 'Node roles, Index mappings, Query DSL, Aggregations, Cluster scaling',
      },
    ],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'Senior/Principal-level topics.',
    files: [
      {
        name: '13-advanced-topics-10years.md',
        title: 'Advanced Topics',
        keyAreas: 'System design at scale (100K RPS), Testing strategies, CI/CD, Observability, Cost optimization, Leadership',
      },
    ],
  },
];

export const systemDesignProjects = [
  {
    id: 'bookmyshow-system',
    name: 'BookMyShow - Movie Ticket Booking',
    description: 'A complete movie ticket booking system with distributed seat locking, real-time availability, and booking lifecycle management.',
    techStack: 'Node.js, Express, PostgreSQL (Prisma), Redis, JWT',
    keyPatterns: 'Repository, Service Layer, Distributed Lock (Redlock)',
    keyChallenge: 'Distributed seat locking',
    type: 'Full Implementation',
    database: 'PostgreSQL',
    cache: 'Redis',
    files: [
      { name: 'README.md', title: 'Overview' },
      { name: 'DESIGN_PATTERNS.md', title: 'Design Patterns' },
      { name: 'REVIEW_FEEDBACK.md', title: 'Review Feedback' },
    ],
  },
  {
    id: 'pub-sub-system',
    name: 'Pub-Sub System (Multithreaded)',
    description: 'A thread-safe Publisher-Subscriber messaging system with concurrent message processing support.',
    techStack: 'Conceptual / Pseudocode',
    keyPatterns: 'Observer, Strategy, Backpressure, Delivery semantics',
    keyChallenge: 'Thread-safe concurrency',
    type: 'Pseudocode',
    database: 'N/A',
    cache: 'N/A',
    files: [
      { name: 'README.md', title: 'Overview' },
      { name: 'ARCHITECTURE.md', title: 'Architecture' },
      { name: 'DESIGN_PATTERNS.md', title: 'Design Patterns' },
    ],
  },
  {
    id: 'url-shortening',
    name: 'URL Shortening Service',
    description: 'A production-ready URL shortening service with configurable strategies, caching, and analytics.',
    techStack: 'Node.js, Express, PostgreSQL (Prisma), Redis, Joi, Winston',
    keyPatterns: 'Strategy (hash/random short codes), Singleton, Repository, Service Layer',
    keyChallenge: 'Configurable strategies',
    type: 'Full Implementation',
    database: 'PostgreSQL',
    cache: 'Redis',
    files: [
      { name: 'README.md', title: 'Overview' },
      { name: 'ARCHITECTURE.md', title: 'Architecture' },
      { name: 'DESIGN_PATTERNS.md', title: 'Design Patterns' },
      { name: 'PROJECT_SUMMARY.md', title: 'Project Summary' },
      { name: 'QUICK_START.md', title: 'Quick Start' },
    ],
  },
  {
    id: 'user-signup-system',
    name: 'User Signup System (Race-Condition-Safe)',
    description: 'A signup system designed to handle concurrent requests safely across multiple servers, preventing duplicate user creation.',
    techStack: 'Node.js, Express, PostgreSQL (Prisma), Redis (Redlock)',
    keyPatterns: 'Distributed Lock (Redlock), Double-Check Pattern, Database Unique Constraint',
    keyChallenge: 'Race condition prevention',
    type: 'Full Implementation',
    database: 'PostgreSQL',
    cache: 'Redis',
    files: [
      { name: 'README.md', title: 'Overview' },
      { name: 'ARCHITECTURE.md', title: 'Architecture' },
    ],
  },
  {
    id: 'web-crawler-kotak-jobs',
    name: 'Web Crawler - Kotak Jobs',
    description: 'A production-ready, scalable web crawler for fetching and aggregating job listings with advanced design patterns.',
    techStack: 'Node.js, MongoDB, Redis, Winston',
    keyPatterns: 'Strategy, Circuit Breaker, Rate Limiter (Token Bucket), Orchestrator',
    keyChallenge: 'Rate limiting & resilience',
    type: 'Full Implementation',
    database: 'MongoDB',
    cache: 'Redis',
    files: [
      { name: 'README.md', title: 'Overview' },
      { name: 'ARCHITECTURE.md', title: 'Architecture' },
      { name: 'DESIGN_PATTERNS.md', title: 'Design Patterns' },
      { name: 'REQUIREMENTS.md', title: 'Requirements' },
      { name: 'PROJECT_SUMMARY.md', title: 'Project Summary' },
    ],
  },
];

export const designGuidelines = {
  id: 'guidelines',
  name: 'Design Guidelines',
  description: 'Comprehensive guide for systematically analyzing functional and non-functional requirements.',
  files: [
    { name: 'REQUIREMENT_ANALYSIS_GUIDELINES.md', title: 'Requirement Analysis Guidelines' },
  ],
};

// Import all markdown files at build time using Vite's import.meta.glob
// The ?raw suffix imports the file content as a string
const interviewPrepModules = import.meta.glob('../../../interview-prep/**/*.md', {
  query: '?raw',
  eager: true,
});

const systemDesignModules = import.meta.glob('../../../system-design/**/*.md', {
  query: '?raw',
  eager: true,
});

// Build a lookup map: relative path -> content string
const contentMap = {};

for (const [path, module] of Object.entries(interviewPrepModules)) {
  // Convert path like "../../../interview-prep/core-concepts/01-caching-questions.md"
  // to key like "interview-prep/core-concepts/01-caching-questions.md"
  const key = path.replace(/^(\.\.\/)+/, '');
  contentMap[key] = typeof module === 'string' ? module : module.default;
}

for (const [path, module] of Object.entries(systemDesignModules)) {
  const key = path.replace(/^(\.\.\/)+/, '');
  contentMap[key] = typeof module === 'string' ? module : module.default;
}

/**
 * Get markdown content by path
 * @param {string} path - Relative path like "interview-prep/core-concepts/01-caching-questions.md"
 * @returns {string|null} The markdown content or null if not found
 */
export function getMarkdownContent(path) {
  return contentMap[path] || null;
}
