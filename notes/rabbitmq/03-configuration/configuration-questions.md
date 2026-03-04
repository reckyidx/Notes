# RabbitMQ Configuration and Performance Interview Questions

## Intermediate Questions

### Q1: Explain the difference between prefetch count and fair dispatch
**Answer:** 
**Prefetch Count** (`basic.qos`) controls how many unacknowledged messages a consumer can have:
- Set to 1: Consumer gets one message at a time (fair dispatch)
- Set to N: Consumer can have N unacknowledged messages (bulk processing)
- Set to 0: Unlimited messages (default, can cause imbalance)

**Fair Dispatch** ensures messages are distributed evenly:
```python
# Without fair dispatch (default)
# Fast consumer might process more messages
channel.basic_consume(queue='work_queue', on_message_callback=callback)

# With fair dispatch
channel.basic_qos(prefetch_count=1)
channel.basic_consume(queue='work_queue', on_message_callback=callback)
```

Trade-offs:
- prefetch=1: Better load balancing, higher latency
- prefetch=N: Better throughput, potential imbalance
- prefetch=0: Maximum throughput, worst load balancing

### Q2: How do you configure publisher confirms in RabbitMQ?
**Answer:**
```python
# Enable confirms on channel
channel.confirm_delivery()

# Synchronous publish (waits for ack/nack)
channel.basic_publish(
    exchange='test',
    routing_key='test',
    body='message'
)
if not channel.wait_for_confirms(timeout=5.0):
    print('Message not confirmed')

# Asynchronous with callback
def ack_callback(delivery_tag, multiple):
    print(f'Message confirmed: {delivery_tag}')

def nack_callback(delivery_tag, multiple):
    print(f'Message rejected: {delivery_tag}')

channel.confirm_delivery(
    ack_callback=ack_callback,
    nack_callback=nack_callback
)
channel.basic_publish(exchange='test', routing_key='test', body='message')

# Wait for all outstanding confirms
channel.wait_for_confirms()
```

Publisher confirms ensure:
- Messages reached broker
- Queue wrote to disk (if persistent)
- Better than transactions (3-5x faster)
- Can handle individual or batch confirms

## Advanced Questions

### Q3: Design a configuration for high-throughput RabbitMQ deployment
**Answer:**

**rabbitmq.conf:**
```ini
# Memory management
vm_memory_high_watermark.relative = 0.6
vm_memory_high_watermark_paging_ratio = 0.75

# Disk configuration
disk_free_limit.relative = 2.0

# Connection settings
heartbeat = 60
connection_max = infinity

# Channel settings
channel_max = 2048

# Performance tuning
heartbeat = 30
frame_max = 131072

# Consumer timeout
consumer_timeout = 3600000

# Collector interval
collect_statistics_interval = 60000

# Erlang VM
RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS="-A 128 -K true"
```

**System-level configuration:**
```bash
# File descriptors
ulimit -n 65536

# Kernel parameters
fs.file-max = 100000
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 8192
net.core.netdev_max_backlog = 5000

# Swap
vm.swappiness = 1
```

**Application-level tuning:**
```python
# Connection pool
connection_params = {
    'host': 'rabbitmq',
    'port': 5672,
    'credentials': pika.PlainCredentials('user', 'pass'),
    'heartbeat': 60,
    'blocked_connection_timeout': 300,
    'connection_attempts': 3,
    'retry_delay': 5
}

# Channel reuse
connection = pika.BlockingConnection(pika.ConnectionParameters(**connection_params))
channel = connection.channel()

# Prefetch based on processing time
if fast_processing:
    channel.basic_qos(prefetch_count=100)
elif medium_processing:
    channel.basic_qos(prefetch_count=20)
else:
    channel.basic_qos(prefetch_count=5)

# Publisher confirms
channel.confirm_delivery()

# Bulk publishing
for i in range(100):
    channel.basic_publish(exchange='', routing_key='queue', body=f'msg{i}')
channel.wait_for_confirms()
```

**Performance optimizations:**
- Use lazy queues for memory-constrained environments
- Increase frame_max for larger messages
- Disable automatic recovery if not needed
- Use channel pool for high-throughput scenarios
- Compress large messages before sending
- Batch acknowledgments when possible

### Q4: Explain RabbitMQ memory management and alarms
**Answer:** RabbitMQ uses two-level memory management:

**Memory Watermarks:**
```ini
vm_memory_high_watermark.relative = 0.6  # 60% of RAM
vm_memory_high_watermark.absolute = 2GB   # Or absolute value
```

