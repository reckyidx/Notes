# RabbitMQ Advanced Features Interview Questions

## Intermediate Questions

### Q1: What are RabbitMQ plugins and how do you manage them?
**Answer:**

**List Available Plugins:**
```bash
rabbitmq-plugins list
```

**Enable Plugins:**
```bash
# Enable management plugin
rabbitmq-plugins enable rabbitmq_management

# Enable federation plugin
rabbitmq-plugins enable rabbitmq_federation

# Enable shovel plugin
rabbitmq-plugins enable rabbitmq_shovel

# Enable multiple plugins
rabbitmq-plugins enable rabbitmq_management rabbitmq_federation rabbitmq_shovel
```

**Disable Plugins:**
```bash
rabbitmq-plugins disable rabbitmq_federation
```

**Common Plugins:**
- **rabbitmq_management**: Web UI and HTTP API
- **rabbitmq_federation**: Link clusters across data centers
- **rabbitmq_shovel**: Move messages between brokers
- **rabbitmq_consistent_hash_exchange**: Consistent hashing routing
- **rabbitmq_delayed_message_exchange**: Delayed message delivery
- **rabbitmq_mqtt**: MQTT protocol support
- **rabbitmq_stomp**: STOMP protocol support
- **rabbitmq_web_stomp**: STOMP over WebSocket

### Q2: How do you use the Federation plugin to connect multiple RabbitMQ clusters?
**Answer:**

**Federation Setup:**
```bash
# Enable federation plugin
rabbitmq-plugins enable rabbitmq_federation
rabbitmq-plugins enable rabbitmq_federation_management

# Define upstream cluster (on consumer cluster)
rabbitmqctl set_parameter federation-upstream production-cluster \
'{"uri":"amqp://user:pass@production.example.com","trust-user-id":"false"}'

# Create federation policy
rabbitmqctl set_policy federation-policy "^fed\." \
'{"federation-upstream-set":"all"}'
```

**Federation Link Configuration:**
```python
# Via HTTP API
import requests

auth = ('admin', 'password')

# Define upstream
upstream = {
    "uri": "amqp://user:pass@production.example.com",
    "trust-user-id": False
}

requests.put(
    'http://localhost:15672/api/parameters/federation-upstream/%2f/my-upstream',
    auth=auth,
    json=upstream
)

# Define upstream set
upstream_set = {
    "upstream": "my-upstream"
}

requests.put(
    'http://localhost:15672/api/policies/%2f/federation-policy',
    auth=auth,
    json={
        "pattern": "^fed\\.",
        "definition": {
            "federation-upstream-set": "my-upstream"
        },
        "priority": 1,
        "apply-to": "queues"
    }
)
```

**Use Cases:**
- Geo-distributed messaging
- Data center replication
- Disaster recovery
- Workload distribution across clusters

## Advanced Questions

### Q3: Implement delayed message delivery using RabbitMQ
**Answer:**

**Using RabbitMQ Delayed Message Plugin:**
```bash
# Install plugin
rabbitmq-plugins enable rabbitmq_delayed_message_exchange
```

**Producer Example:**
```python
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
channel = connection.channel()

# Declare delayed exchange
args = {'x-delayed-type': 'direct'}
channel.exchange_declare(
    exchange='delayed_exchange',
    exchange_type='x-delayed-message',
    arguments=args
)

channel.queue_declare(queue='target_queue')
channel.queue_bind(exchange='delayed_exchange', queue='target_queue', routing_key='')

# Publish with delay
message = "This message will be delayed by 10 seconds"
headers = {'x-delay': 10000}  # Delay in milliseconds

channel.basic_publish(
    exchange='delayed_exchange',
    routing_key='',
    body=message,
    properties=pika.BasicProperties(headers=headers)
)

connection.close()
```

