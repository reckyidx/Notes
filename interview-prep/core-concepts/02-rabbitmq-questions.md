# RabbitMQ Interview Questions & Answers
## For 10+ Years Experienced Node.js Developer

---

## Table of Contents
1. [Basic Concepts](#basic-concepts)
2. [Message Patterns](#message-patterns)
3. [Implementation in Node.js](#implementation-in-nodejs)
4. [Advanced Features](#advanced-features)
5. [Error Handling & Reliability](#error-handling--reliability)
6. [Complex Scenarios](#complex-scenarios)
7. [Performance & Scaling](#performance--scaling)

---

## Basic Concepts

### Q1: Explain RabbitMQ architecture and key components.

**Answer:**

**RabbitMQ Architecture:**

```
Producer → Exchange → Queue → Consumer
            ↓
         Binding Key
```

**Key Components:**

**1. Producer**
- Application that sends messages
- Doesn't know which queue will receive the message
- Publishes to an exchange

**2. Exchange**
- Receives messages from producers
- Routes messages to queues based on binding keys
- Types: Direct, Topic, Fanout, Headers

**3. Queue**
- Buffer that stores messages
- Messages stay until consumed
- Multiple consumers can pull from same queue

**4. Binding**
- Link between exchange and queue
- Defines routing rules
- Uses binding keys

**5. Consumer**
- Application that receives and processes messages
- Pulls messages from queues

**6. Virtual Host (vhost)**
- Logical isolation within RabbitMQ server
- Separates exchanges, queues, bindings
- Similar to database schemas

---

### Q2: What are the different types of exchanges in RabbitMQ?

**Answer:**

**1. Direct Exchange**
```
Routes messages to queues based on exact binding key match.

Producer → Direct Exchange → Queue A (binding key: "error")
                              → Queue B (binding key: "info")
```

```javascript
const directExchange = 'logs.direct';

// Create exchange
await channel.assertExchange(directExchange, 'direct', { durable: true });

// Create queues with binding keys
await channel.assertQueue('error_logs', { durable: true });
await channel.bindQueue('error_logs', directExchange, 'error');

await channel.assertQueue('info_logs', { durable: true });
await channel.bindQueue('info_logs', directExchange, 'info');

// Publish with routing key
await channel.publish(directExchange, 'error', Buffer.from('Error message'));
await channel.publish(directExchange, 'info', Buffer.from('Info message'));
```

**Use Cases:**
- Routing by severity level (error, warning, info)
- Service-based routing
- Priority-based message routing

**2. Topic Exchange**
```
Routes messages based on pattern matching with wildcards.
* matches one word
# matches zero or more words

Producer → Topic Exchange → Queue A (binding: "*.error")
                            → Queue B (binding: "orders.*")
                            → Queue C (binding: "#")
```

```javascript
const topicExchange = 'app.topic';

await channel.assertExchange(topicExchange, 'topic', { durable: true });

// Create queues with topic bindings
await channel.assertQueue('error_queue', { durable: true });
await channel.bindQueue('error_queue', topicExchange, '*.error');

await channel.assertQueue('orders_queue', { durable: true });
await channel.bindQueue('orders_queue', topicExchange, 'orders.*');

await channel.assertQueue('all_queue', { durable: true });
await channel.bindQueue('all_queue', topicExchange, '#'); // Receives all messages

// Publish with routing keys
await channel.publish(topicExchange, 'payment.error', Buffer.from('Payment failed'));
await channel.publish(topicExchange, 'orders.created', Buffer.from('Order created'));
await channel.publish(topicExchange, 'user.login', Buffer.from('User logged in'));
```

**Use Cases:**
- Multi-tenant applications
- Event-driven architecture
- Complex routing scenarios
- Microservices communication

**3. Fanout Exchange**
```
Broadcasts messages to all bound queues.

Producer → Fanout Exchange → Queue A
                            → Queue B
                            → Queue C
```

```javascript
const fanoutExchange = 'notifications.fanout';

await channel.assertExchange(fanoutExchange, 'fanout', { durable: true });

// Create queues (no binding key needed)
await channel.assertQueue('email_queue', { durable: true });
await channel.bindQueue('email_queue', fanoutExchange, '');

await channel.assertQueue('sms_queue', { durable: true });
await channel.bindQueue('sms_queue', fanoutExchange, '');

await channel.assertQueue('push_queue', { durable: true });
await channel.bindQueue('push_queue', fanoutExchange, '');

// Publish (routing key is ignored for fanout)
await channel.publish(fanoutExchange, '', Buffer.from('New notification'));
```

**Use Cases:**
- Broadcasting notifications
- Publish/Subscribe patterns
- Multi-consumer scenarios
- Event broadcasting

**4. Headers Exchange**
```
Routes based on message headers (key-value pairs).
```

```javascript
const headersExchange = 'app.headers';

await channel.assertExchange(headersExchange, 'headers', { durable: true });

// Create queue with header binding
await channel.assertQueue('high_priority', { durable: true });
await channel.bindQueue('high_priority', headersExchange, '', {
  'x-match': 'all', // 'any' or 'all'
  'priority': 10,
  'urgent': true
});

// Publish with headers
await channel.publish(headersExchange, '', Buffer.from('Urgent message'), {
  headers: {
    priority: 10,
    urgent: true
  }
});
```

**Use Cases:**
- Complex routing logic
- Attribute-based filtering
- Multi-criteria matching

---

## Message Patterns

### Q3: Explain common messaging patterns in RabbitMQ.

**Answer:**

**1. Work Queue Pattern**
```
Multiple workers share messages from a queue.
Messages are distributed round-robin.

Producer → Queue → Worker 1
                → Worker 2
                → Worker 3
```

```javascript
// Producer
async function sendTask(task) {
  await channel.assertQueue('tasks', { durable: true });
  
  await channel.sendToQueue('tasks', Buffer.from(JSON.stringify(task)), {
    persistent: true, // Survives broker restart
    deliveryMode: 2   // Persistent message
  });
  
  console.log('Task sent:', task);
}

// Consumer (Worker)
async function startWorker(workerId) {
  await channel.prefetch(1); // Fair dispatch - process one message at a time
  
  await channel.assertQueue('tasks', { durable: true });
  
  channel.consume('tasks', async (msg) => {
    const task = JSON.parse(msg.content.toString());
    
    console.log(`Worker ${workerId} processing task:`, task);
    
    try {
      await processTask(task);
      channel.ack(msg); // Acknowledge successful processing
      console.log(`Worker ${workerId} completed task`);
    } catch (error) {
      console.error(`Worker ${workerId} failed to process task:`, error);
      channel.nack(msg, false, true); // Requeue message
    }
  }, { noAck: false });
}

async function processTask(task) {
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

**2. Publish/Subscribe Pattern**
```
Multiple consumers receive same message.
Uses fanout exchange.

Producer → Fanout Exchange → Queue A → Consumer 1
                        → Queue B → Consumer 2
                        → Queue C → Consumer 3
```

```javascript
// Producer
async function broadcastNotification(notification) {
  const exchange = 'notifications';
  
  await channel.assertExchange(exchange, 'fanout', { durable: true });
  
  await channel.publish(exchange, '', Buffer.from(JSON.stringify(notification)));
  
  console.log('Notification broadcasted:', notification);
}

// Consumer - Email Service
async function startEmailConsumer() {
  const exchange = 'notifications';
  const queue = 'email_notifications';
  
  await channel.assertExchange(exchange, 'fanout', { durable: true });
  
  // Create exclusive queue (auto-generated name)
  const q = await channel.assertQueue(queue, { exclusive: true });
  
  await channel.bindQueue(q.queue, exchange, '');
  
  channel.consume(q.queue, (msg) => {
    const notification = JSON.parse(msg.content.toString());
    sendEmail(notification);
    channel.ack(msg);
  });
}

// Consumer - SMS Service
async function startSMSConsumer() {
  const exchange = 'notifications';
  const queue = 'sms_notifications';
  
  await channel.assertExchange(exchange, 'fanout', { durable: true });
  const q = await channel.assertQueue(queue, { exclusive: true });
  await channel.bindQueue(q.queue, exchange, '');
  
  channel.consume(q.queue, (msg) => {
    const notification = JSON.parse(msg.content.toString());
    sendSMS(notification);
    channel.ack(msg);
  });
}
```

**3. Routing Pattern**
```
Routes messages to specific consumers based on routing key.
Uses direct exchange.

Producer → Direct Exchange → Queue A (routing key: "error")
                      → Queue B (routing key: "warning")
                      → Queue C (routing key: "info")
```

```javascript
// Producer
async function sendLog(level, message) {
  const exchange = 'logs.direct';
  
  await channel.assertExchange(exchange, 'direct', { durable: true });
  
  await channel.publish(exchange, level, Buffer.from(JSON.stringify({
    level,
    message,
    timestamp: new Date()
  })));
}

// Consumer - Error Logger
async function startErrorConsumer() {
  const exchange = 'logs.direct';
  const queue = 'error_logs';
  
  await channel.assertExchange(exchange, 'direct', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'error');
  
  channel.consume(queue, (msg) => {
    const log = JSON.parse(msg.content.toString());
    console.error('ERROR:', log.message);
    channel.ack(msg);
  });
}

// Consumer - Warning Logger
async function startWarningConsumer() {
  const exchange = 'logs.direct';
  const queue = 'warning_logs';
  
  await channel.assertExchange(exchange, 'direct', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'warning');
  
  channel.consume(queue, (msg) => {
    const log = JSON.parse(msg.content.toString());
    console.warn('WARNING:', log.message);
    channel.ack(msg);
  });
}
```

**4. Topic Pattern**
```
Complex routing with pattern matching.
Uses topic exchange.

Producer → Topic Exchange → Queue A (pattern: "*.error")
                    → Queue B (pattern: "orders.*")
                    → Queue C (pattern: "#")
```

```javascript
// Producer
async function publishEvent(domain, eventType, data) {
  const exchange = 'events.topic';
  const routingKey = `${domain}.${eventType}`;
  
  await channel.assertExchange(exchange, 'topic', { durable: true });
  
  await channel.publish(exchange, routingKey, Buffer.from(JSON.stringify({
    domain,
    eventType,
    data,
    timestamp: new Date()
  })));
}

// Usage
await publishEvent('payment', 'success', { orderId: 123, amount: 100 });
await publishEvent('payment', 'error', { orderId: 124, error: 'Insufficient funds' });
await publishEvent('orders', 'created', { orderId: 125, userId: 1 });
await publishEvent('user', 'login', { userId: 1, ip: '192.168.1.1' });

// Consumer - Payment Error Handler
async function startPaymentErrorConsumer() {
  const exchange = 'events.topic';
  const queue = 'payment_errors';
  
  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'payment.error');
  
  channel.consume(queue, (msg) => {
    const event = JSON.parse(msg.content.toString());
    handlePaymentError(event.data);
    channel.ack(msg);
  });
}

// Consumer - All Orders
async function startOrdersConsumer() {
  const exchange = 'events.topic';
  const queue = 'all_orders';
  
  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'orders.*');
  
  channel.consume(queue, (msg) => {
    const event = JSON.parse(msg.content.toString());
    handleOrderEvent(event.eventType, event.data);
    channel.ack(msg);
  });
}

// Consumer - All Events (Audit)
async function startAuditConsumer() {
  const exchange = 'events.topic';
  const queue = 'audit';
  
  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, '#'); // Wildcard for all events
  
  channel.consume(queue, (msg) => {
    const event = JSON.parse(msg.content.toString());
    auditLog(event);
    channel.ack(msg);
  });
}
```

**5. RPC Pattern (Request-Response)**
```
Synchronous-like communication over async messaging.

Client → Request Queue → Server
         ← Response Queue ←
```

```javascript
// RPC Server
async function startRPCServer() {
  const requestQueue = 'rpc_queue';
  
  await channel.assertQueue(requestQueue, { durable: false });
  
  channel.prefetch(1);
  
  channel.consume(requestQueue, async (msg) => {
    const correlationId = msg.properties.correlationId;
    const replyTo = msg.properties.replyTo;
    
    try {
      const request = JSON.parse(msg.content.toString());
      const response = await processRequest(request);
      
      channel.sendToQueue(replyTo, Buffer.from(JSON.stringify(response)), {
        correlationId: correlationId
      });
      
      channel.ack(msg);
    } catch (error) {
      channel.sendToQueue(replyTo, Buffer.from(JSON.stringify({
        error: error.message
      })), {
        correlationId: correlationId
      });
      
      channel.ack(msg);
    }
  });
}

async function processRequest(request) {
  switch (request.method) {
    case 'getUser':
      return await User.findById(request.params.id);
    case 'createOrder':
      return await Order.create(request.data);
    case 'calculateTax':
      return { tax: request.amount * 0.1 };
    default:
      throw new Error('Unknown method');
  }
}

// RPC Client
class RPCClient {
  constructor(channel) {
    this.channel = channel;
    this.responseQueue = null;
    this.pendingCalls = new Map();
    this.setupResponseQueue();
  }
  
  async setupResponseQueue() {
    const q = await this.channel.assertQueue('', { exclusive: true });
    this.responseQueue = q.queue;
    
    this.channel.consume(this.responseQueue, (msg) => {
      const correlationId = msg.properties.correlationId;
      const callback = this.pendingCalls.get(correlationId);
      
      if (callback) {
        const response = JSON.parse(msg.content.toString());
        callback(null, response);
        this.pendingCalls.delete(correlationId);
      }
    }, { noAck: true });
  }
  
  async call(method, params = {}, data = {}) {
    return new Promise((resolve, reject) => {
      const correlationId = this.generateCorrelationId();
      
      this.pendingCalls.set(correlationId, (err, response) => {
        if (err) {
          reject(err);
        } else if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
      
      const request = {
        method,
        params,
        data,
        timestamp: new Date()
      };
      
      this.channel.sendToQueue('rpc_queue', Buffer.from(JSON.stringify(request)), {
        correlationId: correlationId,
        replyTo: this.responseQueue,
        expiration: 10000 // 10 second timeout
      });
      
      // Timeout handling
      setTimeout(() => {
        if (this.pendingCalls.has(correlationId)) {
          this.pendingCalls.delete(correlationId);
          reject(new Error('RPC call timeout'));
        }
      }, 10000);
    });
  }
  
  generateCorrelationId() {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }
}

// Usage
const rpcClient = new RPCClient(channel);

async function main() {
  try {
    const user = await rpcClient.call('getUser', { id: 123 });
    console.log('User:', user);
    
    const order = await rpcClient.call('createOrder', {}, { userId: 123, amount: 100 });
    console.log('Order:', order);
    
    const tax = await rpcClient.call('calculateTax', { amount: 1000 });
    console.log('Tax:', tax);
  } catch (error) {
    console.error('RPC call failed:', error);
  }
}
```

---

## Implementation in Node.js

### Q4: Implement a robust RabbitMQ connection with reconnection logic in Node.js.

**Answer:**

```javascript
// rabbitmq-connection.js
const amqp = require('amqplib');
const EventEmitter = require('events');

class RabbitMQConnection extends EventEmitter {
  constructor(url, options = {}) {
    super();
    this.url = url;
    this.options = {
      reconnectDelay: options.reconnectDelay || 5000,
      maxReconnectAttempts: options.maxReconnectAttempts || Infinity,
      ...options
    };
    
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.shouldReconnect = true;
    this.queues = [];
    this.exchanges = [];
  }
  
  async connect() {
    try {
      console.log('Connecting to RabbitMQ...');
      
      this.connection = await amqp.connect(this.url, {
        heartbeat: 60,
        timeout: 10000
      });
      
      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err);
        this.isConnected = false;
        this.emit('error', err);
      });
      
      this.connection.on('close', () => {
        console.warn('RabbitMQ connection closed');
        this.isConnected = false;
        this.emit('close');
        
        if (this.shouldReconnect) {
          this.reconnect();
        }
      });
      
      this.channel = await this.connection.createChannel();
      
      this.channel.on('error', (err) => {
        console.error('RabbitMQ channel error:', err);
        this.emit('channelError', err);
      });
      
      this.channel.on('close', () => {
        console.warn('RabbitMQ channel closed');
        this.emit('channelClose');
      });
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('Connected to RabbitMQ successfully');
      this.emit('connected');
      
      // Re-setup queues and exchanges
      await this.setupQueuesAndExchanges();
      
      return this.channel;
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      this.isConnected = false;
      this.emit('connectionError', error);
      
      if (this.shouldReconnect) {
        this.reconnect();
      }
      
      throw error;
    }
  }
  
  async reconnect() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.shouldReconnect = false;
      this.emit('maxReconnectAttemptsReached');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Reconnection attempt ${this.reconnectAttempts}...`);
    
    await new Promise(resolve => 
      setTimeout(resolve, this.options.reconnectDelay)
    );
    
    try {
      await this.connect();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  }
  
  async setupQueuesAndExchanges() {
    // Setup exchanges
    for (const exchange of this.exchanges) {
      await this.channel.assertExchange(
        exchange.name,
        exchange.type,
        exchange.options
      );
      console.log(`Exchange ${exchange.name} setup complete`);
    }
    
    // Setup queues
    for (const queue of this.queues) {
      await this.channel.assertQueue(queue.name, queue.options);
      
      // Setup bindings
      if (queue.bindings) {
        for (const binding of queue.bindings) {
          await this.channel.bindQueue(
            queue.name,
            binding.exchange,
            binding.routingKey,
            binding.args
          );
        }
      }
      
      console.log(`Queue ${queue.name} setup complete`);
    }
  }
  
  addExchange(name, type, options = {}) {
    this.exchanges.push({ name, type, options });
    
    if (this.isConnected && this.channel) {
      return this.channel.assertExchange(name, type, options);
    }
    
    return Promise.resolve();
  }
  
  addQueue(name, options = {}, bindings = []) {
    this.queues.push({ name, options, bindings });
    
    if (this.isConnected && this.channel) {
      const setupQueue = async () => {
        await this.channel.assertQueue(name, options);
        
        for (const binding of bindings) {
          await this.channel.bindQueue(name, binding.exchange, binding.routingKey, binding.args);
        }
      };
      
      return setupQueue();
    }
    
    return Promise.resolve();
  }
  
  async publish(exchange, routingKey, message, options = {}) {
    if (!this.isConnected || !this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }
    
    const buffer = Buffer.isBuffer(message) 
      ? message 
      : Buffer.from(JSON.stringify(message));
    
    const defaultOptions = {
      persistent: true,
      deliveryMode: 2,
      timestamp: Date.now(),
      contentType: 'application/json',
      ...options
    };
    
    try {
      await this.channel.publish(exchange, routingKey, buffer, defaultOptions);
      return true;
    } catch (error) {
      console.error('Failed to publish message:', error);
      throw error;
    }
  }
  
  async consume(queue, callback, options = {}) {
    if (!this.isConnected || !this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }
    
    const defaultOptions = {
      noAck: false,
      ...options
    };
    
    try {
      await this.channel.consume(queue, async (msg) => {
        try {
          await callback(msg, this.channel);
        } catch (error) {
          console.error('Error processing message:', error);
          
          // Nack the message (requeue it)
          if (!defaultOptions.noAck) {
            this.channel.nack(msg, false, options.requeue !== false);
          }
        }
      }, defaultOptions);
      
      console.log(`Started consuming from queue: ${queue}`);
    } catch (error) {
      console.error('Failed to start consuming:', error);
      throw error;
    }
  }
  
  async close() {
    this.shouldReconnect = false;
    
    if (this.channel) {
      await this.channel.close();
    }
    
    if (this.connection) {
      await this.connection.close();
    }
    
    this.isConnected = false;
    console.log('RabbitMQ connection closed');
  }
}

module.exports = RabbitMQConnection;
```

**Usage Example:**

```javascript
// app.js
const RabbitMQConnection = require('./rabbitmq-connection');

const rabbitmq = new RabbitMQConnection('amqp://localhost', {
  reconnectDelay: 3000,
  maxReconnectAttempts: 10
});

// Event listeners
rabbitmq.on('connected', () => {
  console.log('RabbitMQ connected event');
});

rabbitmq.on('error', (err) => {
  console.error('RabbitMQ error event:', err);
});

rabbitmq.on('close', () => {
  console.log('RabbitMQ close event');
});

async function setupMessaging() {
  await rabbitmq.connect();
  
  // Setup exchanges
  await rabbitmq.addExchange('app.events', 'topic', { durable: true });
  await rabbitmq.addExchange('app.notifications', 'fanout', { durable: true });
  await rabbitmq.addExchange('app.direct', 'direct', { durable: true });
  
  // Setup queues
  await rabbitmq.addQueue('order.created', { durable: true }, [
    { exchange: 'app.events', routingKey: 'order.created' }
  ]);
  
  await rabbitmq.addQueue('user.signup', { durable: true }, [
    { exchange: 'app.events', routingKey: 'user.signup' }
  ]);
  
  await rabbitmq.addQueue('notifications.email', { durable: true }, [
    { exchange: 'app.notifications', routingKey: '' }
  ]);
  
  await rabbitmq.addQueue('errors', { durable: true }, [
    { exchange: 'app.direct', routingKey: 'error' }
  ]);
  
  // Start consumers
  await rabbitmq.consume('order.created', async (msg, channel) => {
    const order = JSON.parse(msg.content.toString());
    console.log('Processing order:', order);
    
    // Process order
    await processOrder(order);
    
    // Acknowledge
    channel.ack(msg);
  });
  
  await rabbitmq.consume('user.signup', async (msg, channel) => {
    const user = JSON.parse(msg.content.toString());
    console.log('Processing user signup:', user);
    
    // Send welcome email
    await sendWelcomeEmail(user);
    
    channel.ack(msg);
  });
}

async function processOrder(order) {
  console.log('Processing order:', order.id);
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function sendWelcomeEmail(user) {
  console.log('Sending welcome email to:', user.email);
  await new Promise(resolve => setTimeout(resolve, 500));
}

// Publish events
async function publishOrderCreated(order) {
  await rabbitmq.publish('app.events', 'order.created', order);
}

async function publishUserSignup(user) {
  await rabbitmq.publish('app.events', 'user.signup', user);
}

async function publishNotification(notification) {
  await rabbitmq.publish('app.notifications', '', notification);
}

async function publishError(error) {
  await rabbitmq.publish('app.direct', 'error', error);
}

// Start application
setupMessaging().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing RabbitMQ connection...');
  await rabbitmq.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing RabbitMQ connection...');
  await rabbitmq.close();
  process.exit(0);
});
```

---

## Advanced Features

### Q5: Implement message retries with exponential backoff and dead letter queue.

**Answer:**

```javascript
// rabbitmq-retry.js
const RabbitMQConnection = require('./rabbitmq-connection');

class RabbitMQRetryManager {
  constructor(connection) {
    this.connection = connection;
  }
  
  /**
   * Setup queue with dead letter exchange and retry logic
   */
  async setupRetryQueue(queueName, maxRetries = 3, retryDelay = 5000) {
    const dlx = `${queueName}.dlx`;
    const dlq = `${queueName}.dlq`;
    const retryQueue = `${queueName}.retry`;
    
    // Create dead letter exchange
    await this.connection.addExchange(dlx, 'direct', { durable: true });
    
    // Create main queue
    await this.connection.addQueue(queueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': dlx,
        'x-dead-letter-routing-key': queueName
      }
    });
    
    // Create retry queue with TTL
    await this.connection.addQueue(retryQueue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': this.connection.exchanges[0].name,
        'x-dead-letter-routing-key': queueName,
        'x-message-ttl': retryDelay
      }
    }, [
      { exchange: dlx, routingKey: queueName }
    ]);
    
    // Create dead letter queue (for permanently failed messages)
    await this.connection.addQueue(dlq, { durable: true }, [
      { exchange: dlx, routingKey: dlq }
    ]);
    
    console.log(`Retry queues setup for ${queueName}`);
    console.log(`Max retries: ${maxRetries}, Retry delay: ${retryDelay}ms`);
  }
  
  /**
   * Consumer with retry logic
   */
  async consumeWithRetry(queueName, callback, options = {}) {
    const maxRetries = options.maxRetries || 3;
    
    await this.connection.consume(queueName, async (msg, channel) => {
      try {
        await callback(msg);
        channel.ack(msg);
      } catch (error) {
        const retryCount = this.getRetryCount(msg);
        
        if (retryCount < maxRetries) {
          console.log(`Retry ${retryCount + 1}/${maxRetries} for message`);
          
          // Send to retry queue
          await this.retryMessage(channel, msg, queueName);
          channel.ack(msg);
        } else {
          console.error(`Max retries reached, sending to DLQ:`, error);
          
          // Send to dead letter queue
          await this.sendToDLQ(channel, msg, queueName);
          channel.ack(msg);
        }
      }
    });
  }
  
  getRetryCount(msg) {
    return parseInt(msg.properties.headers['x-retry-count'] || '0');
  }
  
  async retryMessage(channel, msg, queueName) {
    const dlx = `${queueName}.dlx`;
    const retryCount = this.getRetryCount(msg) + 1;
    
    await channel.publish(dlx, queueName, msg.content, {
      headers: {
        ...msg.properties.headers,
        'x-retry-count': retryCount,
        'x-first-death-queue': queueName,
        'x-first-death-reason': 'processing_failed',
        'x-first-death-exchange': msg.fields.exchange,
        'x-first-death-routing-key': msg.fields.routingKey
      },
      deliveryMode: msg.properties.deliveryMode,
      correlationId: msg.properties.correlationId,
      replyTo: msg.properties.replyTo
    });
  }
  
  async sendToDLQ(channel, msg, queueName) {
    const dlx = `${queueName}.dlx`;
    const dlq = `${queueName}.dlq`;
    
    await channel.publish(dlx, dlq, msg.content, {
      headers: {
        ...msg.properties.headers,
        'x-death-count': this.getRetryCount(msg),
        'x-final-reason': 'max_retries_exceeded'
      },
      deliveryMode: 2,
      timestamp: Date.now()
    });
  }
  
  /**
   * Consume from dead letter queue for monitoring/reprocessing
   */
  async consumeDLQ(queueName, callback) {
    const dlq = `${queueName}.dlq`;
    
    await this.connection.consume(dlq, async (msg, channel) => {
      const message = JSON.parse(msg.content.toString());
      const headers = msg.properties.headers;
      
      console.log('Message in DLQ:', {
        message,
        retryCount: headers['x-retry-count'],
        deathQueue: headers['x-first-death-queue'],
        deathReason: headers['x-first-death-reason']
      });
      
      await callback(message, headers);
      channel.ack(msg);
    });
  }
}

// Usage Example
const rabbitmq = new RabbitMQConnection('amqp://localhost');
const retryManager = new RabbitMQRetryManager(rabbitmq);

async function setupRetryMessaging() {
  await rabbitmq.connect();
  
  // Setup exchange
  await rabbitmq.addExchange('app.events', 'topic', { durable: true });
  
  // Setup queue with retry logic
  await retryManager.setupRetryQueue('orders', 3, 5000);
  
  await rabbitmq.addQueue('orders', { durable: true }, [
    { exchange: 'app.events', routingKey: 'order.*' }
  ]);
  
  // Consume with retry
  await retryManager.consumeWithRetry('orders', async (msg) => {
    const order = JSON.parse(msg.content.toString());
    console.log('Processing order:', order);
    
    // Simulate processing (may fail)
    if (order.id % 3 === 0) {
      throw new Error('Random processing error');
    }
    
    await processOrder(order);
    console.log('Order processed successfully:', order.id);
  });
  
  // Monitor dead letter queue
  await retryManager.consumeDLQ('orders', async (message, headers) => {
    console.log('Message in DLQ - you can inspect or reprocess:', message);
    // Send alert, log to monitoring system, etc.
  });
}

async function processOrder(order) {
  console.log('Processing order in database:', order.id);
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Publish orders
async function publishOrder(order) {
  await rabbitmq.publish('app.events', 'order.created', order);
}

// Test
setupRetryMessaging().then(async () => {
  // Publish some orders
  for (let i = 1; i <= 10; i++) {
    await publishOrder({ id: i, amount: 100 });
  }
}).catch(console.error);
```

---

## Error Handling & Reliability

### Q6: How do you ensure message reliability in RabbitMQ?

**Answer:**

**1. Publisher Confirms**
```javascript
class ReliablePublisher {
  constructor(channel) {
    this.channel = channel;
    this.unconfirmedMessages = new Map();
    this.confirmChannel = null;
    this.setupConfirmChannel();
  }
  
  async setupConfirmChannel() {
    // Put channel in confirm mode
    await this.channel.confirmSelect();
    
    this.channel.on('ack', (deliveryTag) => {
      const message = this.unconfirmedMessages.get(deliveryTag);
      if (message) {
        console.log(`Message confirmed: ${deliveryTag}`);
        this.unconfirmedMessages.delete(deliveryTag);
      }
    });
    
    this.channel.on('nack', (deliveryTag) => {
      const message = this.unconfirmedMessages.get(deliveryTag);
      if (message) {
        console.error(`Message rejected: ${deliveryTag}`);
        // Retry or log for later processing
        this.retryMessage(message);
        this.unconfirmedMessages.delete(deliveryTag);
      }
    });
  }
  
  async publish(exchange, routingKey, message, options = {}) {
    const deliveryTag = this.channel.getNextPublishSeqNo();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Publisher confirm timeout'));
      }, 10000);
      
      this.unconfirmedMessages.set(deliveryTag, {
        exchange,
        routingKey,
        message,
        options
      });
      
      this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)), options, (err) => {
        clearTimeout(timeout);
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  
  async retryMessage(message) {
    // Implement retry logic with backoff
    console.log('Retrying message:', message);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.publish(message.exchange, message.routingKey, message.message, message.options);
  }
}
```

**2. Consumer Acknowledgments**
```javascript
class ReliableConsumer {
  constructor(channel) {
    this.channel = channel;
    this.prefetchCount = 1;
  }
  
  async setupQueue(queueName) {
    await this.channel.prefetch(this.prefetchCount);
    await this.channel.assertQueue(queueName, { durable: true });
  }
  
  async consume(queueName, callback) {
    await this.channel.consume(queueName, async (msg) => {
      try {
        const message = JSON.parse(msg.content.toString());
        
        // Process message
        await callback(message);
        
        // Acknowledge successful processing
        this.channel.ack(msg);
        console.log(`Message processed and acknowledged: ${msg.fields.deliveryTag}`);
      } catch (error) {
        console.error('Error processing message:', error);
        
        // Negative acknowledgment - requeue message
        const willRequeue = this.shouldRequeue(msg, error);
        this.channel.nack(msg, false, willRequeue);
        
        if (!willRequeue) {
          console.error('Message sent to DLQ');
        }
      }
    }, { noAck: false });
  }
  
  shouldRequeue(msg, error) {
    const retryCount = parseInt(msg.properties.headers['x-retry-count'] || '0');
    const maxRetries = 3;
    
    // Don't requeue if max retries reached
    if (retryCount >= maxRetries) {
      return false;
    }
    
    // Requeue for retryable errors
    const retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'];
    return retryableErrors.some(code => error.message.includes(code));
  }
}
```

**3. Idempotent Processing**
```javascript
class IdempotentProcessor {
  constructor(redis) {
    this.redis = redis;
  }
  
  async processMessage(message, callback) {
    const messageId = message.id || message.properties.messageId;
    const processedKey = `processed:${messageId}`;
    
    // Check if already processed
    const alreadyProcessed = await this.redis.get(processedKey);
    if (alreadyProcessed) {
      console.log(`Message ${messageId} already processed, skipping`);
      return;
    }
    
    try {
      // Process message
      const result = await callback(message);
      
      // Mark as processed
      await this.redis.set(processedKey, '1', 'EX', 86400); // 24 hours
      
      return result;
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }
}

// Usage
const processor = new IdempotentProcessor(redis);

await consumer.consume('orders', async (message) => {
  return await processor.processMessage(message, async (msg) => {
    // This will only run once per message ID
    return await createOrder(msg);
  });
});
```

**4. Exactly-Once Processing**
```javascript
class ExactlyOnceProcessor {
  constructor(redis) {
    this.redis = redis;
  }
  
  async processWithDeduplication(queueName, callback) {
    await this.channel.consume(queueName, async (msg) => {
      const message = JSON.parse(msg.content.toString());
      const messageId = message.id;
      
      // Use distributed lock to ensure exactly-once processing
      const lockKey = `lock:message:${messageId}`;
      const lockAcquired = await this.acquireLock(lockKey, 30000);
      
      if (!lockAcquired) {
        // Another instance is processing this message
        console.log(`Message ${messageId} being processed by another instance`);
        this.channel.nack(msg, false, false); // Don't requeue
        return;
      }
      
      try {
        const result = await callback(message);
        this.channel.ack(msg);
        return result;
      } catch (error) {
        console.error('Error processing message:', error);
        this.channel.nack(msg, false, true); // Requeue
        throw error;
      } finally {
        await this.releaseLock(lockKey);
      }
    });
  }
  
  async acquireLock(key, ttl) {
    return await this.redis.set(key, '1', 'PX', ttl, 'NX');
  }
  
  async releaseLock(key) {
    await this.redis.del(key);
  }
}
```

**5. Circuit Breaker Pattern**
```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.threshold = options.threshold || 5;
    this.timeout = options.timeout || 60000;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'closed'; // closed, open, half-open
  }
  
  async execute(fn) {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      
      this.failureCount = 0;
      this.state = 'closed';
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.threshold) {
        this.state = 'open';
        console.error('Circuit breaker opened due to failures');
      }
      
      throw error;
    }
  }
}

// Usage
const circuitBreaker = new CircuitBreaker({ threshold: 5, timeout: 60000 });

await consumer.consume('orders', async (message) => {
  return await circuitBreaker.execute(async () => {
    return await processOrder(message);
  });
});
```

---

## Complex Scenarios

### Q7: Design an event-driven e-commerce system with RabbitMQ.

**Answer:**

```javascript
// ecommerce-event-system.js
const RabbitMQConnection = require('./rabbitmq-connection');

class ECommerceEventSystem {
  constructor(rabbitmqUrl) {
    this.rabbitmq = new RabbitMQConnection(rabbitmqUrl);
    this.exchanges = {
      orders: 'ecommerce.orders',
      payments: 'ecommerce.payments',
      inventory: 'ecommerce.inventory',
      notifications: 'ecommerce.notifications',
      shipping: 'ecommerce.shipping'
    };
  }
  
  async setup() {
    await this.rabbitmq.connect();
    
    // Setup exchanges
    await this.rabbitmq.addExchange(this.exchanges.orders, 'topic', { durable: true });
    await this.rabbitmq.addExchange(this.exchanges.payments, 'topic', { durable: true });
    await this.rabbitmq.addExchange(this.exchanges.inventory, 'topic', { durable: true });
    await this.rabbitmq.addExchange(this.exchanges.notifications, 'fanout', { durable: true });
    await this.rabbitmq.addExchange(this.exchanges.shipping, 'topic', { durable: true });
    
    // Setup queues and bindings
    await this.setupOrderQueues();
    await this.setupPaymentQueues();
    await this.setupInventoryQueues();
    await this.setupNotificationQueues();
    await this.setupShippingQueues();
    
    // Start consumers
    await this.startConsumers();
  }
  
  async setupOrderQueues() {
    // Order processing queue
    await this.rabbitmq.addQueue('order.processing', { durable: true }, [
      { exchange: this.exchanges.orders, routingKey: 'order.created' }
    ]);
    
    // Order cancellation queue
    await this.rabbitmq.addQueue('order.cancellation', { durable: true }, [
      { exchange: this.exchanges.orders, routingKey: 'order.cancelled' }
    ]);
    
    // Order analytics queue
    await this.rabbitmq.addQueue('order.analytics', { durable: true }, [
      { exchange: this.exchanges.orders, routingKey: 'order.#' }
    ]);
  }
  
  async setupPaymentQueues() {
    // Payment processing queue
    await this.rabbitmq.addQueue('payment.processing', { durable: true }, [
      { exchange: this.exchanges.payments, routingKey: 'payment.*' }
    ]);
    
    // Payment failed queue
    await this.rabbitmq.addQueue('payment.failed', { durable: true }, [
      { exchange: this.exchanges.payments, routingKey: 'payment.failed' }
    ]);
  }
  
  async setupInventoryQueues() {
    // Stock reservation queue
    await this.rabbitmq.addQueue('inventory.reserve', { durable: true }, [
      { exchange: this.exchanges.inventory, routingKey: 'inventory.reserve' }
    ]);
    
    // Stock release queue
    await this.rabbitmq.addQueue('inventory.release', { durable: true }, [
      { exchange: this.exchanges.inventory, routingKey: 'inventory.release' }
    ]);
  }
  
  async setupNotificationQueues() {
    // Email notifications
    await this.rabbitmq.addQueue('notification.email', { durable: true }, [
      { exchange: this.exchanges.notifications, routingKey: '' }
    ]);
    
    // SMS notifications
    await this.rabbitmq.addQueue('notification.sms', { durable: true }, [
      { exchange: this.exchanges.notifications, routingKey: '' }
    ]);
  }
  
  async setupShippingQueues() {
    // Shipping queue
    await this.rabbitmq.addQueue('shipping.create', { durable: true }, [
      { exchange: this.exchanges.shipping, routingKey: 'shipping.*' }
    ]);
  }
  
  async startConsumers() {
    // Order processing consumer
    await this.rabbitmq.consume('order.processing', async (msg, channel) => {
      const order = JSON.parse(msg.content.toString());
      console.log('Processing order:', order.id);
      
      // Reserve inventory
      await this.publishInventoryEvent('inventory.reserve', {
        orderId: order.id,
        items: order.items
      });
      
      // Process payment
      await this.publishPaymentEvent('payment.process', {
        orderId: order.id,
        amount: order.total,
        userId: order.userId
      });
      
      channel.ack(msg);
    });
    
    // Payment consumer
    await this.rabbitmq.consume('payment.processing', async (msg, channel) => {
      const payment = JSON.parse(msg.content.toString());
      
      try {
        const result = await this.processPayment(payment);
        
        if (result.success) {
          await this.publishOrderEvent('order.paid', {
            orderId: payment.orderId,
            transactionId: result.transactionId
          });
          
          await this.publishShippingEvent('shipping.create', {
            orderId: payment.orderId
          });
          
          await this.publishNotification({
            type: 'order_confirmation',
            orderId: payment.orderId,
            userId: payment.userId
          });
        } else {
          await this.publishPaymentEvent('payment.failed', {
            orderId: payment.orderId,
            error: result.error
          });
          
          await this.publishInventoryEvent('inventory.release', {
            orderId: payment.orderId
          });
        }
      } catch (error) {
        console.error('Payment processing error:', error);
        await this.publishPaymentEvent('payment.failed', {
          orderId: payment.orderId,
          error: error.message
        });
      }
      
      channel.ack(msg);
    });
    
    // Inventory consumer
    await this.rabbitmq.consume('inventory.reserve', async (msg, channel) => {
      const reservation = JSON.parse(msg.content.toString());
      
      try {
        const result = await this.reserveInventory(reservation);
        
        if (!result.success) {
          await this.publishPaymentEvent('payment.failed', {
            orderId: reservation.orderId,
            error: 'Insufficient inventory'
          });
        }
      } catch (error) {
        console.error('Inventory reservation error:', error);
      }
      
      channel.ack(msg);
    });
    
    // Notification consumers
    await this.rabbitmq.consume('notification.email', async (msg, channel) => {
      const notification = JSON.parse(msg.content.toString());
      await this.sendEmailNotification(notification);
      channel.ack(msg);
    });
    
    await this.rabbitmq.consume('notification.sms', async (msg, channel) => {
      const notification = JSON.parse(msg.content.toString());
      await this.sendSMSNotification(notification);
      channel.ack(msg);
    });
    
    // Shipping consumer
    await this.rabbitmq.consume('shipping.create', async (msg, channel) => {
      const shipping = JSON.parse(msg.content.toString());
      
      try {
        const result = await this.createShipping(shipping);
        
        await this.publishOrderEvent('order.shipped', {
          orderId: shipping.orderId,
          trackingNumber: result.trackingNumber
        });
        
        await this.publishNotification({
          type: 'order_shipped',
          orderId: shipping.orderId,
          trackingNumber: result.trackingNumber
        });
      } catch (error) {
        console.error('Shipping creation error:', error);
      }
      
      channel.ack(msg);
    });
  }
  
  // Event publishers
  async publishOrderEvent(eventType, data) {
    await this.rabbitmq.publish(this.exchanges.orders, eventType, {
      ...data,
      eventType,
      timestamp: new Date()
    });
  }
  
  async publishPaymentEvent(eventType, data) {
    await this.rabbitmq.publish(this.exchanges.payments, eventType, {
      ...data,
      eventType,
      timestamp: new Date()
    });
  }
  
  async publishInventoryEvent(eventType, data) {
    await this.rabbitmq.publish(this.exchanges.inventory, eventType, {
      ...data,
      eventType,
      timestamp: new Date()
    });
  }
  
  async publishNotification(data) {
    await this.rabbitmq.publish(this.exchanges.notifications, '', {
      ...data,
      timestamp: new Date()
    });
  }
  
  async publishShippingEvent(eventType, data) {
    await this.rabbitmq.publish(this.exchanges.shipping, eventType, {
      ...data,
      eventType,
      timestamp: new Date()
    });
  }
  
  // Business logic methods
  async processPayment(payment) {
    // Simulate payment processing
    console.log('Processing payment:', payment);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate random failures
    if (Math.random() < 0.1) {
      return { success: false, error: 'Payment declined' };
    }
    
    return {
      success: true,
      transactionId: `txn_${Date.now()}`
    };
  }
  
  async reserveInventory(reservation) {
    console.log('Reserving inventory:', reservation);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Simulate random inventory failures
    if (Math.random() < 0.05) {
      return { success: false, error: 'Out of stock' };
    }
    
    return { success: true };
  }
  
  async createShipping(shipping) {
    console.log('Creating shipping:', shipping);
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return {
      success: true,
      trackingNumber: `TRK${Date.now()}`
    };
  }
  
  async sendEmailNotification(notification) {
    console.log('Sending email notification:', notification.type);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  async sendSMSNotification(notification) {
    console.log('Sending SMS notification:', notification.type);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Create order workflow
  async createOrder(orderData) {
    const order = {
      id: `ORD${Date.now()}`,
      ...orderData,
      status: 'pending',
      createdAt: new Date()
    };
    
    // Publish order created event
    await this.publishOrderEvent('order.created', order);
    
    return order;
  }
}

// Usage
const ecommerce = new ECommerceEventSystem('amqp://localhost');

ecommerce.setup().then(async () => {
  console.log('E-commerce event system setup complete');
  
  // Create a test order
  const order = await ecommerce.createOrder({
    userId: 'user123',
    items: [
      { productId: 'prod1', quantity: 2, price: 50 },
      { productId: 'prod2', quantity: 1, price: 30 }
    ],
    total: 130,
    shippingAddress: {
      street: '123 Main St',
      city: 'New York',
      zip: '10001'
    }
  });
  
  console.log('Order created:', order.id);
}).catch(console.error);
```

---

## Performance & Scaling

### Q8: How do you optimize RabbitMQ performance for high throughput?

**Answer:**

**1. Publisher Optimizations**
```javascript
class HighThroughputPublisher {
  constructor(channel) {
    this.channel = channel;
    this.batchSize = 100;
    this.batch = [];
    this.flushInterval = 100; // ms
    this.setupBatching();
  }
  
  setupBatching() {
    this.flushTimer = setInterval(() => {
      if (this.batch.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }
  
  async publish(exchange, routingKey, message) {
    this.batch.push({ exchange, routingKey, message });
    
    if (this.batch.length >= this.batchSize) {
      await this.flush();
    }
  }
  
  async flush() {
    if (this.batch.length === 0) return;
    
    const batch = this.batch;
    this.batch = [];
    
    // Use transactions or confirms for batch
    await this.channel.publishBatch(batch);
  }
  
  async publishBatch(messages) {
    for (const msg of messages) {
      this.channel.publish(
        msg.exchange,
        msg.routingKey,
        Buffer.from(JSON.stringify(msg.message)),
        { persistent: true }
      );
    }
  }
}
```

**2. Consumer Optimizations**
```javascript
class HighThroughputConsumer {
  constructor(channel) {
    this.channel = channel;
    this.prefetchCount = 100; // Increase prefetch for higher throughput
    this.processingPool = new WorkerPool(10); // Multiple workers
  }
  
  async setupQueue(queueName) {
    await this.channel.prefetch(this.prefetchCount);
    await this.channel.assertQueue(queueName, { durable: true });
  }
  
  async consume(queueName) {
    await this.channel.consume(queueName, (msg) => {
      // Process in parallel
      this.processingPool.enqueue(async () => {
        try {
          await this.processMessage(msg);
          this.channel.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          this.channel.nack(msg, false, true);
        }
      });
    }, { noAck: false });
  }
  
  async processMessage(msg) {
    const message = JSON.parse(msg.content.toString());
    // Process message
    await this.handleMessage(message);
  }
}

// Simple worker pool
class WorkerPool {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.queue = [];
    this.activeWorkers = 0;
  }
  
  async enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }
  
  async process() {
    if (this.activeWorkers >= this.concurrency || this.queue.length === 0) {
      return;
    }
    
    this.activeWorkers++;
    const { task, resolve, reject } = this.queue.shift();
    
    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.activeWorkers--;
      this.process();
    }
  }
}
```

**3. Connection Pooling**
```javascript
class RabbitMQConnectionPool {
  constructor(url, options = {}) {
    this.url = url;
    this.poolSize = options.poolSize || 5;
    this.connections = [];
    this.currentConnection = 0;
  }
  
  async initialize() {
    for (let i = 0; i < this.poolSize; i++) {
      const connection = await amqp.connect(this.url);
      const channel = await connection.createChannel();
      this.connections.push({ connection, channel });
    }
  }
  
  getChannel() {
    const index = this.currentConnection % this.connections.length;
    this.currentConnection++;
    return this.connections[index].channel;
  }
  
  async close() {
    for (const { connection } of this.connections) {
      await connection.close();
    }
  }
}
```

**4. Queue Optimization**
```javascript
async function optimizeQueueSettings(channel) {
  // Lazy queue - messages are loaded to RAM only when needed
  await channel.assertQueue('lazy_queue', {
    durable: true,
    arguments: {
      'x-queue-mode': 'lazy'
    }
  });
  
  // Quorum queue - higher consistency, slightly lower throughput
  await channel.assertQueue('quorum_queue', {
    durable: true,
    arguments: {
      'x-quorum-initial-group-size': 3
    }
  });
  
  // Classic queue - highest throughput
  await channel.assertQueue('classic_queue', {
    durable: true
  });
  
  // Stream queue - for replayable message logs
  await channel.assertQueue('stream_queue', {
    durable: true,
    arguments: {
      'x-queue-type': 'stream',
      'x-max-length-bytes': 1073741824 // 1GB
    }
  });
}
```

**5. Monitoring**
```javascript
class RabbitMQMonitor {
  constructor(channel) {
    this.channel = channel;
    this.metrics = {
      messagesPublished: 0,
      messagesConsumed: 0,
      messagesAcknowledged: 0,
      messagesRejected: 0,
      publishLatency: [],
      consumeLatency: []
    };
  }
  
  recordPublished() {
    this.metrics.messagesPublished++;
  }
  
  recordConsumed() {
    this.metrics.messagesConsumed++;
  }
  
  recordAcknowledged() {
    this.metrics.messagesAcknowledged++;
  }
  
  recordRejected() {
    this.metrics.messagesRejected++;
  }
  
  recordPublishLatency(ms) {
    this.metrics.publishLatency.push(ms);
    if (this.metrics.publishLatency.length > 1000) {
      this.metrics.publishLatency.shift();
    }
  }
  
  recordConsumeLatency(ms) {
    this.metrics.consumeLatency.push(ms);
    if (this.metrics.consumeLatency.length > 1000) {
      this.metrics.consumeLatency.shift();
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      averagePublishLatency: this.getAverageLatency(this.metrics.publishLatency),
      averageConsumeLatency: this.getAverageLatency(this.metrics.consumeLatency)
    };
  }
  
  getAverageLatency(latencies) {
    if (latencies.length === 0) return 0;
    const sum = latencies.reduce((a, b) => a + b, 0);
    return sum / latencies.length;
  }
}
```

---

## Advanced Production Debugging & Troubleshooting

### Q9: How do you troubleshoot message loss and ensure delivery guarantees in production?

**Answer:**

**1. Message Loss Detection & Prevention**

```javascript
class MessageGarantor {
  constructor(channel, db) {
    this.channel = channel;
    this.db = db;
    this.unackedMessages = new Map();
    this.deadLetterQueue = 'dlq.messages';
  }

  async publishWithPersistence(exchange, routingKey, message) {
    // Generate unique message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store in database first (transaction log)
    await this.db.query(
      `INSERT INTO message_log (message_id, exchange, routing_key, content, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [messageId, exchange, routingKey, JSON.stringify(message), 'pending']
    );

    // Publish to RabbitMQ with confirmation
    return new Promise((resolve, reject) => {
      this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify({ ...message, messageId })),
        { persistent: true, mandatory: true },
        (error, ok) => {
          if (error) {
            reject(error);
            this.db.query(
              'UPDATE message_log SET status = $1 WHERE message_id = $2',
              ['failed', messageId]
            );
          } else {
            this.db.query(
              'UPDATE message_log SET status = $1 WHERE message_id = $2',
              ['published', messageId]
            );
            resolve({ messageId, ok });
          }
        }
      );
    });
  }

  async setupDLQ(exchange, queue) {
    // Dead Letter Queue for rejected messages
    await this.channel.assertExchange('dlx', 'direct', { durable: true });
    await this.channel.assertQueue(this.deadLetterQueue, { durable: true });
    await this.channel.bindQueue(this.deadLetterQueue, 'dlx', 'failed');

    // Bind original queue with DLX
    await this.channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'dlx',
        'x-dead-letter-routing-key': 'failed',
        'x-message-ttl': 3600000 // 1 hour
      }
    });

    // Consume DLQ messages
    await this.channel.consume(this.deadLetterQueue, async (msg) => {
      try {
        await this.handleFailedMessage(msg);
        this.channel.ack(msg);
      } catch (error) {
        console.error('DLQ handling error:', error);
        this.channel.nack(msg, false, false); // Don't requeue
      }
    });
  }

  async handleFailedMessage(msg) {
    const message = JSON.parse(msg.content.toString());
    const { messageId, reason } = message;

    // Log to database
    await this.db.query(
      `INSERT INTO failed_messages (message_id, reason, raw_message, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [messageId, reason, msg.content.toString()]
    );

    // Alert operations team
    await this.sendAlert({
      severity: 'critical',
      title: 'Message Processing Failed',
      messageId,
      reason
    });
  }
}
```

**2. Message Deduplication (Idempotency)**

```javascript
class IdempotentConsumer {
  constructor(channel, cache, db) {
    this.channel = channel;
    this.cache = cache;
    this.db = db;
  }

  async consumeIdempotent(queue, handler) {
    await this.channel.consume(queue, async (msg) => {
      const content = JSON.parse(msg.content.toString());
      const { messageId } = content;

      try {
        // Check if already processed
        const cached = await this.cache.get(`processed:${messageId}`);
        if (cached) {
          console.log(`Duplicate message detected: ${messageId}, skipping`);
          this.channel.ack(msg);
          return;
        }

        // Check database as backup
        const { rows } = await this.db.query(
          'SELECT id FROM processed_messages WHERE message_id = $1',
          [messageId]
        );

        if (rows.length > 0) {
          console.log(`Message already in DB: ${messageId}, skipping`);
          this.channel.ack(msg);
          return;
        }

        // Process message
        const result = await handler(content);

        // Mark as processed in database
        await this.db.query(
          `INSERT INTO processed_messages (message_id, result, processed_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (message_id) DO NOTHING`,
          [messageId, JSON.stringify(result)]
        );

        // Cache for short-term deduplication
        await this.cache.set(`processed:${messageId}`, true, 3600);

        this.channel.ack(msg);
      } catch (error) {
        console.error(`Error processing message ${messageId}:`, error);
        // Dead letter queue will handle retry logic
        this.channel.nack(msg, false, true); // Requeue to DLQ
      }
    });
  }
}
```

**3. Debugging Message Flow**

```javascript
class RabbitMQDebuger {
  constructor(channel, management api) {
    this.channel = channel;
    this.managementApi = managementApi;
  }

  // Trace a message through the system
  async traceMessage(messageId) {
    const trace = {
      messageId,
      published: null,
      queued: null,
      consumed: null,
      status: null
    };

    // Check message log
    const log = await this.db.query(
      `SELECT * FROM message_log WHERE message_id = $1`,
      [messageId]
    );

    if (log.rows[0]) {
      trace.published = log.rows[0];
    }

    // Check processed messages
    const processed = await this.db.query(
      `SELECT * FROM processed_messages WHERE message_id = $1`,
      [messageId]
    );

    if (processed.rows[0]) {
      trace.consumed = processed.rows[0];
      trace.status = 'completed';
    }

    // Check failed messages
    const failed = await this.db.query(
      `SELECT * FROM failed_messages WHERE message_id = $1`,
      [messageId]
    );

    if (failed.rows[0] && !trace.consumed) {
      trace.status = 'failed';
      return { ...trace, failureReason: failed.rows[0].reason };
    }

    if (!trace.consumed && !failed.rows[0]) {
      trace.status = 'pending';
    }

    return trace;
  }

  // Detect stuck messages
  async detectStuckMessages(staleThreshold = 3600000) { // 1 hour
    const result = await this.db.query(`
      SELECT message_id, created_at, status
      FROM message_log
      WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '1 hour'
    `);

    return {
      stuckCount: result.rows.length,
      messages: result.rows,
      action: 'Consider republishing or investigating consumer'
    };
  }

  // Check queue depth
  async analyzeQueueHealth() {
    const overview = await this.managementApi.get('/api/overview');
    
    const queues = await this.managementApi.get('/api/queues');

    return {
      totalQueues: queues.length,
      queueDetails: queues.map(q => ({
        name: q.name,
        messages: q.messages,
        messagesReady: q.messages_ready,
        messagesUnacknowledged: q.messages_unacknowledged,
        consumers: q.consumers,
        messagesBackup: q.messages > 1000000, // Alert if > 1M
        consumerStalled: q.messages_ready > 10000 && q.consumers === 0
      })),
      issues: queues
        .filter(q => q.messages_ready > 10000 && q.consumers === 0)
        .map(q => `Queue ${q.name} has ${q.messages_ready} messages but no consumers`)
    };
  }

  // Performance analysis
  async analyzePerformance() {
    const result = await this.db.query(`
      SELECT
        DATE_TRUNC('minute', processed_at) as minute,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (processed_at - timestamp))) as avg_latency_sec
      FROM processed_messages
      WHERE processed_at > NOW() - INTERVAL '1 hour'
      GROUP BY DATE_TRUNC('minute', processed_at)
      ORDER BY minute DESC
    `);

    return {
      lastHourMetrics: result.rows,
      averageThroughput: result.rows.reduce((sum, r) => sum + r.count, 0) / 60 + ' msg/sec'
    };
  }
}
```

**4. Advanced Circuit Breaker with Metrics**

```javascript
class CircuitBreakerWithMetrics {
  constructor(name, { failureThreshold = 5, resetTimeout = 60000, metrics } = {}) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.metrics = metrics;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;
  }

  async execute(operation) {
    const start = Date.now();

    try {
      if (this.state === 'OPEN') {
        if (Date.now() - this.lastFailureTime > this.resetTimeout) {
          this.state = 'HALF_OPEN';
          this.halfOpenAttempts = 0;
        } else {
          throw new Error(`Circuit breaker ${this.name} is OPEN`);
        }
      }

      const result = await operation();

      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.consecutiveFailures = 0;
      }

      const latency = Date.now() - start;
      this.metrics?.recordSuccess(this.name, latency);

      return result;
    } catch (error) {
      const latency = Date.now() - start;
      this.metrics?.recordFailure(this.name, latency, error.message);

      this.consecutiveFailures++;
      this.lastFailureTime = Date.now();

      if (this.state === 'HALF_OPEN') {
        this.halfOpenAttempts++;
        if (this.halfOpenAttempts > 2) {
          this.state = 'OPEN';
        }
      } else if (this.consecutiveFailures >= this.failureThreshold) {
        this.state = 'OPEN';
      }

      throw error;
    }
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime
    };
  }
}
```

---

## Summary

**Key Takeaways:**
1. **Understand exchange types** - Direct, Topic, Fanout, Headers
2. **Implement proper error handling** - Publisher confirms, consumer acknowledgments
3. **Use retry patterns** - Exponential backoff, dead letter queues
4. **Ensure reliability** - Idempotent processing, exactly-once semantics
5. **Optimize for performance** - Batching, prefetch tuning, connection pooling
6. **Monitor metrics** - Track message rates, latencies, errors
7. **Design for failure** - Circuit breakers, fallback mechanisms
8. **Use proper queue types** - Classic, Quorum, Lazy, Stream based on needs
9. **Implement circuit breakers** - Prevent cascading failures
10. **Message persistence** - Database-backed delivery guarantees
11. **Idempotency** - Prevent duplicate message processing
12. **Active monitoring** - Detect stuck messages and queue issues
10. **Event-driven architecture** - Decouple services with messaging