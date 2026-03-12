# Microservices Interview Questions & Answers
## For 10+ Years Experienced Node.js Developer

---

## Table of Contents
1. [Microservices Fundamentals](#microservices-fundamentals)
2. [Service Communication](#service-communication)
3. [Service Discovery](#service-discovery)
4. [API Gateway](#api-gateway)
5. [Data Management](#data-management)
6. [Resilience Patterns](#resilience-patterns)
7. [Complex Scenarios](#complex-scenarios)

---

## Microservices Fundamentals

### Q1: Explain microservices architecture and when to use it.

**Answer:**

**Microservices vs Monolithic:**

```
Monolithic Architecture:
┌─────────────────────────────────┐
│   Single Application            │
│  ┌─────────────────────────┐    │
│  │ - User Service          │    │
│  │ - Order Service         │    │
│  │ - Payment Service       │    │
│  │ - Notification Service  │    │
│  └─────────────────────────┘    │
│         Single Database           │
└─────────────────────────────────┘

Microservices Architecture:
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   User   │  │  Order   │  │ Payment  │  │  Notify  │
│ Service  │  │ Service  │  │ Service  │  │ Service  │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │             │
     └─────────────┴─────────────┴─────────────┘
                        │
                ┌───────▼───────┐
                │ API Gateway   │
                └───────────────┘
```

**When to Use Microservices:**

```javascript
/**
 * Use Microservices when:
 * 1. Team size > 10-15 developers
 * 2. Need independent scaling of services
 * 3. Different deployment cycles per service
 * 4. Technology diversity needed
 * 5. Fault isolation is critical
 * 6. Fast iteration required
 */

// Example: Microservices Structure
const microservicesStructure = {
  services: {
    'user-service': {
      port: 3001,
      database: 'user_db',
      responsibilities: [
        'User authentication',
        'User profile management',
        'User preferences'
      ]
    },
    'product-service': {
      port: 3002,
      database: 'product_db',
      responsibilities: [
        'Product catalog',
        'Product search',
        'Inventory management'
      ]
    },
    'order-service': {
      port: 3003,
      database: 'order_db',
      responsibilities: [
        'Order processing',
        'Order management',
        'Order history'
      ]
    },
    'payment-service': {
      port: 3004,
      database: 'payment_db',
      responsibilities: [
        'Payment processing',
        'Refund handling',
        'Payment methods'
      ]
    },
    'notification-service': {
      port: 3005,
      database: 'notification_db',
      responsibilities: [
        'Email notifications',
        'SMS notifications',
        'Push notifications'
      ]
    }
  }
};
```

---

## Service Communication

### Q2: Implement synchronous and asynchronous service communication.

**Answer:**

**1. Synchronous Communication (HTTP/REST):**

```javascript
// services/order-service/orderClient.js
const axios = require('axios');

class ServiceClient {
  constructor() {
    this.services = {
      userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
      productService: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
      paymentService: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
      inventoryService: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3006'
    };
  }

  /**
   * Circuit Breaker Pattern
   */
  async callWithCircuitBreaker(service, method, url, data = null) {
    const maxRetries = 3;
    const retryDelay = 1000;
    const timeout = 5000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const config = {
          method,
          url,
          data,
          timeout,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': this.generateRequestId()
          }
        };

        const response = await axios(config);
        return response.data;
      } catch (error) {
        if (attempt === maxRetries) {
          console.error(`Circuit breaker tripped for ${service}`);
          throw new Error(`Service ${service} unavailable after ${maxRetries} attempts`);
        }

        console.log(`Retry ${attempt}/${maxRetries} for ${service}`);
        await this.sleep(retryDelay * attempt);
      }
    }
  }

  async getUser(userId) {
    return this.callWithCircuitBreaker(
      'userService',
      'GET',
      `${this.services.userService}/api/users/${userId}`
    );
  }

  async getProduct(productId) {
    return this.callWithCircuitBreaker(
      'productService',
      'GET',
      `${this.services.productService}/api/products/${productId}`
    );
  }

  async createPayment(paymentData) {
    return this.callWithCircuitBreaker(
      'paymentService',
      'POST',
      `${this.services.paymentService}/api/payments`,
      paymentData
    );
  }

  async reserveStock(productId, quantity) {
    return this.callWithCircuitBreaker(
      'inventoryService',
      'POST',
      `${this.services.inventoryService}/api/inventory/reserve`,
      { productId, quantity }
    );
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ServiceClient;
```

**2. Asynchronous Communication (Message Queue):**

```javascript
// services/order-service/messagePublisher.js
const amqp = require('amqplib');

class MessagePublisher {
  constructor(rabbitmqUrl) {
    this.url = rabbitmqUrl;
    this.connection = null;
    this.channel = null;
    this.exchanges = {
      orders: 'orders.exchange',
      payments: 'payments.exchange',
      notifications: 'notifications.exchange',
      inventory: 'inventory.exchange'
    };
  }

  async connect() {
    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();

    // Declare exchanges
    for (const exchange of Object.values(this.exchanges)) {
      await this.channel.assertExchange(exchange, 'topic', { durable: true });
    }

    console.log('Message publisher connected to RabbitMQ');
  }

  /**
   * Publish event with proper routing
   */
  async publishEvent(exchange, routingKey, message) {
    const content = Buffer.from(JSON.stringify(message));

    await this.channel.publish(
      exchange,
      routingKey,
      content,
      {
        persistent: true,
        timestamp: Date.now(),
        contentType: 'application/json',
        messageId: this.generateMessageId()
      }
    );

    console.log(`Published event: ${exchange}/${routingKey}`);
  }

  /**
   * Order Created Event
   */
  async publishOrderCreated(order) {
    await this.publishEvent(
      this.exchanges.orders,
      'order.created',
      {
        eventType: 'order.created',
        orderId: order.id,
        userId: order.userId,
        items: order.items,
        total: order.total,
        timestamp: new Date()
      }
    );
  }

  /**
   * Order Paid Event
   */
  async publishOrderPaid(orderId, paymentId) {
    await this.publishEvent(
      this.exchanges.orders,
      'order.paid',
      {
        eventType: 'order.paid',
        orderId,
        paymentId,
        timestamp: new Date()
      }
    );
  }

  /**
   * Order Cancelled Event
   */
  async publishOrderCancelled(orderId, reason) {
    await this.publishEvent(
      this.exchanges.orders,
      'order.cancelled',
      {
        eventType: 'order.cancelled',
        orderId,
        reason,
        timestamp: new Date()
      }
    );
  }

  /**
   * Payment Request Event
   */
  async publishPaymentRequest(paymentData) {
    await this.publishEvent(
      this.exchanges.payments,
      'payment.request',
      paymentData
    );
  }

  /**
   * Notification Event
   */
  async publishNotification(notificationData) {
    await this.publishEvent(
      this.exchanges.notifications,
      notificationData.type,
      notificationData
    );
  }

  generateMessageId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async close() {
    if (this.connection) {
      await this.connection.close();
    }
  }
}

// services/order-service/orderController.js
class OrderController {
  constructor(serviceClient, messagePublisher) {
    this.serviceClient = serviceClient;
    this.messagePublisher = messagePublisher;
  }

  async createOrder(req, res) {
    try {
      const { userId, items } = req.body;

      // 1. Get user details (synchronous)
      const user = await this.serviceClient.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // 2. Validate products and get prices (synchronous)
      const products = await Promise.all(
        items.map(item => this.serviceClient.getProduct(item.productId))
      );

      const invalidProducts = products.filter(p => !p);
      if (invalidProducts.length > 0) {
        return res.status(400).json({ error: 'Invalid products' });
      }

      // 3. Calculate total
      const total = items.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId);
        return sum + (product.price * item.quantity);
      }, 0);

      // 4. Reserve stock (synchronous with circuit breaker)
      for (const item of items) {
        await this.serviceClient.reserveStock(item.productId, item.quantity);
      }

      // 5. Create order
      const order = {
        id: this.generateOrderId(),
        userId,
        items,
        total,
        status: 'pending',
        createdAt: new Date()
      };

      // 6. Publish order created event (asynchronous)
      await this.messagePublisher.publishOrderCreated(order);

      // 7. Publish payment request event (asynchronous)
      await this.messagePublisher.publishPaymentRequest({
        orderId: order.id,
        userId,
        amount: total
      });

      res.status(201).json({
        success: true,
        order
      });
    } catch (error) {
      console.error('Order creation error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  generateOrderId() {
    return `ORD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }
}
```

---

## Service Discovery

### Q3: Implement service discovery with Consul.

**Answer:**

```javascript
// common/serviceDiscovery.js
const Consul = require('consul');

class ServiceDiscovery {
  constructor(consulHost = 'localhost', consulPort = 8500) {
    this.consul = new Consul({
      host: consulHost,
      port: consulPort
    });
    this.serviceId = null;
    this.serviceName = null;
  }

  /**
   * Register service with Consul
   */
  async registerService(serviceName, serviceConfig) {
    this.serviceName = serviceName;
    this.serviceId = `${serviceName}-${serviceConfig.port}-${Date.now()}`;

    const registration = {
      id: this.serviceId,
      name: serviceName,
      address: serviceConfig.address || 'localhost',
      port: serviceConfig.port,
      check: {
        http: `http://${serviceConfig.address || 'localhost'}:${serviceConfig.port}/health`,
        interval: '10s',
        timeout: '5s',
        deregistercriticalserviceafter: '30s'
      },
      tags: serviceConfig.tags || [],
      meta: serviceConfig.meta || {}
    };

    try {
      await this.consul.agent.service.register(registration);
      console.log(`Service ${serviceName} registered with ID: ${this.serviceId}`);

      // Setup health check handler
      this.setupHealthCheck(serviceConfig.port);

      return this.serviceId;
    } catch (error) {
      console.error('Service registration failed:', error);
      throw error;
    }
  }

  /**
   * Deregister service
   */
  async deregisterService() {
    if (this.serviceId) {
      try {
        await this.consul.agent.service.deregister(this.serviceId);
        console.log(`Service ${this.serviceName} deregistered`);
      } catch (error) {
        console.error('Service deregistration failed:', error);
      }
    }
  }

  /**
   * Discover service instances
   */
  async discoverService(serviceName) {
    try {
      const services = await this.consul.health.service(serviceName, true);
      
      if (services.length === 0) {
        throw new Error(`No instances found for service: ${serviceName}`);
      }

      // Filter only healthy services
      const healthyServices = services.filter(s => s.Checks.every(c => c.Status === 'passing'));
      
      if (healthyServices.length === 0) {
        throw new Error(`No healthy instances found for service: ${serviceName}`);
      }

      // Implement load balancing (round-robin)
      const service = healthyServices[Math.floor(Math.random() * healthyServices.length)];

      return {
        id: service.Service.ID,
        name: service.Service.Service,
        address: service.Service.Address,
        port: service.Service.Port,
        tags: service.Service.Tags,
        meta: service.Service.Meta
      };
    } catch (error) {
      console.error('Service discovery failed:', error);
      throw error;
    }
  }

  /**
   * Watch for service changes
   */
  async watchService(serviceName, callback) {
    const watcher = this.consul.watch({
      method: this.consul.health.service,
      options: { service: serviceName, passing: true }
    });

    watcher.on('change', (data) => {
      const services = data.map(s => ({
        id: s.Service.ID,
        address: s.Service.Address,
        port: s.Service.Port
      }));
      callback(services);
    });

    watcher.on('error', (err) => {
      console.error('Service watch error:', err);
    });

    return watcher;
  }

  /**
   * Get service instance URL
   */
  async getServiceUrl(serviceName) {
    const service = await this.discoverService(serviceName);
    return `http://${service.address}:${service.port}`;
  }

  /**
   * Setup health check endpoint
   */
  setupHealthCheck(port) {
    // This would be setup in Express app
    console.log(`Health check enabled on port ${port}`);
  }

  /**
   * Get service catalog
   */
  async getServiceCatalog() {
    try {
      const services = await this.consul.catalog.service.list();
      return services;
    } catch (error) {
      console.error('Failed to get service catalog:', error);
      throw error;
    }
  }
}

module.exports = ServiceDiscovery;

// Usage in a microservice
const express = require('express');
const ServiceDiscovery = require('./common/serviceDiscovery');

class OrderService {
  constructor(port) {
    this.port = port;
    this.app = express();
    this.serviceDiscovery = new ServiceDiscovery();
    this.serviceRegistry = new Map();
  }

  async start() {
    // Setup Express
    this.app.use(express.json());

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', service: 'order-service' });
    });

    // Register with service discovery
    await this.serviceDiscovery.registerService('order-service', {
      port: this.port,
      address: 'localhost',
      tags: ['v1', 'orders'],
      meta: {
        version: '1.0.0',
        team: 'backend'
      }
    });

    // Discover other services
    await this.discoverServices();

    // Start server
    this.app.listen(this.port, () => {
      console.log(`Order service listening on port ${this.port}`);
    });

    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }

  async discoverServices() {
    const servicesToDiscover = ['user-service', 'product-service', 'payment-service'];
    
    for (const serviceName of servicesToDiscover) {
      try {
        const service = await this.serviceDiscovery.discoverService(serviceName);
        this.serviceRegistry.set(serviceName, service);
        console.log(`Discovered ${serviceName}:`, service);
      } catch (error) {
        console.error(`Failed to discover ${serviceName}:`, error.message);
      }
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`${signal} received, shutting down gracefully...`);
      
      // Deregister from service discovery
      await this.serviceDiscovery.deregisterService();
      
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

const orderService = new OrderService(3003);
orderService.start();
```

---

## API Gateway

### Q4: Implement an API Gateway with Express.js.

**Answer:**

```javascript
// api-gateway/gateway.js
const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');

class APIGateway {
  constructor() {
    this.app = express();
    this.services = {
      userService: {
        url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
        routes: ['/api/users', '/api/auth']
      },
      productService: {
        url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
        routes: ['/api/products', '/api/categories']
      },
      orderService: {
        url: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
        routes: ['/api/orders', '/api/cart']
      },
      paymentService: {
        url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
        routes: ['/api/payments']
      },
      notificationService: {
        url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
        routes: ['/api/notifications']
      }
    };

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Rate limiting
    this.app.use(rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      message: 'Too many requests from this IP'
    }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });

    // Request ID
    this.app.use((req, res, next) => {
      req.id = req.headers['x-request-id'] || this.generateRequestId();
      res.setHeader('X-Request-ID', req.id);
      next();
    });

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date(),
        services: Object.keys(this.services)
      });
    });

    // Service health checks
    this.app.get('/health/services', async (req, res) => {
      const healthChecks = {};
      
      for (const [serviceName, service] of Object.entries(this.services)) {
        try {
          const response = await axios.get(`${service.url}/health`, { timeout: 2000 });
          healthChecks[serviceName] = {
            status: response.data.status,
            url: service.url,
            responseTime: response.headers['x-response-time'] || 'N/A'
          };
        } catch (error) {
          healthChecks[serviceName] = {
            status: 'unhealthy',
            url: service.url,
            error: error.message
          };
        }
      }

      res.json(healthChecks);
    });

    // API version endpoint
    this.app.get('/api/version', (req, res) => {
      res.json({
        version: '1.0.0',
        name: 'API Gateway',
        services: this.services
      });
    });

    // Proxy routes to services
    this.app.use('/api', async (req, res, next) => {
      const targetService = this.findTargetService(req.path);
      
      if (!targetService) {
        return res.status(404).json({
          error: 'Service not found',
          path: req.path
        });
      }

      try {
        const response = await this.proxyRequest(req, targetService);
        res.status(response.status).json(response.data);
      } catch (error) {
        next(error);
      }
    });

    // Direct proxy for WebSocket connections
    this.app.use('/ws', createProxyMiddleware({
      target: 'http://localhost:3005',
      ws: true,
      pathRewrite: { '^/ws': '' }
    }));
  }

  findTargetService(path) {
    for (const [serviceName, service] of Object.entries(this.services)) {
      for (const route of service.routes) {
        if (path.startsWith(route)) {
          return service;
        }
      }
    }
    return null;
  }

  async proxyRequest(req, targetService) {
    const startTime = Date.now();
    const targetUrl = `${targetService.url}${req.path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;

    try {
      const response = await axios({
        method: req.method,
        url: targetUrl,
        data: req.body,
        headers: {
          ...req.headers,
          'X-Request-ID': req.id,
          'X-Forwarded-For': req.ip,
          'X-Gateway-Timestamp': new Date().toISOString()
        },
        params: req.query,
        timeout: 30000
      });

      const responseTime = Date.now() - startTime;
      response.headers['x-response-time'] = responseTime;

      console.log(`Proxy request: ${req.method} ${req.path} -> ${targetUrl} (${responseTime}ms)`);

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`Proxy error: ${req.method} ${req.path} -> ${targetUrl} (${responseTime}ms)`, error.message);

      if (error.response) {
        return error.response;
      }

      throw error;
    }
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        path: req.path,
        requestId: req.id
      });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      console.error('Gateway error:', err);

      res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        requestId: req.id,
        timestamp: new Date()
      });
    });
  }

  generateRequestId() {
    return `gw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  start(port) {
    this.app.listen(port, () => {
      console.log(`API Gateway listening on port ${port}`);
      console.log('Registered services:', Object.keys(this.services));
    });
  }
}