**Alternative: TTL + Dead Letter Exchange (No Plugin Required):**
```python
# Create delay exchange and queue
channel.exchange_declare(exchange='delay_exchange', exchange_type='direct')

# Create target queue
channel.queue_declare(queue='target_queue')
channel.queue_bind(exchange='delay_exchange', queue='target_queue', routing_key='')

# Create dead letter exchange
channel.exchange_declare(exchange='dlx', exchange_type='direct')

# Create delay queue with TTL
args = {
    'x-message-ttl': 10000,  # 10 seconds
    'x-dead-letter-exchange': 'delay_exchange',
    'x-dead-letter-routing-key': ''
}
channel.queue_declare(queue='delay_queue', durable=True, arguments=args)
channel.queue_bind(exchange='dlx', queue='delay_queue', routing_key='')

# Publish to delay queue
channel.basic_publish(
    exchange='dlx',
    routing_key='',
    body='Delayed message'
)
```

### Q4: How do you implement message compression and large payload handling?
**Answer:**

**Compression Implementation:**
```python
import pika
import gzip
import pickle
import zlib

class CompressedPublisher:
    def __init__(self, host='localhost'):
        self.connection = pika.BlockingConnection(
            pika.ConnectionParameters(host=host)
        )
        self.channel = self.connection.channel()
    
    def publish_compressed(self, exchange, routing_key, data, compression='gzip'):
        """Publish with compression"""
        # Serialize data
        serialized = pickle.dumps(data)
        
        # Choose compression method
        if compression == 'gzip':
            compressed = gzip.compress(serialized)
            method = 'gzip'
        elif compression == 'zlib':
            compressed = zlib.compress(serialized)
            method = 'zlib'
        else:
            compressed = serialized
            method = 'none'
        
        # Calculate compression ratio
        original_size = len(serialized)
        compressed_size = len(compressed)
        ratio = (1 - compressed_size / original_size) * 100
        
        # Add headers
        headers = {
            'compression': method,
            'original_size': original_size,
            'compressed_size': compressed_size,
            'compression_ratio': f'{ratio:.2f}%'
        }
        
        # Publish
        self.channel.basic_publish(
            exchange=exchange,
            routing_key=routing_key,
            body=compressed,
            properties=pika.BasicProperties(headers=headers)
        )
        
        return compressed_size

class CompressedConsumer:
    def __init__(self, host='localhost'):
        self.connection = pika.BlockingConnection(
            pika.ConnectionParameters(host=host)
        )
        self.channel = self.connection.channel()
    
    def consume_compressed(self, queue, callback):
        """Consume and decompress messages"""
        def wrapper(ch, method, properties, body):
            try:
                data = body
                headers = properties.headers or {}
                
                # Decompress if needed
                if headers.get('compression') == 'gzip':
                    data = gzip.decompress(body)
                elif headers.get('compression') == 'zlib':
                    data = zlib.decompress(body)
                
                # Deserialize
                deserialized = pickle.loads(data)
                
                # Call callback
                callback(ch, method, properties, deserialized)
                
            except Exception as e:
                print(f"Error decompressing: {e}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        
        self.channel.basic_consume(queue=queue, on_message_callback=wrapper)
        self.channel.start_consuming()
```

