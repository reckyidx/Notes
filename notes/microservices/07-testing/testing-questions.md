# Microservices Testing Interview Questions

## Table of Contents
1. [Testing Pyramid](#testing-pyramid)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [Contract Testing](#contract-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Testing Strategies](#testing-strategies)

---

## Testing Pyramid

### Q1. What is the Testing Pyramid?

**Answer:** The Testing Pyramid is a framework that helps determine the optimal balance of different types of tests.

**Structure:**
```
        E2E Tests (1%)
       /            \
      /              \
    Integration Tests (10%)
    /                  \
   /                    \
Unit Tests (70%)
```

**Ratios:**
- **Unit Tests**: 70% - Fast, isolated, many
- **Integration Tests**: 20% - Medium speed, test interactions
- **E2E Tests**: 10% - Slow, test user flows, few

**Characteristics:**

| Test Type | Speed | Cost | Scope | Isolation |
|-----------|-------|------|-------|-----------|
| Unit | Fast (ms) | Low | Single function | Yes |
| Integration | Medium (s) | Medium | Multiple services | Partial |
| E2E | Slow (minutes) | High | Full system | No |

**Benefits of following the pyramid:**
- Faster feedback
- Lower maintenance cost
- More reliable tests
- Better coverage

### Q2. Why are unit tests important in microservices?

**Answer:**

**Benefits:**
1. **Fast Feedback**
   - Run in milliseconds
   - Run locally before commit
   - Fail fast in CI/CD

2. **Low Cost**
   - Easy to write
   - Cheap to maintain
   - No infrastructure needed

3. **High Coverage**
   - Test business logic thoroughly
   - Edge cases and error paths
   - Complex algorithms

4. **Debugging**
   - Pinpoint exact issue
   - Clear stack traces
   - Easy to fix

5. **Refactoring**
   - Confidence in changes
   - Prevent regressions
   - Document expected behavior

**Example:**
```javascript
// order.service.spec.ts
describe('OrderService', () => {
  let service: OrderService;
  let repository: jest.Mocked<OrderRepository>;
  
  beforeEach(() => {
    repository = createMockOrderRepository();
    service = new OrderService(repository);
  });
  
  describe('createOrder', () => {
    it('should create order with valid data', async () => {
      const orderData = { userId: 1, items: [{ id: 1, qty: 2 }] };
      
      repository.save.mockResolvedValue({ id: 1, ...orderData });
      
      const result = await service.createOrder(orderData);
      
      expect(result.id).toBe(1);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1 })
      );
    });
    
    it('should throw error for empty items', async () => {
      const orderData = { userId: 1, items: [] };
      
      await expect(service.createOrder(orderData))
        .rejects.toThrow('Order must have at least one item');
    });
    
    it('should calculate total correctly', async () => {
      const orderData = {
        userId: 1,
        items: [
          { id: 1, qty: 2, price: 10 },
          { id: 2, qty: 3, price: 20 }
        ]
      };
      
      repository.save.mockResolvedValue({ id: 1, total: 80 });
      
      const result = await service.createOrder(orderData);
      
      expect(result.total).toBe(80);
    });
  });
});
```

---

## Unit Testing

### Q3. What are the best practices for unit testing?

**Answer:**

**1. Test Isolation**
```javascript
// Bad - Depends on database
async function testCreateOrder() {
  const order = await db.createOrder({ userId: 1 });
  expect(order.id).toBeDefined();
}

// Good - Mock database
describe('createOrder', () => {
  it('should create order', async () => {
    const mockDb = { save: jest.fn().mockResolvedValue({ id: 1 }) };
    const service = new OrderService(mockDb);
    
    const result = await service.createOrder({ userId: 1 });
    
    expect(result.id).toBe(1);
  });
});
```

**2. Descriptive Test Names**
```javascript
// Bad
it('should work', () => {});
it('tests order', () => {});

// Good
it('should create order with valid data', () => {});
it('should throw error when order has no items', () => {});
it('should calculate total including tax', () => {});
```

**3. AAA Pattern (Arrange-Act-Assert)**
```javascript
it('should calculate order total', () => {
  // Arrange
  const items = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 1 }
  ];
  const order = new Order(items);
  
  // Act
  const total = order.calculateTotal();
  
  // Assert
  expect(total).toBe(25);
});
```

**4. One Assertion Per Test**
```javascript
// Bad - Multiple assertions
it('should validate order', () => {
  const order = new Order(validData);
  expect(order.isValid).toBe(true);
  expect(order.items.length).toBeGreaterThan(0);
  expect(order.total).toBeGreaterThan(0);
});

// Good - Separate tests
it('should be valid with correct data', () => {
  const order = new Order(validData);
  expect(order.isValid).toBe(true);
});

it('should have at least one item', () => {
  const order = new Order(validData);
  expect(order.items.length).toBeGreaterThan(0);
});
```

**5. Test Edge Cases**
```javascript
describe('calculateDiscount', () => {
  it('should apply 10% for orders over $100', () => {
    expect(calculateDiscount(150)).toBe(15);
  });
  
  it('should apply 20% for orders over $500', () => {
    expect(calculateDiscount(600)).toBe(120);
  });
  
  it('should return 0 for orders under $100', () => {
    expect(calculateDiscount(50)).toBe(0);
  });
  
  it('should handle zero total', () => {
    expect(calculateDiscount(0)).toBe(0);
  });
  
  it('should handle negative total', () => {
    expect(calculateDiscount(-10)).toBe(0);
  });
});
```

### Q4. How do you mock external dependencies in unit tests?

**Answer:**

**1. Mocking Databases**
```javascript
import { OrderRepository } from './order.repository';

describe('OrderService', () => {
  it('should save order to repository', async () => {
    // Mock repository
    const mockRepository = {
      save: jest.fn().mockResolvedValue({ id: 1, userId: 123 })
    } as jest.Mocked<OrderRepository>;
    
    const service = new OrderService(mockRepository);
    
    await service.createOrder({ userId: 123, items: [] });
    
    // Verify mock was called
    expect(mockRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 123 })
    );
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });
});
```

**2. Mocking HTTP Calls**
```javascript
import axios from 'axios';

jest.mock('axios');

describe('ExternalService', () => {
  it('should fetch user data', async () => {
    const mockResponse = { data: { id: 1, name: 'John' } };
    axios.get.mockResolvedValue(mockResponse);
    
    const service = new ExternalService();
    const user = await service.getUser(1);
    
    expect(user.name).toBe('John');
    expect(axios.get).toHaveBeenCalledWith('/users/1');
  });
  
  it('should handle errors', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));
    
    const service = new ExternalService();
    
    await expect(service.getUser(1)).rejects.toThrow('Network error');
  });
});
```

**3. Mocking Message Brokers**
```javascript
import { EventBus } from './event-bus';

describe('OrderService', () => {
  it('should publish order created event', async () => {
    const mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined)
    } as jest.Mocked<EventBus>;
    
    const mockRepository = {
      save: jest.fn().mockResolvedValue({ id: 1, userId: 123 })
    };
    
    const service = new OrderService(mockRepository, mockEventBus);
    await service.createOrder({ userId: 123, items: [] });
    
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      'OrderCreated',
      expect.objectContaining({ orderId: 1 })
    );
  });
});
```

**4. Using Test Doubles**
```javascript
// Manual stub
class FakePaymentGateway implements PaymentGateway {
  async charge(amount: number): Promise<boolean> {
    return true;  // Always succeed
  }
}

// Using fake in test
it('should complete order with successful payment', async () => {
  const fakeGateway = new FakePaymentGateway();
  const service = new OrderService(fakeGateway);
  
  const result = await service.completeOrder(orderId);
  
  expect(result.status).toBe('paid');
});
```

---

## Integration Testing

### Q5. What is integration testing in microservices?

**Answer:** Integration testing verifies that different components or services work together correctly.

**Types of Integration Tests:**

**1. Service-Level Integration**
- Test service with real database
- Test service with message broker
- Test service with external APIs

**2. Cross-Service Integration**
- Test communication between services
- Test data flow across services
- Test end-to-end business flows

**Example:**
```typescript
// order.service.integration.spec.ts
describe('OrderService Integration', () => {
  let app: Application;
  let db: Database;
  let eventBus: EventBus;
  
  beforeAll(async () => {
    // Setup real test infrastructure
    db = await createTestDatabase();
    eventBus = await createTestEventBus();
    app = await createApp({ db, eventBus });
  });
  
  afterAll(async () => {
    await db.close();
    await eventBus.close();
  });
  
  beforeEach(async () => {
    await db.clean();  // Clean database before each test
  });
  
  describe('createOrder flow', () => {
    it('should create order and publish event', async () => {
      const orderData = { userId: 1, items: [{ productId: 1, qty: 2 }] };
      
      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(201);
      
      // Verify order in database
      const order = await db.orders.findById(response.body.id);
      expect(order).toBeDefined();
      expect(order.userId).toBe(1);
      
      // Verify event was published
      const events = await eventBus.getPublishedEvents();
      const orderCreatedEvent = events.find(e => e.type === 'OrderCreated');
      expect(orderCreatedEvent).toBeDefined();
      expect(orderCreatedEvent.data.orderId).toBe(response.body.id);
    });
  });
});
```

### Q6. How do you set up integration tests for microservices?

**Answer:**

**1. Testcontainers (Recommended)**
```typescript
import { TestContainer } from 'testcontainers';

describe('Integration Tests', () => {
  let postgres: StartedTestContainer;
  let rabbitmq: StartedTestContainer;
  
  beforeAll(async () => {
    // Start PostgreSQL container
    postgres = await new GenericContainer('postgres:15')
      .withExposedPorts(5432)
      .withEnvironment({ POSTGRES_PASSWORD: 'test' })
      .start();
    
    // Start RabbitMQ container
    rabbitmq = await new GenericContainer('rabbitmq:3-management')
      .withExposedPorts(5672, 15672)
      .start();
    
    // Configure application with test containers
    process.env.DB_URL = `postgresql://postgres:test@localhost:${postgres.getMappedPort(5432)}/test`;
    process.env.RABBITMQ_URL = `amqp://localhost:${rabbitmq.getMappedPort(5672)}`;
  });
  
  afterAll(async () => {
    await postgres.stop();
    await rabbitmq.stop();
  });
});
```

**2. Docker Compose for Tests**
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: test
    ports:
      - "5432:5432"
  
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
  
  test-runner:
    build: .
    command: npm run test:integration
    depends_on:
      - postgres
      - rabbitmq
```