// Usage
const gateway = new APIGateway();
gateway.start(3000);

module.exports = APIGateway;
```

---

## Data Management

### Q5: Explain database per service pattern and implementation.

**Answer:**

```javascript
/**
 * Database Per Service Pattern
 * Each microservice has its own database
 * Services communicate via APIs or message queues
 */

// services/order-service/database.js
const { Pool } = require('pg');

class OrderDatabase {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'order_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Query executed', { text, duration });
      return result;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create order with items (transaction)
   */
  async createOrder(orderData) {
    return this.transaction(async (client) => {
      const { rows: [order] } = await client.query(
        `INSERT INTO orders (user_id, total, status, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [orderData.userId, orderData.total, 'pending']
      );

      for (const item of orderData.items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES ($1, $2, $3, $4)`,
          [order.id, item.productId, item.quantity, item.price]
        );
      }

      return order;
    });
  }

  /**
   * Get order with items
   */
  async getOrder(orderId) {
    const { rows: [order] } = await this.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );

    if (!order) {
      return null;
    }

    const { rows: items } = await this.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [orderId]
    );

    return { ...order, items };
  }

  /**
   * Get user orders
   */
  async getUserOrders(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const { rows: orders } = await this.query(
      `SELECT * FROM orders 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const { rows: [count] } = await this.query(
      'SELECT COUNT(*) FROM orders WHERE user_id = $1',
      [userId]
    );

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total: parseInt(count.count),
        totalPages: Math.ceil(count.count / limit)
      }
    };
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status) {
    const { rows: [order] } = await this.query(
      `UPDATE orders 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [status, orderId]
    );

    return order;
  }
}

