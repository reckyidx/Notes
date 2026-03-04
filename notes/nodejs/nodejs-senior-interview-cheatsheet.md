# Node.js Senior Developer Interview Cheat Sheet

## Table of Contents
1. [Core Concepts & Architecture](#core-concepts--architecture)
2. [Event Loop & Asynchronous Programming](#event-loop--asynchronous-programming)
3. [Advanced Patterns](#advanced-patterns)
4. [Streams & Buffers](#streams--buffers)
5. [Error Handling](#error-handling)
6. [Performance Optimization](#performance-optimization)
7. [Security Best Practices](#security-best-practices)
8. [Design Patterns](#design-patterns)
9. [Testing & Debugging](#testing--debugging)
10. [API Design & REST](#api-design--rest)
11. [Microservices & Distributed Systems](#microservices--distributed-systems)
12. [Memory Management](#memory-management)

---

## Core Concepts & Architecture

### 1. Event Loop Deep Dive

**Question: Explain the Node.js Event Loop phases and their order.**

```javascript
// Event Loop Phases (in order):
// 1. Timers Phase - setTimeout(), setInterval()
// 2. Pending Callbacks Phase - I/O callbacks
// 3. Poll Phase - Retrieve new I/O events
// 4. Check Phase - setImmediate() callbacks
// 5. Close Callbacks Phase - socket.on('close', ...)

// Example demonstrating phase ordering
console.log('Start');

setTimeout(() => console.log('setTimeout'), 0);
setImmediate(() => console.log('setImmediate'));

Promise.resolve().then(() => console.log('Promise'));

process.nextTick(() => console.log('nextTick'));

console.log('End');

// Output: Start -> End -> nextTick -> Promise -> setTimeout -> setImmediate
// (setTimeout and setImmediate order may vary in I/O cycles)
```

### 2. Process vs Threads

**Question: How does Node.js handle concurrency differently from multi-threaded applications?**

```javascript
// Node.js: Single-threaded event loop + libuv thread pool
const crypto = require('crypto');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

// CPU-intensive operation in event loop (BLOCKS)
function hashSync() {
  crypto.pbkdf2Sync('password', 'salt', 100000, 512, 'sha512');
  console.log('Hash computed in main thread');
}

// Using Worker Threads for CPU-intensive operations
if (isMainThread) {
  const worker = new Worker(__filename, {
    workerData: { password: 'password' }
  });
  
  worker.on('message', (hash) => {
    console.log('Hash computed in worker:', hash);
  });
  
  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });
  
  worker.on('exit', (code) => {
    if (code !== 0) console.error(`Worker stopped with exit code ${code}`);
  });
  
  // Event loop continues while worker runs
  console.log('Main thread continues...');
} else {
  // Worker thread code
  crypto.pbkdf2(workerData.password, 'salt', 100000, 512, 'sha512', 
    (err, key) => {
      if (err) throw err;
      parentPort.postMessage(key.toString('hex'));
    }
  );
}
```

### 3. Module System (CJS vs ESM)

**Question: Explain CommonJS vs ES Modules and interoperability.**

```javascript
// CommonJS (require/module.exports)
// utils.cjs
const fs = require('fs');
const path = require('path');

function readFile(filePath) {
  return fs.readFileSync(path.join(__dirname, filePath), 'utf-8');
}

module.exports = { readFile };
// or: exports.readFile = readFile;

// ES Modules (import/export)
// utils.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function readFile(filePath) {
  return await fs.promises.readFile(
    path.join(__dirname, filePath), 
    'utf-8'
  );
}

// Named export
export const config = { timeout: 5000 };

// Default export
export default { readFile };

// Interoperability: Dynamic import in CommonJS
// app.cjs
async function loadModule() {
  const { default: utils } = await import('./utils.mjs');
  return utils;
}
```

---

## Event Loop & Asynchronous Programming

### 1. Microtasks vs Macrotasks

**Question: Explain microtask queue vs macrotask queue and execution order.**

```javascript
console.log('1. Script start');

setTimeout(() => console.log('2. setTimeout'), 0);

Promise.resolve()
  .then(() => console.log('3. Promise 1'))
  .then(() => console.log('4. Promise 2'));

process.nextTick(() => console.log('5. nextTick'));

queueMicrotask(() => console.log('6. queueMicrotask'));

console.log('7. Script end');

// Output: 1 -> 7 -> 5 -> 3 -> 6 -> 4 -> 2
// nextTick queue -> Microtask queue -> Macrotask queue
```

### 2. Async/Await Internals

**Question: How does async/await work under the hood?**

```javascript
// Async function returns a Promise
async function fetchData() {
  const result1 = await fetch('/api/data1');
  const result2 = await fetch('/api/data2');
  return { result1, result2 };
}

// Compiled equivalent (simplified)
function fetchData() {
  return new Promise((resolve, reject) => {
    const generator = (function* () {
      const result1 = yield fetch('/api/data1');
      const result2 = yield fetch('/api/data2');
      return { result1, result2 };
    })();
    
    const iterator = generator();
    
    function step(nextValue) {
      const { done, value } = iterator.next(nextValue);
      if (done) {
        resolve(value);
      } else {
        Promise.resolve(value).then(step).catch(reject);
      }
    }
    
    step();
  });
}

// Error handling with async/await
class CustomError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CustomError';
  }
}

async function safeExecute() {
  try {
    const data = await riskyOperation();
    return { success: true, data };
  } catch (error) {
    if (error instanceof CustomError) {
      console.error('Custom error:', error.message);
      return { success: false, error: error.message };
    }
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal error' };
  }
}
```

### 3. Promise Patterns

**Question: Implement Promise.all, Promise.race, and Promise.allSettled.**

```javascript
// Implement Promise.all
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = [];
    let completed = 0;
    
    if (promises.length === 0) {
      resolve(results);
      return;
    }
    
    promises.forEach((promise, index) => {
      Promise.resolve(promise)
        .then(value => {
          results[index] = value;
          completed++;
          if (completed === promises.length) {
            resolve(results);
          }
        })
        .catch(reject);
    });
  });
}

// Implement Promise.race
function promiseRace(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach(promise => {
      Promise.resolve(promise)
        .then(resolve)
        .catch(reject);
    });
  });
}

// Implement Promise.allSettled
function promiseAllSettled(promises) {
  return new Promise((resolve) => {
    const results = [];
    let completed = 0;
    
    if (promises.length === 0) {
      resolve(results);
      return;
    }
    
    promises.forEach((promise, index) => {
      Promise.resolve(promise)
        .then(value => {
          results[index] = { status: 'fulfilled', value };
        })
        .catch(reason => {
          results[index] = { status: 'rejected', reason };
        })
        .finally(() => {
          completed++;
          if (completed === promises.length) {
            resolve(results);
          }
        });
    });
  });
}

// Usage examples
async function demoPromisePatterns() {
  const promises = [
    Promise.resolve(1),
    Promise.reject(new Error('Failed')),
    Promise.resolve(3)
  ];
  
  // Promise.all - fails fast
  try {
    const result = await promiseAll(promises);
    console.log('All:', result);
  } catch (err) {
    console.log('All failed:', err.message);
  }
  
  // Promise.allSettled - waits for all
  const settled = await promiseAllSettled(promises);
  console.log('AllSettled:', settled);
  
  // Promise.race - first to complete
  const raced = await promiseRace(promises);
  console.log('Race:', raced);
}
```

---

## Advanced Patterns

### 1. Observer Pattern (EventEmitter)

**Question: Implement a custom EventEmitter class.**

```javascript
class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this; // For chaining
  }
  
  once(event, listener) {
    const onceWrapper = (...args) => {
      this.off(event, onceWrapper);
      listener.apply(this, args);
    };
    this.on(event, onceWrapper);
    return this;
  }
  
  off(event, listenerToRemove) {
    if (!this.events[event]) return this;
    
    this.events[event] = this.events[event].filter(
      listener => listener !== listenerToRemove
    );
    return this;
  }
  
  emit(event, ...args) {
    if (!this.events[event]) return false;
    
    this.events[event].forEach(listener => {
      listener.apply(this, args);
    });
    return true;
  }
  
  listenerCount(event) {
    return this.events[event]?.length || 0;
  }
  
  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
    return this;
  }
}

// Usage: Shopping cart example
class ShoppingCart extends EventEmitter {
  constructor() {
    super();
    this.items = [];
  }
  
  addItem(item) {
    this.items.push(item);
    this.emit('itemAdded', item);
    this.emit('changed', this.items);
  }
  
  removeItem(itemId) {
    const index = this.items.findIndex(i => i.id === itemId);
    if (index !== -1) {
      const item = this.items.splice(index, 1)[0];
      this.emit('itemRemoved', item);
      this.emit('changed', this.items);
    }
  }
  
  checkout() {
    this.emit('checkout', this.items);
    this.items = [];
  }
}

const cart = new ShoppingCart();

cart.on('itemAdded', (item) => {
  console.log(`Item added: ${item.name}`);
});

cart.on('changed', (items) => {
  console.log(`Cart updated. Items: ${items.length}`);
});

cart.once('checkout', (items) => {
  console.log(`Processing checkout for ${items.length} items`);
});

cart.addItem({ id: 1, name: 'Book', price: 20 });
cart.addItem({ id: 2, name: 'Pen', price: 5 });
cart.checkout();
```

### 2. Middleware Pattern

**Question: Implement Express-style middleware.**

```javascript
class Application {
  constructor() {
    this.middlewares = [];
  }
  
  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }
  
  async handleRequest(req, res) {
    let index = 0;
    
    const next = async (error) => {
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      
      if (index >= this.middlewares.length) {
        return res.status(404).json({ error: 'Not found' });
      }
      
      const middleware = this.middlewares[index++];
      await middleware(req, res, next);
    };
    
    await next();
  }
}

// Example middlewares
function logger(req, res, next) {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
}

function bodyParser(req, res, next) {
  let data = '';
  req.on('data', chunk => data += chunk);
  req.on('end', () => {
    try {
      req.body = data ? JSON.parse(data) : {};
      next();
    } catch (err) {
      next(err);
    }
  });
}

function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
}

// Route handler middleware
function routeHandler(method, path) {
  return (req, res, next) => {
    if (req.method === method && req.path === path) {
      res.json({ message: 'Success' });
    } else {
      next();
    }
  };
}

// Usage
const app = new Application();

app
  .use(logger)
  .use(bodyParser)
  .use(routeHandler('GET', '/api/users'))
  .use(routeHandler('POST', '/api/users'))
  .use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
```

### 3. Singleton Pattern

**Question: Implement a thread-safe Singleton with lazy initialization.**

```javascript
// Singleton with IIFE
const Database = (() => {
  let instance = null;
  
  class DatabaseConnection {
    constructor() {
      if (instance) {
        throw new Error('Use Database.getInstance() instead');
      }
      this.connection = null;
    }
    
    async connect(connectionString) {
      if (this.connection) {
        return this.connection;
      }
      console.log(`Connecting to: ${connectionString}`);
      // Simulate connection
      this.connection = { connected: true, connectionString };
      return this.connection;
    }
    
    async query(sql, params) {
      if (!this.connection) {
        throw new Error('Not connected to database');
      }
      console.log(`Executing: ${sql}`, params);
      return { rows: [] };
    }
    
    async disconnect() {
      if (this.connection) {
        console.log('Disconnecting from database');
        this.connection = null;
      }
    }
  }
  
  return {
    getInstance: () => {
      if (!instance) {
        instance = new DatabaseConnection();
      }
      return instance;
    }
  };
})();

// Usage
async function demoSingleton() {
  const db1 = Database.getInstance();
  const db2 = Database.getInstance();
  
  console.log(db1 === db2); // true
  
  await db1.connect('postgresql://localhost/mydb');
  await db1.query('SELECT * FROM users');
  await db2.disconnect(); // Same instance
}
```

### 4. Factory Pattern

**Question: Implement a Factory pattern for creating different types of notifications.**

```javascript
// Notification interfaces
class Notification {
  async send(message) {
    throw new Error('send() must be implemented');
  }
}

class EmailNotification extends Notification {
  async send(message) {
    console.log(`Sending Email: ${message}`);
    // Email sending logic
    return { success: true, type: 'email' };
  }
}

class SMSNotification extends Notification {
  async send(message) {
    console.log(`Sending SMS: ${message}`);
    // SMS sending logic
    return { success: true, type: 'sms' };
  }
}

class PushNotification extends Notification {
  async send(message) {
    console.log(`Sending Push: ${message}`);
    // Push notification logic
    return { success: true, type: 'push' };
  }
}

// Notification Factory
class NotificationFactory {
  static create(type) {
    switch (type.toLowerCase()) {
      case 'email':
        return new EmailNotification();
      case 'sms':
        return new SMSNotification();
      case 'push':
        return new PushNotification();
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  }
}

// Abstract Factory for notification templates
class NotificationTemplateFactory {
  static createTemplate(type) {
    const templates = {
      welcome: {
        email: 'Welcome to our service!',
        sms: 'Welcome!',
        push: 'Welcome!'
      },
      passwordReset: {
        email: 'Reset your password: {token}',
        sms: 'Reset code: {token}',
        push: 'Password reset'
      }
    };
    
    return templates[type] || {};
  }
}

// Usage
async function sendNotifications() {
  const notificationTypes = ['email', 'sms', 'push'];
  
  for (const type of notificationTypes) {
    const notification = NotificationFactory.create(type);
    await notification.send('Hello, World!');
  }
  
  const templates = NotificationTemplateFactory.createTemplate('welcome');
  const emailNotif = NotificationFactory.create('email');
  await emailNotif.send(templates.email);
}
```

---

## Streams & Buffers

### 1. Stream Types

**Question: Explain all stream types and create a custom stream.**

```javascript
const { Readable, Writable, Transform, Duplex, pipeline } = require('stream');

// 1. Custom Readable Stream
class NumberStream extends Readable {
  constructor(max = 10) {
    super({ objectMode: true });
    this.max = max;
    this.current = 0;
  }
  
  _read(size) {
    if (this.current >= this.max) {
      this.push(null); // Signal end
      return;
    }
    
    this.push({ number: this.current++ });
  }
}

// 2. Custom Writable Stream
class LogStream extends Writable {
  constructor() {
    super({ objectMode: true });
    this.logs = [];
  }
  
  _write(chunk, encoding, callback) {
    this.logs.push(chunk);
    console.log('Logged:', chunk);
    callback();
  }
}

// 3. Custom Transform Stream
class MultiplyTransform extends Transform {
  constructor(multiplier) {
    super({ objectMode: true });
    this.multiplier = multiplier;
  }
  
  _transform(chunk, encoding, callback) {
    this.push({ number: chunk.number * this.multiplier });
    callback();
  }
}

// 4. Custom Duplex Stream
class CipherStream extends Duplex {
  constructor(algorithm) {
    super({ objectMode: true });
    this.algorithm = algorithm;
  }
  
  _write(chunk, encoding, callback) {
    // Write logic (encrypt)
    this.push({ encrypted: chunk.number * 2 });
    callback();
  }
  
  _read(size) {
    // Read logic (decrypt)
    // Not implemented for this example
  }
}

// Usage example
const readable = new NumberStream(5);
const transform = new MultiplyTransform(2);
const writable = new LogStream();

// Using pipeline with error handling
pipeline(
  readable,
  transform,
  writable,
  (err) => {
    if (err) {
      console.error('Pipeline failed:', err);
    } else {
      console.log('Pipeline succeeded');
    }
  }
);

// Real-world example: File processing
const fs = require('fs');

async function processLargeFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    pipeline(
      fs.createReadStream(inputPath),
      
      // Transform: Compress data
      new Transform({
        transform(chunk, encoding, callback) {
          // Simple transformation - uppercase text
          const transformed = chunk.toString().toUpperCase();
          callback(null, transformed);
        }
      }),
      
      fs.createWriteStream(outputPath),
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}
```

### 2. Buffer Operations

**Question: Demonstrate advanced buffer operations.**

```javascript
// Buffer creation and manipulation
const buf1 = Buffer.from('Hello World');
const buf2 = Buffer.alloc(10);
const buf3 = Buffer.allocUnsafe(10); // Faster, may contain old data

console.log('buf1 length:', buf1.length); // 11
console.log('buf1 string:', buf1.toString()); // 'Hello World'

// Buffer concatenation
const combined = Buffer.concat([buf1, buf2]);
console.log('Combined length:', combined.length);

// Buffer copying
const target = Buffer.alloc(5);
buf1.copy(target, 0, 0, 5);
console.log('Copied:', target.toString()); // 'Hello'

// Buffer comparison
const a = Buffer.from('ABC');
const b = Buffer.from('ABD');
console.log('Comparison:', a.compare(b)); // -1 (a < b)

// Buffer searching
const text = Buffer.from('The quick brown fox jumps');
console.log('Index of "quick":', text.indexOf('quick'));

// Buffer slicing
const slice = buf1.slice(0, 5); // Creates a view, not a copy
console.log('Slice:', slice.toString()); // 'Hello'

// Binary operations
function bufferToHex(buffer) {
  return buffer.toString('hex');
}

function hexToBuffer(hex) {
  return Buffer.from(hex, 'hex');
}

function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

const data = Buffer.from('Binary data');
console.log('Hex:', bufferToHex(data));
console.log('Base64:', bufferToBase64(data));

// Endianness handling
const int32Buffer = Buffer.alloc(4);
int32Buffer.writeInt32LE(0x12345678, 0);
console.log('LE:', int32Buffer.readUInt32LE(0)); // 0x12345678
console.log('BE:', int32Buffer.readUInt32BE(0)); // 0x78563412
```

### 3. Backpressure Handling

**Question: Explain backpressure and how to handle it.**

```javascript
const { Readable, Writable } = require('stream');
const fs = require('fs');

// Readable with backpressure
class SlowReadable extends Readable {
  constructor(source) {
    super({ highWaterMark: 16 }); // Small buffer for demonstration
    this.source = source;
    this.reading = false;
  }
  
  _read(size) {
    if (this.reading) return;
    this.reading = true;
    
    // Simulate slow source
    setTimeout(() => {
      const chunk = this.source.read(size);
      if (chunk) {
        this.push(chunk);
      } else {
        this.push(null);
      }
      this.reading = false;
    }, 100);
  }
}

// Writable that signals backpressure
class SlowWritable extends Writable {
  constructor(destination) {
    super({ highWaterMark: 16 });
    this.destination = destination;
  }
  
  _write(chunk, encoding, callback) {
    // Check for backpressure
    if (this.writableHighWaterMark < this.writableLength) {
      console.log('Backpressure detected, slowing down...');
      setTimeout(() => {
        this.destination.write(chunk);
        callback();
      }, 500);
    } else {
      this.destination.write(chunk);
      callback();
    }
  }
}

// Manual backpressure handling
async function handleBackpressure(source, destination) {
  while (true) {
    const chunk = source.read();
    
    if (chunk === null) {
      if (source._readableState.ended) break;
      await new Promise(resolve => source.once('readable', resolve));
      continue;
    }
    
    const shouldContinue = destination.write(chunk);
    
    if (!shouldContinue) {
      // Backpressure - wait for drain event
      await new Promise(resolve => destination.once('drain', resolve));
    }
  }
}

// Usage: Simulating file copy with backpressure
async function copyFileWithBackpressure(inputPath, outputPath) {
  const reader = fs.createReadStream(inputPath, { highWaterMark: 16 * 1024 });
  const writer = fs.createWriteStream(outputPath, { highWaterMark: 16 * 1024 });
  
  return handleBackpressure(reader, writer);
}
```

---

## Error Handling

### 1. Error-First Callbacks

**Question: Explain error-first callback pattern and implement it.**

```javascript
// Error-first callback pattern
function readFileWithCallback(path, callback) {
  fs.readFile(path, (err, data) => {
    if (err) {
      // First argument is error
      callback(err);
      return;
    }
    
    // Second argument is result
    callback(null, data);
  });
}

// Async function wrapper
function promisify(fn) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      fn(...args, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  };
}

// Usage
const readFileAsync = promisify(fs.readFile);
readFileAsync('package.json')
  .then(data => console.log(data.toString()))
  .catch(err => console.error('Error:', err));
```

### 2. Domain and Async Hooks

**Question: Explain how to track async operations with Async Hooks.**

```javascript
const asyncHooks = require('async_hooks');
const fs = require('fs');

// Create async hook to track operations
const hook = asyncHooks.createHook({
  init(asyncId, type, triggerAsyncId, resource) {
    fs.writeSync(1, `Init: ${type} (id: ${asyncId}, trigger: ${triggerAsyncId})\n`);
  },
  
  before(asyncId) {
    fs.writeSync(1, `Before: ${asyncId}\n`);
  },
  
  after(asyncId) {
    fs.writeSync(1, `After: ${asyncId}\n`);
  },
  
  destroy(asyncId) {
    fs.writeSync(1, `Destroy: ${asyncId}\n`);
  }
});

hook.enable();

// Track async context
class AsyncLocalStorage {
  constructor() {
    this.store = new Map();
    this.hook = asyncHooks.createHook({
      init: (asyncId, type, triggerAsyncId) => {
        if (this.store.has(triggerAsyncId)) {
          this.store.set(asyncId, this.store.get(triggerAsyncId));
        }
      },
      destroy: (asyncId) => {
        this.store.delete(asyncId);
      }
    });
  }
  
  enable() {
    this.hook.enable();
  }
  
  disable() {
    this.hook.disable();
  }
  
  run(store, callback) {
    const asyncId = asyncHooks.executionAsyncId();
    this.store.set(asyncId, store);
    return callback();
  }
  
  getStore() {
    const asyncId = asyncHooks.executionAsyncId();
    return this.store.get(asyncId);
  }
}

// Usage: Context propagation
const asyncLocalStorage = new AsyncLocalStorage();
asyncLocalStorage.enable();

function fetchData() {
  const context = asyncLocalStorage.getStore();
  console.log('Context in async operation:', context);
}

asyncLocalStorage.run({ requestId: '12345', userId: 'user1' }, () => {
  console.log('Context in main:', asyncLocalStorage.getStore());
  fetchData();
});
```

### 3. Global Error Handling

**Question: Implement comprehensive error handling for Node.js application.**

```javascript
// Custom error classes
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

class UnauthorizedError extends AppError {
  constructor(message) {
    super(message, 401);
  }
}

// Global error handler for Express
function globalErrorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR:', err);
  }
  
  // Operational error - send trusted error
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }
  
  // Programming error - don't leak details
  console.error('ERROR 💥:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
}

// Unhandled promise rejection
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Uncaught exception
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Usage in Express app
const express = require('express');

const app = express();

app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return next(new NotFoundError('User not found'));
    }
    
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

app.use(globalErrorHandler);

// Error handler wrapper for async routes
function catchAsync(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

// Usage with catchAsync
app.get('/posts', catchAsync(async (req, res, next) => {
  const posts = await Post.find();
  res.json({ posts });
}));
```

---

## Performance Optimization

### 1. Clustering

**Question: Implement Node.js clustering for multi-core utilization.**

```javascript
const cluster = require('cluster');
const http = require('http');
const os = require('os');

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  
  // Fork workers
  const workers = [];
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    workers.push(worker);
    
    worker.on('exit', (code, signal) => {
      console.log(`Worker ${worker.process.pid} died`);
      // Respawn worker
      const newWorker = cluster.fork();
      workers[workers.indexOf(worker)] = newWorker;
    });
    
    worker.on('message', (msg) => {
      console.log(`Worker ${worker.process.pid}:`, msg);
    });
  }
  
  // Load balancing with round-robin (default)
  // Or enable IPC for custom load balancing
  cluster.on('online', (worker) => {
    console.log(`Worker ${worker.process.pid} is online`);
  });
  
} else {
  // Worker process
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Hello from worker ${process.pid}`);
  }).listen(8000);
  
  console.log(`Worker ${process.pid} started`);
  
  // Send periodic stats to master
  setInterval(() => {
    if (process.send) {
      process.send({ 
        pid: process.pid, 
        memory: process.memoryUsage(),
        uptime: process.uptime()
      });
    }
  }, 5000);
}
```

### 2. Caching Strategies

**Question: Implement various caching patterns.**

```javascript
const NodeCache = require('node-cache');

// 1. In-memory cache with TTL
class CacheManager {
  constructor(stdTTL = 60) {
    this.cache = new NodeCache({ stdTTL, checkperiod: 120 });
  }
  
  set(key, value, ttl) {
    return this.cache.set(key, value, ttl);
  }
  
  get(key) {
    return this.cache.get(key);
  }
  
  del(key) {
    return this.cache.del(key);
  }
  
  // Cache-aside pattern
  async getOrFetch(key, fetchFn, ttl) {
    const cached = this.get(key);
    
    if (cached !== undefined) {
      return cached;
    }
    
    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }
  
  // Write-through pattern
  async setWriteThrough(key, value, ttl, saveFn) {
    this.set(key, value, ttl);
    await saveFn(key, value);
    return value;
  }
  
  // Write-back pattern
  async setWriteBack(key, value, ttl, saveFn) {
    this.set(key, value, ttl);
    // Queue for background write
    setTimeout(() => {
      saveFn(key, value);
    }, 1000);
    return value;
  }
}

const cache = new CacheManager();

// 2. Redis caching
const Redis = require('ioredis');
const redis = new Redis();

class RedisCache {
  constructor(client) {
    this.client = client;
  }
  
  async get(key) {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  async set(key, value, ttl) {
    await this.client.setex(key, ttl, JSON.stringify(value));
  }
  
  async getOrFetch(key, fetchFn, ttl = 3600) {
    const cached = await this.get(key);
    
    if (cached) {
      return cached;
    }
    
    const value = await fetchFn();
    await this.set(key, value, ttl);
    return value;
  }
  
  // Cache invalidation pattern
  async invalidatePattern(pattern) {
    const keys = await this.client.keys(pattern);
    if (keys.length) {
      await this.client.del(...keys);
    }
  }
}

const redisCache = new RedisCache(redis);

// 3. Multi-level caching
class MultiLevelCache {
  constructor(l1, l2) {
    this.l1 = l1; // Fast cache (memory)
    this.l2 = l2; // Slower cache (Redis)
  }
  
  async get(key) {
    // Try L1 first
    let value = this.l1.get(key);
    if (value !== undefined) {
      return value;
    }
    
    // Try L2
    value = await this.l2.get(key);
    if (value !== undefined) {
      // Promote to L1
      this.l1.set(key, value, 60);
      return value;
    }
    
    return null;
  }
  
  async set(key, value, ttl) {
    this.l1.set(key, value, ttl);
    await this.l2.set(key, value, ttl);
  }
}

const mlCache = new MultiLevelCache(cache, redisCache);
```

### 3. Memory Leak Detection

**Question: How to detect and fix memory leaks in Node.js.**

```javascript
// Memory snapshot tool
class MemoryProfiler {
  constructor() {
    this.snapshots = [];
  }
  
  takeSnapshot(name) {
    const snapshot = {
      name,
      time: Date.now(),
      memory: process.memoryUsage(),
      heapUsed: process.memoryUsage().heapUsed / 1024 / 1024,
      heapTotal: process.memoryUsage().heapTotal / 1024 / 1024
    };
    
    this.snapshots.push(snapshot);
    console.log(`Snapshot "${name}":`, snapshot);
    return snapshot;
  }
  
  compare(name1, name2) {
    const s1 = this.snapshots.find(s => s.name === name1);
    const s2 = this.snapshots.find(s => s.name === name2);
    
    if (!s1 || !s2) {
      console.log('Snapshots not found');
      return;
    }
    
    const diff = {
      heapUsed: s2.heapUsed - s1.heapUsed,
      heapTotal: s2.heapTotal - s1.heapTotal,
      timeDiff: (s2.time - s1.time) / 1000
    };
    
    console.log(`Memory growth from ${name1} to ${name2}:`, diff);
    return diff;
  }
  
  startInterval(intervalMs = 60000) {
    this.interval = setInterval(() => {
      this.takeSnapshot(`interval-${Date.now()}`);
    }, intervalMs);
  }
  
  stopInterval() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

// Usage
const profiler = new MemoryProfiler();
profiler.takeSnapshot('initial');

// Simulate memory leak
const leakyData = [];
function createLeak() {
  leakyData.push(new Array(1000).fill('x'));
}

// Create snapshots before and after
setInterval(() => {
  createLeak();
  profiler.takeSnapshot('leak-check');
}, 1000);

// Heap dump on request
if (process.env.NODE_ENV === 'development') {
  const v8 = require('v8');
  const fs = require('fs');
  
  process.on('SIGUSR2', () => {
    const fileName = `heapdump-${Date.now()}.heapsnapshot`;
    v8.writeHeapSnapshot(fileName);
    console.log(`Heap dump written to ${fileName}`);
  });
}
```

---

## Security Best Practices

### 1. Input Validation & Sanitization

**Question: Implement comprehensive input validation.**

```javascript
const Joi = require('joi');
const validator = require('validator');
const xss = require('xss');

// Joi validation schemas
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  ).required(),
  name: Joi.string().trim().min(2).max(100).required(),
  age: Joi.number().integer().min(18).max(120)
});

// Input sanitization
function sanitizeInput(input) {
  if (typeof input === 'string') {
    return {
      sanitized: xss(input.trim()),
      original: input
    };
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]).sanitized;
    }
    return { sanitized, original: input };
  }
  
  return { sanitized: input, original: input };
}

// Validation middleware
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        status: 'error',
        errors
      });
    }
    
    req.body = value;
    next();
  };
}

