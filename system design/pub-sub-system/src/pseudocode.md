# Pub-Sub System - Pseudocode Implementation

## Core Data Structures

### Message
```
class Message {
    // Immutable message object
    readonly id: string          // UUID
    readonly topic: string       // Topic name
    readonly payload: any        // Message content
    readonly timestamp: long     // Creation timestamp
    readonly metadata: Map       // Optional metadata
    readonly correlationId: string  // For request-reply patterns
    
    constructor(id, topic, payload, timestamp, metadata) {
        this.id = id
        this.topic = topic
        this.payload = payload
        this.timestamp = timestamp
        this.metadata = immutableCopy(metadata)
    }
}
```

---

## Topic Implementation

```
class Topic {
    private name: string
    private subscribers: CopyOnWriteArrayList<Subscriber>
    private messageQueue: LinkedBlockingQueue<Message>
    private lock: ReentrantReadWriteLock
    private dispatcher: MessageDispatcher
    private isRunning: AtomicBoolean
    
    constructor(name: string, config: TopicConfig) {
        this.name = name
        this.subscribers = new CopyOnWriteArrayList()
        this.messageQueue = new LinkedBlockingQueue(config.maxQueueSize)
        this.lock = new ReentrantReadWriteLock()
        this.isRunning = new AtomicBoolean(true)
        this.dispatcher = new MessageDispatcher(this)
    }
    
    // ==================== Subscribe Operations ====================
    
    subscribe(subscriber: Subscriber): boolean {
        lock.writeLock().lock()
        try {
            if subscribers.contains(subscriber):
                return false  // Already subscribed
            
            subscribers.add(subscriber)
            log.info("Subscriber {} subscribed to topic {}", subscriber.id, name)
            return true
        } finally {
            lock.writeLock().unlock()
        }
    }
    
    unsubscribe(subscriberId: string): boolean {
        lock.writeLock().lock()
        try {
            iterator = subscribers.iterator()
            while iterator.hasNext():
                sub = iterator.next()
                if sub.id == subscriberId:
                    subscribers.remove(sub)
                    sub.shutdown()
                    log.info("Subscriber {} unsubscribed from topic {}", subscriberId, name)
                    return true
            return false
        } finally {
            lock.writeLock().unlock()
        }
    }
    
    // ==================== Publish Operations ====================
    
    publish(message: Message): PublishResult {
        // Validate message belongs to this topic
        if message.topic != name:
            return PublishResult.failure("Topic mismatch")
        
        // Add to queue (thread-safe, may block if queue full)
        try {
            added = messageQueue.offer(message, config.publishTimeout, TimeUnit.MILLISECONDS)
            if not added:
                return PublishResult.failure("Queue full, timeout exceeded")
            
            // Trigger dispatcher
            dispatcher.signalNewMessage()
            
            return PublishResult.success(message.id)
        } catch InterruptedException e:
            Thread.currentThread().interrupt()
            return PublishResult.failure("Interrupted")
        }
    }
    
    // ==================== Message Dispatch ====================
    
    dispatchMessage(message: Message): void {
        lock.readLock().lock()
        try {
            // Get snapshot of current subscribers
            currentSubscribers = subscribers.toArray()
            
            if currentSubscribers.isEmpty():
                log.debug("No subscribers for topic {}", name)
                return
            
            // Dispatch to all subscribers
            for subscriber in currentSubscribers:
                dispatcher.dispatchToSubscriber(message, subscriber)
        } finally {
            lock.readLock().unlock()
        }
    }
    
    // ==================== Lifecycle ====================
    
    shutdown(): void {
        isRunning.set(false)
        dispatcher.shutdown()
        
        // Drain remaining messages
        messageQueue.clear()
        
        // Shutdown all subscribers
        for subscriber in subscribers:
            subscriber.shutdown()
        subscribers.clear()
    }
    
    getStats(): TopicStats {
        return TopicStats {
            name: name,
            subscriberCount: subscribers.size(),
            queueSize: messageQueue.size(),
            messagesProcessed: dispatcher.getProcessedCount()
        }
    }
}
```

---

## Subscriber Implementation