**3. Test Database Setup**
```typescript
// setup.ts
export async function setupTestDatabase() {
  const db = await createConnection({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    database: `test_${randomUUID()}`,
    username: 'postgres',
    password: 'test',
    entities: [Order, User, Product],
    synchronize: true
  });
  
  // Run migrations
  await runMigrations(db);
  
  return db;
}

export async function teardownTestDatabase(db: Connection) {
  await db.dropDatabase();
  await db.close();
}
```

### Q7. What are the challenges of integration testing?

**Answer:**

**1. Slow Execution**
- Multiple services to start
- Database setup and teardown
- Network communication

**Solution:**
```typescript
// Use in-memory database for fast tests
beforeAll(async () => {
  db = await createConnection({
    type: 'sqlite',
    database: ':memory:',
    entities: [Order]
  });
});
```

**2. Flaky Tests**
- Timing issues
- Race conditions
- External dependencies

**Solution:**
```typescript
// Add retries and timeouts
it('should process order', async () => {
  const result = await waitFor(
    () => orderService.getOrderStatus(orderId),
    { timeout: 5000, interval: 100 }
  );
  
  expect(result.status).toBe('completed');
}, 10000);
```

**3. Test Data Management**
- Complex data setup
- Cleanup between tests
- Test data isolation

**Solution:**
```typescript
// Use factories for test data
class OrderFactory {
  static create(overrides: Partial<Order> = {}): Order {
    return {
      id: randomUUID(),
      userId: 1,
      items: [],
      status: 'pending',
      ...overrides
    };
  }
}

// Clean database between tests
beforeEach(async () => {
  await db.query('TRUNCATE TABLE orders CASCADE');
});
```

