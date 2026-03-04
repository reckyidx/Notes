# Node.js Core Concepts & Architecture

## Table of Contents
1. [Node.js vs Browser JavaScript](#nodejs-vs-browser-javascript)
2. [Event Loop Differences](#event-loop-differences)
3. [Execution Context & Callbacks](#execution-context--callbacks)
4. [Event Loop Deep Dive](#event-loop-deep-dive)
5. [Process vs Threads](#process-vs-threads)
6. [Module System (CJS vs ESM)](#module-system-cjs-vs-esm)

---

## Node.js vs Browser JavaScript

### Fundamental Differences

Node.js and Browser JavaScript both run on the V8 engine but have significant differences in their environment and capabilities.

```javascript
// Browser JavaScript
console.log(window); // Browser's global object
console.log(document); // DOM access
console.log(localStorage); // Browser storage
console.log(fetch); // Built-in fetch API

// Node.js
console.log(global); // Node.js global object
// console.log(document); // ReferenceError: document is not defined
console.log(process); // Process information
console.log(require); // Module system
console.log(__dirname); // Current directory
console.log(__filename); // Current file path
```

### Key Differences Comparison

| Feature | Browser JavaScript | Node.js |
|---------|-------------------|---------|
| **Global Object** | `window` | `global` |
| **DOM Access** | ✅ Available | ❌ Not available |
| **Storage** | `localStorage`, `sessionStorage` | File system API |
| **Networking** | `fetch`, `XMLHttpRequest` | `http`, `https`, `net` |
| **Timers** | `setTimeout`, `setInterval`, `requestAnimationFrame` | `setTimeout`, `setInterval`, `setImmediate` |
| **Console** | Browser DevTools console | Terminal console |
| **ES Modules** | `<script type="module">` | `.mjs` files or `"type": "module"` |
| **Module System** | ESM primarily | CJS & ESM |
| **Security** | Same-origin policy, CSP | OS-level permissions |
| **Entry Point** | HTML file | JavaScript file |
| **Environment** | Client-side | Server-side |

---

## Event Loop Differences

### Browser vs Node.js Event Loop

**Browser Event Loop:**
- Simplified with fewer phases
- Focus on UI rendering
- Microtask queue between macrotasks
- Rendering priority

**Node.js Event Loop:**
- Multiple distinct phases (6 phases)
- Focus on I/O operations
- nextTick queue (highest priority)
- No rendering phase

---

## Execution Context & Callbacks

### What is Execution Context?

An **execution context** is the environment in which JavaScript code is executed. It includes:

1. **Variable Environment** - Variables, functions, arguments
2. **Lexical Environment** - Scope chain
3. **This Binding** - Reference to current object
4. **Reference to outer environment** - For closures

### Do Callbacks Belong to the Event Loop?

**Answer: Yes, but with nuance:**

1. **Synchronous Callbacks**: Execute immediately in the current call stack (e.g., `Array.map()`)
2. **Asynchronous Callbacks**: Go through the event loop queue (e.g., `setTimeout` callbacks)

### Execution Context Flow

```javascript
// Synchronous callback - immediate execution
[1, 2, 3].map(num => num * 2); // Executes immediately

// Asynchronous callback - goes through event loop
setTimeout(() => console.log('Delayed'), 1000); // Queued, executed later
```

---

## How Node.js Single-Threaded Execution Works

**Question: How does Node.js handle concurrency while being single-threaded?**

**Answer:** Node.js achieves high concurrency through its **asynchronous, non-blocking I/O model** powered by the event loop, even though JavaScript execution is single-threaded.

### Key Concepts

1. **Single-Threaded JavaScript**: Only one JavaScript execution thread
2. **Event Loop**: Manages execution of callbacks in non-blocking manner
3. **Call Stack**: LIFO (Last In First Out) - executes synchronous code
4. **Event Queue**: FIFO (First In First Out) - holds asynchronous callbacks
5. **Non-Blocking I/O**: I/O operations don't block the event loop

### Architecture

```
┌─────────────────────────────────────────────────┐
│         Node.js Single-Threaded Model        │
└─────────────────────────────────────────────────┘
            
    ┌──────────────────────────────────────┐
    │        Call Stack (LIFO)            │
    │  - Synchronous code execution       │
    │  - Currently executing function     │
    │  - Push/pop operations              │
    └──────────────┬───────────────────────┘
                   │
                   │ (Empty?)
                   ▼
    ┌──────────────────────────────────────┐
    │      Event Loop (Dispatcher)        │
    │  - Checks call stack continuously    │
    │  - Moves callbacks from queue       │
    │  - When stack is empty              │
    └──────────────┬───────────────────────┘
                   │
                   │ (Callback ready)
                   ▼
    ┌──────────────────────────────────────┐
    │      Event Queue (FIFO)             │
    │  - Holds async callbacks             │
    │  - Waiting to be executed           │
    │  - setTimeout, I/O callbacks         │
    └──────────────────────────────────────┘
```

### Event Loop Initialization

As soon as Node.js starts, it:
1. Initializes the event loop
2. Processes the main script (synchronous code)
3. Starts the event loop to handle callbacks
4. Continues running until there are no more callbacks or timers

### Event Loop Algorithm

```javascript
// Simplified event loop pseudocode
function eventLoop() {
  while (true) {
    // 1. Check if call stack is empty
    if (callStack.isEmpty()) {
      // 2. If event queue has callbacks
      if (eventQueue.hasCallbacks()) {
        // 3. Move callback to call stack
        const callback = eventQueue.dequeue();
        callStack.push(callback);
      }
    }
    
    // 4. Execute function at top of stack
    // (This happens automatically by JavaScript engine)
    
    // 5. Wait for next tick (0ms delay in actual implementation)
    // Actual implementation: wait for I/O events from OS
  }
}
```

### Call Stack Execution - Detailed Example

**Your Example Explained Step-by-Step:**

```javascript
/**
 * Call Stack Example - Synchronous Execution
 */

function add(a, b) {
  return a + b;
}

function print(n) {
  console.log(`Two times the number ${n} is ` + add(n, n));
}

print(5);
```

**Execution Flow with Call Stack Visualization:**

```
Step 1: Call print(5)
┌─────────────────┐
│   print(5)      │ ← Top (executing)
└─────────────────┘
Console: Starting execution

Step 2: Inside print(5), encounter console.log()
┌─────────────────┐
│ console.log()   │ ← Top (preparing string)
└─────────────────┘
│   print(5)      │
└─────────────────┘

Step 3: Building string, encounter add(5, 5)
┌─────────────────┐
│   add(5, 5)     │ ← Top (executing)
└─────────────────┘
│ console.log()   │ ← Suspended (waiting for result)
└─────────────────┘
│   print(5)      │ ← Suspended
└─────────────────┘

Step 4: add(5, 5) returns 10, gets popped
┌─────────────────┐
│ console.log()   │ ← Top (resumes with result)
└─────────────────┘
│   print(5)      │
└─────────────────┘
Result: 10

Step 5: console.log() completes, logs output, gets popped
┌─────────────────┐
│   print(5)      │ ← Top (finishing)
└─────────────────┘
Console: "Two times the number 5 is 10"

Step 6: print(5) completes, gets popped
┌─────────────────┐
│   (Empty)       │ ← Stack is empty
└─────────────────┘

Execution complete!
```

**Detailed Timeline:**

```javascript
// Timeline of execution

// T0: Call print(5)
// Call Stack: [print(5)]

// T1: print() starts executing console.log()
// Call Stack: [print(5), console.log()]
// print() SUSPENDED at console.log

// T2: console.log() needs to evaluate add(5, 5)
// Call Stack: [print(5), console.log(), add(5, 5)]
// console.log() SUSPENDED waiting for add()

// T3: add(5, 5) executes, returns 10
// Call Stack: [print(5), console.log(), add(5, 5)] → add() popped
// Result: 10

// T4: console.log() resumes with result 10
// Call Stack: [print(5), console.log()]

// T5: console.log() logs output and completes
// Console Output: "Two times the number 5 is 10"
// Call Stack: [print(5)] → console.log() popped

// T6: print(5) completes
// Call Stack: [] → print() popped

// T7: Call stack empty, event loop can process next callback
```

### Why This is Fast

**Key Insight:** Call stack operations are extremely fast:
- Push: O(1)
- Pop: O(1)
- Top access: O(1)

Modern JavaScript engines (V8) optimize call stack with:
- Inline caching
- Hidden classes
- JIT compilation
- Stack frames are lightweight memory structures

### Single-Threaded vs Multi-Threaded Comparison

```javascript
// Single-Threaded (Node.js)
function process1() {
  console.log('Process 1 start');
  console.log('Process 1 end');
}

function process2() {
  console.log('Process 2 start');
  console.log('Process 2 end');
}

process1();
process2();

// Output:
// Process 1 start
// Process 1 end
// Process 2 start
// Process 2 end
//
// Execution is sequential, predictable
// No race conditions
// No context switching overhead
```

```javascript
// Multi-Threaded (Traditional)
// Process 1 might run on Thread 1
// Process 2 might run on Thread 2
// Output is non-deterministic:
// Option 1:
// Process 1 start
// Process 2 start
// Process 1 end
// Process 2 end
//
// Option 2:
// Process 1 start
// Process 1 end
// Process 2 start
// Process 2 end
//
// Option 3: Any interleaving possible!
// Race conditions possible
// Context switching overhead
// Higher memory usage per thread
```

### How Asynchronous I/O Works in Single-Threaded Model

```javascript
// Async I/O Example
console.log('1. Start');

fs.readFile('data.txt', (err, data) => {
  // This callback goes to event queue
  console.log('3. File read complete');
});

console.log('2. End');

// Execution Flow:
// T0: console.log('1. Start') → Push → Execute → Pop
// T1: fs.readFile() → Register with OS (non-blocking)
// T2: console.log('2. End') → Push → Execute → Pop
// T3: Event loop sees stack empty
// T4: File read completes (in background by OS)
// T5: Callback pushed from event queue to call stack
// T6: console.log('3. File read complete') → Execute → Pop

// Output:
// 1. Start
// 2. End
// 3. File read complete (after some time)
```

### Visual Timeline: Async vs Sync

```javascript
// Synchronous (Blocking)
console.log('1');
const data = fs.readFileSync('data.txt'); // Blocks here!
console.log('2');

Timeline:
|----|----|----|----|----|----|----|----|→
1    [BLOCKING]                    2

// Asynchronous (Non-blocking)
console.log('1');
fs.readFile('data.txt', (err, data) => {
  console.log('2');
});
console.log('3');

Timeline:
|----|----|----|----|----|----|----|----|→
1    3    2 (when file ready)
```

### Concurrency Through Asynchrony

**How 10,000 requests work:**

```javascript
// All these start "simultaneously"
for (let i = 0; i < 10000; i++) {
  // Each iteration:
  // 1. Add to event queue (O(1))
  // 2. Event loop processes one by one
  // 3. I/O happens in background (libuv threads)
  // 4. Callbacks execute as I/O completes
  
  fs.readFile(`file${i}.txt`, (err, data) => {
    console.log(`File ${i} read`);
  });
}

// Call stack never has more than 1 callback at a time
// But all 10,000 files are being read concurrently!
// Async nature enables massive concurrency with single thread
```

### Summary: Why Single-Threaded is Powerful

**Advantages:**

1. **Simplicity**: No race conditions in JavaScript code
2. **Performance**: No context switching overhead
3. **Memory**: Low memory footprint (one stack)
4. **Predictability**: Execution order is deterministic
5. **Scalability**: Handles 10,000+ concurrent connections

**How it Works:**

1. **JavaScript is single-threaded**: Only one call stack
2. **Event loop manages concurrency**: Coordinates async operations
3. **I/O is offloaded**: File system, network happen in background
4. **Callbacks execute sequentially**: One at a time on call stack
5. **Non-blocking**: Never waits for I/O to complete

**The Magic:**
```
Synchronous (Single-Threaded):
One task at a time = Slow ❌

Asynchronous (Single-Threaded):
Initiate all I/O, handle as they complete = Fast ✅
```

---

## Async/Await Deep Dive

**Question: How does async/await work? Where are suspended functions stored?**

**Answer:** Async/await is **syntactic sugar over Promises**. Under the hood, the compiler transforms async/await code into Promise-based code using generators.

### What is Async/Await?

```javascript
// Async/Await - Modern Syntax
async function logFetch(url) {
  try {
    const response = await fetch(url);
    console.log(response);
  } catch (err) {
    console.log('fetch failed', err);
  }
}

// This is converted to:
function logFetch(url) {
  return new Promise((resolve, reject) => {
    try {
      fetch(url)
        .then(response => {
          console.log(response);
          resolve(response);
        })
        .catch(err => {
          console.log('fetch failed', err);
          reject(err);
        });
    } catch (err) {
      console.log('fetch failed', err);
      reject(err);
    }
  });
}
```

### How Async/Await Transforms Code

**Example 1: Simple async/await**

```javascript
// Your code:
async function logFetch(url) {
  try {
    const response = await fetch(url);
    console.log(response);
  } catch (err) {
    console.log('fetch failed', err);
  }
}

// Compiler transforms to:
function logFetch(url) {
  return handlePromise(
    fetch(url).then(response => {
      console.log(response);
      return response;
    })
  );
}
```

**Example 2: Multiple awaits**

```javascript
// Your code:
async function fetchMultiple() {
  const user = await fetch('/api/user');
  const posts = await fetch('/api/posts');
  const comments = await fetch('/api/comments');
  
  return { user, posts, comments };
}

// Compiler transforms to:
function fetchMultiple() {
  return fetch('/api/user')
    .then(user => {
      return fetch('/api/posts').then(posts => {
        return fetch('/api/comments').then(comments => {
          return { user, posts, comments };
        });
      });
    });
}
```

### How Await Works with Call Stack and Event Loop

**Key Concept:** When `await` is encountered, the function is **suspended** and the call stack is cleared. The suspended state is stored in the **generator object**.

```javascript
async function logFetch(url) {
  try {
    const response = await fetch(url);  // ← Suspension point
    console.log(response);
  } catch (err) {
    console.log('fetch failed', err);
  }
}
```

**Detailed Execution Flow:**

```
Step 1: Call logFetch(url)
┌─────────────────┐
│   logFetch(url) │ ← Top (executing)
└─────────────────┘

Step 2: Execute console.log before await
┌─────────────────┐
│ console.log()   │ ← Top
└─────────────────┘
│   logFetch(url) │
└─────────────────┘

Step 3: Encounter await fetch(url)
┌─────────────────┐
│   logFetch(url) │ ← Encounters await
└─────────────────┘

Step 4: Suspended!
┌─────────────────┐
│   (Empty)       │ ← Stack is clear!
└─────────────────┘
logFetch state: SUSPENDED
  - Stored in generator object
  - Has pending Promise from fetch(url)
  - Call stack is free for other code

Step 5: Event loop processes other callbacks
┌─────────────────┐
│ otherCallback() │ ← Can run now!
└─────────────────┘

Step 6: fetch(url) completes
┌─────────────────┐
│   logFetch(url) │ ← Resumed (pushed back)
└─────────────────┘
State: RESUMED with response value

Step 7: Continue execution
┌─────────────────┐
│ console.log()   │ ← Log response
└─────────────────┘
│   logFetch(url) │
└─────────────────┘

Step 8: Function completes
┌─────────────────┐
│   (Empty)       │
└─────────────────┘
```

### Where Suspended Functions Are Stored

**Answer:** Suspended async functions are stored in **generator objects** created by the V8 engine.

```javascript
// Internal representation (simplified)
class AsyncFunction {
  constructor(generatorFunction) {
    this.generator = generatorFunction();
    this.state = 'suspended';
    this.value = undefined;
  }
  
  async run() {
    const result = this.generator.next();
    
    if (result.done) {
      return result.value;
    }
    
    // Await encountered: suspend function
    const promise = Promise.resolve(result.value);
    
    // Function suspended, stored in this object
    this.state = 'suspended';
    this.value = promise;
    
    // Wait for promise to resolve
    const value = await promise;
    
    // Resume function
    const nextResult = this.generator.next(value);
    return nextResult.value;
  }
}

// When async function is called:
async function example() {
  await fetch(url);
}

// Internally:
const generator = function* () {
  const response = yield fetch(url);  // yield = await
};

const asyncFunc = new AsyncFunction(generator);
asyncFunc.run(); // Starts execution, suspends at yield
```

### Visualization: Multiple Async Functions

**Question: How suspended functions don't impact other requests?**

```javascript
// Multiple async functions running simultaneously
async function request1() {
  console.log('Request 1 start');
  await fetch('/api/1');
  console.log('Request 1 done');
}

async function request2() {
  console.log('Request 2 start');
  await fetch('/api/2');
  console.log('Request 2 done');
}

async function request3() {
  console.log('Request 3 start');
  await fetch('/api/3');
  console.log('Request 3 done');
}

request1();
request2();
request3();

// Execution Timeline:
┌─────────────────────────────────────────────────┐
│              Time                              │
└─────────────────────────────────────────────────┘
|----|----|----|----|----|----|----|----|----|----→
T1   T2   T3   T4   T5   T6   T7   T8   T9   T10

T1: request1() → Push to stack
    Console: "Request 1 start"
    
T2: await fetch('/api/1') → SUSPENDED
    Stack: [EMPTY]
    request1 stored in generator object
    fetch started in background
    
T3: Stack is free, request2() runs
    Console: "Request 2 start"
    
T4: await fetch('/api/2') → SUSPENDED
    Stack: [EMPTY]
    request2 stored in generator object
    fetch started in background
    
T5: Stack is free, request3() runs
    Console: "Request 3 start"
    
T6: await fetch('/api/3') → SUSPENDED
    Stack: [EMPTY]
    request3 stored in generator object
    fetch started in background
    
T7: fetch('/api/1') completes
    request1() → RESUMED → Push to stack
    Console: "Request 1 done"
    
T8: fetch('/api/2') completes
    request2() → RESUMED → Push to stack
    Console: "Request 2 done"
    
T9: fetch('/api/3') completes
    request3() → RESUMED → Push to stack
    Console: "Request 3 done"

T10: All complete, stack empty

// Output:
// Request 1 start
// Request 2 start
// Request 3 start
// Request 1 done
// Request 2 done
// Request 3 done
```

**Key Insight:** Only ONE function runs on the call stack at any given time, but multiple functions can be suspended simultaneously in generator objects!

### Memory Structure: Suspended Functions

```
┌─────────────────────────────────────────────────┐
│              Memory (Heap)                      │
└─────────────────────────────────────────────────┘
            
    ┌──────────────────────────────────────┐
    │    Generator Object 1 (request1)     │
    │  - state: 'suspended'               │
    │  - promise: <pending>               │
    │  - resume point: line 3             │
    │  - local variables stored here      │
    └──────────────────────────────────────┘
    
    ┌──────────────────────────────────────┐
    │    Generator Object 2 (request2)     │
    │  - state: 'suspended'               │
    │  - promise: <pending>               │
    │  - resume point: line 3             │
    │  - local variables stored here      │
    └──────────────────────────────────────┘
    
    ┌──────────────────────────────────────┐
    │    Generator Object 3 (request3)     │
    │  - state: 'suspended'               │
    │  - promise: <pending>               │
    │  - resume point: line 3             │
    │  - local variables stored here      │
    └──────────────────────────────────────┘

All suspended functions exist in memory (heap),
NOT on call stack!
Call stack remains free to process other code.
```

### How Suspension Works Internally

**Using Generators (Under the Hood):**

```javascript
// Async function
async function fetchData() {
  console.log('1. Start');
  const result = await fetch('/api/data');
  console.log('2. Got:', result);
  return result;
}

// Transformed to generator (simplified)
function* fetchDataGenerator() {
  console.log('1. Start');
  
  // await becomes yield
  const result = yield fetch('/api/data');
  
  console.log('2. Got:', result);
  return result;
}

// Async runner (what async/await uses)
function async(genFn) {
  return function(...args) {
    const gen = genFn(...args);
    
    function handle(result) {
      if (result.done) {
        return Promise.resolve(result.value);
      }
      
      // Convert yield result to Promise
      const promise = Promise.resolve(result.value);
      
      // When promise resolves, resume generator
      return promise.then(
        value => handle(gen.next(value)),
        error => handle(gen.throw(error))
      );
    }
    
    // Start execution
    try {
      return handle(gen.next());
    } catch (err) {
      return Promise.reject(err);
    }
  };
}

// Usage
const fetchDataAsync = async(fetchDataGenerator);
```

### Visual Timeline: Suspension and Resumption

```javascript
async function processRequest(id) {
  console.log(`Request ${id}: Start`);
  
  // Step 1: Database query
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  // ← SUSPENDED here, stored in generator object
  
  console.log(`Request ${id}: Got user`);
  
  // Step 2: External API call
  const profile = await externalAPI.getProfile(user.email);
  // ← SUSPENDED again, still in same generator object
  
  console.log(`Request ${id}: Got profile`);
  
  return { user, profile };
}

// 3 concurrent requests
processRequest(1);
processRequest(2);
processRequest(3);

// Memory state at any point:
// 3 generator objects in heap (suspended)
// 0 or 1 function on call stack
// Event loop free to process other callbacks
```

### Why This Doesn't Impact Other Requests

```javascript
// Request A (suspended in generator object A)
async function requestA() {
  const data = await slowDB.query();  // Suspended
  return data;
}

// Request B (runs while A is suspended)
async function requestB() {
  const result = await fastCache.get();  // Runs immediately
  return result;
}

requestA(); // Suspends quickly, clears stack
requestB(); // Runs on cleared stack

// Why this works:
// 1. Request A suspends → Stack cleared → Request B can run
// 2. Request B might complete before Request A
// 3. When Request A completes, it resumes on stack
// 4. Non-blocking = high throughput
```

### Error Handling in Async/Await

```javascript
// Async/Await with try/catch
async function fetchWithErrorHandling() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (err) {
    // Catches both:
    // - fetch() errors (network, 404, etc.)
    // - response.json() errors (invalid JSON)
    console.error('Error:', err);
    throw err; // Re-throw to caller
  }
}

// Transformed to Promises
function fetchWithErrorHandling() {
  return fetch('/api/data')
    .then(response => response.json())
    .then(data => data)
    .catch(err => {
      console.error('Error:', err);
      throw err;
    });
}
```

### Parallel vs Sequential Async/Await

```javascript
// Sequential (slow)
async function sequential() {
  const user = await fetch('/api/user');
  const posts = await fetch('/api/posts');
  const comments = await fetch('/api/comments');
  
  return { user, posts, comments };
}
// Total time: 100ms + 150ms + 50ms = 300ms

// Parallel (fast)
async function parallel() {
  const [user, posts, comments] = await Promise.all([
    fetch('/api/user'),
    fetch('/api/posts'),
    fetch('/api/comments')
  ]);
  
  return { user, posts, comments };
}
// Total time: max(100ms, 150ms, 50ms) = 150ms
```

### Key Takeaways for Interviews

1. **Async/Await = Syntactic Sugar**: Transforms to Promise-based code using generators
2. **Suspension**: `await` suspends function and clears call stack
3. **Storage**: Suspended functions stored in generator objects (heap memory)
4. **Non-blocking**: Cleared stack allows other code to run
5. **Concurrency**: Multiple async functions can be suspended simultaneously
6. **Resumption**: Function resumes on stack when Promise resolves
7. **Try/Catch**: Works like synchronous code but catches Promise rejections
8. **Parallel**: Use `Promise.all` for concurrent async operations

---

## Event Loop Deep Dive

### Event Loop Phases

1. **Timers Phase**: `setTimeout()`, `setInterval()` callbacks
2. **Pending Callbacks Phase**: I/O callbacks (except close)
3. **Poll Phase**: Retrieve new I/O events
4. **Check Phase**: `setImmediate()` callbacks
5. **Close Callbacks Phase**: `socket.on('close')` callbacks

---

## Process vs Threads & Concurrency

### How Node.js Handles Concurrency Despite Being Single-Threaded

**Question: If Node.js is single-threaded, how does it handle 10,000 concurrent requests?**

**Answer:** Node.js achieves concurrency through the **event loop + libuv thread pool** model:

```
┌─────────────────────────────────────────────────┐
│         Client Requests (10,000)             │
└─────────────────────┬───────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│          Node.js Server Process             │
│  ┌─────────────────────────────────────────┐ │
│  │     Single Event Loop Thread          │ │
│  │  - JavaScript Execution               │ │
│  │  - Route Processing                 │ │
│  │  - Business Logic                   │ │
└───┴──────────────────────────────────────┘│
                    │
                    │ (Non-blocking I/O)
                    ▼
┌─────────────────────────────────────────────────┐
│         libuv Thread Pool (4 threads)        │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐      │
│  │ DB  │  │File │  │DNS │  │Comp │      │
│  │ I/O │  │I/O │  │    │  │ress│      │
│  └─────┘  └─────┘  └─────┘  └─────┘      │
└─────────────────────────────────────────────────┘
```

### Request Flow with 10,000 Concurrent Requests

```javascript
// Scenario: 10,000 requests arrive simultaneously

// Step 1: All connections accepted by OS TCP stack
// Step 2: Event loop processes requests one by one (non-blocking)
// Step 3: For each request:
async function handleRequest(request) {
  // 1. Parse request (fast, in event loop)
  const parsed = parseRequest(request);
  
  // 2. Offload DB operation to thread pool (non-blocking)
  const result = await database.query(parsed.sql);
  
  // 3. Process result (back in event loop)
  const response = formatResponse(result);
  
  // 4. Send response
  return response;
}
```

**Execution Timeline:**

```
Time →
  0ms:  Request 1, 2, 3, 4, 5, 6, 7, 8, 9, 10000 arrive
  |
  1ms:  Event loop accepts all TCP connections
  |
  2ms:  Request 1: Parse → Offload DB to thread pool
       Request 2: Parse → Offload DB to thread pool
       Request 3: Parse → Offload DB to thread pool
       ... (all 10,000 requests processed this way)
       |
 10ms: Request 1: DB complete → Process → Send response
       Request 2: DB complete → Process → Send response
       ... (responses return as DB operations complete)
```

**Key Points:**

1. **Event Loop Never Blocks**: Always processing new requests
2. **I/O is Offloaded**: File I/O, DNS, Compression, Crypto happen in thread pool
3. **Concurrency**: 10,000 requests processed "in parallel" through async I/O
4. **No Thread Contention**: JavaScript is single-threaded, no race conditions in JS code

### Database Connection Pooling

With 10,000 requests, you need a **database connection pool**:

```javascript
// Without pool: Each request creates new connection (SLOW)
// With pool: Reuse connections (FAST)

class ConnectionPool {
  constructor(maxConnections = 100) {
    this.pool = [];
    this.maxConnections = maxConnections;
    this.queue = [];
  }
  
  async getConnection() {
    // Return available connection
    const connection = this.pool.find(conn => !conn.inUse);
    if (connection) {
      connection.inUse = true;
      return connection;
    }
    
    // Wait for available connection
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }
  
  releaseConnection(connection) {
    connection.inUse = false;
    
    // Wake up next waiting request
    const next = this.queue.shift();
    if (next) {
      next(connection);
    }
  }
}

// Usage with 10,000 requests
const pool = new ConnectionPool(100); // Only 100 DB connections

async function handleRequest(req) {
  const db = await pool.getConnection(); // May wait if all busy
  
  try {
    const result = await db.query(req.sql);
    return result;
  } finally {
    pool.releaseConnection(db);
  }
}
```

### Load Balancing in Node.js Architecture

**Question: Where does load balancing fit in this picture?**

**Answer: Load balancing happens at different levels:**

```
┌─────────────────────────────────────────────────┐
│         Load Balancer (Nginx/HAProxy)       │
│  - Distributes traffic across instances     │
│  - Health checks                         │
│  - SSL termination                   │
└─────────────────┬─────────────────────────────┘
                  │
        ┌───────┴────────┬──────────┬────────┐
        │                │          │        │
        ▼                ▼          ▼        ▼
┌─────────────┐   ┌───────────────┐  ┌──────────────┐
│ Instance 1   │   │ Instance 2   │  │ Instance 3   │
└─────────────┘   └───────────────┘  └──────────────┘
   (Node.js Process) (Node.js Process)  (Node.js Process)
   │                  │                  │
   ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Event Loop   │  │  Event Loop   │  │  Event Loop   │
│ + Clustering  │  │ + Clustering  │  │ + Clustering  │
│ (4 workers)  │  │ (4 workers)  │  │ (4 workers)  │
└───────────────┘  └───────────────┘  └───────────────┘
```

### Clustering + Load Balancing

```javascript
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);
  
  // Fork workers (one per CPU core)
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
  
} else {
  // Worker process
  const http = require('http');
  
  const server = http.createServer((req, res) {
    res.end(`Worker ${process.pid}: ${req.url}`);
  });
  
  server.listen(3000);
  console.log(`Worker ${process.pid} listening`);
}
```

### Complete Architecture with Load Balancer

```
                    ┌──────────────┐
                    │   Client     │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Load Balancer│
                    │   Nginx     │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                                  │
        ▼                                  ▼
┌─────────────────┐              ┌─────────────────┐
│   Server 1      │              │   Server 2      │
│ ┌───────────────┐ │              │ ┌───────────────┐ │
│ │ Cluster Master │ │              │ │ Cluster Master │ │
│ └───────┬───────┘ │              │ └───────┬───────┘ │
│         │                          │         │          │
│    ┌────┴───────────────────────────┴─────┐     │
│    │         ┌──┐  ┌──┐  ┌──┐  ┌───┐ │     │
│    │         │W1 │  │W2│  │W3│  │W4│ │     │
│    │         └──┘  └──┘  └──┘  └───┘ │     │
│    └─────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

### Handling 10,000 Concurrent Requests Step-by-Step

```javascript
// Load Balancer distributes requests
// Example: Round-robin across 3 servers

// Server 1 receives ~3,334 requests
// Server 2 receives ~3,333 requests
// Server 3 receives ~3,333 requests

// Each Server (with 4 workers):
// Each worker handles ~833 requests

// Total concurrency: 12 worker threads across 3 servers
// Each worker can handle multiple requests concurrently through async I/O
// Effectively: 12 workers × async DB calls = thousands of concurrent DB operations

// Thread pool (4 threads per process):
// 12 processes × 4 threads = 48 thread pool threads total
// Each handles file I/O, DNS, compression, crypto

// Total concurrent capacity:
// 12 event loop threads (JavaScript)
// 48 libuv threads (I/O operations)
// + Database connection pool (100+ connections)

// = Thousands of concurrent operations!
```

### Performance Characteristics

```javascript
// Why this is fast:

// 1. Non-blocking: Never waiting for I/O
// 2. Event Loop: Always processing requests
// 3. Thread Pool: I/O happens in parallel
// 4. Connection Pooling: Reuse DB connections
// 5. Clustering: Utilize all CPU cores

// Benchmark comparison:

// Single-threaded (blocking):
// Request 1: 100ms DB call
// Request 2: 100ms DB call
// Request 3: 100ms DB call
// Total time: 300ms (sequential)

// Node.js async (non-blocking):
// Request 1: 100ms DB call (thread pool)
// Request 2: 100ms DB call (thread pool, parallel)
// Request 3: 100ms DB call (thread pool, parallel)
// Total time: ~100ms (parallel)

// With clustering and load balancing:
// 12 workers handling 10,000 requests in parallel
// ~833 requests per worker
// Effectively processes all requests in 120ms (with 100ms DB calls each)
```

---

## Module System (CJS vs ESM)

### CommonJS (CJS)

```javascript
// utils.cjs
function add(a, b) {
  return a + b;
}
module.exports = { add };

// Importing
const { add } = require('./utils.cjs');
```

**Characteristics:**
- Synchronous loading
- `module.exports` and `require`
- `__filename` and `__dirname` available
- Dynamic: `require(variable)`

### ES Modules (ESM)

```javascript
// utils.mjs
export function add(a, b) {
  return a + b;
}

// Importing
import { add } from './utils.mjs';
```

**Characteristics:**
- Asynchronous loading
- `import` and `export`
- `__filename` and `__dirname` not available
- Static: `import` at top level only

---

## Interview Questions

### Q1: What is the difference between Node.js and Browser JavaScript?

**Answer:**
- **Environment**: Node.js runs server-side, Browser runs client-side
- **Global Object**: Node.js uses `global`, Browser uses `window`
- **DOM Access**: Browser has DOM, Node.js doesn't
- **Event Loop**: Browser has rendering phase, Node.js has I/O phases
- **setImmediate**: Only exists in Node.js
- **requestAnimationFrame**: Only exists in Browser

### Q2: How does the event loop differ between Node.js and Browser?

**Answer:**
- **Browser**: Simpler, focused on rendering, has microtask/macrotask queues
- **Node.js**: More complex with 6 phases, has nextTick queue, focused on I/O
- **Browser**: Rendering priority between macrotasks
- **Node.js**: Processes all phases in one iteration

### Q3: What is execution context and how does it relate to callbacks?

**Answer:**
- **Execution Context**: Environment where code runs (variables, scope, `this` binding)
- **Call Stack**: Maintains execution contexts (LIFO)
- **Synchronous Callbacks**: Execute immediately in current context
- **Asynchronous Callbacks**: Queued in event loop, execute when call stack is empty in new context
- **Each function call**: Creates new execution context

### Q4: Do callbacks belong to the event loop?

**Answer:**
- **Not always**: Synchronous callbacks execute immediately without event loop
- **Async callbacks**: Yes, they go through the event loop queue
- **Event loop's job**: Schedule async callbacks for execution when call stack is empty

### Q5: Explain the execution context flow with callbacks.

**Answer:**
1. Function call creates new execution context
2. Pushed to call stack
3. Synchronous callbacks execute immediately
4. Async callbacks queued in event loop
5. Function completes, context popped
6. Event loop picks next callback, creates new context, pushes to stack

### Q6: How does Node.js handle 10,000 concurrent requests despite being single-threaded?

**Answer:**
- **Event Loop**: Processes requests one by one but never blocks
- **Async I/O**: DB calls, file operations offloaded to thread pool (4 threads)
- **Non-blocking**: Event loop continues processing while I/O happens in parallel
- **Connection Pooling**: Reuse DB connections (e.g., 100 connections for 10,000 requests)
- **Concurrency**: All 10,000 requests initiated "simultaneously", responses return as I/O completes

### Q7: Where does load balancing fit in Node.js architecture?

**Answer:**
- **Level 1**: Load balancer (Nginx/HAProxy) distributes traffic across servers
- **Level 2**: Each server uses clustering to utilize all CPU cores
- **Level 3**: Thread pool handles I/O operations in parallel
- **Example**: 3 servers × 4 workers = 12 event loops handling thousands of concurrent requests
- **Result**: Horizontal scaling through load balancer + Vertical scaling through clustering

### Q8: Explain what is Reactor Pattern in Node.js?

**Answer:**

**Reactor Pattern** is the design pattern that powers Node.js's event loop and non-blocking I/O. It's a behavioral design pattern that handles multiple I/O operations concurrently using a single thread.

```
┌─────────────────────────────────────────────────┐
│            Reactor Pattern Architecture       │
└─────────────────────────────────────────────────┘
            
    ┌──────────────────────────────────────┐
    │         Event Demultiplexer          │
    │    (Uses epoll/kqueue/IOCP)          │
    │  - Monitors multiple I/O events     │
    │  - Blocks until events occur        │
    └──────────────┬───────────────────────┘
                   │
                   │ (events ready)
                   ▼
    ┌──────────────────────────────────────┐
    │         Event Loop (Reactor)         │
    │  - Distributes events to handlers    │
    │  - Single-threaded dispatcher        │
    └──────────────┬───────────────────────┘
                   │
        ┌──────────┴──────────┬───────────┐
        │                     │           │
        ▼                     ▼           ▼
   ┌─────────┐          ┌─────────┐  ┌─────────┐
   │Handler 1│          │Handler 2│  │Handler 3│
   │(File I/O│          │(Network │  │(DB I/O) │
   │ Request)│          │Request) │  │Request) │
   └─────────┘          └─────────┘  └─────────┘
```

**Key Components:**

1. **Event Demultiplexer**: Uses OS-level APIs (epoll on Linux, kqueue on macOS, IOCP on Windows) to monitor multiple I/O sources simultaneously

2. **Event Loop**: The Reactor that loops and waits for events from the demultiplexer

3. **Event Handlers**: Callback functions that handle specific I/O events

**How It Works in Node.js:**

```javascript
// Reactor Pattern in action
const fs = require('fs');
const http = require('http');

// 1. Register interest in I/O event
fs.readFile('data.txt', (err, data) => {
  // Event handler - will be called when file is ready
  console.log('File read:', data);
});

// 2. Register interest in network event
const server = http.createServer((req, res) => {
  // Event handler - will be called when request arrives
  res.end('Hello');
});

// 3. Event loop (Reactor) starts
server.listen(3000);

// Behind the scenes:
// 1. libuv registers interest in file I/O and network I/O
// 2. Event demultiplexer (epoll/kqueue) monitors both
// 3. When events occur, demultiplexer unblocks
// 4. Event loop receives events and dispatches to handlers
// 5. Handlers execute (non-blocking)
// 6. Event loop continues to next iteration
```

**Reactor Pattern vs Traditional Thread-Based:**

```javascript
// Traditional Thread-Based (Blocking)
// Each request = New thread
function handleRequestThread(req, res) {
  // Blocks entire thread
  const data = fs.readFileSync('data.txt'); // Blocks here
  res.end(data);
}

// Problem with 10,000 requests:
// 10,000 threads needed
// High memory usage
// Thread context switching overhead
// Possible deadlock

// Reactor Pattern (Non-blocking)
// All requests = Single thread
function handleRequestReactor(req, res) {
  // Doesn't block
  fs.readFile('data.txt', (err, data) => {
    res.end(data);
  });
}

// Benefit with 10,000 requests:
// 1 event loop thread
// Low memory usage
// No context switching
// No deadlock
// Efficient resource utilization
```

**Advantages of Reactor Pattern:**

1. **Single Threaded**: No race conditions in JavaScript code
2. **Non-blocking**: Always processing requests
3. **Scalable**: Handles thousands of concurrent connections
4. **Efficient**: Minimal memory overhead
5. **Simple**: Easier to reason about code flow

**Disadvantages:**

1. **CPU-intensive tasks**: Block the entire event loop
2. **Error handling**: Uncaught errors can crash the process
3. **Limited parallelism**: Doesn't utilize all CPU cores (solved by clustering)

**Reactor Pattern in Node.js Architecture:**

```
┌─────────────────────────────────────────────────┐
│              Your Application Code            │
│         (Registers event handlers)            │
└─────────────────────┬─────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│           Node.js API Layer                   │
│      (fs, http, net, etc.)                    │
└─────────────────────┬─────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│              libuv (Event Demultiplexer)      │
│    - epoll (Linux)                            │
│    - kqueue (macOS/BSD)                        │
│    - IOCP (Windows)                           │
│    - Thread Pool for CPU operations           │
└─────────────────────────────────────────────────┘
```

**Real-World Example:**

```javascript
// Reactor Pattern handling multiple I/O events simultaneously
const fs = require('fs');
const http = require('http');

// Handler 1: File I/O
fs.readFile('config.json', (err, config) => {
  console.log('Config loaded');
});

// Handler 2: File I/O
fs.readFile('data.json', (err, data) => {
  console.log('Data loaded');
});

// Handler 3: Network I/O
const server = http.createServer((req, res) => {
  console.log('Request received');
  res.end('Response');
});

server.listen(3000, () => {
  console.log('Server listening');
});

// Reactor Pattern Flow:
// 1. All handlers registered with libuv
// 2. Event demultiplexer monitors all I/O sources
// 3. When file I/O completes → demultiplexer unblocks
// 4. Event loop dispatches to fs.readFile handler
// 5. When network request arrives → demultiplexer unblocks
// 6. Event loop dispatches to http.createServer handler
// 7. All handlers execute in single thread (sequentially but non-blocking)
```

---

## Key Takeaways

1. **Node.js vs Browser**: Server vs Client, different global objects and APIs
2. **Event Loop**: Node.js has 6 phases for I/O, Browser has rendering phase
3. **Execution Context**: Environment for code execution with scope and `this`
4. **Callbacks**: Can be synchronous (immediate) or asynchronous (event loop)
5. **Modules**: CJS (synchronous) vs ESM (asynchronous, modern)
6. **Concurrency**: Achieved through event loop + thread pool + clustering + load balancing
7. **Scalability**: Handles thousands of concurrent requests efficiently
8. **Reactor Pattern**: The design pattern powering Node.js's event loop and non-blocking I/O
