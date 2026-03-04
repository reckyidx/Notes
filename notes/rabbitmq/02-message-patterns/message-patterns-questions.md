# RabbitMQ Message Patterns Interview Questions

## Intermediate Questions

### Q1: Implement a work queue pattern (competing consumers) in RabbitMQ
**Answer:**
```python
# Producer
channel.queue_declare(queue='work_queue', durable=True)
channel.basic_publish(
    exchange='',
    routing_key='work_queue',
    body=message,
    properties=pika.BasicProperties(delivery_mode=2)
)

# Consumer with fair dispatch
channel.basic_qos(prefetch_count=1)
channel.basic_consume(queue='work_queue', on_message_callback=callback)
```

Key points:
- Use `prefetch_count=1` for fair dispatch (prevents fast consumers from getting more messages)
- Durable queue ensures tasks survive restarts
- Persistent messages prevent task loss
- Multiple consumers compete for messages automatically

### Q2: How would you implement publish-subscribe pattern using RabbitMQ?
**Answer:**
```python
# Producer
channel.exchange_declare(exchange='logs', exchange_type='fanout')
channel.basic_publish(exchange='logs', routing_key='', body=message)

# Consumers
result = channel.queue_declare(queue='', exclusive=True)
queue_name = result.method.queue
channel.queue_bind(exchange='logs', queue=queue_name)
channel.basic_consume(queue=queue_name, on_message_callback=callback)
```

Key points:
- Fanout exchange broadcasts to all bound queues
- Consumers create exclusive temporary queues
- Each consumer gets its own queue bound to the exchange
- Suitable for logging, notifications, event broadcasting

## Advanced Questions

### Q3: Design a routing system for a microservices architecture using topic exchanges
**Answer:**
```python
# Define routing key pattern: service.action.entity
# Examples: "user.created", "order.updated.123", "payment.failed"

channel.exchange_declare(exchange='events', exchange_type='topic')

# User service subscribes to user events
channel.queue_bind(exchange='events', queue='user_queue', routing_key='user.*')

# Order service subscribes to order updates
channel.queue_bind(exchange='events', queue='order_queue', routing_key='order.updated.*')

# Audit service subscribes to all events
channel.queue_bind(exchange='events', queue='audit_queue', routing_key='#')

# Notification service subscribes to critical events
channel.queue_bind(exchange='events', queue='notification_queue', routing_key='*.failed')
channel.queue_bind(exchange='events', queue='notification_queue', routing_key='*.created')
```

Routing patterns:
- `user.*`: Matches user.created, user.updated
- `order.updated.#`: Matches order.updated.123, order.updated.456.status
- `*.failed`: Matches user.failed, payment.failed
- `#`: Matches all routing keys

Benefits:
- Flexible routing without code changes
- Services can subscribe to specific event types
- Easy to add new subscribers
- Decoupled architecture

### Q4: Explain RPC (Remote Procedure Call) pattern in RabbitMQ and implement it
**Answer:**
```python
# RPC Server
def on_request(ch, method, props, body):
    response = process_request(body)
    ch.basic_publish(
        exchange='',
        routing_key=props.reply_to,
        properties=pika.BasicProperties(correlation_id=props.correlation_id),
        body=response
    )
    ch.basic_ack(delivery_tag=method.delivery_tag)

channel.basic_consume(queue='rpc_queue', on_message_callback=on_request)

# RPC Client
class RpcClient:
    def __init__(self):
        self.connection = pika.BlockingConnection()
        self.channel = self.connection.channel()
        result = self.channel.queue_declare(queue='', exclusive=True)
        self.callback_queue = result.method.queue
        self.channel.basic_consume(
            queue=self.callback_queue,
            on_message_callback=self.on_response
        )
        self.response = None
        self.corr_id = None

    def call(self, n):
        self.response = None
        self.corr_id = str(uuid.uuid4())
        self.channel.basic_publish(
            exchange='',
            routing_key='rpc_queue',
            properties=pika.BasicProperties(
                reply_to=self.callback_queue,
                correlation_id=self.corr_id
            ),
            body=str(n)
        )
        while self.response is None:
            self.connection.process_data_events()
        return self.response

    def on_response(self, ch, method, props, body):
        if self.corr_id == props.correlation_id:
            self.response = body
```

Key considerations:
- Use correlation_id to match requests with responses
- Each client creates a temporary callback queue
- Reply-to property specifies where to send response
- Synchronous wait pattern (can be async with futures)
- Timeout handling is critical
- Consider using multiple RPC servers for load balancing

Trade-offs:
- Simpler than REST for internal service communication
- More efficient than HTTP for high-frequency calls
- Built-in load balancing and fault tolerance
- No built-in circuit breaker (need to implement)
- Harder to debug than HTTP

### Q5: Implement a dead letter queue pattern for handling failed messages
**Answer:**
```python
# Declare dead letter exchange
channel.exchange_declare(exchange='dlx', exchange_type='direct')

# Declare dead letter queue
channel.queue_declare(queue='dlq', durable=True)
channel.queue_bind(exchange='dlx', queue='dlq', routing_key='failed')

# Declare main queue with DLX
args = {
    'x-dead-letter-exchange': 'dlx',
    'x-dead-letter-routing-key': 'failed',
    'x-message-ttl': 3600000  # 1 hour TTL
}
channel.queue_declare(queue='main_queue', durable=True, arguments=args)

# Consumer that rejects messages
def callback(ch, method, properties, body):
    try:
        process_message(body)
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except TemporaryError:
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    except PermanentError:
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

# DLX consumer for monitoring and manual intervention
channel.basic_consume(queue='dlq', on_message_callback=dlq_callback)
```

Use cases:
- Retry logic with exponential backoff
- Message validation failures
- Processing errors that need investigation
- Compliance and audit trails

Advanced patterns:
- **Retry queue**: Multiple DLX levels with increasing delays
- **Poison message detection**: Count rejects and route to quarantine
- **Automatic replay**: Worker that republishes from DLQ after analysis
- **Delay queue**: Use TTL + DLX for scheduled message delivery

Dead letter headers added:
- `x-death`: Array of death information (count, reason, time)
- `x-first-death-reason`: Original reason for death
- `x-first-death-queue`: Original queue