```
class Subscriber {
    readonly id: string
    readonly topic: string
    private messageQueue: LinkedBlockingQueue<Message>
    private handler: MessageHandler
    private isActive: AtomicBoolean
    private consumerThread: Thread
    private processedCount: AtomicLong
    private errorCount: AtomicLong
    
    constructor(id: string, topic: string, handler: MessageHandler, config: SubscriberConfig) {
        this.id = id
        this.topic = topic
        this.handler = handler
        this.messageQueue = new LinkedBlockingQueue(config.queueSize)
        this.isActive = new AtomicBoolean(true)
        this.processedCount = new AtomicLong(0)
        this.errorCount = new AtomicLong(0)
        
        // Start consumer thread
        this.consumerThread = new Thread(new MessageConsumer())
        this.consumerThread.setName("subscriber-" + id + "-consumer")
        this.consumerThread.start()
    }
    
    // ==================== Message Delivery ====================
    
    deliver(message: Message): boolean {
        if not isActive.get():
            return false
        
        try {
            // Non-blocking offer with timeout
            return messageQueue.offer(message, 100, TimeUnit.MILLISECONDS)
        } catch InterruptedException e {
            Thread.currentThread().interrupt()
            return false
        }
    }
    
    // ==================== Consumer Thread ====================
    
    class MessageConsumer implements Runnable {
        run(): void {
            while isActive.get():
                try {
                    // Blocking take with timeout
                    message = messageQueue.poll(1, TimeUnit.SECONDS)
                    
                    if message != null:
                        processMessage(message)
                } catch InterruptedException e:
                    if isActive.get():
                        log.warn("Consumer thread interrupted for subscriber {}", id)
                    Thread.currentThread().interrupt()
                    break
                }
            
            log.info("Consumer thread stopped for subscriber {}", id)
        }
        
        private processMessage(message: Message): void {
            try {
                // Invoke handler
                handler.handle(message)
                processedCount.incrementAndGet()
                
                // Acknowledge if needed
                acknowledge(message)
            } catch Exception e {
                errorCount.incrementAndGet()
                log.error("Error processing message {} for subscriber {}: {}", 
                         message.id, id, e.message)
                
                // Handle retry logic
                handleError(message, e)
            }
        }
    }
    
    // ==================== Acknowledgment ====================
    
    private acknowledge(message: Message): void {
        // Implementation depends on delivery semantics
        // At-most-once: No-op
        // At-least-once: Mark as processed
        // Exactly-once: Transaction commit
    }
    
    private handleError(message: Message, error: Exception): void {
        // Retry logic, dead letter queue, etc.
        if shouldRetry(message, error):
            retryMessage(message)
        else:
            sendToDeadLetterQueue(message, error)
    }
    
    // ==================== Lifecycle ====================
    
    shutdown(): void {
        isActive.set(false)
        consumerThread.interrupt()
        
        try {
            consumerThread.join(5000)  // Wait up to 5 seconds
        } catch InterruptedException e {
            log.warn("Interrupted while waiting for consumer thread to stop")
        }
    }
    
    getStats(): SubscriberStats {
        return SubscriberStats {
            id: id,
            topic: topic,
            isActive: isActive.get(),
            queueSize: messageQueue.size(),
            processedCount: processedCount.get(),
            errorCount: errorCount.get()
        }
    }
}
```

---

## TopicManager (Broker) Implementation

