# Requirement Analysis Guidelines for System Design

## Table of Contents
1. [Introduction](#introduction)
2. [Understanding the Problem Statement](#understanding-the-problem-statement)
3. [Functional Requirements Analysis](#functional-requirements-analysis)
4. [Non-Functional Requirements Analysis](#non-functional-requirements-analysis)
5. [Requirements Gathering Techniques](#requirements-gathering-techniques)
6. [HLD Creation Prerequisites](#hld-creation-prerequisites)
7. [LLD Creation Prerequisites](#lld-creation-prerequisites)
8. [Checklists and Templates](#checklists-and-templates)
9. [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)
10. [Real-World Examples](#real-world-examples)

---

## Introduction

Before diving into High-Level Design (HLD) and Low-Level Design (LLD), thorough requirement analysis is crucial. This document provides guidelines for systematically analyzing both functional and non-functional requirements.

### Why Requirement Analysis Matters

- **Prevents costly rework**: Identifying issues early saves time and resources
- **Ensures stakeholder alignment**: Clear requirements reduce misunderstandings
- **Guides design decisions**: Well-analyzed requirements inform architectural choices
- **Enables accurate estimation**: Clear requirements lead to better time/scope estimates

### Document Purpose

This guide helps you:
- Analyze problems systematically
- Extract and document requirements effectively
- Prepare comprehensive requirement specifications before design
- Make informed architectural decisions based on requirements

---

## Understanding the Problem Statement

### Step 1: Initial Problem Comprehension

#### 1.1 Read the Problem Statement Carefully
- Read multiple times to understand the full scope
- Identify the core problem being solved
- Note any explicit constraints mentioned

#### 1.2 Identify the Problem Domain
- What industry does this system belong to?
- Who are the primary users?
- What is the business context?

#### 1.3 Determine System Boundaries
- What's inside the system?
- What's outside (external systems, users, dependencies)?
- What are the integration points?

### Step 2: Clarify Ambiguities

#### 2.1 Ask Clarifying Questions

**User-Related Questions:**
- Who are the end-users?
- How many users are expected?
- What are user roles and permissions?

**Functionality-Related Questions:**
- What are the core features?
- Are there any nice-to-have features?
- What features can be delayed to future versions?

**Data-Related Questions:**
- What data needs to be stored?
- What is the data volume?
- What are the data relationships?

**Performance-Related Questions:**
- What are the response time requirements?
- How many concurrent users are expected?
- What is the expected growth rate?

### Step 3: Identify Success Criteria

Define what makes the system successful:
- Must-have criteria (deal-breakers if not met)
- Should-have criteria (important but flexible)
- Nice-to-have criteria (enhancements for future)

### Step 4: Create Problem Summary

Write a concise problem statement (2-3 sentences) that captures:
- What problem is being solved
- Who benefits from the solution
- Why the solution is needed

---

## Functional Requirements Analysis

Functional requirements define **what** the system should do. They describe specific behaviors, functions, and features.

### Categorization of Functional Requirements

#### 1. Core Business Functions

These are the primary functions that deliver value to users.

**Analysis Steps:**
1. **Identify Business Processes**
   - What business processes does the system support?
   - What are the inputs and outputs for each process?
   - What are the process flows and decision points?

2. **Define Use Cases**
   - Identify actors (users, external systems)
   - Document main success scenarios
   - Identify alternative flows and exception cases
   - Define preconditions and postconditions

**Example Template:**

```markdown
### Use Case: User Registration

**Actor:** Unauthenticated User

**Preconditions:**
- User has valid email
- User is not already registered

**Main Flow:**
1. User navigates to registration page
2. User enters personal information
3. User submits registration form
4. System validates input data
5. System creates user account
6. System sends verification email
7. User verifies email address
8. Account becomes active

**Alternative Flows:**
- Email already exists: Show error, prompt login
- Invalid email format: Show validation error
- System unavailable: Display error message

**Postconditions:**
- User account created in database
- Verification email sent
- User not logged in until verification
```

#### 2. User Interactions

Define how users interact with the system.

**Analysis Steps:**
1. **User Interface Requirements**
   - What screens/pages are needed?
   - What user actions are supported?
   - What information is displayed?
   - How do users navigate through the system?

2. **Input Requirements**
   - What data does user need to provide?
   - What are the validation rules for each input?
   - What are the default values?
   - What is the expected format?

3. **Output Requirements**
   - What information does the system display?
   - What are the report formats?
   - How is data presented (charts, tables, etc.)?

#### 3. Data Requirements

Define data storage and management needs.

**Analysis Steps:**
1. **Data Entities**
   - What entities exist in the system?
   - What are the attributes of each entity?
   - What are the relationships between entities?

**Example:**

| Entity | Attributes | Relationships |
|--------|------------|--------------|
| User | id, name, email, password_hash | has_many Orders |
| Order | id, user_id, total, status | belongs_to User, has_many OrderItems |
| OrderItem | id, order_id, product_id, quantity | belongs_to Order, belongs_to Product |

2. **Data Operations**
   - Create, Read, Update, Delete (CRUD) operations for each entity
   - Bulk operations needed
   - Data import/export requirements

3. **Data Constraints**
   - Unique constraints
   - Referential integrity
   - Business rules (e.g., order status transitions)

#### 4. Integration Requirements

Define how the system interacts with external systems.

**Analysis Steps:**
1. **External Systems**
   - Which external systems need integration?
   - What is the purpose of each integration?
   - What data flows between systems?

2. **Integration Protocols**
   - REST APIs, GraphQL, gRPC, message queues
   - Authentication/authorization requirements
   - Data formats (JSON, XML, Protocol Buffers)

3. **Integration Scenarios**
   - Real-time sync
   - Batch processing
   - Event-driven communication

**Example Template:**

```markdown
### Integration: Payment Gateway

**External System:** Stripe API

**Purpose:** Process payments for orders

**Data Flow:**
- Outgoing: Order details, payment amount, customer info
- Incoming: Payment confirmation, transaction ID, status

**Protocol:** REST API (HTTPS)

**Authentication:** API Key + Client Secret

**Error Handling:**
- Retry logic for transient failures
- Notify user for payment failures
- Log all failed transactions
```

### Functional Requirements Specification Format

Use the following template to document functional requirements:

```markdown
### FR-001: [Requirement Title]

**Description:** [Detailed description of the requirement]

**Priority:** [Must Have / Should Have / Nice to Have]

**User Story:**
As a [role],
I want to [feature],
So that [benefit]

**Acceptance Criteria:**
- [AC1]: Given [precondition], when [action], then [outcome]
- [AC2]: Given [precondition], when [action], then [outcome]

**Dependencies:**
- [List of related requirements]

**Notes:**
[Any additional information or edge cases]
```

### Functional Requirements Checklist

- [ ] All core business functions identified
- [ ] All user roles defined
- [ ] All user interfaces specified
- [ ] All input validations defined
- [ ] All output formats specified
- [ ] All data entities identified with attributes
- [ ] All entity relationships documented
- [ ] All CRUD operations defined
- [ ] All external integrations specified
- [ ] All error scenarios identified
- [ ] All acceptance criteria written
- [ ] All priorities assigned
- [ ] Dependencies between requirements documented

---

## Non-Functional Requirements Analysis

Non-functional requirements define **how** the system should behave. They specify quality attributes and constraints.

### Categories of Non-Functional Requirements

#### 1. Performance Requirements

Define system performance characteristics.

**Analysis Steps:**
1. **Response Time Requirements**
   - What is the acceptable response time for each operation?
   - Define as p50, p95, p99 percentiles

**Example:**
| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| User Login | < 100ms | < 200ms | < 500ms |
| Search Query | < 200ms | < 500ms | < 1s |
| Order Creation | < 500ms | < 1s | < 2s |

2. **Throughput Requirements**
   - Requests per second (RPS)
   - Transactions per second (TPS)
   - Operations per second (OPS)

**Example:**
- API Gateway: 10,000 RPS
- Database Writes: 5,000 TPS
- Database Reads: 20,000 OPS

3. **Concurrency Requirements**
   - Number of simultaneous users
   - Number of concurrent connections
   - Peak traffic handling

**Example:**
```markdown
### NFR-PERF-001: Concurrent Users

**Description:** System must support 10,000 concurrent users during peak hours.

**Definition of Concurrent User:**
- A user who has performed at least one action in the last 5 minutes

**Peak Traffic:**
- Occurs between 9 AM - 11 AM and 2 PM - 4 PM
- Expected duration: 2 hours per peak

**Metrics to Track:**
- Active sessions
- API requests per second
- Database connection pool utilization
```

#### 2. Scalability Requirements

Define system's ability to handle growth.

**Analysis Steps:**
1. **Growth Projections**
   - Expected user growth over time (3 months, 6 months, 1 year, 3 years)
   - Expected data growth
   - Expected traffic growth

**Example:**
| Timeframe | Users | Daily Requests | Data Size |
|-----------|-------|----------------|-----------|
| Initial | 10,000 | 100K | 10 GB |
| 6 Months | 100,000 | 1M | 100 GB |
| 1 Year | 500,000 | 5M | 500 GB |
| 3 Years | 2M | 20M | 5 TB |

2. **Scaling Strategy**
   - Vertical scaling (scale up) or Horizontal scaling (scale out)?
   - Stateless services for easier horizontal scaling
   - Database scaling strategies (read replicas, sharding)

**Example:**
```markdown
### NFR-SCAL-001: Horizontal Scalability

**Requirement:** System must support horizontal scaling of stateless services.

**Scalability Targets:**
- Add nodes without downtime
- Auto-scaling based on CPU utilization (>70%)
- Support up to 100 instances per service

**State Management:**
- All user sessions stored in Redis
- File uploads stored in object storage (S3)
- No local state on application servers
```

#### 3. Availability Requirements

Define system uptime and reliability.

**Analysis Steps:**
1. **Uptime Targets**
   - Define as percentage over a time period
   - Common standards: 99.9%, 99.99%, 99.999%

**Example:**
| Availability Level | Uptime % | Downtime per Year | Downtime per Month | Downtime per Week |
|-------------------|----------|-------------------|-------------------|-------------------|
| Two 9s | 99% | 3.65 days | 7.31 hours | 1.68 hours |
| Three 9s | 99.9% | 8.77 hours | 43.83 minutes | 10.08 minutes |
| Four 9s | 99.99% | 52.60 minutes | 4.38 minutes | 1.01 minutes |
| Five 9s | 99.999% | 5.26 minutes | 26.30 seconds | 6.05 seconds |

2. **Failure Scenarios**
   - Single node failure
   - Availability zone failure
   - Regional failure (if applicable)
   - Network partitions

**Example:**
```markdown
### NFR-AVAIL-001: High Availability

**Requirement:** System must maintain 99.9% uptime with no single point of failure.

**Failure Handling:**
- Single node failure: Automatic failover within 30 seconds, no downtime
- AZ failure: Traffic rerouted to remaining AZs within 1 minute, <5% traffic loss
- Database failover: Promote replica within 60 seconds, minimal data loss (<1 second)

**Maintenance Windows:**
- No scheduled downtime for deployments
- Rolling updates only
- Blue-green deployment support
```

#### 4. Reliability Requirements

Define system's ability to perform correctly consistently.

**Analysis Steps:**
1. **Error Rate Targets**
   - Define acceptable error rates
   - Differentiate between client errors (4xx) and server errors (5xx)

**Example:**
| Metric Type | Target |
|-------------|--------|
| Overall Error Rate | < 0.1% |
| 5xx Server Errors | < 0.01% |
| 4xx Client Errors | < 0.1% |

2. **Data Integrity**
   - Data consistency requirements
   - Data durability requirements
   - Backup and restore requirements

**Example:**
```markdown
### NFR-REL-001: Data Durability

**Requirement:** Data must be durable with 99.999999999% (11 9s) durability.

**Implementation:**
- Multi-AZ database replication
- Daily automated backups with 30-day retention
- Point-in-time recovery (PITR) with 35-day window
- Cross-region backup replication for disaster recovery

**Backup Testing:**
- Monthly restore testing
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 5 minutes
```

#### 5. Security Requirements

Define security controls and protections.

**Analysis Steps:**
1. **Authentication & Authorization**
   - Authentication mechanisms (passwords, OAuth, SSO, MFA)
   - Authorization models (RBAC, ABAC)
   - Session management

**Example:**
```markdown
### NFR-SEC-001: Authentication

**Requirement:** Users must authenticate using industry-standard mechanisms.

**Authentication Methods:**
- Email/password with bcrypt hashing (minimum 12 rounds)
- OAuth 2.0 / OpenID Connect (Google, GitHub, etc.)
- Multi-factor authentication (TOTP or SMS) for admin users
- JWT tokens for API authentication (15-minute expiry)

**Password Policy:**
- Minimum 12 characters
- At least one uppercase, lowercase, number, special character
- No common passwords
- Force password change every 90 days

**Account Security:**
- Account lockout after 5 failed attempts (15-minute cooldown)
- Email verification required for new accounts
- Email notification for suspicious login attempts
```

2. **Data Protection**
   - Data encryption at rest
   - Data encryption in transit
   - PII handling
   - Data retention policies

**Example:**
```markdown
### NFR-SEC-002: Data Encryption

**Requirement:** All sensitive data must be encrypted at rest and in transit.

**Encryption Standards:**
- At Rest: AES-256 for database, S3, EBS volumes
- In Transit: TLS 1.3 for all network communications

**Key Management:**
- AWS KMS for key management
- Key rotation every 90 days
- Hardware Security Module (HSM) for master keys

**Sensitive Data Masking:**
- Logs must not contain PII
- Database backups encrypted
- API responses must not expose sensitive data
```

3. **Compliance Requirements**
   - GDPR, HIPAA, PCI-DSS, SOC 2, etc.
   - Audit logging requirements
   - Data residency requirements

#### 6. Maintainability Requirements

Define ease of system maintenance and evolution.

**Analysis Steps:**
1. **Code Quality**
   - Code review process
   - Code coverage targets
   - Documentation requirements

**Example:**
```markdown
### NFR-MAINT-001: Code Quality Standards

**Code Coverage:**
- Minimum 80% unit test coverage
- Minimum 70% integration test coverage
- Critical path must have 95%+ coverage

**Code Review:**
- All code changes require at least 1 approval
- No reviewer can approve their own code
- Automated checks must pass (linting, tests, security scans)

**Documentation:**
- All public APIs documented (OpenAPI/Swagger)
- Architecture decision records (ADRs) for major decisions
- README for each microservice
- Deployment documentation
```

2. **Monitoring & Observability**
   - Logging requirements
   - Metrics requirements
   - Tracing requirements
   - Alerting requirements

**Example:**
```markdown
### NFR-MAINT-002: Observability

**Logging:**
- Structured JSON logging
- Log levels: DEBUG, INFO, WARN, ERROR
- Minimum retention: 30 days
- Centralized logging (ELK/CloudWatch)
- Correlation ID for request tracing

**Metrics:**
- Request latency (p50, p95, p99)
- Request rate, error rate
- Database connection pool usage
- Cache hit/miss ratios
- Custom business metrics

**Distributed Tracing:**
- End-to-end request tracing
- Service dependency graph
- Trace sampling: 10% for production

**Alerting:**
- Error rate > 1% for 5 minutes
- p95 latency > target for 10 minutes
- Database connection pool > 90% utilization
- Available memory < 10%
```

#### 7. Usability Requirements

Define user experience quality.

**Analysis Steps:**
1. **User Interface**
   - Responsive design (mobile, tablet, desktop)
   - Accessibility (WCAG compliance)
   - Internationalization (i18n) and localization (l10n)

**Example:**
```markdown
### NFR-USE-001: Responsive Design

**Requirement:** UI must adapt to different screen sizes and devices.

**Supported Viewports:**
- Mobile: 320px - 768px
- Tablet: 768px - 1024px
- Desktop: 1024px+

**Design Principles:**
- Mobile-first design
- Touch-friendly controls (minimum 44x44px)
- No horizontal scrolling on mobile
- Optimized images for different viewports

**Accessibility:**
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatible
- Color contrast minimum 4.5:1
```

#### 8. Compatibility Requirements

Define system compatibility standards.

**Analysis Steps:**
1. **Platform Support**
   - Operating systems
   - Browsers
   - Device types

**Example:**
```markdown
### NFR-COMP-001: Browser Compatibility

**Supported Browsers (current + 2 versions):**
- Chrome (Desktop & Android)
- Safari (Desktop & iOS)
- Firefox (Desktop & Android)
- Edge (Desktop)

**Graceful Degradation:**
- Older browsers must show functional UI
- Progressive enhancement for modern browsers
- Feature detection for JavaScript APIs
```

#### 9. Data Consistency Requirements

Define consistency and data synchronization needs.

**Analysis Steps:**
1. **Consistency Models**
   - Strong consistency vs. eventual consistency
   - CAP theorem considerations
   - Consistency requirements per use case

**Example:**
```markdown
### NFR-CONS-001: Consistency Requirements

**Strong Consistency Required For:**
- Financial transactions
- Inventory counts
- User authentication status

**Eventual Consistency Acceptable For:**
- Search indexing
- Analytics and reporting
- Recommendations
- Email notifications

**Consistency Guarantees:**
- Financial data: ACID transactions
- Caching: Write-through or write-back with TTL
- Distributed transactions: Saga pattern for multi-service
```

### Non-Functional Requirements Template

Use this template to document NFRs:

```markdown
### NFR-[ID]: [Category] - [Title]

**Description:** [Detailed description]

**Priority:** [Must Have / Should Have / Nice to Have]

**Metric/Measurement:**
- [Metric 1]: [Value]
- [Metric 2]: [Value]

**Acceptance Criteria:**
- [AC1]: [Criteria]
- [AC2]: [Criteria]

**Testing Approach:**
- Load testing: [Details]
- Stress testing: [Details]
- Security testing: [Details]
- etc.

**Trade-offs:**
- [Describe trade-offs if any]
```

### Non-Functional Requirements Checklist

- [ ] Performance requirements defined (response time, throughput)
- [ ] Scalability requirements documented with growth projections
- [ ] Availability targets specified with SLA
- [ ] Reliability requirements (error rate, data integrity) defined
- [ ] Security requirements (auth, encryption, compliance) specified
- [ ] Maintainability requirements (code quality, observability) defined
- [ ] Usability requirements (responsive, accessibility) specified
- [ ] Compatibility requirements (browsers, platforms) documented
- [ ] Data consistency requirements clarified
- [ ] All requirements measurable with specific metrics
- [ ] Testing approaches defined for each NFR
- [ ] Trade-offs documented

---

## Requirements Gathering Techniques

### 1. Stakeholder Interviews

**Purpose:** Direct information gathering from stakeholders

**Best Practices:**
- Interview key stakeholders individually first
- Follow up with group sessions to align on shared understanding
- Prepare interview questions in advance
- Record and document conversations
- Validate understanding by paraphrasing

**Key Questions:**
- "What problem are you trying to solve?"
- "What does success look like for this project?"
- "What are the must-have features?"
- "What constraints (budget, time, technical) do we have?"
- "Who are the end users and how will they use the system?"

### 2. Use Case Modeling

**Purpose:** Capture functional requirements from user perspective

**Steps:**
1. Identify actors (users, external systems)
2. Define use cases for each actor
3. Document main success scenarios
4. Identify alternative flows and exceptions
5. Create use case diagrams

### 3. User Stories

**Purpose:** Express requirements in user-centric language

**Template:**
```
As a [role],
I want to [feature],
So that [benefit]
```

**Acceptance Criteria:**
- Given [context]
- When [action]
- Then [outcome]

### 4. Requirement Workshops

**Purpose:** Collaborative requirement gathering with all stakeholders

**Structure:**
- **Kickoff:** Present problem statement and goals
- **Brainstorming:** Generate ideas and requirements
- **Grouping:** Categorize and prioritize requirements
- **Clarification:** Resolve ambiguities
- **Validation:** Confirm understanding with stakeholders

### 5. Prototyping

**Purpose:** Visualize requirements and gather feedback

**Types:**
- **Low-fidelity:** Wireframes, sketches
- **Medium-fidelity:** Clickable mockups
- **High-fidelity:** Interactive prototypes

**Benefits:**
- Helps stakeholders visualize the system
- Identifies missing requirements early
- Enables iterative feedback

### 6. Competitive Analysis

**Purpose:** Learn from existing solutions

**Steps:**
1. Identify competitor systems
2. Analyze their features and functionality
3. Evaluate strengths and weaknesses
4. Identify opportunities for differentiation

### 7. Questionnaires & Surveys

**Purpose:** Gather requirements from large user groups

**Use Cases:**
- Understanding user demographics
- Identifying pain points with current solutions
- Prioritizing features based on user demand

### 8. Document Analysis

**Purpose:** Extract requirements from existing documentation

**Sources:**
- Existing system documentation
- Business process documents
- Industry standards and regulations
- Support tickets and bug reports

---

## HLD Creation Prerequisites

Before creating High-Level Design, ensure you have:

### 1. Complete Requirements Document

**Required Sections:**
- [ ] Clear problem statement
- [ ] All functional requirements documented
- [ ] All non-functional requirements documented
- [ ] Stakeholder sign-off on requirements
- [ ] Prioritized requirements with must-have/should-have/nice-to-have

### 2. Capacity Planning Data

**Required Information:**
- [ ] Current user base size
- [ ] Projected growth (3, 6, 12, 36 months)
- [ ] Request patterns (read/write ratios)
- [ ] Data volume estimates
- [ ] Peak traffic estimates
- [ ] Geographic distribution of users

### 3. Technical Constraints

**Documented Constraints:**
- [ ] Technology stack restrictions (languages, frameworks)
- [ ] Budget constraints (infrastructure, licensing)
- [ ] Timeline constraints (deadlines, milestones)
- [ ] Team size and expertise
- [ ] Integration requirements with existing systems
- [ ] Compliance requirements (GDPR, HIPAA, PCI-DSS)

### 4. Risk Assessment

**Identified Risks:**
- [ ] Technical risks (technology maturity, complexity)
- [ ] Operational risks (deployment, monitoring, maintenance)
- [ ] Business risks (budget overruns, timeline delays)
- [ ] Security risks
- [ ] Mitigation strategies for each risk

### 5. Assumptions and Dependencies

**Documented Assumptions:**
- [ ] Third-party service availability
- [ ] Infrastructure availability
- [ ] User behavior assumptions
- [ ] Data growth assumptions

**Documented Dependencies:**
- [ ] External system dependencies
- [ ] Internal team dependencies
- [ ] Stakeholder dependencies

### HLD Readiness Checklist

```
□ Requirements Analysis Complete
  □ Functional requirements gathered and documented
  □ Non-functional requirements defined with metrics
  □ Requirements prioritized
  □ Stakeholder sign-off obtained

□ Capacity Planning Complete
  □ Current and projected user base defined
  □ Traffic patterns analyzed
  □ Data volume estimated
  □ Peak usage scenarios identified

□ Technical Constraints Documented
  □ Technology stack chosen/validated
  □ Budget constraints known
  □ Timeline defined
  □ Team capabilities assessed

□ Risk Assessment Complete
  □ Technical risks identified
  □ Operational risks identified
  □ Mitigation strategies defined

□ Assumptions and Dependencies Documented
  □ All assumptions listed
  □ All dependencies identified
  □ Contingency plans defined
```

---

## LLD Creation Prerequisites

Before creating Low-Level Design, ensure you have:

### 1. Approved HLD

**Required HLD Artifacts:**
- [ ] Architecture diagrams (system, component, deployment)
- [ ] Technology stack decisions
- [ ] Database design (ER diagrams, schemas)
- [ ] API contracts (OpenAPI/Swagger)
- [ ] Component interactions and data flow
- [ ] Security architecture
- [ ] Deployment architecture
- [ ] HLD reviewed and approved

### 2. Detailed API Specifications

**API Documentation Must Include:**
- [ ] Endpoint URLs and HTTP methods
- [ ] Request/response schemas
- [ ] Authentication/authorization requirements
- [ ] Error response formats
- [ ] Rate limiting details
- [ ] Pagination details
- [ ] Query parameters and filters
- [ ] Example requests and responses

### 3. Database Schema Design

**Database Design Must Include:**
- [ ] Complete table definitions
- [ ] Column types and constraints
- [ ] Index definitions
- [ ] Foreign key relationships
- [ ] Normalization level
- [ ] Migration scripts

### 4. Component Interface Definitions

**For Each Component:**
- [ ] Class/interface definitions
- [ ] Method signatures
- [ ] Input/output contracts
- [ ] Error handling contracts
- [ ] Dependencies

### 5. Testing Strategy

**Testing Requirements:**
- [ ] Unit testing requirements
- [ ] Integration testing requirements
- [ ] End-to-end testing requirements
- [ ] Performance testing requirements
- [ ] Security testing requirements
- [ ] Test coverage targets

### 6. Design Patterns and Standards

**Documented Decisions:**
- [ ] Design patterns to use (Singleton, Factory, Repository, etc.)
- [ ] Coding standards and conventions
- [ ] Naming conventions
- [ ] Error handling patterns
- [ ] Logging patterns

### LLD Readiness Checklist

```
□ HLD Approved
  □ Architecture diagrams complete
  □ Technology stack finalized
  □ Database design complete
  □ API specifications documented
  □ HLD reviewed and approved

□ Detailed Design Documents Ready
  □ API contracts fully specified
  □ Database schema frozen
  □ Component interfaces defined
  □ Data models documented

□ Technical Standards Defined
  □ Coding standards established
  □ Design patterns selected
  □ Error handling strategy defined
  □ Logging strategy defined

□ Testing Strategy Defined
  □ Test coverage targets set
  □ Testing frameworks selected
  □ Test environments planned
  □ CI/CD pipeline defined
```

---

## Checklists and Templates

### Requirements Elicitation Checklist

**Initial Discovery:**
- [ ] Understand business problem and context
- [ ] Identify all stakeholders
- [ ] Gather existing documentation
- [ ] Analyze competitive solutions
- [ ] Document assumptions

**Functional Requirements:**
- [ ] Identify all user roles
- [ ] Document all user stories
- [ ] Create use case diagrams
- [ ] Define all user interfaces
- [ ] Specify all CRUD operations
- [ ] Document business rules
- [ ] Identify all integrations
- [ ] Define error handling requirements

**Non-Functional Requirements:**
- [ ] Define performance targets (latency, throughput)
- [ ] Specify scalability requirements
- [ ] Define availability targets (SLA)
- [ ] Specify security requirements
- [ ] Define reliability requirements
- [ ] Specify maintainability needs
- [ ] Define usability requirements
- [ ] Specify compliance needs

**Validation:**
- [ ] Requirements are measurable
- [ ] Requirements are testable
- [ ] Requirements are complete
- [ ] Requirements are consistent
- [ ] Requirements are prioritized
- [ ] Stakeholder review complete
- [ ] Sign-off obtained

### Requirements Quality Criteria

Use these criteria to validate requirements:

**Complete:**
- The requirement includes all necessary information
- No missing details or unspecified behavior

**Consistent:**
- No contradictions between requirements
- No conflicts with other requirements

**Unambiguous:**
- The requirement has only one interpretation
- Clear and precise language used

**Verifiable:**
- The requirement can be tested or validated
- Specific acceptance criteria defined

**Prioritized:**
- Importance level assigned (Must/Should/Could)
- Dependencies identified

**Feasible:**
- Can be implemented given constraints
- Within technical and budget limitations

**Necessary:**
- Adds value to the system
- No superfluous requirements

**Traceable:**
- Can be linked to business objectives
- Can be traced through design and implementation

---

## Common Pitfalls to Avoid

### 1. Requirements Pitfalls

**Pitfall:** Gathering requirements from wrong stakeholders
- **Solution:** Identify all stakeholder groups (users, business, operations, security, compliance)

**Pitfall:** Focusing too much on how instead of what
- **Solution:** Understand requirements first, defer implementation decisions to design phase

**Pitfall:** Assuming instead of asking
- **Solution:** Validate all assumptions with stakeholders, don't guess

**Pitfall:** Documenting requirements too vaguely
- **Solution:** Use specific, measurable language with concrete examples

**Pitfall:** Ignoring non-functional requirements
- **Solution:** Treat NFRs as equally important as functional requirements

**Pitfall:** Not prioritizing requirements
- **Solution:** Prioritize using MoSCoW method (Must, Should, Could, Won't)

### 2. Analysis Pitfalls

**Pitfall:** Over-engineering
- **Solution:** Focus on requirements, solve actual problems, not hypothetical ones

**Pitfall:** Under-estimating growth
- **Solution:** Plan for 10x growth from the start, use scalable architectures

**Pitfall:** Ignoring edge cases
- **Solution:** Think about what could go wrong, document error scenarios

**Pitfall:** Not considering constraints early
- **Solution:** Identify technical, budget, and time constraints upfront

**Pitfall:** Skipping validation
- **Solution:** Prototype early, validate requirements with users

### 3. Documentation Pitfalls

**Pitfall:** Requirements document is too long
- **Solution:** Use structured documentation with clear sections, include executive summary

**Pitfall:** Requirements are not traceable
- **Solution:** Use unique IDs, maintain traceability matrix

**Pitfall:** Requirements not versioned
- **Solution:** Use version control, track changes

**Pitfall:** Requirements living in documents that nobody reads
- **Solution:** Keep documents living, review regularly, make them accessible

---

## Real-World Examples

### Example 1: E-Commerce System Requirements Analysis

**Problem Statement:**
Build an online marketplace where users can buy and sell products.

#### Functional Requirements

**User Management:**
- Users must be able to register, login, and manage their profile
- Two types of users: buyers and sellers
- Email verification required
- Password recovery mechanism

**Product Management:**
- Sellers can create, update, delete product listings
- Products have: name, description, price, images, category, inventory
- Search products by name, category, price range

**Order Management:**
- Buyers can add products to cart
- Checkout process: payment processing, order confirmation
- Order tracking (placed, shipped, delivered)
- Order history for buyers

**Payment:**
- Integration with Stripe
- Support credit/debit cards
- Refund processing

#### Non-Functional Requirements

**Performance:**
- Page load time < 2 seconds (p95)
- Search response < 500ms (p95)
- Support 10,000 concurrent users

**Scalability:**
- Horizontal scaling capability
- Handle 10x traffic growth
- Auto-scaling based on load

**Availability:**
- 99.9% uptime
- No single point of failure
- Multi-AZ deployment

**Security:**
- HTTPS for all connections
- PCI-DSS compliance for payments
- Secure password storage (bcrypt)
- Rate limiting on APIs

---

### Example 2: URL Shortening Service Requirements Analysis

**Problem Statement:**
Create a service that converts long URLs into short, shareable links.

#### Functional Requirements

**URL Shortening:**
- Users submit a long URL and receive a short URL
- Custom short codes allowed (optional)
- Short URLs must be unique
- Redirect short URL to original long URL

**Analytics:**
- Track click count for each short URL
- Track timestamps of clicks
- Track geographic location of clicks (optional)

**User Accounts (Optional):**
- Registered users can manage their URLs
- View analytics for their URLs
- Delete URLs they created

#### Non-Functional Requirements

**Performance:**
- Short URL creation: < 200ms (p95)
- Redirection: < 100ms (p95)
- Support 100M URLs total
- Handle 1M redirections per day

**Availability:**
- 99.99% uptime (critical service)
- Redis caching for short URLs
- Read replicas for database

**Scalability:**
- Stateless application servers
- Database sharding for scale
- CDN for static assets

**Reliability:**
- Short URLs must never expire
- Data durability: 11 9s
- Daily backups

---

## Summary

### Key Takeaways

1. **Requirements analysis is foundational**: Thorough analysis prevents costly rework later
2. **Both FRs and NFRs matter equally**: Don't neglect non-functional requirements
3. **Make requirements measurable**: Define specific metrics and acceptance criteria
4. **Involve stakeholders early and often**: Continuous validation prevents misunderstandings
5. **Document assumptions and constraints**: These impact design decisions significantly
6. **Prioritize requirements**: Not all requirements are equally important
7. **Validate requirements**: Use prototyping and proof-of-concepts to validate
8. **Maintain traceability**: Keep requirements linked to design, implementation, and tests

### Before Moving to HLD:

✅ Complete requirements document with FRs and NFRs  
✅ Capacity planning data  
✅ Technical constraints documented  
✅ Risk assessment complete  
✅ Stakeholder sign-off obtained  

### Before Moving to LLD:

✅ Approved HLD  
✅ Detailed API specifications  
✅ Database schema frozen  
✅ Component interfaces defined  
✅ Testing strategy documented  
✅ Technical standards established  

### Best Practices

- Start with understanding the problem, not the solution
- Gather requirements iteratively, not all at once
- Use multiple techniques (interviews, workshops, prototyping)
- Document requirements clearly and specifically
- Validate requirements with stakeholders continuously
- Plan for growth and change
- Consider operational aspects early (monitoring, deployment)

---

## Additional Resources

### Books
- "Software Requirements" by Karl Wiegers
- "Writing Effective Use Cases" by Alistair Cockburn
- "Systems Engineering and Analysis" by Benjamin Blanchard

### Frameworks
- MoSCoW Method for prioritization
- INVEST criteria for user stories
-