// services/user-service/database.js
const { MongoClient } = require('mongodb');

class UserDatabase {
  constructor() {
    this.client = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017');
    this.db = null;
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db('user_db');
    console.log('Connected to MongoDB');
  }

  getCollection(name) {
    return this.db.collection(name);
  }

  /**
   * Create user
   */
  async createUser(userData) {
    const users = this.getCollection('users');
    const result = await users.insertOne({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return await users.findOne({ _id: result.insertedId });
  }

  /**
   * Get user by ID
   */
  async getUser(userId) {
    const users = this.getCollection('users');
    return await users.findOne({ _id: new ObjectId(userId) });
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    const users = this.getCollection('users');
    return await users.findOne({ email });
  }

  /**
   * Update user
   */
  async updateUser(userId, userData) {
    const users = this.getCollection('users');
    await users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { ...userData, updatedAt: new Date() } }
    );
    return await this.getUser(userId);
  }

  async close() {
    await this.client.close();
  }
}

// services/product-service/database.js
const Redis = require('ioredis');

class ProductDatabase {
  constructor() {
    this.redis = new Redis();
    this.postgres = new Pool({
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'product_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD
    });
  }

  /**
   * Get product with caching
   */
  async getProduct(productId) {
    const cacheKey = `product:${productId}`;

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get from database
    const { rows: [product] } = await this.postgres.query(
      'SELECT * FROM products WHERE id = $1',
      [productId]
    );

    if (product) {
      // Cache for 1 hour
      await this.redis.setex(cacheKey, 3600, JSON.stringify(product));
    }

    return product;
  }