```
class TopicManager {
    // Singleton instance
    private static volatile instance: TopicManager
    private static lock: Object = new Object()
    
    // Topic registry
    private topics: ConcurrentHashMap<string, Topic>
    private topicConfigs: ConcurrentHashMap<string, TopicConfig>
    
    // Thread pools
    private publisherPool: ThreadPoolExecutor
    private dispatcherPool: ThreadPoolExecutor
    
    // State
    private isRunning: AtomicBoolean
    private globalLock: ReentrantReadWriteLock
    
    // ==================== Singleton ====================
    
    private TopicManager() {
        this.topics = new ConcurrentHashMap()
        this.topicConfigs = new ConcurrentHashMap()
        this.isRunning = new AtomicBoolean(true)
        this.globalLock = new ReentrantReadWriteLock()
        
        initializeThreadPools()
    }
    
    getInstance(): TopicManager {
        if instance == null:
            synchronized(lock):
                if instance == null:
                    instance = new TopicManager()
        return instance
    }
    
    // ==================== Thread Pool Initialization ====================
    
    private initializeThreadPools(): void {
        // Publisher thread pool (fixed size)
        publisherPool = new ThreadPoolExecutor(
            corePoolSize: 4,
            maxPoolSize: 4,
            keepAliveTime: 0,
            unit: TimeUnit.SECONDS,
            workQueue: new LinkedBlockingQueue(1000),
            handler: new CallerRunsPolicy()
        )
        
        // Dispatcher thread pool (cached, grows as needed)
        dispatcherPool = new ThreadPoolExecutor(
            corePoolSize: 2,
            maxPoolSize: Integer.MAX_VALUE,
            keepAliveTime: 60,
            unit: TimeUnit.SECONDS,
            workQueue: new SynchronousQueue()
        )
    }
    
    // ==================== Topic Management ====================
    
    createTopic(name: string, config: TopicConfig): Topic {
        globalLock.writeLock().lock()
        try {
            if topics.containsKey(name):
                throw TopicAlreadyExistsException(name)
            
            topic = new Topic(name, config)
            topics.put(name, topic)
            topicConfigs.put(name, config)
            
            log.info("Created topic: {}", name)
            return topic
        } finally {
            globalLock.writeLock().unlock()
        }
    }
    
    deleteTopic(name: string): boolean {
        globalLock.writeLock().lock()
        try {
            topic = topics.remove(name)
            if topic != null:
                topic.shutdown()
                topicConfigs.remove(name)
                log.info("Deleted topic: {}", name)
                return true
            return false
        } finally {
            globalLock.writeLock().unlock()
        }
    }
    
    getTopic(name: string): Topic {
        globalLock.readLock().lock()
        try {
            topic = topics.get(name)
            if topic == null:
                throw TopicNotFoundException(name)
            return topic
        } finally {
            globalLock.readLock().unlock()
        }
    }
    
    // ==================== Subscribe Operations ====================
    
    subscribe(topicName: string, subscriber: Subscriber): boolean {
        topic = getTopic(topicName)
        return topic.subscribe(subscriber)
    }
    
    unsubscribe(topicName: string, subscriberId: string): boolean {
        topic = getTopic(topicName)
        return topic.unsubscribe(subscriberId)
    }
    
    // ==================== Publish Operations ====================
    
    publish(topicName: string, payload: any): PublishResult {
        return publish(topicName, payload, null)
    }
    
    publish(topicName: string, payload: any, metadata: Map): PublishResult {
        if not isRunning.get():
            return PublishResult.failure("TopicManager is shutting down")
        
        // Create message
        message = MessageBuilder()
            .withId(UUID.randomUUID().toString())
            .withTopic(topicName)
            .withPayload(payload)
            .withTimestamp(System.currentTimeMillis())
            .withMetadata(metadata)
            .build()
        
        // Submit to publisher pool
        future = publisherPool.submit(() -> {
            topic = getTopic(topicName)
            return topic.publish(message)
        })
        
        try {
            return future.get(5, TimeUnit.SECONDS)
        } catch TimeoutException e:
            return PublishResult.failure("Publish timeout")
        } catch Exception e:
            return PublishResult.failure(e.message)
        }
    }
    
    // ==================== Batch Publish ====================
    
    publishBatch(topicName: string, messages: List<any>): BatchPublishResult {
        results = new ArrayList()
        successCount = 0
        failureCount = 0
        
        for payload in messages:
            result = publish(topicName, payload)
            results.add(result)
            if result.success:
                successCount++
            else:
                failureCount++
        
        return BatchPublishResult(results, successCount, failureCount)
    }
    
    // ==================== Lifecycle ====================
    
    shutdown(): void {
        isRunning.set(false)
        
        // Shutdown thread pools
        publisherPool.shutdown()
        dispatcherPool.shutdown()
        
        // Wait for completion
        publisherPool.awaitTermination(30, TimeUnit.SECONDS)
        dispatcherPool.awaitTermination(30, TimeUnit.SECONDS)
        
        // Shutdown all topics
        for topic in topics.values():
            topic.shutdown()
        
        topics.clear()
        log.info("TopicManager shutdown complete")
    }
    
    // ==================== Monitoring ====================
    
    getStats(): SystemStats {
        topicStats = new ArrayList()
        for topic in topics.values():
            topicStats.add(topic.getStats())
        
        return SystemStats {
            isRunning: isRunning.get(),
            topicCount: topics.size(),
            activePublisherThreads: publisherPool.getActiveCount(),
            activeDispatcherThreads: dispatcherPool.getActiveCount(),
            topics: topicStats
        }
    }
}
```

