# Microservices Security Interview Questions

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [API Security](#api-security)
3. [Service-to-Service Security](#service-to-service-security)
4. [Network Security](#network-security)
5. [Security Best Practices](#security-best-practices)

---

## Authentication & Authorization

### Q1. What is the difference between authentication and authorization?

**Answer:**

| Aspect | Authentication | Authorization |
|--------|---------------|---------------|
| **Purpose** | Verify identity | Verify permissions |
| **Question** | Who are you? | What can you do? |
| **Example** | Login with username/password | Access resources based on role |
| **Method** | JWT, OAuth, Session | RBAC, ABAC, Policies |
| **Timing** | First step | After authentication |

**Authentication Flow:**
```
User → Login → System verifies credentials → Issues token
```

**Authorization Flow:**
```
User → Request with token → System checks permissions → Allow/Deny
```

### Q2. What is OAuth 2.0 and how does it work?

**Answer:** OAuth 2.0 is an authorization framework that enables applications to obtain limited access to user accounts on an HTTP service.

            OAuth 2.0 is an authorization framework that enables third-party applications to obtain limited access to user resources without exposing user credentials. Primary use cases include granting access to APIs, enabling social logins, and allowing applications to act on behalf of users.

  SSO:  SSO is an authentication mechanism that allows users to access multiple applications or systems with a single set of login credentials. Benefits include improved user experience, centralized authentication management, and reduced password fatigue.

**Roles:**
1. **Resource Owner**: User who owns the data
2. **Client**: Application requesting access
3. **Authorization Server**: Issues access tokens
4. **Resource Server**: API that hosts the data

**Grant Types:**

**1. Authorization Code (Recommended)**
```
1. User → Client: Request access
2. Client → Auth Server: Redirect with client_id
3. User → Auth Server: Login & approve
4. Auth Server → Client: Redirect with authorization code
5. Client → Auth Server: Exchange code for access_token
6. Auth Server → Client: Return access_token
```

**2. Client Credentials (Service-to-service)**
```
1. Service → Auth Server: Send client_id + client_secret
2. Auth Server → Service: Return access_token
```

**3. Refresh Token**
```
1. Client → Auth Server: Send refresh_token
2. Auth Server → Client: Return new access_token
```

**Example:**
```javascript
// Authorization Code Flow
const authUrl = `https://auth.example.com/authorize?
  response_type=code&
  client_id=${CLIENT_ID}&
  redirect_uri=${REDIRECT_URI}&
  scope=read:write`;

// Exchange code for token
const tokenResponse = await fetch('https://auth.example.com/token', {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  })
});
```

### Q3. What is JWT (JSON Web Token)?

**Answer:** JWT is a compact, URL-safe means of representing claims to be transferred between two parties.

**Structure:**
```
Header.Payload.Signature
```

**Example:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**1. Header**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**2. Payload**
```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "iat": 1516239022,
  "exp": 1516242622
}
```

**3. Signature**
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

**Usage:**
```javascript
const jwt = require('jsonwebtoken');

// Generate token
const token = jwt.sign(
  { userId: 123, role: 'admin' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// Verify token
const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log(decoded.userId);  // 123
```

### Q4. What is the difference between access token and refresh token?

**Answer:**

| Aspect | Access Token | Refresh Token |
|--------|-------------|---------------|
| **Purpose** | Access API resources | Get new access tokens |
| **Lifetime** | Short (minutes/hours) | Long (days/months) |
| **Storage** | Memory, localStorage | HttpOnly cookie |
| **Usage** | Sent with API requests | Sent to auth server only |
| **Revocation** | Wait for expiration | Can be revoked |
| **Size** | Small | Larger |

**Flow:**
```
1. User logs in → Get access_token + refresh_token
2. Use access_token for API calls
3. When access_token expires:
   → Send refresh_token to auth server
   → Get new access_token
4. If refresh_token expires:
   → User must log in again
```

**Implementation:**
```javascript
// Login response
{
  "access_token": "eyJhbGci...",
  "refresh_token": "rt_abc123...",
  "expires_in": 3600
}

// Refresh token flow
async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://auth.example.com/token/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  
  const data = await response.json();
  return data.access_token;
}
```

---

## API Security

### Q5. What are the common API security vulnerabilities?

**Answer:**

**1. Broken Authentication**
- Weak passwords
- No account lockout
- Session fixation
- Credential stuffing

**2. Broken Access Control**
- IDOR (Insecure Direct Object References)
- Missing authorization checks
- Privilege escalation
- Exposed admin endpoints

**3. Injection Attacks**
- SQL Injection
- NoSQL Injection
- Command Injection
- XSS (Cross-Site Scripting) => a vulnerability that allows attackers to inject malicious scripts into web pages viewed by other users. Prevention methods                          include input validation and sanitization, encoding output data, implementing Content Security Policy (CSP), and using                            security libraries or frameworks that automatically escape inputs
- DDoS ( Distributed Denial of Service) - too many request hit a server
**4. Sensitive Data Exposure**
- No encryption
- Logging sensitive data
- Clear text passwords
- Exposed secrets

**5. Security Misconfiguration**
- Default credentials
- Unnecessary features enabled
- Verbose error messages
- Open CORS policy

**6. Insufficient Logging & Monitoring**
- No audit trail
- Missing security events
- No intrusion detection
- Poor incident response

### Q6. What is Rate Limiting and why is it important?

**Answer:** Rate limiting controls the number of requests a client can make to an API within a specific time period.

**Why important:**
- Prevent DDoS attacks
- Protect against brute force
- Ensure fair resource allocation
- Control costs
- Improve system stability

**Challenges**
- Granularity and Precision
- Handling Bursty Traffic


**Implementation strategies:**

**1. Token Bucket Algorithm**
  the amount of data transferred by continuously generating new tokens to comprise the bucket with certian time
```javascript
class RateLimiter {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.refillRate = refillRate;  // tokens per second
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  
  allowRequest() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    
    // Refill tokens
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    return false;
  }
}
```

**2. Sliding Window Log**
      namely the fixed window and the leaky bucket. It keeps a moving time frame and restricts the number of requests to be made within that frame
```javascript
class SlidingWindowRateLimiter {
  constructor(windowSize, maxRequests) {
    this.windowSize = windowSize;  // in milliseconds
    this.maxRequests = maxRequests;
    this.requests = new Map();  // userId -> timestamps[]
  }
  
  allowRequest(userId) {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Remove old requests outside window
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowSize
    );
    
    if (validRequests.length < this.maxRequests) {
      validRequests.push(now);
      this.requests.set(userId, validRequests);
      return true;
    }
    
    return false;
  }
}
```
**3. Leaky Bucket Algorithm**
    the bucket size is constant and has a leak that allows it to shrink in size progressively
**Express middleware example:**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

### Q7. What is API versioning and security considerations?

**Answer:** API versioning allows you to introduce breaking changes while supporting older versions.

**Versioning strategies:**

**1. URL Versioning**
```
/api/v1/users
/api/v2/users
```

**2. Header Versioning**
```
GET /api/users
Accept: application/vnd.myapi.v2+json
```

**3. Query Parameter**
```
/api/users?version=2
```

**Security considerations:**

**1. Deprecate old versions**
```javascript
app.use('/api/v1', (req, res, next) => {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', '2024-12-31');
  res.setHeader('Link', '</api/v2/users>; rel="successor-version"');
  next();
});
```

**2. Different security policies per version**
- v1: Basic auth
- v2: OAuth 2.0 + JWT

**3. Monitor usage**
```javascript
const versionUsage = {
  v1: 1000,
  v2: 5000
};

if (versionUsage.v1 < threshold) {
  deprecateVersion('v1');
}
```

### Q8. What is input validation and why is it important?

**Answer:** Input validation ensures that data received from users or other services meets expected criteria before processing.

**Why important:**
- Prevent injection attacks
- Ensure data integrity
- Improve error messages
- Protect against malformed data
- Validate business rules

**Types of validation:**

**1. Type Validation**
```javascript
function validateType(value, expectedType) {
  if (typeof value !== expectedType) {
    throw new Error(`Expected ${expectedType}, got ${typeof value}`);
  }
}
```

**2. Format Validation**
```javascript
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
}

function validateUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new Error('Invalid UUID format');
  }
}
```

**3. Length Validation**
```javascript
function validateLength(value, min, max) {
  if (value.length < min || value.length > max) {
    throw new Error(`Length must be between ${min} and ${max}`);
  }
}
```

**4. Range Validation**
```javascript
function validateRange(value, min, max) {
  if (value < min || value > max) {
    throw new Error(`Value must be between ${min} and ${max}`);
  }
}
```

**5. Whitelist Validation**
```javascript
const allowedRoles = ['user', 'admin', 'moderator'];

function validateRole(role) {
  if (!allowedRoles.includes(role)) {
    throw new Error(`Invalid role. Allowed: ${allowedRoles.join(', ')}`);
  }
}
```

**Sanitization:**
```javascript
const sanitizeHtml = require('sanitize-html');

function sanitizeInput(input) {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {}
  });
}
```

---

## Service-to-Service Security

### Q9. How do you secure service-to-service communication?

**Answer:**

**1. Mutual TLS (mTLS)**
- Both client and server have certificates
- Two-way authentication
- Encrypted communication

```yaml
# Istio mTLS example
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
spec:
  mtls:
    mode: STRICT
```

**2. JWT with Service Identity**
```javascript
// Service authenticates as itself
const serviceToken = jwt.sign({
  service: 'order-service',
  permissions: ['read:orders', 'create:orders']
}, process.env.SERVICE_SECRET);

// Service calls another service
const response = await fetch('http://inventory-service/items', {
  headers: {
    'Authorization': `Bearer ${serviceToken}`
  }
});
```

**3. Service Mesh Security**
- Automatic mTLS between services
- Fine-grained access control
- Service identity and policies

**4. API Keys**
```javascript
// Each service has unique API key
const response = await fetch('http://payment-service/charge', {
  headers: {
    'X-API-Key': process.env.PAYMENT_SERVICE_API_KEY
  }
});
```

### Q10. What is Mutual TLS (mTLS)?

**Answer:** Mutual TLS is a security protocol where both the client and server authenticate each other using digital certificates.

**How it works:**
```
1. Client → Server: Hello + Client Certificate
2. Server → Client: Hello + Server Certificate
3. Both verify each other's certificates
4. Both verify certificates are signed by trusted CA
5. Establish encrypted connection
```

**Benefits:**
- Two-way authentication
- Prevents man-in-the-middle attacks
- Service identity verification
- Secure communication

**Implementation with Istio:**
```yaml
# Enable mTLS for namespace
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: production
spec:
  mtls:
    mode: STRICT
```

**Implementation with Linkerd:**
```yaml
# Enable mTLS
apiVersion: policy.linkerd.io/v1beta1
kind: Server
metadata:
  name: order-service
spec:
  podSelector:
    matchLabels:
      app: order-service
  port: 8080
  proxyProtocol: mTLS
```

### Q11. What is Service Identity?

**Answer:** Service identity is a cryptographic identity assigned to a microservice that uniquely identifies it across the system.

**Components:**

**1. Service Account**
- Kubernetes service account
- Attached to pods
- Provides identity

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
---
apiVersion: v1
kind: Pod
metadata:
  name: order-service
spec:
  serviceAccountName: order-service
```

**2. Certificate Identity**
- X.509 certificate for service
- Contains service name
- Signed by CA

```json
{
  "subject": "spiffe://cluster.local/ns/production/sa/order-service",
  "issuer": "cluster.local"
}
```

**3. SPIFFE (SPIFFE ID)**
- Universal identity format
- Used in service mesh
```
spiffe://<trust domain>/ns/<namespace>/sa/<service account>
```

**Usage in authorization:**
```yaml
# Only allow order-service to call inventory-service
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-order-service
spec:
  selector:
    matchLabels:
      app: inventory-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/production/sa/order-service"]
```

---

## Network Security

### Q12. What is a Network Policy in Kubernetes?

**Answer:** Network policies control traffic flow between pods/services at the network level.

**Use cases:**
- Isolate microservices
- Restrict ingress/egress traffic
- Implement zero trust
- Control communication between namespaces

**Example:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: order-service-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: order-service
  
  policyTypes:
  - Ingress
  - Egress
  
  # Ingress rules (incoming traffic)
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-controllers
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 3000
  
  # Egress rules (outgoing traffic)
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 53  # DNS
```

### Q13. What is Zero Trust Security?

**Answer:** Zero Trust is a security model based on the principle "never trust, always verify."

**Core principles:**
1. **Verify explicitly**: Always authenticate and authorize
2. **Least privilege**: Minimum access required
3. **Assume breach**: Design for compromised systems

**Implementation in microservices:**

**1. Network Level**
```yaml
# Default deny all traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

**2. Service Level**
```yaml
# Require mTLS for all services
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
spec:
  mtls:
    mode: STRICT
```

**3. Application Level**
```javascript
// Verify every request
function verifyRequest(req) {
  const token = req.headers.authorization;
  const decoded = jwt.verify(token, SECRET);
  
  if (!hasPermission(decoded.userId, req.path, req.method)) {
    throw new Error('Access denied');
  }
}
```

**4. Workload Identity**
```yaml
# Each service has unique identity
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
automountServiceAccountToken: false
```

### Q14. What is a Web Application Firewall (WAF)?

**Answer:** WAF is a security solution that protects web applications from various attacks by filtering and monitoring HTTP traffic.

**Protection against:**
- SQL Injection
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- DDoS attacks
- File inclusion attacks
- Command injection

**Implementation options:**

**1. Cloud-based WAF**
- AWS WAF
- Cloudflare WAF
- Akamai WAF

**2. Self-hosted WAF**
- ModSecurity
- Nginx with OWASP rules
- Incapsula

**Example WAF rules:**
```nginx
# Nginx with ModSecurity
SecRuleEngine On

# Block SQL injection
SecRule ARGS "@detectSQLi" \
    "id:1001,phase:2,deny,status:403,msg:'SQL Injection Attack'"

# Block XSS
SecRule ARGS "@detectXSS" \
    "id:1002,phase:2,deny,status:403,msg:'XSS Attack'"

# Rate limiting
SecRule IP:REQUEST_COUNT "@gt 100" \
    "id:1003,phase:1,deny,status:429,msg:'Rate Limit Exceeded'"
```

**Integration with microservices:**
```
Internet → WAF → API Gateway → Microservices
```

---

## Security Best Practices

### Q15. What are the security best practices for microservices?

**Answer:**

**1. Secrets Management**
- Never hardcode secrets
- Use secret management tools
- Rotate secrets regularly
- Audit secret access

```bash
# Kubernetes secrets
kubectl create secret generic db-password \
  --from-literal=password='secret123'

# Use in pod
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-password
        key: password
```

**2. Principle of Least Privilege**
- Minimum required permissions
- Service-specific roles
- No shared credentials
- Regular permission reviews

**3. Defense in Depth**
- Multiple security layers
- Network security
- Application security
- Data security

**4. Secure Communication**
- Use HTTPS/TLS everywhere
- Implement mTLS between services
- Encrypt data at rest
- Use secure protocols

**5. Input Validation**
- Validate all inputs
- Sanitize user data
- Use parameterized queries
- Whitelist over blacklist

**6. Authentication & Authorization**
- Strong authentication (MFA)
- Fine-grained authorization
- Token expiration
- Session management

**7. Logging & Monitoring**
- Log security events
- Monitor for anomalies
- Alert on suspicious activity
- Audit trails

**8. Regular Updates**
- Keep dependencies updated
- Apply security patches
- Scan for vulnerabilities
- Use base images carefully

### Q16. How do you manage secrets in microservices?

**Answer:**

**1. Kubernetes Secrets**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-keys
type: Opaque
data:
  api-key: YWJjMTIz  # base64 encoded
  db-password: c2VjcmV0MTIz
```

**2. External Secret Stores**
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager

**Example with Vault:**
```javascript
const vault = require('node-vault')({
  endpoint: 'http://vault:8200',
  token: process.env.VAULT_TOKEN
});

async function getSecret(path) {
  const result = await vault.read(path);
  return result.data.data;
}

// Usage
const apiKey = await getSecret('secret/order-service/api-key');
```

**3. Environment Variables (with caution)**
```yaml
env:
  - name: API_KEY
    valueFrom:
      secretKeyRef:
        name: api-keys
        key: api-key
```

**4. Sealed Secrets**
```bash
# Encrypt secret
kubeseal --raw --name api-key --from-file=api-key=api-key.txt > sealed-secret.yaml
```

**5. External Secrets Operator**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-store
spec:
  provider:
    vault:
      server: "http://vault:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "auth/kubernetes"
          role: "external-secrets"
```

**Best practices:**
- Never commit secrets to Git
- Rotate secrets regularly
- Use different secrets per environment
- Audit secret access
- Encrypt secrets at rest
- Use ephemeral secrets where possible

### Q17. What is OWASP Top 10 and how does it apply to microservices?

**Answer:** OWASP Top 10 is a standard awareness document for developers and web application security.

**OWASP Top 10 (2021) applied to microservices:**

**1. Broken Access Control**
- Verify permissions on every request
- Implement proper RBAC/ABAC
- Prevent IDOR
- Secure API endpoints

```javascript
// Bad
app.get('/api/orders/:id', async (req, res) => {
  const order = await db.getOrder(req.params.id);  // No auth check!
});

// Good
app.get('/api/orders/:id', authenticate, authorize('order:read'), async (req, res) => {
  if (req.user.id !== order.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const order = await db.getOrder(req.params.id);
});
```

**2. Cryptographic Failures**
- Encrypt sensitive data
- Use strong algorithms
- Proper key management
- TLS everywhere

**3. Injection**
- Use parameterized queries
- Validate and sanitize input
- Use ORMs properly
- Limit database permissions

**4. Insecure Design**
- Security-first architecture
- Threat modeling
- Secure by default
- Defense in depth

**5. Security Misconfiguration**
- Remove default credentials
- Disable unused features
- Keep dependencies updated
- Secure configuration

**6. Vulnerable and Outdated Components**
- Regular dependency updates
- Vulnerability scanning
- Use SBOM
- Monitor CVEs

**7. Identification and Authentication Failures**
- Strong password policies
- MFA for sensitive operations
- Secure session management
- Proper token handling

**8. Software and Data Integrity Failures**
- Verify package integrity
- Secure CI/CD pipeline
- Immutable infrastructure
- Code signing

**9. Security Logging and Monitoring Failures**
- Log security events
- Monitor for anomalies
- Alert on suspicious activity
- Audit trails

**10. Server-Side Request Forgery (SSRF)**
- Validate and sanitize URLs
- Network segmentation
- Allowlist trusted domains
- Rate limiting

### Q18. How do you implement security in CI/CD pipeline?

**Answer:**

**1. Dependency Scanning**
```yaml
# GitHub Actions
- name: Run security audit
  run: npm audit

- name: Run Snyk security scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

**2. Container Image Scanning**
```yaml
- name: Build and scan Docker image
  run: |
    docker build -t myservice:${{ github.sha }} .
    trivy image myservice:${{ github.sha }}
```

**3. Static Application Security Testing (SAST)**
```yaml
- name: Run SAST scan
  uses: github/super-linter@v4
  env:
    DEFAULT_BRANCH: main
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**4. Infrastructure Scanning**
```yaml
- name: Terraform security scan
  run: |
    terraform init
    tfsec ./terraform
```

**5. Policy Enforcement**
```yaml
# OPA Gatekeeper
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: all-must-have-owner
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    labels: ["owner"]
```

**6. Secret Scanning**
```yaml
- name: Scan for secrets
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
```

**7. Compliance Checks**
```yaml
- name: Run compliance checks
  run: |
    sonar-scanner \
      -Dsonar.projectKey=myproject \
      -Dsonar.quality.gates.wait=true