**4. External Service Dependencies**
- Third-party APIs
- Payment gateways
- Email services

**Solution:**
```typescript
// Use mocks for external services
const mockPaymentGateway = new MockPaymentGateway();
const service = new OrderService(db, mockPaymentGateway);

// Or use contract testing
beforeAll(async () => {
  paymentGatewayMock = await startMockServer(3001);
  paymentGatewayMock.post('/charge').reply(200, { success: true });
});
```

---

## Contract Testing

### Q8. What is contract testing?

**Answer:** Contract testing ensures that a service adheres to a contract (API specification) agreed upon by consumer and provider services.

**Why needed:**
- Prevent breaking changes
- Document API contracts
- Enable independent development
- Catch integration issues early

**Contract Testing Flow:**
```
1. Consumer defines expectations (contract)
2. Provider implements contract
3. Both run contract tests
4. Contracts verified independently
```

### Q9. How do you implement contract testing?

**Answer:**

**Using Pact:**

**Consumer Test:**
```typescript
import { Pact } from '@pact-foundation/pact';
import { OrderClient } from './order-client';

describe('Order API Consumer', () => {
  const provider = new Pact({
    consumer: 'inventory-service',
    provider: 'order-service',
    port: 3923
  });
  
  beforeAll(async () => {
    await provider.setup();
  });
  
  afterAll(async () => {
    await provider.finalize();
  });
  
  afterEach(async () => {
    await provider.verify();
  });
  
  describe('create order', () => {
    beforeAll(async () => {
      await provider.addInteraction({
        state: 'user exists',
        uponReceiving: 'a request to create order',
        withRequest: {
          method: 'POST',
          path: '/api/orders',
          headers: { 'Content-Type': 'application/json' },
          body: {
            userId: 1,
            items: [{ productId: 1, quantity: 2 }]
          }
        },
        willRespondWith: {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
          body: {
            id: like(123),
            userId: 1,
            status: 'created',
            total: like(99.99)
          }
        }
      });
    });
    
    it('creates order successfully', async () => {
      const client = new OrderClient('http://localhost:3923');
      const order = await client.createOrder({
        userId: 1,
        items: [{ productId: 1, quantity: 2 }]
      });
      
      expect(order.id).toBeDefined();
      expect(order.status).toBe('created');
    });
  });
});
```