---

## Message Dispatcher Implementation

```
class MessageDispatcher {
    private topic: Topic
    private executor: ThreadPoolExecutor
    private pendingAcks: ConcurrentHashMap<string, AckTracker>
    private isRunning: AtomicBoolean
    
    constructor(topic: Topic) {
        this.topic = topic
        this.executor = Executors.newCachedThreadPool()
        this.pendingAcks = new ConcurrentHashMap()
        this.isRunning = new AtomicBoolean(true)
    }
    
    // ==================== Dispatch Logic ====================
    
    signalNewMessage(): void {
        executor.submit(() -> processQueue())
    }
    
    private processQueue(): void {
        while isRunning.get():
            message = topic.messageQueue.poll()
            
            if message == null:
                break  // Queue empty, exit
            
            topic.dispatchMessage(message)
        }
    }
    
    dispatchToSubscriber(message: Message, subscriber: Subscriber): void {
        executor.submit(() -> {
            try {
                success = subscriber.deliver(message)
                
                if success:
                    trackAck(message, subscriber)
                else:
                    log.warn("Failed to deliver message {} to subscriber {}", 
                            message.id, subscriber.id)
                    // Retry logic
                    retryDelivery(message, subscriber)
            } catch Exception e:
                log.error("Error dispatching message {}: {}", message.id, e.message)
        })
    }
    
    // ==================== Acknowledgment Tracking ====================
    
    private trackAck(message: Message, subscriber: Subscriber): void {
        ackKey = message.id + ":" + subscriber.id
        tracker = AckTracker(message, subscriber)
        pendingAcks.put(ackKey, tracker)
        
        // Schedule timeout check
        executor.schedule(() -> {
            checkAckTimeout(ackKey)
        }, 30, TimeUnit.SECONDS)
    }
    
    private checkAckTimeout(ackKey: string): void {
        tracker = pendingAcks.get(ackKey)
        
        if tracker != null and not tracker.isAcknowledged():
            log.warn("Ack timeout for message {} to subscriber {}", 
                    tracker.message.id, tracker.subscriber.id)
            
            // Retry or move to dead letter queue
            handleAckTimeout(tracker)
        }
    }
    
    acknowledge(messageId: string, subscriberId: string): void {
        ackKey = messageId + ":" + subscriberId
        tracker = pendingAcks.get(ackKey)
        
        if tracker != null:
            tracker.acknowledge()
            pendingAcks.remove(ackKey)
    
    // ==================== Retry Logic ====================
    
    private retryDelivery(message: Message, subscriber: Subscriber): void {
        retryCount = message.metadata.get("retryCount", 0)
        
        if retryCount < MAX_RETRIES:
            // Increment retry count
            message.metadata.put("retryCount", retryCount + 1)
            
            // Exponential backoff
            delay = Math.pow(2, retryCount) * 1000  // 1s, 2s, 4s...
            
            executor.schedule(() -> {
                subscriber.deliver(message)
            }, delay, TimeUnit.MILLISECONDS)
        else:
            sendToDeadLetterQueue(message, subscriber)
    }
    
    // ==================== Lifecycle ====================
    
    shutdown(): void {
        isRunning.set(false)
        executor.shutdown()
        executor.awaitTermination(10, TimeUnit.SECONDS)
    }
}

// Acknowledgment Tracker
class AckTracker {
    message: Message
    subscriber: Subscriber
    acknowledged: AtomicBoolean
    timestamp: long
    
    isAcknowledged(): boolean {
        return acknowledged.get()
    }
    
    acknowledge(): void {
        acknowledged.set(true)
    }
}
```