**Chunked Message Pattern for Very Large Payloads:**
```python
import json
import uuid
from threading import Event

class ChunkedMessageManager:
    def __init__(self, max_chunk_size=1024 * 1024):  # 1MB chunks
        self.max_chunk_size = max_chunk_size
        self.message_parts = {}
        self.message_events = {}
    
    def publish_chunked(self, channel, exchange, routing_key, data):
        """Split large data into chunks"""
        message_id = str(uuid.uuid4())
        serialized = json.dumps(data).encode()
        total_size = len(serialized)
        total_chunks = (total_size // self.max_chunk_size) + 1
        
        headers = {
            'message_id': message_id,
            'total_chunks': total_chunks,
            'total_size': total_size,
            'chunked': 'true'
        }
        
        # Send chunks
        for i in range(total_chunks):
            start = i * self.max_chunk_size
            end = start + self.max_chunk_size
            chunk_data = serialized[start:end]
            
            chunk_headers = headers.copy()
            chunk_headers['chunk_index'] = i
            chunk_headers['chunk_size'] = len(chunk_data)
            
            channel.basic_publish(
                exchange=exchange,
                routing_key=routing_key,
                body=chunk_data,
                properties=pika.BasicProperties(headers=chunk_headers)
            )
        
        return message_id
    
    def handle_chunk(self, channel, method, properties, body):
        """Process incoming chunk"""
        headers = properties.headers
        
        if not headers.get('chunked'):
            return body  # Not chunked
        
        message_id = headers['message_id']
        chunk_index = headers['chunk_index']
        total_chunks = headers['total_chunks']
        
        # Initialize storage
        if message_id not in self.message_parts:
            self.message_parts[message_id] = [None] * total_chunks
            self.message_events[message_id] = Event()
        
        # Store chunk
        self.message_parts[message_id][chunk_index] = body
        
        # Check if complete
        if all(chunk is not None for chunk in self.message_parts[message_id]):
            # Reassemble message
            complete_data = b''.join(self.message_parts[message_id])
            del self.message_parts[message_id]
            event = self.message_events.pop(message_id)
            event.set()
            
            return json.loads(complete_data.decode())
        
        return None
    
    def wait_for_message(self, message_id, timeout=30):
        """Wait for all chunks to arrive"""
        event = self.message_events.get(message_id)
        if event:
            return event.wait(timeout=timeout)
        return False
```

### Q5: How do you implement exactly-once semantics in RabbitMQ?
**Answer:**

**Understanding Delivery Guarantees:**
- **At-most-once**: Fire and forget (no ack)
- **At-least-once**: Ack after processing (default RabbitMQ)
- **Exactly-once**: Requires idempotency + deduplication

**Exactly-Once Implementation:**
```python
import redis
import hashlib
import json

class ExactlyOnceProcessor:
    def __init__(self, rabbitmq_host, redis_host):
        # RabbitMQ connection
        self.connection = pika.BlockingConnection(
            pika.ConnectionParameters(host=rabbitmq_host)
        )
        self.channel = self.connection.channel()
        
        # Redis for deduplication
        self.redis = redis.Redis(host=redis_host, port=6379, db=0)
        
        # Configure channel
        self.channel.basic_qos(prefetch_count=1)
    
    def generate_message_id(self, body):
        """Generate unique ID from message content"""
        return hashlib.sha256(body).hexdigest()
    
    def process_message(self, ch, method, properties, body):
        """Process with exactly-once semantics"""
        try:
            # Generate message ID
            message_id = self.generate_message_id(body)
            
            # Check if already processed
            if self.redis.exists(f"processed:{message_id}"):
                print(f"Message {message_id} already processed, skipping")
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return
            
            # Process message (idempotent operation)
            result = self.idempotent_process(body)
            
            # Mark as processed (with TTL)
            self.redis.setex(f"processed:{message_id}", 86400, "1")  # 24 hour TTL
            
            # Store result if needed
            if result:
                self.redis.set(f"result:{message_id}", json.dumps(result), ex=86400)
            
            # Acknowledge
            ch.basic_ack(delivery_tag=method.delivery_tag)
            print(f"Processed message {message_id}")
            
        except Exception as e:
            print(f"Error processing message: {e}")
            # Nack with requeue for retry
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    def idempotent_process(self, body):
        """Implement idempotent business logic"""
        data = json.loads(body.decode())
        
        # Example: Update database record
        # Use upsert operations, unique constraints, or conditional updates
        
        # Example with unique constraint
        record_id = data['id']
        
        # Check if record exists and version matches
        existing = self.get_record(record_id)
        
        if existing:
            # Only update if version is newer
            if data['version'] > existing['version']:
                return self.update_record(data)
            else:
                return existing  # Return existing data
        else:
            return self.create_record(data)
```

