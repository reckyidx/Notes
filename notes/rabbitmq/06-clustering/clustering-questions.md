# RabbitMQ Clustering and High Availability Interview Questions

## Intermediate Questions

### Q1: How do you create a RabbitMQ cluster?
**Answer:**

**Manual Cluster Setup:**
```bash
# Node 1 (seed node)
rabbitmq-server -detached

# Node 2
rabbitmq-server -detached
rabbitmqctl stop_app
rabbitmqctl reset
rabbitmqctl join_cluster rabbit@node1
rabbitmqctl start_app

# Node 3
rabbitmq-server -detached
rabbitmqctl stop_app
rabbitmqctl reset
rabbitmqctl join_cluster rabbit@node1
rabbitmqctl start_app

# Verify cluster
rabbitmqctl cluster_status
```

**Using Docker Compose:**
```yaml
version: '3'
services:
  rabbit1:
    image: rabbitmq:3-management
    hostname: rabbit1
    environment:
      - RABBITMQ_ERLANG_COOKIE=secretcookie
      - RABBITMQ_NODENAME=rabbit@rabbit1
    ports:
      - "5672:5672"
      - "15672:15672"
  
  rabbit2:
    image: rabbitmq:3-management
    hostname: rabbit2
    environment:
      - RABBITMQ_ERLANG_COOKIE=secretcookie
      - RABBITMQ_NODENAME=rabbit@rabbit2
      - RABBITMQ_CLUSTER_NODES=rabbit@rabbit1
    depends_on:
      - rabbit1
  
  rabbit3:
    image: rabbitmq:3-management
    hostname: rabbit3
    environment:
      - RABBITMQ_ERLANG_COOKIE=secretcookie
      - RABBITMQ_NODENAME=rabbit@rabbit3
      - RABBITMQ_CLUSTER_NODES=rabbit@rabbit1
    depends_on:
      - rabbit1
```

**Key requirements:**
- Same Erlang cookie on all nodes
- Resolvable hostnames
- Open ports: 5672 (AMQP), 25672 (inter-node), 15672 (management)
- Same RabbitMQ version across cluster

### Q2: What is the difference between mirrored queues and quorum queues?
**Answer:**

**Mirrored Queues (Classic HA):**
```python
# Create mirrored queue with policy
# Via CLI
rabbitmqctl set_policy ha-all "^ha\." '{"ha-mode":"all","ha-sync-mode":"automatic"}'

# Create HA queue
args = {'x-ha-policy': 'all'}
channel.queue_declare(queue='ha_queue', durable=True, arguments=args)
```

**Quorum Queues (Modern HA):**
```python
# Create quorum queue
args = {'x-queue-type': 'quorum'}
channel.queue_declare(queue='quorum_queue', durable=True, arguments=args)

# Set replication factor via policy
rabbitmqctl set_policy quorum-all "^quorum\." '{"quorum-all-up-to":true}'
```

**Comparison:**

| Feature | Mirrored Queues | Quorum Queues |
|---------|----------------|---------------|
| Consistency | Eventual | Strong |
| Failover time | Seconds | Milliseconds |
| Performance | Higher | Lower |
| Network partition handling | Stop all | Majority continues |
| Message ordering | Preserved | Preserved |
| Max replicas | All nodes | Can limit |
| Recommended for | High throughput | Critical data |

### Q3: How do you handle network partitions in RabbitMQ cluster?
**Answer:**

**Partition Handling Modes:**
```ini
# rabbitmq.conf

# Autoheal: Let RabbitMQ resolve (default)
cluster_partition_handling = autoheal

# Pause minority: Continue only on majority
cluster_partition_handling = pause_minority

# Ignore: Manual intervention required
cluster_partition_handling = ignore
```

**Understanding Partition Handling:**

**1. Autoheal Mode:**
```bash
# Selects partition with most connections
# Losers reset and rejoin
# Risk: Message loss on losing side
```

**2. Pause Minority Mode:**
```bash
# Pauses nodes with fewer than half of cluster
# Safer, requires manual intervention
# Use for production
cluster_partition_handling = pause_minority
```

**3. Manual Recovery:**
```bash
# Check cluster status
rabbitmqctl cluster_status

# On paused node (minority)
rabbitmqctl start_app

# If needed, force forget
rabbitmqctl forget_cluster_node rabbit@isolated_node

# Rejoin cluster
rabbitmqctl stop_app
rabbitmqctl reset
rabbitmqctl join_cluster rabbit@primary_node
rabbitmqctl start_app
```

**Best Practices:**
- Use `pause_minority` in production
- Monitor for partition events
- Have at least 3 nodes for quorum
- Use load balancer with health checks
- Test partition scenarios in staging