---

## Message Handler Interface

```
interface MessageHandler {
    handle(message: Message): void
}

// Example implementations
class LoggingHandler implements MessageHandler {
    handle(message: Message): void {
        log.info("Received message: topic={}, id={}, payload={}", 
                message.topic, message.id, message.payload)
    }
}

class AsyncHandler implements MessageHandler {
    private delegate: MessageHandler
    private executor: ExecutorService
    
    constructor(delegate: MessageHandler) {
        this.delegate = delegate
        this.executor = Executors.newSingleThreadExecutor()
    }
    
    handle(message: Message): void {
        executor.submit(() -> delegate.handle(message))
    }
}

class BatchHandler implements MessageHandler {
    private batch: List<Message> = new ArrayList()
    private batchSize: int
    private delegate: MessageHandler
    private lock: Object = new Object()
    
    handle(message: Message): void {
        synchronized(lock):
            batch.add(message)
            
            if batch.size() >= batchSize:
                flushBatch()
    }
    
    private flushBatch(): void {
        for msg in batch:
            delegate.handle(msg)
        batch.clear()
    }
}
```

---

## Dead Letter Queue Implementation

```
class DeadLetterQueue {
    private queue: LinkedBlockingQueue<DeadLetterEntry>
    private persistence: DeadLetterPersistence
    private maxCapacity: int
    
    add(message: Message, subscriber: Subscriber, error: Exception): void {
        if queue.size() >= maxCapacity:
            log.error("Dead letter queue full, dropping message: {}", message.id)
            return
        
        entry = DeadLetterEntry {
            message: message,
            subscriberId: subscriber.id,
            error: error.message,
            timestamp: System.currentTimeMillis()
        }
        
        queue.offer(entry)
        persistence.save(entry)
        
        log.warn("Message {} moved to DLQ for subscriber {}", message.id, subscriber.id)
    }
    
    reprocess(entryId: string): boolean {
        entry = persistence.findById(entryId)
        if entry == null:
            return false
        
        // Re-publish to topic
        TopicManager.getInstance().publish(entry.message.topic, entry.message.payload)
        persistence.delete(entryId)
        return true
    }
    
    list(limit: int): List<DeadLetterEntry> {
        return persistence.findAll(limit)
    }
}
```

---

## Usage Example

```
// Initialize the system
topicManager = TopicManager.getInstance()

// Create topics
topicManager.createTopic("orders", TopicConfig.default())
topicManager.createTopic("notifications", TopicConfig.default())

// Create subscribers
orderSubscriber = new Subscriber(
    id: "order-processor-1",
    topic: "orders",
    handler: new OrderHandler(),
    config: SubscriberConfig.default()
)

notificationSubscriber = new Subscriber(
    id: "notification-sender-1",
    topic: "notifications",
    handler: new NotificationHandler(),
    config: SubscriberConfig.default()
)

// Subscribe
topicManager.subscribe("orders", orderSubscriber)
topicManager.subscribe("notifications", notificationSubscriber)

// Publish messages (from multiple threads)
// Thread 1
topicManager.publish("orders", {orderId: "123", items: [...]})

// Thread 2
topicManager.publish("notifications", {type: "email", to: "user@example.com"})

// Batch publish
topicManager.publishBatch("orders", [
    {orderId: "124", items: [...]},
    {orderId: "125", items: [...]},
    {orderId: "126", items: [...]}
])

// Monitor
stats = topicManager.getStats()
log.info("System stats: {}", stats)

// Shutdown
topicManager.shutdown()
```

---

## Thread Safety Summary

| Component | Shared State | Synchronization Mechanism |
|-----------|-------------|---------------------------|
| TopicManager | topics map | ConcurrentHashMap + ReadWriteLock |
| Topic | subscribers list | CopyOnWriteArrayList + ReadWriteLock |
| Topic | messageQueue | LinkedBlockingQueue (internal lock) |
| Subscriber | messageQueue | LinkedBlockingQueue (internal lock) |
| Subscriber | isActive | AtomicBoolean |
| Dispatcher | pendingAcks | ConcurrentHashMap |
| Message | all fields | Immutable (no sync needed) |