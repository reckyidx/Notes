# Pub-Sub System (Multithreaded)

A thread-safe Publisher-Subscriber system implementation focusing on concurrent message processing.

## Problem Statement

Design a Publisher-Subscriber system where:
- **Producers** can publish messages to topics
- **Subscribers** can subscribe to topics and receive messages
- System must handle concurrent operations safely (multithreading)

## Project Structure

```
pub-sub-system/
├── ARCHITECTURE.md      # System architecture and design decisions
├── DESIGN_PATTERNS.md   # Design patterns used with explanations
├── README.md            # This file
└── src/
    └── pseudocode.md    # Detailed pseudocode implementation
```

## Key Features

### Core Functionality
- ✅ Topic-based message publishing
- ✅ Subscriber registration and management
- ✅ Message queuing with backpressure
- ✅ Multiple delivery semantics support

### Multithreading Features
- ✅ Thread-safe data structures (ConcurrentHashMap, BlockingQueue)
- ✅ Read-Write locks for concurrent read access
- ✅ Thread pool management for publishers and dispatchers
- ✅ Atomic operations for state management
- ✅ Deadlock prevention through lock ordering

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Publisher  │────▶│TopicManager │────▶│   Topic     │
└─────────────┘     │   (Broker)  │     │  Subscribers│
                    └─────────────┘     └─────────────┘
```

### Components

| Component | Responsibility |
|-----------|---------------|
| TopicManager | Central broker, manages topics and thread pools |
| Topic | Holds subscribers, queues messages |
| Subscriber | Consumes messages, runs handler in separate thread |
| MessageDispatcher | Routes messages to subscribers |
| DeadLetterQueue | Handles failed messages |

## Threading Model

### Thread Pools

1. **Publisher Pool** (Fixed size: 4 threads)
   - Handles incoming publish requests
   - Prevents publisher overload

2. **Dispatcher Pool** (Cached, scalable)
   - Routes messages to subscribers
   - Grows based on load

3. **Subscriber Threads** (Per subscriber)
   - Each subscriber has dedicated consumer thread
   - Isolates subscriber processing

### Synchronization Strategy

| Operation | Lock Type | Reason |
|----------|-----------|--------|
| Create/Delete Topic | Write Lock | Structural change |
| Subscribe/Unsubscribe | Write Lock | Modify subscriber list |
| Publish Message | Read Lock | No structural change |
| Get Subscribers | Read Lock | Read-only operation |

## Design Patterns Used

1. **Observer Pattern** - Core pub-sub notification mechanism
2. **Producer-Consumer Pattern** - Message queue decoupling
3. **Strategy Pattern** - Pluggable delivery semantics
4. **Thread Pool Pattern** - Managed concurrent execution
5. **Read-Write Lock Pattern** - Optimized concurrent reads
6. **Singleton Pattern** - Single TopicManager instance
7. **Builder Pattern** - Message construction

## Delivery Semantics

### At-Most-Once
```
Publisher → Queue → Subscriber (fire and forget)
```
- Fastest, no acknowledgment
- Messages may be lost

### At-Least-Once
```
Publisher → Queue → Subscriber → Ack → Complete
```
- Guaranteed delivery with retry
- May have duplicates (idempotency required)

### Exactly-Once
```
Publisher → Queue → Transaction → Subscriber → Commit
```
- Most reliable, highest overhead
- Requires transaction support

## Quick Reference

### Publish Message
```
topicManager.publish("orders", {orderId: "123", items: [...]})
```

### Subscribe to Topic
```
subscriber = new Subscriber(
    id: "order-processor",
    topic: "orders",
    handler: new OrderHandler()
)
topicManager.subscribe("orders", subscriber)
```

### Shutdown
```
topicManager.shutdown()
```

## Thread Safety Guarantees

| Guarantee | Implementation |
|-----------|---------------|
| No data races | Atomic types, synchronized blocks |
| No deadlocks | Lock ordering, tryLock with timeout |
| Visibility | Volatile variables, final fields |
| Atomicity | ConcurrentHashMap, AtomicBoolean |

## Common Pitfalls Avoided

1. **Deadlock** - Lock ordering (TopicManager → Topic → Subscriber)
2. **Race Conditions** - Thread-safe collections, atomic operations
3. **Memory Visibility** - Volatile for flags, final for immutables
4. **Thread Starvation** - Fair locks, bounded queues
5. **Resource Leaks** - Proper shutdown hooks, try-finally blocks

## Files to Reference

- **ARCHITECTURE.md** - Detailed architecture diagrams and explanations
- **DESIGN_PATTERNS.md** - Design patterns with pseudocode examples
- **src/pseudocode.md** - Complete implementation pseudocode

## Learning Objectives

This project demonstrates:
1. How to design thread-safe systems
2. When to use different synchronization mechanisms
3. How to structure concurrent code
4. Best practices for multithreaded applications