**Behavior as memory fills:**

1. **Normal (0-50%):** No restrictions
2. **Flow control (50-60%):** Publishers blocked
3. **Paging (60-75%):** Queue pages to disk
4. **Alarm (>60%):** All publishers blocked

**Memory alarm states:**
```python
# Check alarm state
import requests
api_url = 'http://localhost:15672/api/nodes'
response = requests.get(api_url, auth=('guest', 'guest'))
node = response.json()[0]
print(f'Memory used: {node["mem_used"]} / {node["mem_limit"]}')
print(f'Alarm active: {node["mem_alarm"]}')
```

**Tuning strategies:**

1. **Increase watermark** (accept less safety):
```ini
vm_memory_high_watermark.relative = 0.8
```

2. **Use lazy queues** (keep messages on disk):
```python
args = {'x-queue-mode': 'lazy'}
channel.queue_declare(queue='lazy_queue', arguments=args)
```

3. **Reduce connection overhead**:
```ini
heartbeat = 300
connection_max = 1000
```

4. **Optimize message size**:
- Compress payloads
- Store large data externally (S3, database)
- Use message references instead of embedded data

5. **Monitor and auto-scale**:
```python
def check_memory_health():
    if is_memory_alarm_active():
        trigger_autoscale()
        route_traffic_to_other_cluster()
```

**Critical considerations:**
- Never set watermark > 0.8 (risk of OOM)
- Monitor memory usage continuously
- Have horizontal scaling strategy
- Test alarm scenarios in staging
- Consider separate clusters for different workloads

### Q5: How do you optimize RabbitMQ for large message handling?
**Answer:**

**Queue configuration:**
```python
# Lazy queues - keep messages on disk
args = {'x-queue-mode': 'lazy'}
channel.queue_declare(queue='large_messages', durable=True, arguments=args)

# Quorum queues - better for large messages
args = {'x-queue-type': 'quorum'}
channel.queue_declare(queue='large_quorum', durable=True, arguments=args)

# Max length to prevent unbounded growth
args = {
    'x-max-length': 100000,
    'x-overflow': 'drop-head'
}
channel.queue_declare(queue='bounded_queue', arguments=args)
```

**Message optimization:**
```python
import zlib
import json

# Compress large payloads
def publish_large_message(exchange, routing_key, data):
    # Compress if large
    data_json = json.dumps(data)
    if len(data_json) > 10000:  # > 10KB
        body = zlib.compress(data_json.encode())
        headers = {'compressed': 'true'}
    else:
        body = data_json.encode()
        headers = {'compressed': 'false'}
    
    channel.basic_publish(
        exchange=exchange,
        routing_key=routing_key,
        body=body,
        headers=headers
    )

def consume_large_message(ch, method, properties, body):
    data = body
    if properties.headers.get('compressed') == 'true':
        data = zlib.decompress(body)
    process_data(json.loads(data.decode()))
```

**Alternative patterns:**
```python
# Store large data externally, send reference
def publish_with_reference(exchange, routing_key, large_data):
    # Store in S3/Database
    storage_key = store_in_s3(large_data)
    
    # Send reference
    message = {
        'type': 'large_data',
        'storage_key': storage_key,
        'size': len(large_data),
        'timestamp': time.time()
    }
    
    channel.basic_publish(
        exchange=exchange,
        routing_key=routing_key,
        body=json.dumps(message)
    )

def consume_with_reference(ch, method, properties, body):
    message = json.loads(body.decode())
    large_data = retrieve_from_s3(message['storage_key'])
    process_data(large_data)
```

**Configuration tuning:**
```ini
# Increase frame size for large messages
frame_max = 1048576  # 1MB

# Increase heartbeat for slow processing
heartbeat = 300

# Disable automatic recovery for large operations
connection.automatic_recovery_enabled = false
```

**Performance comparison:**

| Message Size | Regular Queue | Lazy Queue | Quorum Queue |
|--------------|---------------|------------|--------------|
| < 1KB | 50K msg/s | 10K msg/s | 40K msg/s |
| 1-10KB | 20K msg/s | 8K msg/s | 15K msg/s |
| 10-100KB | 2K msg/s | 5K msg/s | 8K msg/s |
| > 100KB | 200 msg/s | 1K msg/s | 2K msg/s |

**Best practices:**
- Avoid messages > 10MB in queue
- Use lazy queues for messages > 100KB
- Consider external storage for > 1MB
- Implement chunking for very large payloads
- Monitor memory and disk usage
- Set reasonable message size limits
- Use compression for text-heavy messages