**Provider Test:**
```typescript
import { Verifier } from '@pact-foundation/pact';
import { app } from './app';

describe('Order API Provider', () => {
  let server: any;
  
  beforeAll(async () => {
    server = app.listen(3000);
  });
  
  afterAll(async () => {
    server.close();
  });
  
  it('validates order contract', async () => {
    const verifier = new Verifier({
      providerBaseUrl: 'http://localhost:3000',
      pactUrls: ['./pacts/inventory-service-order-service.json'],
      provider: 'order-service',
      stateHandlers: {
        'user exists': async () => {
          await setupUser(1);
        }
      }
    });
    
    const output = await verifier.verify();
    expect(output).toContain('Verifying pact');
  });
});
```

### Q10. What are the benefits of contract testing?

**Answer:**

**1. Early Detection**
- Catch breaking changes before deployment
- Identify API mismatches in development
- Prevent production outages

**2. Independent Development**
- Teams can work in parallel
- No need for running provider service
- Faster development cycles

**3. Documentation**
- Contracts serve as living documentation
- Clear API expectations
- Version control for APIs

**4. Continuous Integration**
- Run contract tests in CI/CD
- Block breaking changes
- Automate verification

**5. Reduced Integration Testing**
- Fewer flaky end-to-end tests
- Faster feedback loop
- Lower testing cost

**Example CI/CD Pipeline:**
```yaml
# .github/workflows/contract-testing.yml
name: Contract Tests

on: [push, pull_request]

jobs:
  consumer-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run consumer tests
        run: npm run test:contract:consumer
      - name: Publish pacts
        run: npm run pact:publish
  
  provider-tests:
    runs-on: ubuntu-latest
    needs: consumer-tests
    steps:
      - uses: actions/checkout@v2
      - name: Start service
        run: npm start &
      - name: Run provider tests
        run: npm run test:contract:provider
```

---

## End-to-End Testing

### Q11. What is end-to-end testing?

**Answer:** E2E testing validates the entire application flow from start to finish, simulating real user scenarios.

**Scope:**
- User interactions
- Multiple services
- Database operations
- External integrations
- Full business workflows

**Example Flow:**
```
1. User creates account
2. User logs in
3. User browses products
4. User adds items to cart
5. User places order
6. Payment is processed
7. Order is created
8. Inventory is updated
9. Confirmation email is sent
```

### Q12. What tools are used for E2E testing?

