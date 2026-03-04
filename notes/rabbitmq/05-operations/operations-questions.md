# RabbitMQ Operations and Monitoring Interview Questions

## Intermediate Questions

### Q1: How do you monitor RabbitMQ performance and health?
**Answer:** Use multiple monitoring approaches:

**Management UI (HTTP API):**
```bash
# Enable management plugin
rabbitmq-plugins enable rabbitmq_management

# Access at http://localhost:15672
# Default credentials: guest/guest
```

**CLI Monitoring:**
```bash
# Cluster status
rabbitmqctl cluster_status

# List queues
rabbitmqctl list_queues name messages consumers

# List connections
rabbitmqctl list_connections

# Memory usage
rabbitmqctl status

# Environment details
rabbitmqctl environment
```

**Key Metrics to Monitor:**
```python
import requests
from datetime import datetime

def get_rabbitmq_metrics():
    base_url = 'http://localhost:15672/api'
    auth = ('admin', 'password')
    
    # Node metrics
    nodes = requests.get(f'{base_url}/nodes', auth=auth).json()
    for node in nodes:
        print(f"Memory: {node['mem_used'] / 1024 / 1024:.2f} MB")
        print(f"Disk free: {node['disk_free'] / 1024 / 1024 / 1024:.2f} GB")
        print(f"FD used: {node['fd_used']}/{node['fd_total']}")
        print(f"Sockets used: {node['sockets_used']}/{node['sockets_total']}")
        print(f"Process count: {node['proc_used']}/{node['proc_total']}")
        print(f"Running: {node['running']}")
    
    # Queue metrics
    queues = requests.get(f'{base_url}/queues', auth=auth).json()
    for queue in queues:
        print(f"Queue: {queue['name']}")
        print(f"  Messages: {queue['messages']}")
        print(f"  Messages ready: {queue['messages_ready']}")
        print(f"  Messages unacknowledged: {queue['messages_unacknowledged']}")
        print(f"  Consumers: {queue['consumers']}")
        print(f"  Rate: {queue.get('message_stats', {}).get('publish_details', {}).get('rate', 0)} msg/s")
```

### Q2: How do you handle RabbitMQ node failures and recovery?
**Answer:**

**Graceful Shutdown:**
```bash
# Graceful stop (waits for connections to close)
rabbitmqctl stop

# Stop specific node in cluster
rabbitmqctl stop_app

# Stop and wait for synchronization
rabbitmqctl stop --wait 30
```

**Forced Shutdown (emergency):**
```bash
# Immediate stop
rabbitmqctl stop_app
rabbitmqctl stop

# Or kill process (last resort)
kill -9 $(cat /var/lib/rabbitmq/mnesia/rabbit@hostname/PID)
```

**Recovery Checklist:**
```bash
# 1. Check node status
rabbitmqctl cluster_status

# 2. Verify queues
rabbitmqctl list_queues name durable auto_delete

# 3. Check message counts
rabbitmqctl list_queues name messages messages_ready

# 4. Verify cluster links
rabbitmqctl cluster_links

# 5. Check for uncommitted messages
rabbitmqctl list_queues name messages_unacknowledged
```

**Automatic Recovery Configuration:**
```python
# Connection with auto-reconnect
parameters = pika.ConnectionParameters(
    host='rabbitmq',
    port=5672,
    virtual_host='/',
    credentials=pika.PlainCredentials('user', 'pass'),
    connection_attempts=5,
    retry_delay=5,
    blocked_connection_timeout=300,
    heartbeat=60
)

# Automatic recovery
connection = pika.BlockingConnection(parameters)
channel = connection.channel()
# Re-declare queues and exchanges after reconnect
```

## Advanced Questions

### Q3: Design a comprehensive monitoring and alerting system for RabbitMQ
**Answer:**

**Prometheus + Grafana Stack:**
```yaml
# docker-compose.yml
version: '3'
services:
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
      - "15692:15692"  # Prometheus exporter
  
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
```

**prometheus.yml:**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'rabbitmq'
    static_configs:
      - targets: ['rabbitmq:15692']