  /**
   * Update product and invalidate cache
   */
  async updateProduct(productId, productData) {
    const { rows: [product] } = await this.postgres.query(
      `UPDATE products 
       SET name = COALESCE($2, name),
           price = COALESCE($3, price),
           stock = COALESCE($4, stock),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [productId, productData.name, productData.price, productData.stock]
    );

    // Invalidate cache
    const cacheKey = `product:${productId}`;
    await this.redis.del(cacheKey);

    return product;
  }

  /**
   * Update stock (atomic)
   */
  async updateStock(productId, quantityChange) {
    const { rows: [product] } = await this.postgres.query(
      `UPDATE products 
       SET stock = stock + $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [quantityChange, productId]
    );

    // Invalidate cache
    const cacheKey = `product:${productId}`;
    await this.redis.del(cacheKey);

    return product;
  }
}
```

---

## Summary

**Key Takeaways:**
1. **Decomposition** - Split by business capability, not technical layer
2. **Communication** - Use async messaging for eventual consistency
3. **Service Discovery** - Dynamic service registration and discovery
4. **API Gateway** - Single entry point with routing and load balancing
5. **Database per service** - Each service owns its database
6. **Circuit Breaker** - Prevent cascading failures
7. **Observability** - Distributed tracing, logging, monitoring
8. **Resilience** - Retries, timeouts, bulkheads
9. **Deployment** - Independent deployment and scaling
10. **Data Consistency** - Saga pattern for distributed transactions