**Answer:**

**1. Cypress**
```typescript
// cypress/e2e/order-flow.spec.ts
describe('Order Flow', () => {
  it('should complete order from checkout to confirmation', () => {
    // Visit website
    cy.visit('/');
    
    // Login
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="email"]').type('user@example.com');
    cy.get('[data-testid="password"]').type('password123');
    cy.get('[data-testid="submit"]').click();
    
    // Browse products
    cy.visit('/products');
    cy.get('[data-testid="product-1"]').click();
    cy.get('[data-testid="add-to-cart"]').click();
    
    // Checkout
    cy.get('[data-testid="cart-button"]').click();
    cy.get('[data-testid="checkout-button"]').click();
    
    // Payment
    cy.get('[data-testid="card-number"]').type('4111111111111111');
    cy.get('[data-testid="expiry"]').type('12/25');
    cy.get('[data-testid="cvv"]').type('123');
    cy.get('[data-testid="pay-button"]').click();
    
    // Verify order confirmation
    cy.url().should('include', '/order/confirmation');
    cy.get('[data-testid="order-id"]').should('be.visible');
    cy.contains('Thank you for your order').should('be.visible');
  });
});
```

**2. Playwright**
```typescript
// e2e/order.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Order Flow', () => {
  test('should create order successfully', async ({ page }) => {
    await page.goto('/');
    
    // Login
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="submit"]');
    
    // Add to cart
    await page.goto('/products/1');
    await page.click('[data-testid="add-to-cart"]');
    
    // Checkout
    await page.goto('/cart');
    await page.click('[data-testid="checkout-button"]');
    
    // Verify order created
    await expect(page).toHaveURL(/\/order\/\d+/);
    await expect(page.locator('[data-testid="order-id"]')).toBeVisible();
  });
});
```

**3. Supertest (API E2E)**
```typescript
// e2e/api/order-flow.spec.ts
import request from 'supertest';
import app from '../src/app';

describe('Order API E2E', () => {
  let authToken: string;
  let orderId: string;
  
  it('should login user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(200);
    
    authToken = response.body.token;
    expect(authToken).toBeDefined();
  });
  
  it('should create order', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        items: [{ productId: 1, quantity: 2 }]
      })
      .expect(201);
    
    orderId = response.body.id;
    expect(orderId).toBeDefined();
  });
  
  it('should retrieve order', async () => {
    const response = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(response.body.id).toBe(orderId);
    expect(response.body.items).toHaveLength(1);
  });
});
```

---

## Testing Strategies

### Q13. How do you test distributed transactions?

**Answer:**

**Testing Saga Pattern:**

```typescript
describe('Order Saga', () => {
  let orderService: OrderService;
  let inventoryService: InventoryService;
  let paymentService: PaymentService;
  let eventBus: EventBus;
  
  beforeEach(async () => {
    eventBus = new TestEventBus();
    inventoryService = new InventoryService(eventBus);
    paymentService = new PaymentService(eventBus);
    orderService = new OrderService(eventBus);
  });
  
  describe('successful order flow', () => {
    it('should complete all saga steps', async () => {
      const orderData = { userId: 1, items: [{ productId: 1, qty: 2 }] };
      
      // Execute saga
      const result = await orderService.createOrder(orderData);
      
      // Verify all steps completed
      expect(result.status).toBe('completed');
      
      // Verify order created
      const order = await orderService.getOrder(result.orderId);
      expect(order).toBeDefined();
      
      // Verify inventory reserved
      const inventory = await inventoryService.getReservation(result.orderId);
      expect(inventory).toBeDefined();
      
      // Verify payment processed
      const payment = await paymentService.getPayment(result.orderId);
      expect(payment).toBeDefined();
      expect(payment.status).toBe('completed');
    });
  });
  
  describe('compensation on failure', () => {
    it('should compensate when payment fails', async () => {
      // Mock payment failure
      paymentService.charge = jest.fn().mockRejectedValue(new Error('Payment failed'));
      
      const orderData = { userId: 1, items: [{ productId: 1, qty: 2 }] };
      
      await expect(orderService.createOrder(orderData))
        .rejects.toThrow('Payment failed');
      
      // Verify compensation
      const inventory = await inventoryService.getReservation(result.orderId);
      expect(inventory).toBeUndefined();  // Inventory released
      
      const order = await orderService.getOrder(result.orderId);
      expect(order.status).toBe('cancelled');
    });
  });
});
```