**Distributed Transaction with Outbox Pattern:**
```python
import pika
import psycopg2
from psycopg2 import sql

class OutboxProcessor:
    def __init__(self, db_params, rabbitmq_host):
        # Database connection
        self.db_conn = psycopg2.connect(**db_params)
        self.db_cursor = self.db_conn.cursor()
        
        # RabbitMQ connection
        self.connection = pika.BlockingConnection(
            pika.ConnectionParameters(host=rabbitmq_host)
        )
        self.channel = self.connection.channel()
    
    def execute_transaction_with_event(self, operation, event_data):
        """Execute database operation and create outbox entry"""
        try:
            # Start transaction
            self.db_conn.autocommit = False
            
            # Execute business operation
            result = operation()
            
            # Create outbox entry
            insert_query = sql.SQL("""
                INSERT INTO outbox (event_type, payload, status, created_at)
                VALUES (%s, %s, %s, NOW())
                RETURNING id
            """)
            self.db_cursor.execute(insert_query, (
                event_data['type'],
                json.dumps(event_data['payload']),
                'pending'
            ))
            outbox_id = self.db_cursor.fetchone()[0]
            
            # Commit transaction
            self.db_conn.commit()
            
            # Publish event after commit
            self.publish_event(outbox_id, event_data)
            
            return result
            
        except Exception as e:
            self.db_conn.rollback()
            raise e
    
    def publish_event(self, outbox_id, event_data):
        """Publish event to RabbitMQ"""
        try:
            self.channel.basic_publish(
                exchange='events',
                routing_key=event_data['type'],
                body=json.dumps(event_data['payload']),
                properties=pika.BasicProperties(
                    message_id=str(outbox_id),
                    delivery_mode=2  # Persistent
                )
            )
            
            # Update outbox status
            update_query = sql.SQL("""
                UPDATE outbox SET status = %s, published_at = NOW()
                WHERE id = %s
            """)
            self.db_cursor.execute(update_query, ('published', outbox_id))
            self.db_conn.commit()
            
        except Exception as e:
            print(f"Failed to publish event {outbox_id}: {e}")
            raise
    
    def process_outbox(self):
        """Process failed/pending outbox entries"""
        select_query = sql.SQL("""
            SELECT id, event_type, payload 
            FROM outbox 
            WHERE status = 'pending' OR status = 'failed'
            ORDER BY created_at ASC
            LIMIT 100
        """)
        self.db_cursor.execute(select_query)
        
        for row in self.db_cursor.fetchall():
            outbox_id, event_type, payload = row
            
            try:
                event_data = {'type': event_type, 'payload': json.loads(payload)}
                self.publish_event(outbox_id, event_data)
                
            except Exception as e:
                print(f"Failed to republish {outbox_id}: {e}")
                
                update_query = sql.SQL("""
                    UPDATE outbox 
                    SET status = %s, error_message = %s, retry_count = retry_count + 1
                    WHERE id = %s
                """)
                self.db_cursor.execute(update_query, (
                    'failed',
                    str(e),
                    outbox_id
                ))
                self.db_conn.commit()
```

**Consumer-Side Exactly-Once:**
```python
class ExactlyOnceConsumer:
    def __init__(self, rabbitmq_host, redis_host):
        self.connection = pika.BlockingConnection(
            pika.ConnectionParameters(host=rabbitmq_host)
        )
        self.channel = self.connection.channel()
        self.redis = redis.Redis(host=redis_host, port=6379, db=0)
        
        # Enable publisher confirms
        self.channel.confirm_delivery()
    
    def consume_exactly_once(self, queue, callback):
        def wrapper(ch, method, properties, body):
            try:
                # Get message ID
                message_id = properties.message_id or self.generate_id(body)
                
                # Check deduplication
                dedup_key = f"consumed:{queue}:{message_id}"
                
                if self.redis.exists(dedup_key):
                    print(f"Message {message_id} already consumed")
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    return
                
                # Process in transaction
                result = callback(body)
                
                if result['success']:
                    # Mark as consumed
                    self.redis.setex(dedup_key, 86400, "1")
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                else:
                    # Failed, requeue with backoff
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
                    
            except Exception as e:
                print(f"Error: {e}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
        
        self.channel.basic_consume(queue=queue, on_message_callback=wrapper)
        self.channel.start_consuming()