```

**Critical Alerts:**
```yaml
groups:
  - name: rabbitmq_alerts
    rules:
      - alert: RabbitMQNodeDown
        expr: up{job="rabbitmq"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "RabbitMQ node is down"
      
      - alert: RabbitMQHighMemoryUsage
        expr: rabbitmq_process_memory_bytes / rabbitmq_process_resident_memory_bytes > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "RabbitMQ memory usage > 80%"
      
      - alert: RabbitMQQueueBacklog
        expr: rabbitmq_queue_messages > 100000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Queue {{ $labels.queue }} has high backlog"
      
      - alert: RabbitMQNoConsumers
        expr: rabbitmq_queue_consumers == 0 and rabbitmq_queue_messages > 1000
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Queue {{ $labels.queue }} has messages but no consumers"
      
      - alert: RabbitMQDiskSpaceLow
        expr: rabbitmq_disk_free_bytes / rabbitmq_disk_free_limit_bytes < 0.2
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "RabbitMQ disk space running low"
```

**Custom Metrics Collection:**
```python
from prometheus_client import start_http_server, Gauge
import requests
import time

# Define metrics
queue_messages = Gauge('rabbitmq_queue_messages', 'Number of messages in queue', ['queue', 'vhost'])
queue_consumers = Gauge('rabbitmq_queue_consumers', 'Number of consumers', ['queue', 'vhost'])
node_memory = Gauge('rabbitmq_node_memory_bytes', 'Node memory usage', ['node'])
message_rate = Gauge('rabbitmq_message_rate', 'Message rate', ['queue', 'vhost', 'direction'])

def collect_metrics():
    auth = ('admin', 'password')
    api_url = 'http://localhost:15672/api'
    
    # Collect queue metrics
    queues = requests.get(f'{api_url}/queues', auth=auth).json()
    for queue in queues:
        queue_messages.labels(queue=queue['name'], vhost=queue['vhost']).set(queue['messages'])
        queue_consumers.labels(queue=queue['name'], vhost=queue['vhost']).set(queue['consumers'])
        
        stats = queue.get('message_stats', {})
        publish_rate = stats.get('publish_details', {}).get('rate', 0)
        deliver_rate = stats.get('deliver_details', {}).get('rate', 0)
        message_rate.labels(queue=queue['name'], vhost=queue['vhost'], direction='publish').set(publish_rate)
        message_rate.labels(queue=queue['name'], vhost=queue['vhost'], direction='deliver').set(deliver_rate)
    
    # Collect node metrics
    nodes = requests.get(f'{api_url}/nodes', auth=auth).json()
    for node in nodes:
        node_memory.labels(node=node['name']).set(node['mem_used'])

if __name__ == '__main__':
    start_http_server(8000)
    while True:
        collect_metrics()
        time.sleep(15)
```

**Log Aggregation (ELK Stack):**
```bash
# Filebeat configuration for RabbitMQ logs
filebeat.inputs:
- type: log
  paths:
    - /var/log/rabbitmq/*.log
  fields:
    service: rabbitmq
  fields_under_root: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "rabbitmq-logs-%{+yyyy.MM.dd}"
```

**Health Check Endpoint:**
```python
from flask import Flask, jsonify
import requests

app = Flask(__name__)

@app.route('/health')
def health_check():
    try:
        response = requests.get('http://localhost:15672/api/overview', 
                              auth=('admin', 'password'), timeout=5)
        if response.status_code == 200:
            data = response.json()
            health = {
                'status': 'healthy',
                'rabbitmq_status': data['rabbitmq_version'],
                'node_count': len(data['contexts']),
                'erlang_version': data['erlang_version']
            }
            
            # Additional checks
            if any(node['running'] == False for node in data.get('contexts', [])):
                health['status'] = 'degraded'
            
            return jsonify(health), 200
        else:
            return jsonify({'status': 'unhealthy'}), 503
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 503

if __name__ == '__main__':
    app.run(port=8080)
```

### Q4: How do you troubleshoot RabbitMQ performance issues?
**Answer:**

**Diagnostic Tools:**
```bash
# 1. Check resource usage
rabbitmqctl status

# 2. Monitor message rates
rabbitmqctl list_queues name messages messages_unacknowledged messages_ready

# 3. Check channel flow control
rabbitmqctl list_connections name client_properties

# 4. Analyze slow queues
rabbitmqctl list_queues name messages consumers

# 5. Check for blocked connections
rabbitmqctl list_connections name state

# 6. Memory breakdown
rabbitmqctl status | grep -A 20 '{memory'
```

**Common Performance Issues and Solutions:**

**Issue 1: Slow Message Processing**
```python
# Diagnose: Check consumer lag
def check_consumer_lag():
    queues = get_queue_metrics()
    for queue in queues:
        lag = queue['messages'] / max(queue['consumers'], 1)
        if lag > 1000:
            print(f"Queue {queue['name']}: High lag - {lag} msg/consumer")

# Solution 1: Add more consumers
scale_consumers(queue_name='slow_queue', count=10)

# Solution 2: Optimize consumer processing
# Implement bulk processing
def bulk_consumer(ch, method, properties, body):
    messages = [body]
    for _ in range(9):  # Process 10 at a time
        method, properties, body = ch.basic_get(queue='slow_queue')
        if method:
            messages.append(body)
    
    process_bulk(messages)
    for msg in messages:
        ch.basic_ack(delivery_tag=method.delivery_tag)
```

**Issue 2: High Memory Usage**
```python
# Diagnose: Find memory hogs
def find_memory_hogs():
    queues = get_queue_metrics()
    sorted_queues = sorted(queues, key=lambda x: x.get('memory', 0), reverse=True)
    
    print("Top memory consumers:")
    for queue in sorted_queues[:10]:
        print(f"{queue['name']}: {queue.get('memory', 0)} bytes")

# Solution: Convert to lazy queues
def optimize_memory(queue_name):
    # Create new lazy queue
    args = {'x-queue-mode': 'lazy'}
    channel.queue_declare(queue=f'{queue_name}_lazy', durable=True, arguments=args)
    
    # Drain old queue
    while True:
        method, properties, body = channel.basic_get(queue=queue_name)
        if not method:
            break
        channel.basic_publish(exchange='', routing_key=f'{queue_name}_lazy', body=body)
        channel.basic_ack(delivery_tag=method.delivery_tag)
```

**Issue 3: Connection Storms**
```python
# Diagnose: Check connection patterns
def analyze_connections():
    connections = get_connections()
    by_client = {}
    for conn in connections:
        client = conn['client_properties'].get('connection_name', 'unknown')
        by_client[client] = by_client.get(client, 0) + 1
    
    for client, count in by_client.items():
        if count > 100:
            print(f"Client {client}: {count} connections")

# Solution: Implement connection pooling
class RabbitMQConnectionPool:
    def __init__(self, max_connections=10):
        self.pool = Queue(maxsize=max_connections)
        self.max_connections = max_connections
        self._initialize_pool()
    
    def _initialize_pool(self):
        for _ in range(self.max_connections):
            conn = self._create_connection()
            self.pool.put(conn)
    
    def get_connection(self):
        return self.pool.get()
    
    def return_connection(self, conn):
        if conn.is_open:
            self.pool.put(conn)
        else:
            new_conn = self._create_connection()
            self.pool.put(new_conn)
```

**Issue 4: Disk I/O Bottleneck**
```bash
# Diagnose: Monitor disk performance
iostat -x 1 10

# Check RabbitMQ disk sync settings
rabbitmqctl status | grep disk

# Solution: Adjust disk sync interval
# In rabbitmq.conf:
disk_sync_limit = 100  # Sync every 100 messages

# Or use lazy queues to keep messages on disk
```

**Performance Profiling Script:**
```python
import time
import psutil

def profile_rabbitmq(duration=60):
    print("Profiling RabbitMQ for {} seconds...".format(duration))
    
    metrics = {
        'timestamp': [],
        'memory': [],
        'cpu': [],
        'disk_read': [],
        'disk_write': [],
        'network_sent': [],
        'network_recv': [],
        'queue_depths': {}
    }
    
    # Get all queues
    queues = list_queues()
    
    start_time = time.time()
    while time.time() - start_time < duration:
        timestamp = time.time()
        
        # System metrics
        metrics['timestamp'].append(timestamp)
        metrics['memory'].append(psutil.virtual_memory().used)
        metrics['cpu'].append(psutil.cpu_percent())
        
        # Disk I/O
        disk = psutil.disk_io_counters()
        metrics['disk_read'].append(disk.read_bytes)
        metrics['disk_write'].append(disk.write_bytes)
        
        # Network
        net = psutil.net_io_counters()
        metrics['network_sent'].append(net.bytes_sent)
        metrics['network_recv'].append(net.bytes_recv)
        
        # Queue depths
        queue_metrics = get_queue_metrics()
        for queue in queues:
            q_data = next((q for q in queue_metrics if q['name'] == queue), None)
            if queue not in metrics['queue_depths']:
                metrics['queue_depths'][queue] = []
            metrics['queue_depths'][queue].append(q_data['messages'] if q_data else 0)
        
        time.sleep(1)
    
    analyze_results(metrics)
```

### Q5: How do you perform RabbitMQ backup and restore operations?
**Answer:**

**Backup Strategies:**

**1. Definition Backup (Recommended):**
```bash
#!/bin/bash
# backup_rabbitmq_definitions.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/rabbitmq/definitions"
mkdir -p $BACKUP_DIR

# Export all definitions
rabbitmqctl export_definitions $BACKUP_DIR/definitions_$DATE.json

# Export definitions per vhost
for vhost in $(rabbitmqctl list_vhosts); do
    rabbitmqctl export_definitions -p $vhost $BACKUP_DIR/definitions_${vhost}_$DATE.json
done

# Keep last 30 days
find $BACKUP_DIR -name "definitions_*.json" -mtime +30 -delete
```

**2. Message Backup (For Important Queues):**
```python
import pika
import json
from datetime import datetime

def backup_queue(host, queue_name, output_file):
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=host))
    channel = connection.channel()
    
    # Get message count
    method_frame = channel.queue_declare(queue=queue_name, passive=True)
    total_messages = method_frame.method.message_count
    
    print(f"Backing up {total_messages} messages from {queue_name}")
    
    messages = []
    while True:
        method, properties, body = channel.basic_get(queue=queue_name)
        if not method:
            break
        
        message = {
            'delivery_tag': method.delivery_tag,
            'redelivered': method.redelivered,
            'exchange': method.exchange,
            'routing_key': method.routing_key,
            'body': body.decode(),
            'properties': {
                'content_type': properties.content_type,
                'content_encoding': properties.content_encoding,
                'headers': properties.headers,
                'delivery_mode': properties.delivery_mode,
                'priority': properties.priority,
                'correlation_id': properties.correlation_id,
                'reply_to': properties.reply_to,
                'expiration': properties.expiration,
                'message_id': properties.message_id,
                'timestamp': properties.timestamp,
                'type': properties.type,
                'user_id': properties.user_id,
                'app_id': properties.app_id,
            }
        }
        messages.append(message)
        channel.basic_ack(delivery_tag=method.delivery_tag)
    
    # Save to file
    backup_data = {
        'queue': queue_name,
        'backup_time': datetime.now().isoformat(),
        'message_count': len(messages),
        'messages': messages
    }
    
    with open(output_file, 'w') as f:
        json.dump(backup_data, f, indent=2)
    
    connection.close()
    print(f"Backup saved to {output_file}")
```

**3. Restore from Backup:**
```python
def restore_queue(host, queue_name, backup_file):
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=host))
    channel = connection.channel()
    
    # Load backup
    with open(backup_file, 'r') as f:
        backup_data = json.load(f)
    
    print(f"Restoring {backup_data['message_count']} messages to {queue_name}")
    
    for msg in backup_data['messages']:
        props = msg['properties']
        properties = pika.BasicProperties(
            content_type=props.get('content_type'),
            content_encoding=props.get('content_encoding'),
            headers=props.get('headers'),
            delivery_mode=props.get('delivery_mode'),
            priority=props.get('priority'),
            correlation_id=props.get('correlation_id'),
            reply_to=props.get('reply_to'),
            expiration=props.get('expiration'),
            message_id=props.get('message_id'),
            timestamp=props.get('timestamp'),
            type=props.get('type'),
            user_id=props.get('user_id'),
            app_id=props.get('app_id')
        )
        
        channel.basic_publish(
            exchange=msg['exchange'],
            routing_key=msg['routing_key'],
            body=msg['body'],
            properties=properties
        )
    
    connection.close()
    print("Restore complete")
```

**4. Full System Backup (Docker):**
```bash
#!/bin/bash
# backup_docker_rabbitmq.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/rabbitmq"
mkdir -p $BACKUP_DIR

# Stop container
docker stop rabbitmq

# Backup data directory
docker run --rm -v rabbitmq-data:/data -v $BACKUP_DIR:/backup \
    alpine tar czf /backup/rabbitmq_data_$DATE.tar.gz -C /data .

# Backup definitions
docker start rabbitmq
docker exec rabbitmq rabbitmqctl export_definitions /tmp/definitions.json
docker cp rabbitmq:/tmp/definitions.json $BACKUP_DIR/definitions_$DATE.json

# Start container
docker start rabbitmq

echo "Backup completed: $BACKUP_DIR/rabbitmq_data_$DATE.tar.gz"
```

**5. Disaster Recovery Procedure:**
```bash
#!/bin/bash
# disaster_recovery.sh

echo "Starting RabbitMQ disaster recovery..."

# 1. Stop existing cluster
rabbitmqctl stop_app

# 2. Backup current state (just in case)
cp -r /var/lib/rabbitmq /var/lib/rabbitmq.backup

# 3. Restore data directory
tar xzf /backups/rabbitmq/rabbitmq_data_latest.tar.gz -C /var/lib/rabbitmq

# 4. Start node
rabbitmq-server -detached

# 5. Wait for startup
sleep 30

# 6. Restore definitions
rabbitmqctl import_definitions /backups/rabbitmq/definitions_latest.json

# 7. Verify cluster status
rabbitmqctl cluster_status

# 8. Check queues
rabbitmqctl list_queues name messages

echo "Recovery complete"
```

**Backup Best Practices:**
- Automate daily definition backups
- Enable message backup only for critical queues
- Test restore procedures regularly
- Keep backups in multiple locations (local + offsite)
- Use versioning for backups
- Document backup and restore procedures
- Monitor backup job success/failure
- Consider using policies for queue replication instead of message backups