### Q14. How do you test message-driven systems?

**Answer:**

**Testing Event-Driven Architecture:**

```typescript
describe('Event-Driven Order Processing', () => {
  let eventBus: TestEventBus;
  let orderService: OrderService;
  let inventoryService: InventoryService;
  let notificationService: NotificationService;
  
  beforeEach(async () => {
    eventBus = new TestEventBus();
    orderService = new OrderService(eventBus);
    inventoryService = new InventoryService(eventBus);
    notificationService = new NotificationService(eventBus);
    
    // Subscribe services to events
    eventBus.subscribe('OrderCreated', inventoryService.handleOrderCreated);
    eventBus.subscribe('OrderCreated', notificationService.handleOrderCreated);
  });
  
  describe('event publishing and consumption', () => {
    it('should publish OrderCreated event', async () => {
      const order = await orderService.createOrder({ userId: 1, items: [] });
      
      const events = eventBus.getPublishedEvents();
      const orderCreatedEvent = events.find(e => e.type === 'OrderCreated');
      
      expect(orderCreatedEvent).toBeDefined();
      expect(orderCreatedEvent.data.orderId).toBe(order.id);
    });
    
    it('should consume OrderCreated event in inventory service', async () => {
      await orderService.createOrder({ userId: 1, items: [] });
      
      // Wait for event to be processed
      await eventBus.waitFor('OrderCreated', 1000);
      
      // Verify inventory was reserved
      const inventory = await inventoryService.getReservations();
      expect(inventory).toHaveLength(1);
    });
    
    it('should handle out-of-order events', async () => {
      // Simulate out-of-order events
      eventBus.publish('PaymentCompleted', { orderId: 1 });
      eventBus.publish('OrderCreated', { orderId: 1 });
      eventBus.publish('InventoryReserved', { orderId: 1 });
      
      // Wait for all events to be processed
      await eventBus.waitForAll(2000);
      
      const order = await orderService.getOrder(1);
      expect(order.status).toBe('completed');
    });
  });
});
```

### Q15. What are the testing best practices for microservices?

**Answer:**

**1. Test at Every Level**
- Unit tests for business logic
- Integration tests for service interactions
- Contract tests for API compatibility
- E2E tests for critical user flows

**2. Test Data Management**
```typescript
// Use test data factories
class TestDataFactory {
  static createOrder(overrides: Partial<Order> = {}): Order {
    return {
      id: randomUUID(),
      userId: 1,
      items: [TestDataFactory.createOrderItem()],
      status: 'pending',
      createdAt: new Date(),
      ...overrides
    };
  }
  
  static createOrderItem(): OrderItem {
    return {
      productId: randomUUID(),
      quantity: 1,
      price: 99.99
    };
  }
}
```

**3. Isolate Tests**
```typescript
beforeEach(async () => {
  // Clean database
  await db.query('TRUNCATE TABLE orders CASCADE');
  await db.query('TRUNCATE TABLE users CASCADE');
  
  // Clear message queues
  await eventBus.clear();
  
  // Reset mocks
  jest.clearAllMocks();
});
```

**4. Use Appropriate Test Environments**
```typescript
// .env.test
NODE_ENV=test
DB_URL=postgresql://localhost:5432/test_db
REDIS_URL=redis://localhost:6379/15
RABBITMQ_URL=amqp://localhost:5672/test
```

**5. Parallel Test Execution**
```typescript
// jest.config.js
module.exports = {
  maxWorkers: 4,  // Run tests in parallel
  testTimeout: 10000,
  testMatch: ['**/__tests__/**/*.test.ts']
};
```

**6. Monitor Test Coverage**
```typescript
// package.json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch"
  }
}

// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.test.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

**7. Mock External Services**
```typescript
// Don't test third-party services
jest.mock('stripe', () => ({
  charges: {
    create: jest.fn().mockResolvedValue({ id: 'ch_123' })
  }
}));

// Or use test doubles
class TestPaymentGateway implements PaymentGateway {
  async charge(amount: number): Promise<PaymentResult> {
    return { success: true, transactionId: 'test_123' };
  }
}