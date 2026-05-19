# Design Patterns Used in Pub-Sub System

## 1. Observer Pattern

### Purpose
The core pattern for Pub-Sub systems. It defines a one-to-many dependency between objects so that when one object changes state, all dependents are notified automatically.

### Implementation
```
┌─────────────────────────────────────────────────────────────┐
│                    Observer Pattern                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐         ┌─────────────────┐            │
│  │    Subject      │         │    Observer     │            │
│  ├─────────────────┤         ├─────────────────┤            │
│  │ + attach()      │◀───────││ + update()      │            │
│  │ + detach()      │         └─────────────────┘            │
│  │ + notify()      │                  ▲                     │
│  └────────┬────────┘                  │                     │
│           │                           │                     │
│           ▼                           │                     │
│  ┌─────────────────┐         ┌────────┴────────┐            │
│  │     Topic       │         │   Subscriber     │            │
│  ├─────────────────┤         ├─────────────────┤            │
│  │ - subscribers   │────────▶│ - id            │            │
│  │ - messageQueue  │         │ - messageQueue   │            │
│  │ + publish()     │         │ + consume()      │            │
│  │ + subscribe()   │         └─────────────────┘            │
│  └─────────────────┘                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Pseudocode
```
interface Observer {
    update(message: Message): void
}

class Topic implements Subject {
    private observers: List<Observer> = []
    private lock: ReadWriteLock
    
    attach(observer: Observer): void {
        lock.writeLock().lock()
        observers.add(observer)
        lock.writeLock().unlock()
    }
    
    detach(observer: Observer): void {
        lock.writeLock().lock()
        observers.remove(observer)
        lock.writeLock().unlock()
    }
    
    notify(message: Message): void {
        lock.readLock().lock()
        for observer in observers:
            observer.update(message)
        lock.readLock().unlock()
    }
}
```

---

## 2. Producer-Consumer Pattern

### Purpose
Decouples message production from consumption, allowing them to operate at different rates. Essential for handling bursty traffic.

### Implementation
```
┌─────────────────────────────────────────────────────────────┐
│                Producer-Consumer Pattern                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │  Producer 1 │────▶│             │◀────│  Producer 2 │   │
│  └─────────────┘     │   Shared    │     └─────────────┘   │
│                      │    Queue    │                        │
│  ┌─────────────┐     │             │     ┌─────────────┐   │
│  │  Producer 3 │────▶│  [M][M][M]  │◀────│  Producer 4 │   │
│  └─────────────┘     │             │     └─────────────┘   │
│                      └──────┬──────┘                        │
│                             │                               │
│              ┌──────────────┼──────────────┐               │
│              ▼              ▼              ▼               │
│       ┌───────────┐  ┌───────────┐  ┌───────────┐         │
│       │ Consumer 1│  │ Consumer 2│  │ Consumer 3│         │
│       └───────────┘  └───────────┘  └───────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Pseudocode
```
class MessageQueue {
    private queue: BlockingQueue<Message>
    private capacity: int
    
    produce(message: Message): void {
        // Blocks if queue is full
        queue.put(message)  // Thread-safe blocking operation
    }
    
    consume(): Message {
        // Blocks if queue is empty
        return queue.take()  // Thread-safe blocking operation
    }
}
```

---

## 3. Strategy Pattern

### Purpose
Allows different message delivery strategies to be swapped at runtime.

### Implementation
```
┌─────────────────────────────────────────────────────────────┐
│                   Strategy Pattern                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           DeliveryStrategy (Interface)               │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ + deliver(message, subscribers): void               │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                   │
│       ┌─────────────────┼─────────────────┐                 │
│       ▼                 ▼                 ▼                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ AtMostOnce  │  │ AtLeastOnce │  │ ExactlyOnce │         │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤         │
│  │ + deliver() │  │ + deliver() │  │ + deliver() │         │
│  │ (fire &     │  │ (with ack)  │  │ (with txn)  │         │
│  │  forget)    │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Pseudocode
```
interface DeliveryStrategy {
    deliver(message: Message, subscribers: List<Subscriber>): void
}

class AtMostOnceStrategy implements DeliveryStrategy {
    deliver(message, subscribers): void {
        for sub in subscribers:
            sub.messageQueue.offer(message)  // Non-blocking, may fail
    }
}

class AtLeastOnceStrategy implements DeliveryStrategy {
    deliver(message, subscribers): void {
        for sub in subscribers:
            sub.messageQueue.put(message)  // Blocking, guaranteed
            waitForAck(message.id, sub.id)  // Retry on failure
    }
}