// SQL injection prevention
const { Pool } = require('pg');
const pool = new Pool();

class UserRepository {
  async findById(id) {
    // Parameterized query - prevents SQL injection
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }
  
  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }
  
  // Use this instead of string interpolation
  async unsafeFind(query) {
    // DON'T DO THIS:
    // const result = await pool.query(`SELECT * FROM users WHERE email = '${email}'`);
    
    // DO THIS:
    return this.findById(query);
  }
}

// XSS prevention
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """)
    .replace(/'/g, "&#039;");
}

// Content Security Policy
const helmet = require('helmet');

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.example.com"],
    scriptSrc: ["'self'", "https://cdn.example.com"],
    imgSrc: ["'self'", "data:", "https:"]
  }
}));
```

### 2. Authentication & Authorization

**Question: Implement JWT-based authentication with role-based access control.**

```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

// Token generation
class TokenManager {
  generateAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'your-app',
      audience: 'your-app-users'
    });
  }
  
  generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'your-app',
      audience: 'your-app-users'
    });
  }
  
  verifyToken(token) {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'your-app',
      audience: 'your-app-users'
    });
  }
  
  async generateTokenPair(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }
}

// Password hashing
class PasswordManager {
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }
  
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
  
  async generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = new TokenManager().verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Authorization middleware
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    next();
  };
}

// Usage
app.post('/register', validate(userSchema), async (req, res) => {
  const { email, password, name } = req.body;
  
  const passwordManager = new PasswordManager();
  const hashedPassword = await passwordManager.hashPassword(password);
  
  const user = await User.create({
    email,
    password: hashedPassword,
    name
  });
  
  const tokenManager = new TokenManager();
  const tokens = await tokenManager.generateTokenPair(user);
  
  res.json({ user, tokens });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = await User.findByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const passwordManager = new PasswordManager();
  const isValid = await passwordManager.verifyPassword(password, user.password);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const tokenManager = new TokenManager();
  const tokens = await tokenManager.generateTokenPair(user);
  
  res.json({ user, tokens });
});

app.get('/admin/users', authenticate, authorize('admin'), async (req, res) => {
  const users = await User.findAll();
  res.json({ users });
});
```

### 3. Rate Limiting

**Question: Implement rate limiting with Redis backend.**

```javascript
const redis = require('ioredis');
const redisClient = new Redis();

class RateLimiter {
  constructor(redisClient) {
    this.redis = redisClient;
  }
  
  // Fixed window counter
  async checkFixedWindow(key, limit, windowMs) {
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, Math.ceil(windowMs / 1000));
    }
    
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      reset: windowMs
    };
  }
  
  // Sliding window log
  async checkSlidingWindow(key, limit, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const pipeline = this.redis.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Count requests in window
    pipeline.zcard(key);
    
    // Set expiration
    pipeline.expire(key, Math.ceil(windowMs / 1000) + 1);
    
    const results = await pipeline.exec();
    const count = results[2][1];
    
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      reset: windowMs
    };
  }
  
  // Token bucket
  async checkTokenBucket(key, limit, refillRate) {
    const now = Date.now();
    
    const pipeline = this.redis.pipeline();
    
    // Get current tokens and last refill
    pipeline.hmget(key, 'tokens', 'lastRefill');
    
    const results = await pipeline.exec();
    const [tokens, lastRefill] = results[0][1];
    
    const currentTokens = parseInt(tokens) || limit;
    const lastRefillTime = parseInt(lastRefill) || now;
    
    // Calculate tokens to add
    const timePassed = (now - lastRefillTime) / 1000;
    const tokensToAdd = timePassed * refillRate;
    
    const newTokens = Math.min(limit, currentTokens + tokensToAdd);
    
    if (newTokens >= 1) {
      // Consume a token
      await this.redis.hmset(key, {
        tokens: newTokens - 1,
        lastRefill: now
      });
      await this.redis.expire(key, Math.ceil(limit / refillRate) + 10);
      
      return {
        allowed: true,
        remaining: Math.floor(newTokens - 1),
        reset: (limit - newTokens) / refillRate * 1000
      };
    }
    
    return {
      allowed: false,
      remaining: 0,
      reset: (1 - newTokens) / refillRate * 1000
    };
  }
}

// Express middleware
function rateLimit(limiter, keyGenerator, options) {
  return async (req, res, next) => {
    const key = keyGenerator(req);
    
    const result = await limiter.checkSlidingWindow(
      key,
      options.limit,
      options.windowMs
    );
    
    res.set({
      'X-RateLimit-Limit': options.limit,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': new Date(Date.now() + result.reset).toISOString()
    });
    
    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(result.reset / 1000)
      });
    }
    
    next();
  };
}

// Usage
const rateLimiter = new RateLimiter(redisClient);

app.use(rateLimit(
  rateLimiter,
  (req) => `rate-limit:${req.ip}`,
  { limit: 100, windowMs: 60000 }
));

// Endpoint-specific rate limiting
app.post('/api/login', 
  rateLimit(
    rateLimiter,
    (req) => `login:${req.ip}`,
    { limit: 5, windowMs: 60000 }
  ),
  loginHandler
);
```

---

## Design Patterns

### 1. Repository Pattern

**Question: Implement Repository pattern for data access abstraction.**

```javascript
// Base repository interface
class Repository {
  async findById(id) {
    throw new Error('findById() must be implemented');
  }
  
  async findAll() {
    throw new Error('findAll() must be implemented');
  }
  
  async create(data) {
    throw new Error('create() must be implemented');
  }
  
  async update(id, data) {
    throw new Error('update() must be implemented');
  }
  
  async delete(id) {
    throw new Error('delete() must be implemented');
  }
}

// User repository implementation
class UserRepository extends Repository {
  constructor(db) {
    super();
    this.db = db;
  }
  
  async findById(id) {
    const result = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }
  
  async findAll(filters = {}) {
    let query = 'SELECT * FROM users';
    const params = [];
    const conditions = [];
    
    if (filters.email) {
      conditions.push(`email = $${params.length + 1}`);
      params.push(filters.email);
    }
    
    if (filters.role) {
      conditions.push(`role = $${params.length + 1}`);
      params.push(filters.role);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    const result = await this.db.query(query, params);
    return result.rows;
  }
  
  async create(data) {
    const { email, password, name, role } = data;
    const result = await this.db.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, password, name, role]
    );
    return result.rows[0];
  }
  
  async update(id, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, index) => 
      `${field} = $${index + 2}`
    ).join(', ');
    
    const result = await this.db.query(
      `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }
  
  async delete(id) {
    const result = await this.db.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
}

// Unit of Work pattern
class UnitOfWork {
  constructor(db) {
    this.db = db;
    this.users = new UserRepository(db);
    this.posts = new PostRepository(db);
    this.transactions = [];
  }
  
  async begin() {
    await this.db.query('BEGIN');
  }
  
  async commit() {
    await this.db.query('COMMIT');
  }
  
  async rollback() {
    await this.db.query('ROLLBACK');
  }
}

// Usage
async function createUserWithPost(userData, postData) {
  const uow = new UnitOfWork(db);
  
  try {
    await uow.begin();
    
    const user = await uow.users.create(userData);
    postData.userId = user.id;
    const post = await uow.posts.create(postData);
    
    await uow.commit();
    return { user, post };
  } catch (err) {
    await uow.rollback();
    throw err;
  }
}
```

### 2. Strategy Pattern

**Question: Implement Strategy pattern for payment processing.**

```javascript
// Payment strategy interface
class PaymentStrategy {
  async processPayment(amount, details) {
    throw new Error('processPayment() must be implemented');
  }
  
  async refund(transactionId, amount) {
    throw new Error('refund() must be implemented');
  }
}

// Credit card strategy
class CreditCardStrategy extends PaymentStrategy {
  async processPayment(amount, details) {
    console.log(`Processing credit card payment: $${amount}`);
    // Credit card processing logic
    return {
      success: true,
      transactionId: `CC-${Date.now()}`,
      amount
    };
  }
  
  async refund(transactionId, amount) {
    console.log(`Refunding credit card: ${transactionId}, $${amount}`);
    return { success: true };
  }
}

// PayPal strategy
class PayPalStrategy extends PaymentStrategy {
  async processPayment(amount, details) {
    console.log(`Processing PayPal payment: $${amount}`);
    // PayPal processing logic
    return {
      success: true,
      transactionId: `PP-${Date.now()}`,
      amount
    };
  }
  
  async refund(transactionId, amount) {
    console.log(`Refunding PayPal: ${transactionId}, $${amount}`);
    return { success: true };
  }
}

// Cryptocurrency strategy
class CryptoStrategy extends PaymentStrategy {
  async processPayment(amount, details) {
    console.log(`Processing crypto payment: $${amount}`);
    // Crypto processing logic
    return {
      success: true,
      transactionId: `CR-${Date.now()}`,
      amount
    };
  }
  
  async refund(transactionId, amount) {
    throw new Error('Cryptocurrency payments cannot be refunded');
  }
}

// Payment context
class PaymentProcessor {
  constructor(strategy) {
    this.strategy = strategy;
  }
  
  setStrategy(strategy) {
    this.strategy = strategy;
  }
  
  async processPayment(amount, details) {
    return this.strategy.processPayment(amount, details);
  }
  
  async refund(transactionId, amount) {
    return this.strategy.refund(transactionId, amount);
  }
}

// Strategy factory
class PaymentStrategyFactory {
  static create(type) {
    switch (type.toLowerCase()) {
      case 'credit_card':
      case 'cc':
        return new CreditCardStrategy();
      case 'paypal':
        return new PayPalStrategy();
      case 'crypto':
        return new CryptoStrategy();
      default:
        throw new Error(`Unknown payment strategy: ${type}`);
    }
  }
}

// Usage
async function processOrder(order) {
  const strategy = PaymentStrategyFactory.create(order.paymentMethod);
  const processor = new PaymentProcessor(strategy);
  
  const result = await processor.processPayment(order.total, order.paymentDetails);
  
  if (result.success) {
    console.log(`Payment successful: ${result.transactionId}`);
    return result;
  }
}
```

### 3. Decorator Pattern

**Question: Implement Decorator pattern for service functionality enhancement.**

```javascript
// Service interface
class Service {
  async execute(data) {
    throw new Error('execute() must be implemented');
  }
}

// Base service
class UserService extends Service {
  async execute(data) {
    console.log('Processing user:', data.name);
    return { success: true, user: data };
  }
}

// Decorator base class
class ServiceDecorator extends Service {
  constructor(service) {
    super();
    this.service = service;
  }
  
  async execute(data) {
    return this.service.execute(data);
  }
}

// Logging decorator
class LoggingDecorator extends ServiceDecorator {
  async execute(data) {
    console.log(`[LOG] Starting operation at ${new Date().toISOString()}`);
    console.log(`[LOG] Input:`, JSON.stringify(data));
    
    try {
      const result = await super.execute(data);
      console.log(`[LOG] Operation completed successfully`);
      console.log(`[LOG] Output:`, JSON.stringify(result));
      return result;
    } catch (err) {
      console.error(`[LOG] Operation failed:`, err.message);
      throw err;
    }
  }
}

// Caching decorator
class CachingDecorator extends ServiceDecorator {
  constructor(service, cache) {
    super(service);
    this.cache = cache;
    this.ttl = 300; // 5 minutes
  }
  
  async execute(data) {
    const cacheKey = `service:${this.service.constructor.name}:${JSON.stringify(data)}`;
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log('[CACHE] Hit');
      return cached;
    }
    
    console.log('[CACHE] Miss');
    const result = await super.execute(data);
    
    // Store in cache
    await this.cache.set(cacheKey, result, this.ttl);
    
    return result;
  }
}

// Rate limiting decorator
class RateLimitDecorator extends ServiceDecorator {
  constructor(service, limiter, options) {
    super(service);
    this.limiter = limiter;
    this.options = options;
  }
  
  async execute(data) {
    const key = `${this.service.constructor.name}:${data.userId || 'anonymous'}`;
    
    const result = await this.limiter.check(key, this.options.limit, this.options.windowMs);
    
    if (!result.allowed) {
      throw new Error('Rate limit exceeded');
    }
    
    return super.execute(data);
  }
}

// Circuit breaker decorator
class CircuitBreakerDecorator extends ServiceDecorator {
  constructor(service, options = {}) {
    super(service);
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'closed'; // closed, open, half-open
    this.options = {
      threshold: options.threshold || 5,
      timeout: options.timeout || 60000, // 1 minute
      ...options
    };
  }
  
  async execute(data) {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.options.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await super.execute(data);
      execute
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failureCount = 0;
      }
      
      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.options.threshold) {
        this.state = 'open';
        console.error('Circuit breaker opened due to failures');
      }
      
      throw err;
    }
  }
}

// Usage
const cache = new CacheManager();
const rateLimiter = new RateLimiter();

const baseService = new UserService();

// Apply decorators
let service = new LoggingDecorator(baseService);
service = new CachingDecorator(service, cache);
service = new RateLimitDecorator(service, rateLimiter, { limit: 10, windowMs: 60000 });
service = new CircuitBreakerDecorator(service, { threshold: 3, timeout: 30000 });

await service.execute({ name: 'John', userId: '123' });
```

### 4. Builder Pattern

**Question: Implement Builder pattern for complex object construction.**

```javascript
// Query builder for database queries
class QueryBuilder {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.select = [];
    this.from = '';
    this.where = [];
    this.join = [];
    this.orderBy = [];
    this.limit = null;
    this.offset = null;
    this.params = [];
    return this;
  }
  
  select(...fields) {
    this.select = fields;
    return this;
  }
  
  from(table) {
    this.from = table;
    return this;
  }
  
  where(condition, param) {
    this.where.push(condition);
    if (param !== undefined) {
      this.params.push(param);
    }
    return this;
  }
  
  join(table, on) {
    this.join.push({ table, on });
    return this;
  }
  
  orderBy(field, direction = 'ASC') {
    this.orderBy.push(`${field} ${direction}`);
    return this;
  }
  
  limit(value) {
    this.limit = value;
    return this;
  }
  
  offset(value) {
    this.offset = value;
    return this;
  }
  
  build() {
    if (!this.from) {
      throw new Error('FROM clause is required');
    }
    
    let query = `SELECT ${this.select.length ? this.select.join(', ') : '*'}`;
    query += ` FROM ${this.from}`;
    
    // Joins
    for (const join of this.join) {
      query += ` JOIN ${join.table} ON ${join.on}`;
    }
    
    // Where
    if (this.where.length > 0) {
      query += ` WHERE ${this.where.join(' AND ')}`;
    }
    
    // Order By
    if (this.orderBy.length > 0) {
      query += ` ORDER BY ${this.orderBy.join(', ')}`;
    }
    
    // Limit & Offset
    if (this.limit) {
      query += ` LIMIT ${this.limit}`;
    }
    
    if (this.offset) {
      query += ` OFFSET ${this.offset}`;
    }
    
    return { query, params: this.params };
  }
}

// Usage
const { query, params } = new QueryBuilder()
  .select('id', 'name', 'email', 'created_at')
  .from('users')
  .join('profiles', 'users.id = profiles.user_id')
  .where('users.status = $1', 'active')
  .where('profiles.role = $2', 'admin')
  .orderBy('created_at', 'DESC')
  .limit(10)
  .offset(20)
  .build();

console.log(query);
console.log(params);

// HTTP request builder
class HttpRequestBuilder {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.method = 'GET';
    this.url = '';
    this.headers = {};
    this.query = {};
    this.body = null;
    return this;
  }
  
  method(method) {
    this.method = method.toUpperCase();
    return this;
  }
  
  url(url) {
    this.url = url;
    return this;
  }
  
  headers(headers) {
    this.headers = { ...this.headers, ...headers };
    return this;
  }
  
  header(key, value) {
    this.headers[key] = value;
    return this;
  }
  
  query(params) {
    this.query = { ...this.query, ...params };
    return this;
  }
  
  body(body) {
    this.body = body;
    return this;
  }
  
  json(data) {
    this.headers['Content-Type'] = 'application/json';
    this.body = JSON.stringify(data);
    return this;
  }
  
  build() {
    if (!this.url) {
      throw new Error('URL is required');
    }
    
    // Build query string
    const queryString = Object.keys(this.query)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(this.query[key])}`)
      .join('&');
    
    let fullUrl = this.url;
    if (queryString) {
      fullUrl += `?${queryString}`;
    }
    
    return {
      method: this.method,
      url: fullUrl,
      headers: this.headers,
      body: this.body
    };
  }
}

// Usage
const request = new HttpRequestBuilder()
  .method('POST')
  .url('https://api.example.com/users')
  .header('Authorization', 'Bearer token123')
  .json({
    name: 'John Doe',
    email: 'john@example.com'
  })
  .build();
```

---

## Testing & Debugging

### 1. Unit Testing with Jest

**Question: Write comprehensive unit tests with Jest.**

```javascript
const { UserService } = require('./userService');

describe('UserService', () => {
  let userService;
  let mockDb;
  
  beforeEach(() => {
    // Setup mock database
    mockDb = {
      query: jest.fn()
    };
    
    userService = new UserService(mockDb);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: 1, name: 'John', email: 'john@example.com' };
      mockDb.query.mockResolvedValue({ rows: [mockUser] });
      
      const result = await userService.findById(1);
      
      expect(result).toEqual(mockUser);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1]
      );
    });
    
    it('should return null when user not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      
      const result = await userService.findById(999);
      
      expect(result).toBeNull();
    });
    
    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockDb.query.mockRejectedValue(error);
      
      await expect(userService.findById(1)).rejects.toThrow(error);
    });
  });
  
  describe('create', () => {
    it('should create user successfully', async () => {
      const userData = {
        name: 'John',
        email: 'john@example.com',
        password: 'hashed123'
      };
      
      const createdUser = { id: 1, ...userData };
      mockDb.query.mockResolvedValue({ rows: [createdUser] });
      
      const result = await userService.create(userData);
      
      expect(result).toEqual(createdUser);
      expect(mockDb.query).toHaveBeenCalledWith(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
        [userData.name, userData.email, userData.password]
      );
    });
    
    it('should validate email format', async () => {
      const userData = {
        name: 'John',
        email: 'invalid-email',
        password: 'hashed123'
      };
      
      await expect(userService.create(userData)).rejects.toThrow('Invalid email');
    });
  });
  
  describe('update', () => {
    it('should update user successfully', async () => {
      const updateData = { name: 'Jane' };
      const updatedUser = { id: 1, name: 'Jane', email: 'john@example.com' };
      mockDb.query.mockResolvedValue({ rows: [updatedUser] });
      
      const result = await userService.update(1, updateData);
      
      expect(result).toEqual(updatedUser);
      expect(mockDb.query).toHaveBeenCalled();
    });
  });
});

// Integration test
describe('User API Integration', () => {
  let app;
  let db;
  
  beforeAll(async () => {
    db = await setupTestDatabase();
    app = createApp(db);
  });
  
  afterAll(async () => {
    await cleanupTestDatabase(db);
  });
  
  beforeEach(async () => {
    await db.query('TRUNCATE TABLE users CASCADE');
  });
  
  describe('POST /api/users', () => {
    it('should create user and return 201', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'Password123!'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('John Doe');
    });
    
    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'John',
          email: 'invalid'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });
});

// Mock implementations
jest.mock('./emailService', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
    sendPasswordReset: jest.fn().mockResolvedValue(true)
  }))
}));
```

### 2. Test Doubles (Mocks, Stubs, Spies)

**Question: Explain and implement different types of test doubles.**

```javascript
// Spy - observes function calls
describe('Spies', () => {
  it('should track function calls', () => {
    const callback = jest.fn();
    
    processInput('test', callback);
    
    expect(callback).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('TEST');
  });
  
  it('should spy on existing methods', () => {
    const userService = new UserService();
    const spy = jest.spyOn(userService, 'validateEmail');
    
    userService.create({ email: 'test@example.com' });
    
    expect(spy).toHaveBeenCalledWith('test@example.com');
    spy.mockRestore();
  });
});

// Mock - provides predefined responses
describe('Mocks', () => {
  it('should mock external service', async () => {
    const mockDb = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'John' }] })
        .mockResolvedValueOnce({ rows: [] })
    };
    
    const service = new UserService(mockDb);
    
    const user1 = await service.findById(1);
    const user2 = await service.findById(2);
    
    expect(user1).toEqual({ id: 1, name: 'John' });
    expect(user2).toBeNull();
    expect(mockDb.query).toHaveBeenCalledTimes(2);
  });
  
  it('should mock with return values', () => {
    const calculator = {
      add: jest.fn().mockReturnValue(5),
      multiply: jest.fn().mockImplementation((a, b) => a * b),
      divide: jest.fn().mockName('divide')
    };
    
    expect(calculator.add(2, 3)).toBe(5);
    expect(calculator.multiply(4, 5)).toBe(20);
    expect(calculator.divide.mockName).toBe('divide');
  });
});

// Stub - replaces function with controlled behavior
describe('Stubs', () => {
  it('should stub async operations', async () => {
    const axiosStub = {
      get: jest.fn()
        .mockResolvedValue({ data: { results: [] } })
    };
    
    const api = new ExternalAPI(axiosStub);
    const results = await api.fetchData();
    
    expect(results).toEqual({ results: [] });
    expect(axiosStub.get).toHaveBeenCalledWith('/endpoint');
  });
  
  it('should stub different scenarios', () => {
    const paymentService = {
      process: jest.fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Insufficient funds' })
        .mockRejectedValueOnce(new Error('Network error'))
    };
    
    // Success case
    return paymentService.process(100)
      .then(result => {
        expect(result.success).toBe(true);
      })
      .then(() => paymentService.process(100))
      .then(result => {
        expect(result.success).toBe(false);
      })
      .then(() => paymentService.process(100))
      .catch(err => {
        expect(err.message).toBe('Network error');
      });
  });
});

// Fake - simplified implementation for testing
class FakeDatabase {
  constructor() {
    this.data = new Map();
  }
  
  async save(table, record) {
    if (!this.data.has(table)) {
      this.data.set(table, []);
    }
    const records = this.data.get(table);
    const id = records.length + 1;
    const saved = { ...record, id };
    records.push(saved);
    return saved;
  }
  
  async findById(table, id) {
    const records = this.data.get(table) || [];
    return records.find(r => r.id === id);
  }
  
  async findAll(table) {
    return this.data.get(table) || [];
  }
}

describe('UserService with FakeDatabase', () => {
  let userService;
  let fakeDb;
  
  beforeEach(() => {
    fakeDb = new FakeDatabase();
    userService = new UserService(fakeDb);
  });
  
  it('should create and retrieve user', async () => {
    const user = await userService.create({
      name: 'John',
      email: 'john@example.com'
    });
    
    expect(user.id).toBe(1);
    
    const retrieved = await userService.findById(user.id);
    expect(retrieved).toEqual(user);
  });
});
```

### 3. Debugging Techniques

**Question: Demonstrate various debugging techniques in Node.js.**

```javascript
// 1. Using debugger statement
function processPayment(payment) {
  debugger; // Execution pauses here
  
  const amount = payment.amount;
  const currency = payment.currency;
  
  debugger; // Check values here
  
  return { processed: true, amount, currency };
}

// 2. Using console.table for structured data
function debugUserQuery(users) {
  console.log('User Query Results:');
  console.table(users);
}

// 3. Custom debug utility
class DebugLogger {
  constructor(namespace) {
    this.namespace = namespace;
    this.enabled = process.env.DEBUG?.includes(namespace);
  }
  
  log(...args) {
    if (this.enabled) {
      console.log(`[${this.namespace}]`, ...args);
    }
  }
  
  error(...args) {
    if (this.enabled) {
      console.error(`[${this.namespace}] ERROR:`, ...args);
    }
  }
  
  time(label) {
    if (this.enabled) {
      console.time(`[${this.namespace}] ${label}`);
    }
  }
  
  timeEnd(label) {
    if (this.enabled) {
      console.timeEnd(`[${this.namespace}] ${label}`);
    }
  }
}

const debug = new DebugLogger('app:service');

async function fetchData(id) {
  debug.time('fetchData');
  debug.log('Fetching data for id:', id);
  
  try {
    const data = await database.findById(id);
    debug.log('Data fetched:', data);
    debug.timeEnd('fetchData');
    return data;
  } catch (err) {
    debug.error('Failed to fetch data:', err);
    debug.timeEnd('fetchData');
    throw err;
  }
}

// 4. Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }
  
  start(label) {
    this.metrics.set(label, {
      start: process.hrtime.bigint(),
      startMemory: process.memoryUsage().heapUsed
    });
  }
  
  end(label) {
    const metric = this.metrics.get(label);
    if (!metric) return;
    
    const end = process.hrtime.bigint();
    const endMemory = process.memoryUsage().heapUsed;
    
    const duration = Number(end - metric.start) / 1000000; // ms
    const memoryDelta = (endMemory - metric.startMemory) / 1024 / 1024; // MB
    
    console.log(`[Performance] ${label}:`);
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Memory Delta: ${memoryDelta.toFixed(2)}MB`);
    
    this.metrics.delete(label);
  }
}

const monitor = new PerformanceMonitor();

monitor.start('dataProcessing');
// ... code to measure ...
monitor.end('dataProcessing');
```

---

## API Design & REST

### 1. RESTful API Design Principles

**Question: Design a RESTful API with proper HTTP methods and status codes.**

```javascript
const express = require('express');
const router = express.Router();

// Resource naming: Use plural nouns for resources
router.route('/users')
  // GET /users - List all users (200, pagination, filtering, sorting)
  .get(async (req, res) => {
    const { page = 1, limit = 10, sort = '-createdAt', search } = req.query;
    
    const result = await UserService.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      search
    });
    
    res.json({
      data: result.users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  })
  
  // POST /users - Create new user (201 with Location header)
  .post(async (req, res) => {
    const user = await UserService.create(req.body);
    res.status(201)
       .location(`/users/${user.id}`)
       .json(user);
  });

router.route('/users/:id')
  // GET /users/:id - Get single user (200 or 404)
  .get(async (req, res) => {
    const user = await UserService.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  })
  
  // PATCH /users/:id - Partial update (200 or 404)
  .patch(async (req, res) => {
    const user = await UserService.update(req.params.id, req.body);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  })
  
  // PUT /users/:id - Complete replace (200 or 404)
  .put(async (req, res) => {
    const user = await UserService.replace(req.params.id, req.body);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  })
  
  // DELETE /users/:id - Delete user (204)
  .delete(async (req, res) => {
    const deleted = await UserService.delete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(204).send();
  });

// Nested resources
router.get('/users/:userId/posts', async (req, res) => {
  const posts = await PostService.findByUser(req.params.userId);
  res.json(posts);
});

// Versioning
const v1Router = express.Router();
app.use('/api/v1', v1Router);

// HATEOAS - Include links to related resources
router.get('/users/:id', async (req, res) => {
  const user = await UserService.findById(req.params.id);
  
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    _links: {
      self: { href: `/api/v1/users/${user.id}` },
      posts: { href: `/api/v1/users/${user.id}/posts` },
      avatar: { href: `/api/v1/users/${user.id}/avatar` }
    }
  });
});
```

### 2. API Versioning Strategies

**Question: Implement different API versioning strategies.**

```javascript
// 1. URL Path Versioning
const v1Router = express.Router();
const v2Router = express.Router();

app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

v1Router.get('/users', v1UserController.list);
v2Router.get('/users', v2UserController.list);

// 2. Header Versioning
app.use((req, res, next) => {
  const version = req.headers['api-version'] || 'v1';
  req.apiVersion = version;
  next();
});

app.get('/users', (req, res) => {
  if (req.apiVersion === 'v1') {
    v1UserController.list(req, res);
  } else {
    v2UserController.list(req, res);
  }
});

// 3. Query Parameter Versioning
app.get('/users', (req, res) => {
  const version = req.query.version || 'v1';
  
  if (version === 'v1') {
    v1UserController.list(req, res);
  } else {
    v2UserController.list(req, res);
  }
});

// 4. Content Negotiation Versioning
app.get('/users', (req, res) => {
  const accept = req.accepts(['application/vnd.api.v1+json', 'application/vnd.api.v2+json']);
  
  if (accept === 'application/vnd.api.v1+json') {
    v1UserController.list(req, res);
  } else {
    v2UserController.list(req, res);
  }
});
```

### 3. GraphQL vs REST

**Question: Explain when to use GraphQL vs REST and implement a GraphQL resolver.**

```javascript
const { ApolloServer, gql } = require('apollo-server-express');

// GraphQL Schema
const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
  }
  
  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
  }
  
  type Query {
    users: [User!]!
    user(id: ID!): User
    posts: [Post!]!
    post(id: ID!): Post
  }
  
  type Mutation {
    createUser(name: String!, email: String!): User!
    updateUser(id: ID!, name: String, email: String): User!
    deleteUser(id: ID!): Boolean!
  }
`;

// Resolvers
const resolvers = {
  Query: {
    users: () => UserService.findAll(),
    user: (_, { id }) => UserService.findById(id),
    posts: () => PostService.findAll(),
    post: (_, { id }) => PostService.findById(id)
  },
  
  Mutation: {
    createUser: (_, { name, email }) => UserService.create({ name, email }),
    updateUser: (_, { id, name, email }) => UserService.update(id, { name, email }),
    deleteUser: (_, { id }) => UserService.delete(id)
  },
  
  // Field resolvers for nested queries
  User: {
    posts: (user) => PostService.findByUser(user.id)
  },
  
  Post: {
    author: (post) => UserService.findById(post.userId)
  }
};

// Apollo Server
const server = new ApolloServer({ typeDefs, resolvers });
server.applyMiddleware({ app, path: '/graphql' });
```

---

## Microservices & Distributed Systems

### 1. Service Communication Patterns

**Question: Implement different inter-service communication patterns.**

```javascript
const axios = require('axios');
const amqp = require('amqplib');
const NATS = require('nats');

// 1. Synchronous HTTP Communication
class HttpClient {
  constructor(baseURL) {
    this.client = axios.create({
      baseURL,
      timeout: 5000
    });
  }
  
  async getUser(userId) {
    const response = await this.client.get(`/users/${userId}`);
    return response.data;
  }
  
  async updateUser(userId, data) {
    const response = await this.client.patch(`/users/${userId}`, data);
    return response.data;
  }
}

// 2. Asynchronous Message Queue (RabbitMQ)
class MessageQueue {
  async connect(url) {
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
  }
  
  async publish(queue, message) {
    await this.channel.assertQueue(queue, { durable: true });
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
  }
  
  async consume(queue, callback) {
    await this.channel.assertQueue(queue, { durable: true });
    this.channel.consume(queue, async (msg) => {
      const content = JSON.parse(msg.content.toString());
      
      try {
        await callback(content);
        this.channel.ack(msg);
      } catch (err) {
        this.channel.nack(msg, false, true); // Requeue on error
      }
    });
  }
  
  async close() {
    await this.connection.close();
  }
}

// Usage: Event-driven architecture
const eventBus = new MessageQueue();

async function publishUserCreated(user) {
  await eventBus.publish('user.created', {
    type: 'USER_CREATED',
    userId: user.id,
    email: user.email,
    timestamp: new Date().toISOString()
  });
}

async function handleUserCreated(event) {
  console.log('User created:', event.userId);
  await EmailService.sendWelcomeEmail(event.email);
}

eventBus.consume('user.created', handleUserCreated);

// 3. Pub/Sub with NATS
class PubSubClient {
  async connect(url) {
    this.nc = await NATS.connect(url);
  }
  
  async publish(subject, data) {
    this.nc.publish(subject, JSON.stringify(data));
  }
  
  async subscribe(subject, callback) {
    this.nc.subscribe(subject, (msg) => {
      const data = JSON.parse(msg);
      callback(data);
    });
  }
}

// 4. Request-Reply Pattern
class RPCClient {
  async send(queue, message, timeout = 5000) {
    const replyQueue = await this.channel.assertQueue('', { exclusive: true });
    const correlationId = this.generateCorrelationId();
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('RPC timeout'));
      }, timeout);
      
      this.channel.consume(replyQueue.queue, (msg) => {
        if (msg.properties.correlationId === correlationId) {
          clearTimeout(timer);
          resolve(JSON.parse(msg.content.toString()));
        }
      });
      
      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        correlationId,
        replyTo: replyQueue.queue
      });
    });
  }
}
```

### 2. Circuit Breaker Pattern

**Question: Implement Circuit Breaker for resilience in distributed systems.**

```javascript
class CircuitBreaker {
  constructor(service, options = {}) {
    this.service = service;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 2,
      timeout: options.timeout || 60000, // Time to stay open
      ...options
    };
  }
  
  async execute(...args) {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await this.service.execute(...args);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.successCount++;
    
    if (this.state === 'HALF_OPEN' && 
        this.successCount >= this.options.successThreshold) {
      this.state = 'CLOSED';
      this.successCount = 0;
    }
  }
  
  onFailure() {
    this.failureCount++;
    this.successCount = 0;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      console.error('Circuit breaker opened');
    }
  }
  
  shouldAttemptReset() {
    return Date.now() - this.lastFailureTime > this.options.timeout;
  }
  
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount
    };
  }
}

// Usage
const userServiceCircuitBreaker = new CircuitBreaker({
  async execute(userId) {
    return await ExternalUserService.fetch(userId);
  }
}, { failureThreshold: 3, timeout: 30000 });

try {
  const user = await userServiceCircuitBreaker.execute('123');
} catch (err) {
  console.error('Service unavailable:', err.message);
}
```

### 3. Distributed Tracing

**Question: Implement distributed tracing for microservices.**

```javascript
const { v4: uuidv4 } = require('uuid');

class Tracer {
  constructor() {
    this.traces = new Map();
  }
  
  startSpan(name, parentSpanId = null) {
    const spanId = uuidv4();
    const traceId = parentSpanId ? 
      this.getTraceId(parentSpanId) : 
      uuidv4();
    
    const span = {
      spanId,
      traceId,
      parentSpanId,
      name,
      startTime: Date.now(),
      tags: {}
    };
    
    this.traces.set(spanId, span);
    return spanId;
  }
  
  finishSpan(spanId, tags = {}) {
    const span = this.traces.get(spanId);
    if (!span) return;
    
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.tags = { ...span.tags, ...tags };
    
    console.log(`[Trace] ${span.name}: ${span.duration}ms`);
  }
  
  getTraceId(spanId) {
    const span = this.traces.get(spanId);
    return span ? span.traceId : null;
  }
  
  getHeaders(spanId) {
    const span = this.traces.get(spanId);
    return {
      'X-Trace-Id': span.traceId,
      'X-Span-Id': span.spanId,
      'X-Parent-Span-Id': span.parentSpanId
    };
  }
}

const tracer = new Tracer();

// Middleware for Express
function tracingMiddleware(req, res, next) {
  const parentSpanId = req.headers['x-span-id'];
  const spanId = tracer.startSpan(`${req.method} ${req.path}`, parentSpanId);
  
  req.traceSpanId = spanId;
  res.on('finish', () => {
    tracer.finishSpan(spanId, {
      'http.status_code': res.statusCode
    });
  });
  
  next();
}

// HTTP client with tracing
class TracedHttpClient {
  constructor(tracer) {
    this.tracer = tracer;
  }
  
  async get(url, parentSpanId) {
    const spanId = this.tracer.startSpan(`HTTP GET ${url}`, parentSpanId);
    
    try {
      const headers = this.tracer.getHeaders(spanId);
      const response = await axios.get(url, { headers });
      
      this.tracer.finishSpan(spanId, {
        'http.status_code': response.status,
        success: true
      });
      
      return response;
    } catch (err) {
      this.tracer.finishSpan(spanId, {
        success: false,
        error: err.message
      });
      throw err;
    }
  }
}
```

---

## Memory Management

### 1. V8 Garbage Collection

**Question: Explain V8 garbage collection and how to optimize memory usage.**

```javascript
// V8 Memory Management
const v8 = require('v8');

// 1. Memory monitoring
function monitorMemory() {
  const usage = process.memoryUsage();
  
  console.log('Memory Usage:');
  console.log(`  RSS: ${(usage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Total: ${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  External: ${(usage.external / 1024 / 1024).toFixed(2)} MB`);
}

// 2. Heap statistics
function getHeapStats() {
  const stats = v8.getHeapStatistics();
  console.log('Heap Statistics:');
  console.log(`  Total Heap Size: ${(stats.total_heap_size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Total Heap Size Executable: ${(stats.total_heap_size_executable / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Total Physical Size: ${(stats.total_physical_size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Total Available Size: ${(stats.total_available_size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Used Heap Size: ${(stats.used_heap_size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Size Limit: ${(stats.heap_size_limit / 1024 / 1024).toFixed(2)} MB`);
}

// 3. Space statistics
function getSpaceStats() {
  const spaces = v8.getHeapSpaceStatistics();
  
  spaces.forEach(space => {
    console.log(`${space.space_name}:`);
    console.log(`  Size: ${(space.space_size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Used: ${(space.space_used_size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Available: ${(space.space_available_size / 1024 / 1024).toFixed(2)} MB`);
  });
}

// 4. Force garbage collection (in development)
if (process.env.NODE_ENV === 'development') {
  v8.writeHeapSnapshot('before-gc.heapsnapshot');
  global.gc(); // Requires --expose-gc flag
  v8.writeHeapSnapshot('after-gc.heapsnapshot');
}

// 5. Memory leak prevention
class Cache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      // LRU eviction
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  
  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
}

// 6. Buffer pool for reusable memory
class BufferPool {
  constructor(poolSize = 10, bufferSize = 1024) {
    this.pool = [];
    this.poolSize = poolSize;
    this.bufferSize = bufferSize;
    
    for (let i = 0; i < poolSize; i++) {
      this.pool.push(Buffer.allocUnsafe(bufferSize));
    }
  }
  
  acquire() {
    return this.pool.pop() || Buffer.allocUnsafe(this.bufferSize);
  }
  
  release(buffer) {
    if (this.pool.length < this.poolSize && buffer.length === this.bufferSize) {
      this.pool.push(buffer);
    }
  }
}
```

### 2. Memory Leak Detection & Prevention

**Question: Implement memory leak detection and prevention strategies.**

```javascript
class MemoryLeakDetector {
  constructor(threshold = 100) {
    this.threshold = threshold; // MB
    this.snapshots = [];
    this.monitoring = false;
  }
  
  startMonitoring(interval = 60000) {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.interval = setInterval(() => {
      this.takeSnapshot();
    }, interval);
  }
  
  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      this.monitoring = false;
    }
  }
  
  takeSnapshot() {
    const usage = process.memoryUsage();
    const snapshot = {
      timestamp: Date.now(),
      heapUsed: usage.heapUsed / 1024 / 1024,
      heapTotal: usage.heapTotal / 1024 / 1024,
      rss: usage.rss / 1024 / 1024
    };
    
    this.snapshots.push(snapshot);
    
    // Keep only last 100 snapshots
    if (this.snapshots.length > 100) {
      this.snapshots.shift();
    }
    
    this.checkForLeaks(snapshot);
    
    return snapshot;
  }
  
  checkForLeaks(snapshot) {
    if (this.snapshots.length < 3) return;
    
    const recent = this.snapshots.slice(-3);
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    const growthRate = (last.heapUsed - first.heapUsed) / 
      ((last.timestamp - first.timestamp) / 1000);
    
    if (last.heapUsed > this.threshold && growthRate > 0.1) {
      console.error('Potential memory leak detected!');
      console.error(`Heap size: ${last.heapUsed.toFixed(2)} MB`);
      console.error(`Growth rate: ${growthRate.toFixed(2)} MB/s`);
    }
  }
  
  compareSnapshots(index1, index2) {
    const s1 = this.snapshots[index1];
    const s2 = this.snapshots[index2];
    
    if (!s1 || !s2) {
      console.log('Invalid snapshot indices');
      return;
    }
    
    const diff = {
      heapUsed: s2.heapUsed - s1.heapUsed,
      heapTotal: s2.heapTotal - s1.heapTotal,
      timeDiff: (s2.timestamp - s1.timestamp) / 1000
    };
    
    console.log(`Memory difference between snapshots ${index1} and ${index2}:`);
    console.log(`  Heap Used: ${diff.heapUsed.toFixed(2)} MB`);
    console.log(`  Time: ${diff.timeDiff.toFixed(2)} s`);
    console.log(`  Rate: ${(diff.heapUsed / diff.timeDiff).toFixed(2)} MB/s`);
  }
}

// Common memory leak patterns to avoid

// 1. Global variables (AVOID)
// let globalCache = {}; // Memory leak!

// 2. Event listeners not removed (AVOID)
class EventEmitterLeak extends EventEmitter {
  constructor() {
    super();
    this.listeners = [];
  }
  
  // BAD: Adding listeners without removing
  addListener(callback) {
    this.on('event', callback);
    this.listeners.push(callback);
  }
  
  // GOOD: Remove listeners when done
  addListenerSafe(callback) {
    const wrapper = (...args) => {
      callback.apply(this, args);
      this.off('event', wrapper);
    };
    this.on('event', wrapper);
  }
  
  // Clean up all listeners
  removeAll() {
    this.listeners.forEach(callback => {
      this.off('event', callback);
    });
    this.listeners = [];
  }
}

// 3. Closures keeping references (AVOID)
function createClosure() {
  const largeData = new Array(100000).fill('x');
  
  return function() {
    console.log('Using closure');
    // largeData is kept in memory even if not used
  };
}

// 4. Timers not cleared (AVOID)
class TimerLeak {
  constructor() {
    this.timers = [];
  }
  
  // BAD: Timer never cleared
  schedule(callback, interval) {
    setInterval(callback, interval);
  }
  
  // GOOD: Track and clear timers
  scheduleSafe(callback, interval) {
    const timer = setInterval(callback, interval);
    this.timers.push(timer);
    return timer;
  }
  
  clearAll() {
    this.timers.forEach(timer => clearInterval(timer));
    this.timers = [];
  }
}

// 5. Proper cleanup on module unload
function setupCleanup() {
  const listeners = [];
  const timers = [];
  
  const api = {
    on: (event, callback) => {
      emitter.on(event, callback);
      listeners.push({ event, callback });
    },
    setInterval: (callback, interval) => {
      const timer = setInterval(callback, interval);
      timers.push(timer);
      return timer;
    }
  };
  
  // Cleanup on process exit
  process.on('exit', () => {
    listeners.forEach(({ event, callback }) => {
      emitter.off(event, callback);
    });
    timers.forEach(timer => clearInterval(timer));
  });
  
  return api;
}
```

---

## Summary & Key Takeaways

### Interview Preparation Checklist

- ✅ **Core Concepts**: Event loop, async/await, modules
- ✅ **Advanced Patterns**: Observer, middleware, singleton, factory
- ✅ **Streams & Buffers**: All stream types, backpressure handling
- ✅ **Error Handling**: Try-catch, async errors, global handlers
- ✅ **Performance**: Clustering, caching, memory management
- ✅ **Security**: Input validation, authentication, rate limiting
- ✅ **Design Patterns**: Repository, strategy, decorator, builder
- ✅ **Testing**: Unit tests, mocks, integration tests
- ✅ **API Design**: REST, GraphQL, versioning
- ✅ **Microservices**: Communication patterns, circuit breaker, tracing
- ✅ **Memory**: V8 GC, leak detection, optimization

### Quick Reference Commands

```bash
# Run with inspect
node --inspect app.js

# Force garbage collection
node --expose-gc app.js

# Heap snapshot
node --heap-prof app.js

# Cluster mode
NODE_ENV=production node cluster.js

# Monitor process
node --monitor app.js
```

### Essential Packages

- `express` - Web framework
- `async_hooks` - Async operation tracking
- `cluster` - Multi-core utilization
- `worker_threads` - CPU-intensive tasks
- `jest` - Testing framework
- `supertest` - HTTP testing
- `joi` - Schema validation
- `helmet` - Security headers
- `rate-limiter-flexible` - Rate limiting
- `ioredis` - Redis client
- `amqplib` - RabbitMQ client
- `winston` - Logging
- `prom-client` - Metrics

---

**Happy Coding! Good luck with your interview! 🚀**
