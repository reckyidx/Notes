# Load Balancer & Networking Interview Questions
## For 10+ Years Experienced Node.js Developer

---

## Table of Contents
1. [Load Balancer Fundamentals](#load-balancer-fundamentals)
2. [Load Balancer Types](#load-balancer-types)
3. [Load Balancing Algorithms](#load-balancing-algorithms)
4. [Implementation & Configuration](#implementation--configuration)
5. [High Availability & Failover](#high-availability--failover)
6. [Health Checks & Monitoring](#health-checks--monitoring)
7. [Performance Optimization](#performance-optimization)
8. [Real-World Scenarios](#real-world-scenarios)

---

## Load Balancer Fundamentals

### Q1: What is a load balancer and why is it critical for scalability?

**Answer:**

```javascript
/**
 * Load Balancer Purpose & Architecture
 * 
 * Problem: Single server cannot handle millions of concurrent connections
 * Solution: Distribute traffic across multiple servers
 * 
 * Network Flow:
 * 
 * [Client 1]
 * [Client 2] -----> [Load Balancer] -----> [Server 1]
 * [Client N]                                [Server 2]
 *                                           [Server N]
 */

const LoadBalancerPurposes = {
  distributed: 'Spread traffic across servers',
  scalability: 'Handle more concurrent connections',
  highAvailability: 'Automatic failover if server down',
  sessionStickiness: 'User stays with same server',
  security: 'Hide internal server IPs (WAF)',
  ssl_termination: 'Decrypt SSL once, not on each server',
  caching: 'Cache responses at load balancer',
  compression: 'Compress responses before sending',
  rate_limiting: 'Control request rates',
  logging: 'Centralized access logs'
};

// Load Balancer Components
const LoadBalancerComponents = {
  frontend: {
    description: 'Accepts client connections',
    config: {
      ip: '203.0.113.1',
      port: 80,
      maxConnections: 100000
    }
  },

  backend: {
    description: 'Pool of servers handling requests',
    servers: [
      { hostname: 'server1.internal', ip: '10.0.1.10', port: 3000, weight: 1 },
      { hostname: 'server2.internal', ip: '10.0.1.11', port: 3000, weight: 1 },
      { hostname: 'server3.internal', ip: '10.0.1.12', port: 3000, weight: 2 }
    ]
  },

  healthCheck: {
    description: 'Verify servers are healthy',
    interval: 5000, // ms
    timeout: 3000,  // ms
    healthyThreshold: 2,
    unhealthyThreshold: 3
  },

  sessionPersistence: {
    description: 'Stick user to same server',
    type: 'sticky_ip_hash'
  }
};

// Basic load balancer implementation
class BasicLoadBalancer {
  constructor(servers) {
    this.servers = servers;
    this.currentIndex = 0;
    this.healthyServers = [...servers];
  }

  // Round-robin selection
  selectServer() {
    if (this.healthyServers.length === 0) {
      throw new Error('No healthy servers available');
    }

    const server = this.healthyServers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.healthyServers.length;
    return server;
  }

  // Health check
  async checkHealth(server) {
    try {
      const response = await fetch(`http://${server.ip}:${server.port}/health`, {
        timeout: 3000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Monitor server health
  async monitorHealth() {
    const results = await Promise.all(
      this.servers.map(async (server) => ({
        server,
        isHealthy: await this.checkHealth(server)
      }))
    );

    this.healthyServers = results
      .filter(r => r.isHealthy)
      .map(r => r.server);

    console.log(`Healthy servers: ${this.healthyServers.length}/${this.servers.length}`);
  }

  // Handle request
  async handleRequest(request) {
    const server = this.selectServer();
    return this.forwardRequest(request, server);
  }

  async forwardRequest(request, server) {
    // Forward to backend server
    return fetch(`http://${server.ip}:${server.port}${request.path}`, {
      method: request.method,
      headers: {
        ...request.headers,
        'X-Forwarded-For': request.clientIp,
        'X-Forwarded-Proto': request.protocol,
        'X-Forwarded-Host': request.host
      },
      body: request.body
    });
  }
}
```

---

## Load Balancer Types

### Q2: Compare different load balancer types and their use cases

**Answer:**

```javascript
/**
 * Load Balancer Types & OSI Layers
 */

const LoadBalancerTypes = {
  layer4: {
    name: 'Layer 4 (Transport Layer)',
    protocols: ['TCP', 'UDP'],
    works_on: 'IP addresses and ports',
    
    characteristics: {
      speed: 'Fastest - minimal packet inspection',
      complexity: 'Simple - no protocol knowledge needed',
      useCase: 'Non-HTTP protocols, extreme performance',
      examples: ['Network Load Balancer (NLB)', 'HAProxy TCP mode']
    },

    example: `
    [Client] 
      |
      | TCP connection to 203.0.113.1:80
      |
    [L4 LB] looks only at: dest IP=203.0.113.1, port=80
      |
      +-> Routes to one of:
          - 10.0.1.10:3000
          - 10.0.1.11:3000
          - 10.0.1.12:3000
    `
  },

  layer7: {
    name: 'Layer 7 (Application Layer)',
    protocols: ['HTTP', 'HTTPS', 'gRPC', 'WebSocket'],
    works_on: 'Request content (URLs, hostnames, headers, cookies)',
    
    characteristics: {
      speed: 'Slower - deep packet inspection',
      complexity: 'More complex - understands protocols',
      useCase: 'HTTP/HTTPS, session stickiness, URL routing',
      examples: ['Application Load Balancer (ALB)', 'HAProxy HTTP mode'],
      capabilities: [
        'Route based on URL path (/api/* -> api-servers)',
        'Route based on hostname (api.example.com -> api-servers)',
        'Route based on HTTP headers',
        'Route based on query parameters',
        'Modify requests/responses',
        'Implement API gateway features'
      ]
    },

    example: `
    [Client] 
      |
      | HTTP GET /api/users (Host: api.example.com)
      |
    [L7 LB] inspects:
      - URL path: /api/users
      - Hostname: api.example.com
      - Headers: Authorization, etc.
      |
      +-> Routes to API servers:
          - 10.0.2.10:3000
          - 10.0.2.11:3000
    `
  }
};

// AWS Load Balancer Types
const AWSLoadBalancers = {
  nlb: {
    name: 'Network Load Balancer',
    layer: 'Layer 4',
    throughput: 'Up to 100 Gbps',
    latency: 'Ultra-low (~100 microseconds)',
    useCases: [
      'Extreme performance requirements',
      'Non-HTTP protocols (TCP, UDP)',
      'IoT applications',
      'Gaming',
      'Real-time communications',
      'DNS services'
    ],
    config: {
      protocol: 'TCP/UDP',
      port: 3000,
      healthCheck: {
        enabled: true,
        interval: 10,
        timeout: 10,
        healthyThreshold: 3
      }
    },
    pricing: 'Pay per LCU (processed bytes)'
  },

  alb: {
    name: 'Application Load Balancer',
    layer: 'Layer 7',
    throughput: 'Up to 8,000 Mbps',
    latency: 'Moderate (~400 microseconds)',
    useCases: [
      'Web applications',
      'Content-based routing',
      'Microservices',
      'Container services (ECS, EKS)',
      'API services'
    ],
    config: {
      protocol: 'HTTP/HTTPS',
      port: 80,
      rules: [
        {
          pathPattern: '/api/*',
          targetGroup: 'api-servers'
        },
        {
          hostHeader: 'admin.example.com',
          targetGroup: 'admin-servers'
        },
        {
          httpHeader: { Authorization: 'Bearer *' },
          targetGroup: 'authenticated-users'
        }
      ],
      healthCheck: {
        path: '/health',
        statusCode: '200',
        interval: 30,
        timeout: 5,
        healthyThreshold: 2,
        unhealthyThreshold: 2
      }
    },
    pricing: 'Flat hourly + processed GB'
  },

  clb: {
    name: 'Classic Load Balancer',
    layer: 'Layer 4 & 7 (both)',
    note: 'Legacy - use NLB or ALB instead'
  }
};

// GCP Load Balancer Types
const GCPLoadBalancers = {
  tcp_ssl: {
    name: 'TCP/SSL Proxy Load Balancer',
    layer: 'Layer 4-7',
    use: 'Non-HTTP protocols'
  },

  http_https: {
    name: 'HTTP(S) Load Balancer',
    layer: 'Layer 7',
    use: 'Web and API applications',
    global: true,
    capabilities: [
      'URL rewriting',
      'Request/response transformation',
      'Protocol-aware load balancing'
    ]
  },

  network: {
    name: 'Network Load Balancer',
    layer: 'Layer 3-4',
    use: 'High throughput, low latency'
  }
};
```

---

## Load Balancing Algorithms

### Q3: Implement and compare different load balancing algorithms

**Answer:**

```javascript
/**
 * Load Balancing Algorithms
 */

class LoadBalancingAlgorithms {
  // 1. Round-Robin - Simple, equal distribution
  static roundRobin(servers) {
    let index = 0;
    
    return {
      select: () => {
        const server = servers[index];
        index = (index + 1) % servers.length;
        return server;
      }
    };
  }

  // 2. Weighted Round-Robin - Distribution based on server capacity
  static weightedRoundRobin(servers) {
    // servers = [{ ip: '...', weight: 3 }, { ip: '...', weight: 1 }]
    const expandedServers = [];
    
    for (const server of servers) {
      for (let i = 0; i < server.weight; i++) {
        expandedServers.push(server);
      }
    }

    let index = 0;
    
    return {
      select: () => {
        const server = expandedServers[index];
        index = (index + 1) % expandedServers.length;
        return server;
      }
    };
  }

  // 3. Least Connections - Route to server with fewest active connections
  static leastConnections(servers) {
    const connections = new Map();
    servers.forEach(s => connections.set(s.ip, 0));

    return {
      select: () => {
        let minServer = servers[0];
        let minConnections = connections.get(minServer.ip);

        for (const server of servers) {
          const connCount = connections.get(server.ip);
          if (connCount < minConnections) {
            minServer = server;
            minConnections = connCount;
          }
        }

        return minServer;
      },

      connectionOpened: (serverIp) => {
        connections.set(serverIp, connections.get(serverIp) + 1);
      },

      connectionClosed: (serverIp) => {
        connections.set(serverIp, Math.max(0, connections.get(serverIp) - 1));
      }
    };
  }

  // 4. IP Hash - Consistent routing based on client IP
  static ipHash(servers) {
    return {
      select: (clientIp) => {
        // Compute hash of client IP
        let hash = 0;
        for (let char of clientIp) {
          hash = ((hash << 5) - hash) + char.charCodeAt(0);
          hash = hash & hash; // Convert to 32-bit integer
        }

        const index = Math.abs(hash) % servers.length;
        return servers[index];
      }
    };
  }

  // 5. Least Response Time - Route to fastest server
  static leastResponseTime(servers) {
    const responseTimes = new Map();
    servers.forEach(s => responseTimes.set(s.ip, 0));

    return {
      select: () => {
        let fastestServer = servers[0];
        let minTime = responseTimes.get(fastestServer.ip) || Infinity;

        for (const server of servers) {
          const time = responseTimes.get(server.ip) || Infinity;
          if (time < minTime) {
            fastestServer = server;
            minTime = time;
          }
        }

        return fastestServer;
      },

      recordResponseTime: (serverIp, responseTime) => {
        // Exponential moving average
        const current = responseTimes.get(serverIp) || 0;
        const alpha = 0.7;
        responseTimes.set(serverIp, alpha * responseTime + (1 - alpha) * current);
      }
    };
  }

  // 6. Random - For simple scenarios
  static random(servers) {
    return {
      select: () => {
        return servers[Math.floor(Math.random() * servers.length)];
      }
    };
  }

  // 7. Consistent Hash - Maps to hash ring (for caching, distributed systems)
  static consistentHash(servers, replicas = 160) {
    const ring = new Map();
    const sortedKeys = [];

    // Build hash ring
    for (const server of servers) {
      for (let i = 0; i < replicas; i++) {
        const hash = this.hash(`${server.ip}:${i}`);
        ring.set(hash, server);
        sortedKeys.push(hash);
      }
    }

    sortedKeys.sort((a, b) => a - b);

    return {
      select: (key) => {
        const hash = this.hash(key);

        // Find first server with hash >= key hash
        for (const ringHash of sortedKeys) {
          if (ringHash >= hash) {
            return ring.get(ringHash);
          }
        }

        // Wrap around to first
        return ring.get(sortedKeys[0]);
      },

      addServer: (server) => {
        for (let i = 0; i < replicas; i++) {
          const hash = this.hash(`${server.ip}:${i}`);
          ring.set(hash, server);
          sortedKeys.push(hash);
        }
        sortedKeys.sort((a, b) => a - b);
      },

      removeServer: (server) => {
        for (let i = 0; i < replicas; i++) {
          const hash = this.hash(`${server.ip}:${i}`);
          ring.delete(hash);
        }
        sortedKeys.splice(0); // Clear array
        // Rebuild sorted keys
      }
    };
  }

  static hash(key) {
    let hash = 0;
    for (let char of key) {
      hash = ((hash << 5) - hash) + char.charCodeAt(0);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// Algorithm Comparison
const AlgorithmComparison = {
  roundRobin: {
    pros: ['Simple', 'Equal distribution'],
    cons: ['Ignores server capacity', 'Ignores current load'],
    bestFor: 'Uniform servers with similar capacity'
  },

  weightedRoundRobin: {
    pros: ['Accounts for server capacity'],
    cons: ['Still ignores current load'],
    bestFor: 'Servers with different capacities'
  },

  leastConnections: {
    pros: ['Adapts to current load', 'Handles variable request durations'],
    cons: ['Higher CPU overhead'],
    bestFor: 'Long-lived connections, variable request sizes'
  },

  ipHash: {
    pros: ['Session persistence without sticky sessions', 'Deterministic'],
    cons: ['Can be uneven if IPs not well distributed'],
    bestFor: 'Stateful apps, caching layers'
  },

  leastResponseTime: {
    pros: ['Optimal user experience', 'Adapts to server performance'],
    cons: ['Highest overhead', 'Requires latency measurement'],
    bestFor: 'Performance-critical applications'
  },

  consistentHash: {
    pros: ['Minimal redistribution on server changes', 'Works for distributed caching'],
    cons: ['More complex implementation'],
    bestFor: 'Caching, distributed systems, cache-aside pattern'
  }
};
```

---

## Implementation & Configuration

### Q4: Configure and implement load balancer with reverse proxy (HAProxy/Nginx)

**Answer:**

```javascript
/**
 * HAProxy Configuration for Production
 */

const HAProxyConfig = `
# HAProxy Production Configuration

global
  log /dev/log local0
  log /dev/log local1 notice
  chroot /var/lib/haproxy
  stats socket /run/haproxy/admin.sock mode 660 level admin
  stats timeout 30s
  
  # Security
  user haproxy
  group haproxy
  daemon
  maxconn 10000
  
  # SSL/TLS
  ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256
  ssl-default-bind-options ssl-min-ver TLSv1.2

defaults
  log     global
  mode    http
  option  httplog
  option  denylogin
  option  forwardfor
  option  http-keep-alive
  
  timeout connect 5000
  timeout client  50000
  timeout server  50000

# Stats endpoint
listen stats
  bind 127.0.0.1:8404
  stats enable
  stats uri /stats
  stats show-legends
  stats refresh 30s

# Backend HTTP servers
backend app_servers
  mode http
  option httpchk GET /health HTTP/1.1\\r\\nHost:\\ healthcheck
  balance leastconn
  
  server app1 10.0.1.10:3000 check inter 5000 fall 3 rise 2
  server app2 10.0.1.11:3000 check inter 5000 fall 3 rise 2
  server app3 10.0.1.12:3000 check inter 5000 fall 3 rise 2 weight 2
  
  # Session stickiness
  cookie SERVERID insert indirect nocache
  server app1 10.0.1.10:3000 check cookie app1
  server app2 10.0.1.11:3000 check cookie app2
  server app3 10.0.1.12:3000 check cookie app3

# Frontend (incoming connections)
frontend http_front
  bind *:80
  bind *:443 ssl crt /etc/haproxy/certs/cert.pem
  
  mode http
  option httpclose
  option forwardfor
  
  # Redirect HTTP to HTTPS
  redirect scheme https code 301 if !{ ssl_fc }
  
  # Logging
  log 127.0.0.1:514 local0 info
  
  # Rules
  acl is_api path_beg /api
  acl is_admin hdr(host) -i admin.example.com
  acl is_websocket path_beg /ws
  
  # Route based on rules
  use_backend api_servers if is_api
  use_backend admin_servers if is_admin
  use_backend websocket_servers if is_websocket
  default_backend app_servers

# Separate backend for API
backend api_servers
  mode http
  option httpchk GET /api/health HTTP/1.1\\r\\nHost:\\ api.example.com
  balance leastconn
  
  server api1 10.0.2.10:3000 check
  server api2 10.0.2.11:3000 check
  server api3 10.0.2.12:3000 check

# WebSocket backend (different timeout)
backend websocket_servers
  mode http
  balance roundrobin
  
  # Longer timeout for WebSocket connections
  timeout client 3600000
  timeout server 3600000
  
  option httpchk GET /ws/ping
  
  server ws1 10.0.3.10:3000 check
  server ws2 10.0.3.11:3000 check
`;

/**
 * Nginx Configuration
 */

const NginxConfig = `
# Nginx Load Balancer Configuration

upstream backend {
  # LRU pool with connection persistence
  keepalive 32;
  
  # Weighted round-robin
  server 10.0.1.10:3000 weight=1;
  server 10.0.1.11:3000 weight=1;
  server 10.0.1.12:3000 weight=2;
  
  # IP Hash for session stickiness
  # hash control.client_addr consistent;
}

upstream api_backend {
  least_conn; # Least connections algorithm
  
  server 10.0.2.10:3000;
  server 10.0.2.11:3000;
  server 10.0.2.12:3000;
}

# Main server block
server {
  listen 80;
  listen 443 ssl http2;
  server_name example.com www.example.com;
  
  # SSL configuration
  ssl_certificate /etc/nginx/certs/cert.pem;
  ssl_certificate_key /etc/nginx/certs/key.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;
  
  # Redirect HTTP to HTTPS
  if ($scheme != "https") {
    return 301 https://$server_name$request_uri;
  }
  
  # Logging
  access_log /var/log/nginx/access.log combined;
  error_log /var/log/nginx/error.log warn;
  
  # API routes
  location /api/ {
    proxy_pass http://api_backend;
    proxy_http_version 1.1;
    
    # Headers for backend
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Connection management
    proxy_set_header Connection "";
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }
  
  # WebSocket support
  location /ws/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    
    # WebSocket headers
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    
    # Long timeout
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
  }
  
  # Regular requests
  location / {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Connection "";
  }
  
  # Health check endpoint
  location /health {
    access_log off;
    return 200 "healthy\\n";
  }
}

# Admin server
server {
  listen 80;
  server_name admin.example.com;
  
  location / {
    proxy_pass http://10.0.2.10:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}

# Stats page
server {
  listen 8080;
  server_name _;
  
  location /stats {
    stub_status on;
    access_log off;
  }
}
`;
```

---

## High Availability & Failover

### Q5: Implement high availability with failover and session persistence

**Answer:**

```javascript
/**
 * High Availability & Failover Strategies
 */

class HighAvailabilityLoadBalancer {
  constructor(primaryLB, secondaryLB) {
    this.primaryLB = primaryLB;
    this.secondaryLB = secondaryLB;
    this.isHealthy = true;
    this.healthCheckInterval = 5000;
    this.failoverThreshold = 3;
    this.healthCheckFailures = 0;
  }

  startHealthCheck() {
    setInterval(() => {
      this.checkPrimaryHealth();
    }, this.healthCheckInterval);
  }

  async checkPrimaryHealth() {
    try {
      const response = await fetch(`http://${this.primaryLB.ip}/health`, {
        timeout: 3000
      });

      if (response.ok) {
        this.healthCheckFailures = 0;
        if (!this.isHealthy) {
          console.log('Primary LB restored');
          this.isHealthy = true;
          // Notify secondary
          this.notifyFailover('primary_restored');
        }
      } else {
        this.healthCheckFailures++;
      }
    } catch (error) {
      this.healthCheckFailures++;
    }

    // Trigger failover if threshold exceeded
    if (this.healthCheckFailures >= this.failoverThreshold) {
      this.triggerFailover();
    }
  }

  triggerFailover() {
    if (this.isHealthy) {
      console.error('Primary LB failed, triggering failover');
      this.isHealthy = false;

      // Update DNS to point to secondary
      this.updateDNS(this.secondaryLB.ip);

      // Notify about failover
      this.alertOperations({
        type: 'failover',
        from: this.primaryLB.ip,
        to: this.secondaryLB.ip
      });
    }
  }

  updateDNS(newIP) {
    // In production, this would update Route53, CloudFlare DNS, etc.
    console.log(`Updating DNS to point to ${newIP}`);
  }

  notifyFailover(event) {
    // Notification to secondary via heartbeat protocol
  }

  alertOperations(alertData) {
    // Send alert to monitoring system, Slack, PagerDuty
  }
}

// Session Persistence Methods
const SessionPersistenceMethods = {
  cookieBased: {
    name: 'Cookie-based stickiness',
    mechanism: 'LB sets cookie with server ID',
    example: `
    Set-Cookie: SERVERID=server1; Path=/
    
    Client sends back:
    Cookie: SERVERID=server1
    -> LB routes to server1
    `,
    pros: ['Works across LB restarts', 'Simple'],
    cons: ['Browser dependent', 'Client can modify']
  },

  sourceIP: {
    name: 'Source IP affinity',
    mechanism: 'Hash of client IP determines server',
    example: `
    md5(client_ip) % num_servers = server_index
    `,
    pros: ['Cannot be spoofed', 'Consistent'],
    cons: ['May be unbalanced if IPs concentrated']
  },

  jSessionId: {
    name: 'jsessionid-based (Java)',
    mechanism: 'Application session ID to route',
    example: `
    jsessionid=ABC123DEF456
    -> Extract 'ABC123' (encoded server ID)
    -> Route to corresponding server
    `,
    pros: ['Application aware', 'Fallback to IP hash'],
    cons: ['Requires parsing']
  },

  tokenBased: {
    name: 'Token/Ticket',
    mechanism: 'Token contains encrypted server ID',
    example: `
    Token = encrypt(server_id, secret_key)
    LB decrypts to find server
    `,
    pros: ['Secure', 'Can migrate across LBs'],
    cons: ['Requires encryption infrastructure']
  }
};
```

---

## Health Checks & Monitoring

### Q6: Implement comprehensive health checking and monitoring

**Answer:**

```javascript
/**
 * Advanced Health Checking
 */

class HealthCheckManager {
  constructor(servers, config = {}) {
    this.servers = servers;
    this.config = {
      checkInterval: config.checkInterval || 30000,
      timeout: config.timeout || 5000,
      healthyThreshold: config.healthyThreshold || 2,
      unhealthyThreshold: config.unhealthyThreshold || 3,
      checkPath: config.checkPath || '/health',
      ...config
    };
    
    this.serverStates = new Map();
    servers.forEach(s => {
      this.serverStates.set(s.ip, {
        healthy: true,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        lastCheck: null,
        lastBadCheck: null
      });
    });
  }

  startHealthChecks() {
    setInterval(() => this.performHealthChecks(), this.config.checkInterval);
    // Run immediately
    this.performHealthChecks();
  }

  async performHealthChecks() {
    const checks = this.servers.map(server => 
      this.checkServerHealth(server)
    );

    await Promise.all(checks);
  }

  async checkServerHealth(server) {
    const state = this.serverStates.get(server.ip);

    try {
      const response = await fetch(
        `http://${server.ip}:${server.port}${this.config.checkPath}`,
        { timeout: this.config.timeout }
      );

      if (response.ok) {
        this.recordSuccess(server);
        return { status: 'healthy' };
      } else {
        this.recordFailure(server);
        return { status: 'unhealthy', reason: `HTTP ${response.status}` };
      }
    } catch (error) {
      this.recordFailure(server);
      return { status: 'unhealthy', reason: error.message };
    }
  }

  recordSuccess(server) {
    const state = this.serverStates.get(server.ip);
    state.consecutiveSuccesses++;
    state.consecutiveFailures = 0;
    state.lastCheck = new Date();

    // Transition from unhealthy to healthy
    if (!state.healthy && state.consecutiveSuccesses >= this.config.healthyThreshold) {
      state.healthy = true;
      this.onServerHealthy(server);
    }
  }

  recordFailure(server) {
    const state = this.serverStates.get(server.ip);
    state.consecutiveFailures++;
    state.consecutiveSuccesses = 0;
    state.lastBadCheck = new Date();

    // Transition from healthy to unhealthy
    if (state.healthy && state.consecutiveFailures >= this.config.unhealthyThreshold) {
      state.healthy = false;
      this.onServerUnhealthy(server);
    }
  }

  onServerHealthy(server) {
    console.log(`Server ${server.ip} is now HEALTHY`);
    // Add back to load balancer pool
  }

  onServerUnhealthy(server) {
    console.log(`Server ${server.ip} is now UNHEALTHY`);
    // Remove from load balancer pool
    // Alert operations team
  }

  getHealthStatus() {
    const status = {};
    for (const [ip, state] of this.serverStates) {
      status[ip] = {
        healthy: state.healthy,
        lastCheck: state.lastCheck,
        lastBadCheck: state.lastBadCheck,
        consecutiveFailures: state.consecutiveFailures
      };
    }
    return status;
  }
}

// Monitoring & Metrics
class LoadBalancerMonitoring {
  constructor() {
    this.metrics = {
      requestsProcessed: 0,
      activeConnections: 0,
      totalDataTransferred: 0,
      errors: 0,
      latencies: []
    };
  }

  recordRequest(duration, dataSize, error = false) {
    this.metrics.requestsProcessed++;
    this.metrics.totalDataTransferred += dataSize;
    this.metrics.latencies.push(duration);

    if (error) {
      this.metrics.errors++;
    }

    // Keep only last 1000 latencies
    if (this.metrics.latencies.length > 1000) {
      this.metrics.latencies.shift();
    }
  }

  getMetrics() {
    return {
      requestsPerSecond: this.metrics.requestsProcessed / 60,
      activeConnections: this.metrics.activeConnections,
      averageLatency: this.getAverageLatency(),
      p99Latency: this.getPercentileLatency(99),
      errorRate: (this.metrics.errors / this.metrics.requestsProcessed * 100).toFixed(2),
      totalDataTransferred: this.metrics.totalDataTransferred
    };
  }

  getAverageLatency() {
    if (this.metrics.latencies.length === 0) return 0;
    const sum = this.metrics.latencies.reduce((a, b) => a + b, 0);
    return sum / this.metrics.latencies.length;
  }

  getPercentileLatency(percentile) {
    const sorted = [...this.metrics.latencies].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}
```

---

## Performance Optimization

### Q7: Optimize load balancer for maximum throughput and minimal latency

**Answer:**

```javascript
/**
 * Load Balancer Performance Optimizations
 */

const LoadBalancerOptimizations = {
  connectionPooling: {
    strategy: 'Reuse connections to backend servers',
    benefit: 'Reduce TCP handshake overhead',
    implementation: `
    Keep-Alive: Maintain persistent connections
    Max connections per server: 1000
    Connection timeout: 300 seconds
    `,
    impact: '50-70% latency reduction'
  },

  tcpOptimization: {
    tcpFastOpen: 'Send data in TCP handshake',
    tcpSackEnabled: 'Selective acknowledgments for faster recovery',
    tcpWinScaling: 'Enable window scaling for high-speed networks',
    impact: '10-20% throughput improvement'
  },

  bufferTuning: {
    sendBuffer: '262144 bytes (256KB)',
    receiveBuffer: '262144 bytes (256KB)',
    rationale: 'Larger buffers for high-throughput scenarios',
    measurement: 'BDP (Bandwidth-Delay Product)'
  },

  multipleListeningPorts: {
    strategy: 'Use multiple ports to handle more connections',
    example: [
      { port: 80, procesorsCount: 4 },
      { port: 8080, processorCount: 4 }
    ],
    benefit: 'Load distribution at port level'
  },

  bypassCompression: {
    strategy: 'Only compress when beneficial',
    rule: `
    if (request_size > 1KB && not binary_content){
      apply gzip/brotli
    } else {
      skip compression
    }
    `,
    benefit: 'Reduce CPU usage'
  },

  cpuAffinity: {
    strategy: 'Bind LB processes to CPUs',
    example: 'numactl --cpunodebind=0 haproxy',
    benefit: 'Better CPU cache utilization'
  },

  updateChecking: {
    strategy: 'Cache DNS lookups',
    ttl: '60 seconds',
    benefit: 'Avoid repeated DNS resolution'
  }
};
```

---

## Real-World Scenarios

### Q8: Handle complex real-world scenarios

**Answer:**

```javascript
/**
 * Real-World Load Balancer Scenarios
 */

const RealWorldScenarios = {
  scenario1: {
    name: 'Gradual Server Deployment',
    requirement: 'Deploy new version to 10% of users first',
    solution: `
    Use weighted load balancing:
    
    backend servers:
      server old_v1.0 10.0.1.10:3000 weight=9
      server new_v2.0 10.0.1.20:3000 weight=1
    
    # Route 90% to old version, 10% to new
    # Monitor metrics
    # If errors increase, keep weight at 10%
    # If errors stable, increase to 20%
    # Continue until 100% on new version
    `
  },

  scenario2: {
    name: 'A/B Testing',
    requirement: 'Route users to different versions for testing',
    solution: `
    Hash user ID or cookie to determine variant:
    
    if (user_id % 10 < 5) {
      backend variant_a;  # 50% users
    } else {
      backend variant_b;  # 50% users
    }
    
    Consistent routing: Same user always sees same variant
    `
  },

  scenario3: {
    name: 'Geographic Load Balancing',
    requirement: 'Route to nearest datacenter',
    solution: `
    Use Route53 or Cloudflare with geo-location:
    
    if (request from US West) {
      route to LB in US West
    } else if (request from EU) {
      route to LB in EU
    } else {
      route to LB in Asia
    }
    
    Reduces latency by ~100ms per region
    `
  },

  scenario4: {
    name: 'Blue-Green Deployment',
    requirement: 'Instant switchover with zero downtime',
    solution: `
    1. Blue environment (current, active)
    2. Green environment (new version, standby)
    3. Test green thoroughly
    4. Switch LB to route all traffic to green
    5. Keep blue for instant rollback
    
    Switchover is instantaneous (1 command)
    Rollback time: < 10 seconds
    `
  },

  scenario5: {
    name: 'Rate Limiting at LB Level',
    requirement: 'Protect backend from overload',
    solution: `
    // Implement token bucket at LB
    
    max_requests_per_second = 10000
    
    For each request:
      if (tokens > 0) {
        process_request()
        tokens--
      } else {
        return 429 Too Many Requests
      }
    
    Tokens refill at rate = max_requests_per_second
    `
  }
};
```

---

## Summary

**Key Takeaways for Senior Engineers:**

1. **Layer 4 vs Layer 7** - Choose based on protocol and routing needs
2. **Algorithms** - Different algorithms for different scenarios
3. **Session Persistence** - Essential for stateful applications
4. **Health Checks** - Automated failover is critical
5. **High Availability** - Always have redundancy
6. **Performance** - Connection pooling and TCP tuning matter
7. **Monitoring** - Observability is essential
8. **Gradual Deployment** - Weighted load balancing for safety
9. **Geographic Distribution** - Reduce latency with geo-routing
10. **Metrics** - Track latency, throughput, error rates
