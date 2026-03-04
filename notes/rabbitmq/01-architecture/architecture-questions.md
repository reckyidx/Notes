# RabbitMQ Architecture Interview Questions

## Intermediate Questions

### Q1: Explain the fundamental architecture of RabbitMQ
**Answer:** RabbitMQ follows a broker-based messaging architecture with the following components:
- **Producer**: Applications that publish messages
- **Exchange**: Receives messages from producers and routes them to queues
- **Queue**: Buffers messages for consumers
- **Consumer**: Applications that receive and process messages
- **Binding**: Relationship between exchange and queue with routing keys
- **Virtual Host**: Logical grouping and isolation of resources

### Q2: What are the main exchange types and when would you use each?
**Answer:**
- **Direct**: Routes messages to queues where binding key matches routing key exactly. Use for point-to-point messaging.
- **Topic**: Routes messages using pattern matching with wildcards (* and #). Use for publish-subscribe with flexible routing.
- **Fanout**: Broadcasts messages to all bound queues. Use for broadcast scenarios.
- **Headers**: Routes based on message headers instead of routing keys. Use when routing logic is complex.

## Advanced Questions

### Q3: How does RabbitMQ handle message persistence and what are the performance implications?
**Answer:** RabbitMQ provides two levels of persistence:
- **Queue durability**: Queues survive broker restarts when declared as durable
- **Message persistence**: Messages written to disk when published with delivery_mode=2

Performance implications:
- Durable queues have ~2x slower message rates than non-durable
- Persistent messages have ~5-10x lower throughput than transient messages
- Disk writes are batched by default (5 messages or 200ms intervals)
- Transaction mode further reduces throughput (~3-5x)
- Publisher confirms offer better throughput than transactions

Tuning considerations:
- Increase disk sync interval for higher throughput at risk of message loss
- Use lazy queues for better memory management
- Consider mirrored queues for HA instead of pure persistence

### Q4: Explain RabbitMQ's internal message flow from producer to consumer
**Answer:**
1. Producer establishes AMQP connection
2. Publisher confirms flow control
3. Producer publishes message to exchange
4. Exchange routes message based on binding
5. Message placed in queue (in memory first)
6. Queue persists message if persistent
7. Consumer establishes channel and subscribes
8. Message delivered to consumer (prefetch count controls unacknowledged messages)
9. Consumer sends acknowledgment
10. Queue removes message and updates state

Internal components involved:
- **Process**: Queue process and Erlang VM
- **Mnesia**: Internal metadata store
- **Erlang VM**: Runtime environment
- **Channel**: Virtual connection within physical connection

### Q5: What is the purpose of virtual hosts in RabbitMQ?
**Answer:** Virtual hosts provide:
- **Logical isolation**: Separate namespaces for queues, exchanges, bindings
- **Multi-tenancy**: Different applications or environments can share one RabbitMQ instance
- **Resource separation**: Memory, connections, and queues are scoped per vhost
- **Security boundaries**: Permissions can be set per vhost
- **Configuration independence**: Policies, parameters, and features apply per vhost

Trade-offs:
- Virtual hosts don't provide complete resource isolation (shared Erlang VM)
- One vhost's high load can affect others
- No network-level isolation between vhosts