# RabbitMQ Best Practices and Design Patterns Interview Questions

## Intermediate Questions

### Q1: What are the best practices for naming conventions in RabbitMQ?
**Answer:**

**Queue Naming:**
```python
# Use descriptive, hierarchical names
channel.queue_declare(queue='orders.created')
channel.queue_declare(queue='orders.updated')
channel.queue_declare(queue='notifications.email')

# Use prefixes for queue types
channel.queue_declare(queue='temp.session.active')
channel.queue_declare(queue='dlq.orders.failed')
channel.queue_declare(queue='retry.orders')

# Use consistent separators (dot notation recommended)
# Good: 'orders.pending', 'user.events'
# Bad: 'orders-pending', 'UserEvents'
```

**Exchange Naming:**
```python
# Domain-based naming
channel.exchange_declare(exchange='orders.events', exchange_type='topic')
channel.exchange_declare(exchange='user.events', exchange_type='topic')
channel.exchange_declare(exchange='notifications', exchange_type='fanout')

# Type suffix (optional)
channel.exchange_declare(exchange='events.direct', exchange_type='direct')
channel.exchange_declare(exchange='logs.fanout', exchange_type='fanout')
```

**Routing Key Patterns:**
```python
# Hierarchical routing keys
# Pattern: <domain>.<entity>.<action>
channel.basic_publish(exchange='events', routing_key='order.created')
channel.basic_publish(exchange='events', routing_key='user.updated')
channel.basic_publish(exchange='events', routing_key='payment.succeeded')

# Environment prefix for multi-environment
channel.basic_publish(exchange='events', routing_key='prod.order.created')
channel.basic_publish(exchange='events', routing_key='staging.order.created')
```

### Q2: How do you design queues for different use cases?
**Answer:**

**Work Queue (Task Queue):**
```python
# Durable, persistent messages
channel.queue_declare(queue='tasks.processing', durable=True)
channel.basic_publish(
    exchange='',
    routing_key='tasks.processing',
    body=task,
    properties=pika.BasicProperties(delivery_mode=2)
)

# Fair dispatch with prefetch
channel.basic_qos(prefetch_count=1)
```

**Event Queue (Fire and Forget):**
```python
# Non-durable, transient messages
channel.queue_declare(queue='events.logging', auto_delete=True)
channel.basic_publish(
    exchange='',
    routing_key='events.logging',
    body=event
)
```

**Critical Data Queue:**
```python
# Quorum queue for strong consistency
args = {'x-queue-type': 'quorum', 'x-quorum-initial-group-size': 3}
channel.queue_declare(queue='transactions.critical', durable=True, arguments=args)
```

**High Throughput Queue:**
```python
# Lazy queue for memory efficiency
args = {'x-queue-mode': 'lazy'}
channel.queue_declare(queue='high.volume', durable=True, arguments=args)
```

## Advanced Questions

### Q3: Design a comprehensive error handling and retry strategy for RabbitMQ
**Answer:**

**Multi-Level Retry Strategy:**
```python
import time
import json
from datetime import datetime

class RetryHandler:
    def __init__(self, channel):
        self.channel = channel
        self._setup_retry_queues()
    
    def _setup_retry_queues(self):
        """Setup retry queues with exponential backoff"""
        retry_delays = [1000, 5000, 15000, 30000, 60000]  # ms
        
        for delay in retry_delays:
            queue_name = f'retry.{delay}ms'
            args = {
                'x-message-ttl': delay,
                'x-dead-letter-exchange': 'retry',
                'x-dead-letter-routing-key': str(delay)
            }
            self.channel.queue_declare(queue=queue_name, durable=True, arguments=args)
        
        self.channel.queue_declare(queue='deadletter.final', durable=True)
    
    def handle_processing_failure(self, ch, method, properties, body, error):
        """Handle failed message with retry logic"""
        message = json.loads(body.decode())
        retry_count = message.get('retry_count', 0)
        max_retries = message.get('max_retries', 5)
        
        if retry_count < max_retries:
            retry_delays = [1000, 5000, 15000, 30000, 60000]
            delay = retry_delays[min(retry_count, len(retry_delays) - 1)]
            
            message['retry_count'] += 1
            message['last_attempt'] = datetime.now().isoformat()
            
            ch.basic_publish(exchange='retry', routing_key=str(delay), body=json.dumps(message))
            ch.basic_ack(delivery_tag=method.delivery_tag)
        else:
            ch.basic_publish(exchange='deadletter', routing_key='final', body=json.dumps(message))
            ch.basic_ack(delivery_tag=method.delivery_tag)
```

### Q4: What are the best practices for RabbitMQ in microservices architecture?
**Answer:**

**1. Event-Driven Communication:**
```python
# Use topic exchanges for service communication
channel.exchange_declare(exchange='domain.events', exchange_type='topic')

# Service-specific routing keys
channel.basic_publish(exchange='domain.events', routing_key='user.created', body=event)
channel.basic_publish(exchange='domain.events', routing_key='order.paid', body=event)
```

**2. Schema Validation:**
```python
import jsonschema

# Validate message schema
EVENT_SCHEMA = {
    "type": "object",
    "properties": {
        "event_id": {"type": "string"},
        "event_type": {"type": "string"},
        "timestamp": {"type": "string"},
        "data": {"type": "object"}
    },
    "required": ["event_id", "event_type", "timestamp", "data"]
}

def validate_message(message):
    try:
        jsonschema.validate(message, EVENT_SCHEMA)
        return True
    except jsonschema.ValidationError as e:
        print(f"Invalid message: {e}")
        return False
```

