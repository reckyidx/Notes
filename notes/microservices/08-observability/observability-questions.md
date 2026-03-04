# Microservices Observability Interview Questions

## Table of Contents
1. [Observability Pillars](#observability-pillars)
2. [Logging](#logging)
3. [Metrics](#metrics)
4. [Distributed Tracing](#distributed-tracing)
5. [Monitoring & Alerting](#monitoring--alerting)

---

## Observability Pillars

### Q1. What are the three pillars of observability?

**Answer:** Observability in microservices is built on three pillars:

**1. Logging**
- Records discrete events
- Text-based, human-readable
- Debugging and troubleshooting
- Examples: Application logs, access logs

**2. Metrics**
- Numerical measurements over time
- Aggregated data
- Monitoring and alerting
- Examples: Request count, response time, error rate

**3. Tracing**
- Tracks request flow across services
- Shows causality and latency
- Performance analysis
- Examples: Distributed tracing, span trees

**Relationship:**
```
Observability = Logs + Metrics + Traces
                   ↓        ↓       ↓
               What     How much Where & When
               happened  often?   and Why
```

### Q2. What is observability vs monitoring?

**Answer:**

| Aspect | Monitoring | Observability |
|--------|-----------|---------------|
| **Focus** | Known unknowns | Unknown unknowns |
| **Approach** | Pre-defined metrics | Exploratory analysis |
| **Questions** | "Is system healthy?" | "Why is system slow?" |
| **Scope** | Metrics, alerts | Logs, metrics, traces |
| **Proactive** | Yes | Reactive & Proactive |
| **Diagnostics** | Limited | Rich context |

**Example:**

**Monitoring:**
- "CPU usage is 90% - alert!"
- "Error rate is 5% - notify!"
- "Response time is 500ms - warn!"

**Observability:**
- "Why is CPU usage high? Let me check traces."
- "Which requests are causing errors? Let me search logs."
- "Where is the latency coming from? Let me follow the trace."

**Monitoring answers "known" questions, Observability helps you answer "unknown" questions.**

---

## Logging

### Q3. What are logging best practices for microservices?

**Answer:**

**1. Structured Logging**
```javascript
// Bad: Unstructured
console.log('Order created for user 123');

// Good: Structured
logger.info('OrderCreated', {
  orderId: 'abc-123',
  userId: 123,
  items: 3,
  total: 99.99,
  timestamp: new Date().toISOString()
});
```

**2. Log Levels**
```javascript
logger.error('Payment failed', { orderId, error: err.message });
logger.warn('High memory usage', { memory: '90%' });
logger.info('User logged in', { userId });
logger.debug('Cache miss', { key: 'user:123' });
```

**3. Include Context**
```javascript
// Always include correlation/request ID
const requestId = generateRequestId();
logger.setContext({ requestId });

logger.info('Processing order', { orderId, requestId });
```

**4. Don't Log Sensitive Data**
```javascript
// Bad
logger.info('User login', { username: 'john', password: 'secret' });

// Good
logger.info('User login', { username: 'john' });
```

**5. Use Correlation IDs**
```javascript
// Generate unique ID per request
const correlationId = req.headers['x-correlation-id'] || uuid.v4();

// Pass through all service calls
logger.setContext({ correlationId });
await orderService.createOrder(orderData, { correlationId });
```

### Q4. What is centralized logging?

**Answer:** Centralized logging aggregates logs from all services into a single location for easier analysis and search.

**Architecture:**
```
Microservices → Log Agents → Log Aggregator → Storage → UI
                      ↓              ↓           ↓
                  Filebeat      Logstash      Elasticsearch
```

**Popular stacks:**

**1. ELK Stack**
- **Elasticsearch**: Storage and search
- **Logstash**: Log processing and parsing
- **Kibana**: Visualization and UI

**2. EFK Stack**
- **Elasticsearch**: Storage and search
- **Fluentd**: Log collection and routing
- **Kibana**: Visualization and UI

**3. Cloud Solutions**
- AWS CloudWatch Logs
- Google Cloud Logging
- Azure Monitor Logs
- Datadog Logs

**Example setup:**
```yaml
# Filebeat configuration
filebeat.inputs:
- type: container
  paths:
    - '/var/lib/docker/containers/*/*.log'
  processors:
  - add_docker_metadata: ~

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  indices:
    - index: "microservices-%{+yyyy.MM.dd}"

setup.kibana:
  host: "kibana:5601"
```

**Benefits:**
- Single place to search all logs
- Powerful search and filtering
- Log aggregation and analysis
- Alert on log patterns
- Long-term retention

---

## Metrics

### Q5. What are the types of metrics?

**Answer:**

**1. Counter**
- Monotonically increasing value
- Counts occurrences of events
- Never decreases
- Examples: Requests served, errors, orders created

```javascript
const requestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status', 'service']
});

requestCounter.inc({ method: 'GET', status: '200', service: 'order-api' });
```

**2. Gauge**
- Can go up or down
- Current value of something
- Examples: Memory usage, active connections, queue size

```javascript
const memoryGauge = new Gauge({
  name: 'memory_usage_bytes',
  help: 'Current memory usage',
  labelNames: ['service']
});

memoryGauge.set({ service: 'order-service' }, process.memoryUsage().heapUsed);
```

**3. Histogram**
- Samples observations into buckets
- Distribution of values
- Examples: Request duration, response size

```javascript
const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  buckets: [0.1, 0.5, 1, 2, 5],
  labelNames: ['method', 'service']
});

const end = requestDuration.startTimer();
// ... process request ...
end({ method: 'GET', service: 'order-api' });
```

**4. Summary**
- Similar to histogram
- Calculates quantiles on the client
- Examples: Response time (p50, p95, p99)

```javascript
const requestSummary = new Summary({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration summary',
  percentiles: [0.5, 0.9, 0.99],
  labelNames: ['method', 'service']
});

requestSummary.observe({ method: 'GET', service: 'order-api' }, 0.5);
```

### Q6. What is RED method for metrics?

**Answer:** RED method is a methodology for defining key metrics for monitoring services.

**R - Rate (Throughput)**
- Number of requests per second
- Traffic volume
- Business metrics

**E - Errors (Errors)**
- Error rate
- Failed requests
- 4xx and 5xx status codes

**D - Duration (Latency)**
- Response time
- Request duration
- Processing time

**Implementation:**
```javascript
// Rate - Request counter
const requestRate = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status', 'service']
});

// Errors - Error counter
const errorRate = new Counter({
  name: 'http_errors_total',
  help: 'Total HTTP errors',
  labelNames: ['method', 'status', 'service']
});

// Duration - Request duration histogram
const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  buckets: [0.1, 0.5, 1, 2, 5],
  labelNames: ['method', 'service']
});

// Middleware to track all metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    requestRate.inc({
      method: req.method,
      status: res.statusCode,
      service: 'order-service'
    });
    
    if (res.statusCode >= 400) {
      errorRate.inc({
        method: req.method,
        status: res.statusCode,
        service: 'order-service'
      });
    }
    
    requestDuration.observe({
      method: req.method,
      service: 'order-service'
    }, duration);
  });
  
  next();
});
```

### Q7. What is USE method for metrics?

**Answer:** USE method is for analyzing performance of resources (CPU, memory, disk, network).

**U - Utilization**
- Average time resource was busy
- Percentage of capacity used
- Examples: CPU utilization, memory usage

**S - Saturation**
- How much work is queued/waiting
- Resource is overwhelmed
- Examples: Load average, queue depth

**E - Errors**
- Rate of errors
- Resource failures
- Examples: Disk errors, network errors

**Examples:**

**CPU Metrics:**
```
# Utilization
rate(process_cpu_seconds_total[5m])

# Saturation
load_average / cpu_count

# Errors - Usually doesn't apply to CPU
```

**Memory Metrics:**
```
# Utilization
process_resident_memory_bytes / total_memory

# Saturation
page_faults_rate

# Errors - Out of memory errors
oom_kills_total
```

**Disk Metrics:**
```
# Utilization
rate(node_disk_io_time_seconds_total[5m])

# Saturation
node_filesystem_size_bytes - node_filesystem_avail_bytes

# Errors
rate(node_disk_io_time_seconds_total{errors="yes"}[5m])
```

### Q8. What are the common metric collection tools?

**Answer:**

**1. Prometheus**
- Pull-based scraping
- Time-series database
- Built-in alerting
- Multi-dimensional data model

**Example:**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'order-service'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['order-service:3000']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'order-service'
```

**2. Grafana**
- Visualization and dashboards
- Multiple data sources
- Alerting
- Pluggable

**3. StatsD / Telegraf**
- Push-based metrics
- Agent-based collection
- Multiple backends
- Lightweight

**4. Cloud Solutions**
- AWS CloudWatch
- Google Cloud Monitoring
- Azure Monitor
- Datadog

**5. Application-level libraries**
```javascript
// Node.js with prom-client
const promClient = require('prom-client');

// Create registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## Distributed Tracing

### Q9. What is distributed tracing?

**Answer:** Distributed tracing tracks the path of a request as it travels through multiple microservices, showing latency and causality.

**Key concepts:**

**1. Trace**
- A single request through the system
- Collection of all spans
- Unique trace ID

**2. Span**
- A single unit of work
- Has start/end time
- Has parent/child relationships

**3. Trace Context**
- Trace ID + Span ID + Parent Span ID
- Passed between services
- Maintains causality

**Example:**
```
Trace: abc-123
├── Span 1: API Gateway receives request (0ms - 10ms)
├── Span 2: Order Service creates order (15ms - 50ms)
│   ├── Span 3: Database query (20ms - 45ms)
│   └── Span 4: Publish event (48ms - 50ms)
└── Span 5: Inventory Service reserves (60ms - 80ms)
    └── Span 6: Database update (65ms - 78ms)
```

### Q10. How do you implement distributed tracing?

**Answer:**

**Using OpenTelemetry:**

```javascript
import { trace, context, SpanKind } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

// Setup tracing
const provider = new NodeTracerProvider({
  resource: new Resource({
    'service.name': 'order-service'
  })
});

const exporter = new JaegerExporter({
  endpoint: 'http://jaeger:14268/api/traces'
});

provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register();

// Use in code
app.get('/api/orders/:id', async (req, res) => {
  const tracer = trace.getTracer('order-service');
  const span = tracer.startSpan('getOrder', {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': 'GET',
      'http.url': req.url
    }
  });
  
  try {
    // Business logic
    const order = await orderService.getOrder(req.params.id);
    
    res.json(order);
    
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ 
      code: SpanStatusCode.ERROR,
      message: error.message 
    });
    res.status(500).json({ error: error.message });
  } finally {
    span.end();
  }
});
```

**Propagating trace context:**

```javascript
// Client - send trace context
const traceId = context.active().getValue(traceIdKey);
const spanId = context.active().getValue(spanIdKey);

await fetch('http://inventory-service/items', {
  headers: {
    'X-Trace-Id': traceId,
    'X-Span-Id': spanId,
    'X-Parent-Span-Id': currentSpanId
  }
});

// Server - receive trace context
app.use((req, res, next) => {
  const traceId = req.headers['x-trace-id'];
  const spanId = req.headers['x-span-id'];
  
  const context = trace.setSpanContext({
    traceId,
    spanId,
    traceFlags: TraceFlags.SAMPLED
  });
  
  context.with(context, next);
});
```

### Q11. What are the distributed tracing tools?

**Answer:**

**1. Jaeger**
- Open source
- Multiple storage backends
- Good visualization
- Part of CNCF

**2. Zipkin**
- Open source
- Inspired by Dapper
- Simpler than Jaeger
- Part of CNCF

**3. AWS X-Ray**
- Managed service
- Integration with AWS
- Good for AWS users
- Built-in visualization

**4. Datadog APM**
- Commercial
- Excellent UI
- Rich features
- Integration with other Datadog products

**5. Honeycomb**
- Commercial
- Event-based
- Fast queries
- Good for observability

**6. OpenTelemetry**
- Vendor-neutral
- Standard instrumentation
- Multiple exporters
- Future of tracing

**Architecture:**
```
Application (OpenTelemetry SDK)
    ↓
Collector (OpenTelemetry Collector)
    ↓
Backend (Jaeger, Zipkin, Cloud)
    ↓
UI (Jaeger UI, Grafana, etc.)
```

### Q12. What are the benefits of distributed tracing?

**Answer:**

**1. Root Cause Analysis**
- Find bottlenecks in request flow
- Identify slow services
- Pinpoint performance issues

**2. Service Dependency Map**
- See how services call each other
- Understand system architecture
- Identify unknown dependencies

**3. Latency Analysis**
- See where time is spent
- Find slow database queries
- Optimize performance

**4. Error Tracking**
- Trace errors across services
- See full error context
- Debug production issues

**5. Capacity Planning**
- Understand traffic patterns
- Plan for scale
- Optimize resource usage

**Example trace analysis:**
```
Trace ID: abc-123
Total duration: 200ms

├── API Gateway: 10ms (5%)
├── Order Service: 50ms (25%)
│   ├── Database: 30ms (15%)
│   └── Event Publish: 5ms (2.5%)
├── Inventory Service: 80ms (40%)
│   ├── Database: 60ms (30%) ⚠️ SLOW
│   └── Cache: 10ms (5%)
└── Payment Service: 40ms (20%)
    ├── External API: 30ms (15%)
    └── Database: 5ms (2.5%)

Insights:
- Inventory Service database is slow (30ms)
- Consider adding cache
- Overall trace time is 200ms - acceptable
```

---

## Monitoring & Alerting

### Q13. What is the difference between metrics and alerts?

**Answer:**

| Aspect | Metrics | Alerts |
|--------|---------|--------|
| **Purpose** | Collect data | Notify on conditions |
| **Timing** | Continuous | Conditional |
| **Action** | Passive | Active |
| **Usage** | Analysis, dashboards | Notifications, actions |
| **Examples** | CPU usage, request rate | CPU > 90%, error rate > 5% |

**Metrics feed into Alerts:**
```
Metrics Collection → Alert Rule Evaluation → Alert Triggered → Notification
```

**Example:**
```yaml
# Prometheus Alert Rules
groups:
  - name: order-service
    rules:
      # Metric
      - record: job:http_requests:rate1m
        expr: rate(http_requests_total[1m])
      
      # Alert
      - alert: HighErrorRate
        expr: rate(http_errors_total[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.service }}"
          description: "Error rate is {{ $value | humanizePercentage }}"
```

### Q14. What are the best practices for alerting?

**Answer:**

**1. Alert on Symptoms, Not Causes**
```yaml
# Bad - Alert on CPU
alert: HighCPUUsage
expr: cpu_usage > 90

# Good - Alert on degraded service
alert: HighResponseTime
expr: http_request_duration_seconds{quantile="0.95"} > 1
```

**2. Set Appropriate Thresholds**
```yaml
# Too sensitive - Noisy alerts
expr: error_rate > 0.01

# Too loose - Miss real issues
expr: error_rate > 0.5

# Good - Balanced threshold
expr: error_rate > 0.05
```

**3. Use Alert Severity Levels**
```yaml
- alert: ServiceDown
  severity: critical
  expr: up == 0
  
- alert: HighErrorRate
  severity: warning
  expr: error_rate > 0.05
  
- alert: HighLatency
  severity: info
  expr: latency > 1
```

**4. Add Alert Context**
```yaml
annotations:
  summary: "High error rate on {{ $labels.service }}"
  description: |
    Error rate is {{ $value | humanizePercentage }}
    Threshold: 0.05
    Duration: {{ $duration }}
    Instance: {{ $labels.instance }}
```

**5. Prevent Alert Fatigue**
```yaml
# Use for duration to prevent flapping
for: 5m

# Use hysteresis
- alert: HighErrorRate
  expr: error_rate > 0.05
  annotations:
    summary: "Error rate is {{ $value | humanizePercentage }}"

- alert: ErrorRateRecovered
  expr: error_rate < 0.02
  annotations:
    summary: "Error rate recovered to {{ $value | humanizePercentage }}"
```

**6. Route Alerts Appropriately**
```yaml
# Route critical alerts to on-call
- match:
    severity: critical
  receiver: oncall

# Route warning alerts to team Slack
- match:
    severity: warning
  receiver: team-slack

# Route info alerts to daily digest
- match:
    severity: info
  receiver: daily-digest
```

### Q15. What is SLO and SLA?

**Answer:**

**SLO (Service Level Objective)**
- Internal target for service quality
- Measurable goals
- Example: 99.9% uptime, < 100ms p95 latency

**SLA (Service Level Agreement)**
- External promise to customers
- Consequences for missing SLO
- Example: 99.9% uptime or credit

**Relationship:**
```
SLA (External Promise)
    ↓
SLO (Internal Target)
    ↓
Error Budget (Allowed Downtime)
```

**Error Budget Calculation:**
```
SLO: 99.9% uptime
Allowed downtime per month: 30 days × 24 hours × 0.1% = 43.2 minutes

If we've used 10 minutes of error budget:
Remaining budget: 43.2 - 10 = 33.2 minutes
```

**Example SLOs:**
```yaml
# Availability SLO
apiVersion: observability/v1
kind: SLO
metadata:
  name: order-service-availability
spec:
  target: 0.999  # 99.9%
  window: 30d
  indicator:
    type: availability
    query: |
      (
        sum(rate(http_requests_total{service="order-service",code!~"5.."}[5m]))
        /
        sum(rate(http_requests_total{service="order-service"}[5m]))
      )

# Latency SLO
apiVersion: observability/v1
kind: SLO
metadata:
  name: order-service-latency
spec:
  target: 0.95  # 95% of requests < 100ms
  window: 7d
  indicator:
    type: latency
    threshold: 0.1
    query: |
      histogram_quantile(0.95,
        rate(http_request_duration_seconds_bucket{service="order-service"}[5m])
      )
```

### Q16. What is error budget?

**Answer:** Error budget is the amount of downtime or errors allowed before SLO is violated.

**Calculating Error Budget:**
```
SLO: 99.9% availability
Monthly period: 30 days = 43,200 minutes

Error Budget = 43,200 × (1 - 0.999) = 43.2 minutes
```

**Using Error Budget:**

**1. Burn Rate**
- How fast error budget is being consumed
- High burn rate = need action

```yaml
# Burn rate calculation
burn_rate = (current_error_rate) / (error_budget_rate)

# Examples
burn_rate = 0.01 / 0.001 = 10x  # Burning 10x faster than allowed
burn_rate = 0.001 / 0.001 = 1x  # On track
burn_rate = 0.0001 / 0.001 = 0.1x  # Under budget
```

**2. Error Budget Policy**
```yaml
# Define actions based on burn rate
error_budget_policy:
  critical:
    burn_rate: 10x
    action: Stop deployments, page on-call
    duration: 1h
  warning:
    burn_rate: 2x
    action: Page team lead, review deployments
    duration: 6h
  normal:
    burn_rate: 0.1x - 1x
    action: Normal operations
  healthy:
    burn_rate: < 0.1x
    action: Can ship more features
```

**3. Integrating Error Budget with Deployment Decisions**
```yaml
# Deployment policy based on error budget
deployment_policy:
  when_error_budget_remaining > 50%:
    can_deploy: true
    deployment_type: normal
  
  when_error_budget_remaining < 50% and > 20%:
    can_deploy: true
    deployment_type: canary
    require_approval: true
  
  when_error_budget_remaining < 20%:
    can_deploy: false
    action: freeze deployments until budget recovers
```

**Benefits of Error Budget:**
- Data-driven deployment decisions
- Balance innovation and reliability
- Prevent alert fatigue
- Focus on user impact

### Q17. What is alert fatigue and how to avoid it?

**Answer:** Alert fatigue occurs when too many alerts cause team members to ignore or miss critical alerts.

**Causes:**
- Too many alerts (alert spamming)
- Alerts on symptoms, not impact
- Flapping alerts
- No clear action items
- False positives

**Solutions:**

**1. Reduce Alert Volume**
```yaml
# Bad: Alert on every 5xx error
- alert: HTTPError
  expr: http_errors_total > 0

# Good: Alert only when error rate is high
- alert: HighErrorRate
  expr: rate(http_errors_total[5m]) / rate(http_requests_total[5m]) > 0.05
  for: 5m  # Sustained for 5 minutes
```

**2. Add Minimum Duration**
```yaml
for: 5m  # Only alert if condition persists for 5 minutes
```

**3. Use Hysteresis**
```yaml
# Alert when > 5%, clear when < 2%
- alert: HighErrorRate
  expr: error_rate > 0.05

- alert: ErrorRateRecovered
  expr: error_rate < 0.02
```

**4. Alert on Business Impact**
```yaml
# Bad: CPU usage
expr: cpu_usage > 90

# Good: Slow page loads
expr: http_request_duration_seconds{quantile="0.95"} > 2

# Best: Users can't complete checkout
expr: checkout_failure_rate > 0.1
```

**5. Implement Alert Silencing**
```yaml
# Silence during maintenance window
silences:
  - matchers:
      - name: service
        value: order-service
    startsAt: 2024-01-01T02:00:00Z
    endsAt: 2024-01-01T04:00:00Z
    comment: "Scheduled maintenance"
```

**6. Use Severity Levels Appropriately**
- **Critical**: Page on-call immediately
- **Warning**: Slack notification
- **Info**: Daily digest only

### Q18. What is runbook automation?

**Answer:** Runbook automation is the practice of automatically executing predefined procedures in response to alerts.

**Benefits:**
- Faster incident response
- Consistent problem handling
- Reduced human error
- Lower toil

**Example:**
```yaml
# Automated runbook for high memory usage
alert: HighMemoryUsage
expr: memory_usage > 90

annotations:
  runbook_url: "https://runbooks.example.com/high-memory"
  auto_remediation: true

auto_actions:
  - name: collect_heap_dump
    action: |
      curl -X POST http://order-service:3000/debug/heap-dump
      attachment: heap-dump.hprof
  
  - name: restart_pod
    condition: memory_usage > 95
    action: |
      kubectl delete pod order-service-abc123
    notify: true
```

**Runbook best practices:**
1. Document symptoms
2. Provide clear steps
3. Include rollback procedures
4. Automate where possible
5. Review and update regularly
</content>
<task_progress>
- [x] Create microservices directory structure
- [x] Create fundamentals questions
- [x] Create architecture patterns questions
- [x] Create communication questions
- [x] Create data management questions
- [x] Create deployment questions
- [x] Create security questions
- [x] Create testing questions
- [x] Create observability questions
- [ ] Create challenges questions
- [ ] Create advanced questions
</task_progress>