class ExactlyOnceStrategy implements DeliveryStrategy {
    deliver(message, subscribers): void {
        transaction.begin()
        for sub in subscribers:
            if not sub.hasProcessed(message.id):
                sub.messageQueue.put(message)
                sub.markProcessed(message.id)
        transaction.commit()
    }
}
```

---

## 4. Thread Pool Pattern

### Purpose
Manages a pool of worker threads to execute tasks concurrently, avoiding the overhead of thread creation for each task.

### Implementation
```
┌─────────────────────────────────────────────────────────────┐
│                   Thread Pool Pattern                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Task Queue                         │    │
│  │  ┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐        │    │
│  │  │Task1││Task2││Task3││Task4││Task5││Task6│        │    │
│  │  └─────┘└─────┘└─────┘└─────┘└─────┘└─────┘        │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                             │                               │
│              ┌──────────────┼──────────────┐                │
│              ▼              ▼              ▼                │
│       ┌───────────┐  ┌───────────┐  ┌───────────┐          │
│       │  Worker 1 │  │  Worker 2 │  │  Worker 3 │          │
│       │ ┌───────┐ │  │ ┌───────┐ │  │ ┌───────┐ │          │
│       │ │Thread │ │  │ │Thread │ │  │ │Thread │ │          │
│       │ └───────┘ │  │ └───────┘ │  │ └───────┘ │          │
│       └───────────┘  └───────────┘  └───────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Pseudocode
```
class ThreadPool {
    private workers: List<WorkerThread>
    private taskQueue: BlockingQueue<Task>
    private isRunning: AtomicBoolean
    
    constructor(numThreads: int) {
        for i in 0..numThreads:
            workers.add(new WorkerThread(taskQueue))
    }
    
    submit(task: Task): void {
        taskQueue.put(task)  // Thread-safe
    }
    
    shutdown(): void {
        isRunning.set(false)
        for worker in workers:
            worker.interrupt()
        }
    }
}

class WorkerThread extends Thread {
    private taskQueue: BlockingQueue<Task>
    
    run(): void {
        while isRunning:
            task = taskQueue.take()  // Blocks until task available
            task.execute()
    }
}
```

---

## 5. Read-Write Lock Pattern

### Purpose
Allows multiple concurrent readers but exclusive access for writers. Optimizes for read-heavy workloads.

### Implementation
```
┌─────────────────────────────────────────────────────────────┐
│                 Read-Write Lock Pattern                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  State: UNLOCKED                                             │
│                                                              │
│  Read Lock Acquisition:                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Thread 1 (Read) ──▶ LOCK (SHARED)                   │    │
│  │  Thread 2 (Read) ──▶ LOCK (SHARED) ──▶ ALLOWED        │    │
│  │  Thread 3 (Read) ──▶ LOCK (SHARED) ──▶ ALLOWED        │    │
│  │  Thread 4 (Write)──▶ BLOCK (waiting for readers)      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Write Lock Acquisition:                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Thread 1 (Write)──▶ LOCK (EXCLUSIVE)                │    │
│  │  Thread 2 (Read)  ──▶ BLOCK                         │    │
│  │  Thread 3 (Write)──▶ BLOCK                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Pseudocode
```
class Topic {
    private subscribers: List<Subscriber>
    private lock: ReadWriteLock
    
    subscribe(subscriber: Subscriber): void {
        lock.writeLock().lock()
        try:
            subscribers.add(subscriber)
        finally:
            lock.writeLock().unlock()
    }
    
    getSubscribers(): List<Subscriber> {
        lock.readLock().lock()
        try:
            return copy(subscribers)  // Return copy for thread safety
        finally:
            lock.readLock().unlock()
    }
    
    publish(message: Message): void {
        lock.readLock().lock()
        try:
            for sub in subscribers:
                sub.deliver(message)
        finally:
            lock.readLock().unlock()
    }
}
```

---

## 6. Singleton Pattern (Thread-Safe)

### Purpose
Ensures only one instance of TopicManager exists, providing a global point of access.

### Implementation
```
┌─────────────────────────────────────────────────────────────┐
│              Singleton Pattern (Thread-Safe)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  TopicManager                       │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ - instance: volatile TopicManager                   │    │
│  │ - lock: Object                                      │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ + getInstance(): TopicManager                       │    │
│  │   ┌─────────────────────────────────────────────┐   │    │
│  │   │ if instance == null:                        │   │    │
│  │   │   synchronized(lock):                        │   │    │
│  │   │     if instance == null:  // Double-check   │   │    │
│  │   │       instance = new TopicManager()         │   │    │
│  │   │ return instance                             │   │    │
│  │   └─────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Pseudocode
```
class TopicManager {
    private static volatile instance: TopicManager
    private static lock: Object = new Object()
    
    private TopicManager() {}  // Private constructor
    
    getInstance(): TopicManager {
        if instance == null:  // First check (no locking)
            synchronized(lock):
                if instance == null:  // Double-check
                    instance = new TopicManager()
        return instance
    }
}
```

---

## 7. Builder Pattern

### Purpose
Constructs complex Message objects step by step.

### Pseudocode
```
class MessageBuilder {
    private id: string
    private topic: string
    private payload: any
    private timestamp: datetime
    private metadata: Map
    
    withId(id: string): MessageBuilder {
        this.id = id
        return this
    }
    
    withTopic(topic: string): MessageBuilder {
        this.topic = topic
        return this
    }
    
    withPayload(payload: any): MessageBuilder {
        this.payload = payload
        return this
    }
    
    build(): Message {
        return new Message(id, topic, payload, timestamp, metadata)
    }
}

// Usage
message = MessageBuilder()
    .withId(uuid())
    .withTopic("orders")
    .withPayload({orderId: 123})
    .build()
```

---

## Pattern Summary Table

| Pattern | Use Case | Thread-Safety Benefit |
|---------|----------|----------------------|
| Observer | Pub-Sub notification | Read-write lock for subscriber list |
| Producer-Consumer | Message queue | BlockingQueue is thread-safe |
| Strategy | Delivery semantics | Immutable strategy objects |
| Thread Pool | Concurrent processing | Managed worker threads |
| Read-Write Lock | Topic operations | Concurrent reads, exclusive writes |
| Singleton | TopicManager | Double-checked locking |
| Builder | Message construction | Immutable message objects |