**3. Idempotent Consumers:**
```python
def process_order(ch, method, properties, body):
    order = json.loads(body.decode())
    order_id = order['order_id']
    
    # Check if already processed
    if is_order_processed(order_id):
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return
    
    # Process order
    result = process(order)
    
    # Mark as processed
    mark_order_processed(order_id, result)
    ch.basic_ack(delivery_tag=method.delivery_tag)
```

**4. Message Versioning:**
```python
# Include version in message headers
properties = pika.BasicProperties(
    headers={
        'message_version': '2.0',
        'producer_service': 'order-service'
    }
)

channel.basic_publish(exchange='events', routing_key='order.created', body=body, properties=properties)
```

### Q5: How do you implement saga pattern with RabbitMQ for distributed transactions?
**Answer:**

**Saga Orchestration Implementation:**
```python
class SagaOrchestrator:
    def __init__(self, channel):
        self.channel = channel
        self.saga_state = {}
        
        # Setup exchanges
        self.channel.exchange_declare(exchange='saga.commands', exchange_type='direct')
        self.channel.exchange_declare(exchange='saga.events', exchange_type='topic')
    
    def start_saga(self, saga_id, saga_type, initial_data):
        """Start a new saga"""
        self.saga_state[saga_id] = {
            'type': saga_type,
            'status': 'started',
            'current_step': 0,
            'data': initial_data,
            'history': []
        }
        
        self._execute_next_step(saga_id)
    
    def _execute_next_step(self, saga_id):
        """Execute next step in saga"""
        saga = self.saga_state[saga_id]
        steps = self._get_saga_steps(saga['type'])
        
        if saga['current_step'] < len(steps):
            step = steps[saga['current_step']]
            
            command = {
                'saga_id': saga_id,
                'step': step['name'],
                'action': step['action'],
                'data': saga['data'],
                'compensating': step['compensating']
            }
            
            self.channel.basic_publish(
                exchange='saga.commands',
                routing_key=step['service'],
                body=json.dumps(command)
            )
        else:
            self._complete_saga(saga_id, success=True)
    
    def handle_step_success(self, saga_id, result):
        """Handle successful step completion"""
        saga = self.saga_state[saga_id]
        saga['history'].append({
            'step': saga['current_step'],
            'status': 'success',
            'result': result
        })
        
        saga['current_step'] += 1
        self._execute_next_step(saga_id)
    
    def handle_step_failure(self, saga_id, error):
        """Handle failed step - start compensation"""
        saga = self.saga_state[saga_id]
        saga['status'] = 'compensating'
        
        # Compensate previous steps in reverse order
        for i in range(saga['current_step'] - 1, -1, -1):
            step_info = saga['history'][i]
            
            compensating_command = {
                'saga_id': saga_id,
                'step': step_info['step'],
                'action': step_info['compensating'],
                'original_data': step_info['result']
            }
            
            self.channel.basic_publish(
                exchange='saga.commands',
                routing_key=step_info['step'],
                body=json.dumps(compensating_command)
            )
    
    def _complete_saga(self, saga_id, success):
        """Mark saga as complete"""
        self.saga_state[saga_id]['status'] = 'completed' if success else 'failed'
        # Publish saga completion event
        event = {
            'saga_id': saga_id,
            'status': 'completed' if success else 'failed'
        }
        self.channel.basic_publish(
            exchange='saga.events',
            routing_key='saga.completed',
            body=json.dumps(event)
        )

# Example: Order Processing Saga
def get_order_saga_steps():
    return [
        {
            'name': 'reserve_inventory',
            'service': 'inventory-service',
            'action': 'reserve',
            'compensating': 'release'
        },
        {
            'name': 'process_payment',
            'service': 'payment-service',
            'action': 'charge',
            'compensating': 'refund'
        },
        {
            'name': 'confirm_order',
            'service': 'order-service',
            'action': 'confirm',
            'compensating': 'cancel'
        }
    ]
```

**Key Best Practices Summary:**

1. **Naming Conventions:**
   - Use hierarchical dot notation
   - Include queue type prefixes (dlq, retry, temp)
   - Use domain-driven naming

2. **Queue Design:**
   - Use quorum queues for critical data
   - Use lazy queues for high volume
   - Set appropriate prefetch counts
   - Use durable queues with persistent messages for reliability

3. **Error Handling:**
   - Implement multi-level retry with exponential backoff
   - Use dead letter queues for failed messages
   - Classify errors (transient, non-transient, poison pill)
   - Monitor and alert on DLQ growth

4. **Monitoring:**
   - Track queue depths and consumer lag
   - Monitor message rates
   - Alert on resource limits
   - Use comprehensive logging

5. **Performance:**
   - Use publisher confirms over transactions
   - Optimize message sizes
   - Implement connection pooling
   - Use compression for large payloads

6. **Security:**
   - Enable TLS for all connections
   - Use least-privilege permissions
   - Implement certificate-based auth
   - Regular security audits

7. **High Availability:**
   - Use clustering with quorum queues
   - Configure proper partition handling
   - Implement federation for multi-DC
   - Regular backup and restore testing