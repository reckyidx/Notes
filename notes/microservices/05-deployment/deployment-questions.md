# Microservices Deployment Interview Questions

## Table of Contents
1. [Containerization](#containerization)
2. [Orchestration](#orchestration)
3. [Deployment Strategies](#deployment-strategies)
4. [CI/CD Pipelines](#cicd-pipelines)
5. [Infrastructure as Code](#infrastructure-as-code)

---

## Containerization

### Q1. What is containerization and why use it for microservices?

**Answer:** Containerization is a form of operating system virtualization that packages applications with all their dependencies into lightweight, portable containers.

**Benefits for microservices:**
- **Portability**: Run anywhere (dev, test, prod)
- **Isolation**: Services don't interfere with each other
- **Consistency**: Same environment everywhere
- **Efficiency**: Lightweight compared to VMs
- **Scalability**: Easy to spawn new instances
- **Dependency Management**: All dependencies packaged together

**Docker vs VM:**
```
VM: Hardware → OS → Hypervisor → Guest OS → App
Container: Hardware → OS → Docker Engine → App
```

### Q2. What is Docker and how does it work?

**Answer:** Docker is a platform for developing, shipping, and running applications in containers.

**Key components:**
- **Dockerfile**: Instructions to build an image
- **Image**: Read-only template for containers
              

            They are executable packages(bundled with application code & dependencies, software packages, etc.) for the purpose of creating containers. Docker images can be deployed to any docker environment and the containers can be spun up there to run the application.

- **Container**: Running instance of an image
- **Docker Daemon**: Background service managing containers
- **Docker Registry**: Stores images (Docker Hub, ECR, GCR)

**Example Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

**Build and run:**
```bash
docker build -t order-service:1.0 .
docker run -p 3000:3000 order-service:1.0
```

### Q3. What are Docker multi-stage builds?

**Answer:** Multi-stage builds allow you to use multiple FROM statements in a Dockerfile, creating smaller final images by copying only needed artifacts.

**Benefits:**
- Smaller final image size
- Separate build and runtime dependencies
- Better security (no build tools in production)
- Faster deployment

**Example:**
```dockerfile
# Stage 1: Build
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
RUN npm ci --only=production
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Without multi-stage:** Image size ~800MB
**With multi-stage:** Image size ~150MB

### Q4. What is Docker Compose?

**Answer:** Docker Compose is a tool for defining and running multi-container Docker applications.

**Features:**
- Define services in docker-compose.yml
- Start all services with one command
- Manage networking between containers
- Configure volumes and environment variables
- Scale services easily

**Example docker-compose.yml:**
```yaml
version: '3.8'

services:
  order-service:
    build: ./order-service
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=postgres
    depends_on:
      - postgres

  inventory-service:
    build: ./inventory-service
    ports:
      - "3001:3000"
    depends_on:
      - mongo

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=secret
    volumes:
      - postgres-data:/var/lib/postgresql/data

  mongo:
    image: mongo:6
    volumes:
      - mongo-data:/data/db

volumes:
  postgres-data:
  mongo-data:
```

**Usage:**
```bash
docker-compose up -d      # Start all services
docker-compose down        # Stop all services
docker-compose scale order-service=3  # Scale service
```

---

## Orchestration

### Q5. What is Kubernetes?

**Answer:** Kubernetes (K8s) is an open-source container orchestration platform for automating deployment, scaling, and management of containerized applications.

**Key features:**
- **Self-healing**: Restarts failed containers
- **Auto-scaling**: Scale based on load
- **Load balancing**: Distributes traffic
- **Rolling updates**: Zero downtime deployments
- **Rollbacks**: Easy rollback to previous version
- **Service discovery**: Services find each other
- **Storage orchestration**: Manage persistent storage

**Architecture:**
```
Control Plane
  ├── API Server (front-end)
  ├── etcd (key-value store)
  ├── Scheduler (assigns pods to nodes)
  └── Controller Manager (maintains state)

Worker Nodes
  ├── Kubelet (agent)
  ├── Kube-proxy (network proxy)
  └── Container Runtime (Docker, containerd)
```

### Q6. What are the key Kubernetes concepts?

**Answer:**

**1. Pod**
- Smallest deployable unit
- Contains one or more containers
- Shared network and storage
- Ephemeral (can be recreated)

**2. Deployment**
- Manages replica sets
- Declares desired state
- Handles updates and rollbacks

**3. Service**
- Stable network endpoint for pods
- Load balancing across pods
- Service discovery via DNS

**4. ConfigMap & Secret**
- Configuration data
- Secrets for sensitive data
- Mounted as volumes or environment variables

**5. Namespace**
- Virtual cluster within cluster
- Resource isolation
- Multi-tenancy

**Example Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
      - name: order-service
        image: order-service:1.0
        ports:
        - containerPort: 3000
        env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: db-host
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

### Q7. What is the difference between Docker Swarm and Kubernetes?

**Answer:**

| Aspect | Docker Swarm | Kubernetes |
|--------|-------------|------------|
| **Complexity** | Simple | Complex |
| **Learning Curve** | Low | High |
| **Setup** | Easy | Difficult |
| **Scaling** | Basic | Advanced |
| **Self-healing** | Limited | Comprehensive |
| **Rolling Updates** | Yes | Yes |
| **Rollbacks** | Manual | Automatic |
| **Load Balancing** | Built-in | Multiple options |
| **Monitoring** | Limited | Rich ecosystem |
| **Ecosystem** | Small | Large |
| **Best For** | Small deployments | Production, large scale |

**When to use Docker Swarm:**
- Simple applications
- Small teams
- Quick setup required
- Learning purposes

**When to use Kubernetes:**
- Production workloads
- Complex applications
- Large teams
- Need advanced features

### Q8. What is a Kubernetes namespace?

**Answer:** A namespace is a virtual cluster within a Kubernetes cluster that provides scope for names and resource isolation.

**Use cases:**
1. **Multi-tenant environments**: Separate teams/departments
2. **Environment separation**: dev, staging, prod
3. **Resource limits**: CPU, memory quotas per namespace
4. **Network policies**: Isolate network traffic
5. **RBAC**: Different permissions per namespace

**Example:**
```yaml
# Create namespace
apiVersion: v1
kind: Namespace
metadata:
  name: production

# Resource quota for namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-resources
  namespace: production
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
```

**Use namespaces:**
```bash
kubectl create namespace production
kubectl get pods --namespace=production
kubectl config set-context --current --namespace=production
```

---

## Deployment Strategies

### Q9. What are the different deployment strategies?

**Answer:**

**1. Rolling Update**
- Gradually replace old instances with new ones
- Zero downtime
- Gradual rollout
- Easy rollback

**2. Blue-Green Deployment**
- Run two identical environments (blue, green)
- Switch traffic from blue to green
- Instant rollback
- Requires 2x resources

**3. Canary Deployment**
- Deploy new version to small subset of users
- Monitor and gradually increase traffic
- Reduce risk
- A/B testing

**4. A/B Testing**
- Deploy different versions to different users
- Test features
- Measure performance
- Data-driven decisions

**5. Shadow Deployment**
- Deploy new version without traffic
- Mirror production traffic
- Test in production
- No user impact

### Q10. How does rolling update work?

**Answer:** Rolling update gradually replaces old pods with new ones while maintaining availability.

**Process:**
1. Create new replica set with new version
2. Scale up new replicas
3. Scale down old replicas
4. Repeat until all old pods replaced
5. Can pause/rollback at any point

**Kubernetes rolling update:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Can create 1 extra pod
      maxUnavailable: 1  # Can have 1 pod unavailable
  template:
    spec:
      containers:
      - image: order-service:v2
```

**Update process:**
```
Initial: 4 pods of v1
Step 1:  Create 1 pod of v2 (5 total: 4 v1 + 1 v2)
Step 2:  Terminate 1 pod of v1 (4 total: 3 v1 + 1 v2)
Step 3:  Create 1 pod of v2 (5 total: 3 v1 + 2 v2)
Step 4:  Terminate 1 pod of v1 (4 total: 2 v1 + 2 v2)
...
Final:   4 pods of v2
```

**Rollback:**
```bash
kubectl rollout undo deployment/order-service
kubectl rollout history deployment/order-service
```

### Q11. How does blue-green deployment work?

**Answer:** Blue-green deployment runs two identical production environments and switches traffic between them.

**Process:**
1. Blue environment running v1 (100% traffic)
2. Deploy v2 to green environment
3. Test green environment
4. Switch traffic to green (100% to v2)
5. Keep blue for rollback
6. Decommission blue after success

**Kubernetes implementation:**
```yaml
# Blue deployment (current)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service-blue
spec:
  replicas: 3
  template:
    metadata:
      labels:
        version: v1
    spec:
      containers:
      - image: order-service:v1

---
# Green deployment (new)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service-green
spec:
  replicas: 3
  template:
    metadata:
      labels:
        version: v2
    spec:
      containers:
      - image: order-service:v2

---
# Service pointing to blue
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    version: v1  # Change to v2 to switch
  ports:
  - port: 80
    targetPort: 3000
```

**Switch traffic:**
```bash
# Update service to point to green
kubectl patch service order-service -p '{"spec":{"selector":{"version":"v2"}}}'
```

**Pros:**
- Instant rollback (switch service selector)
- Zero downtime
- Easy testing

**Cons:**
- Requires 2x infrastructure
- Higher cost
- Database migration complexity

### Q12. How does canary deployment work?

**Answer:** Canary deployment routes a small percentage of traffic to the new version and gradually increases based on health metrics.

**Process:**
1. Deploy v2 alongside v1
2. Route 1% traffic to v2
3. Monitor metrics (errors, latency)
4. Gradually increase traffic (5%, 10%, 25%, 50%, 100%)
5. Rollback if issues detected

**Kubernetes with Istio:**
```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: order-service
spec:
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: order-service
        subset: v2
  - route:
    - destination:
        host: order-service
        subset: v1
      weight: 95
    - destination:
        host: order-service
        subset: v2
      weight: 5
```

**Weight-based traffic shifting:**
```bash
# Initial: 95% v1, 5% v2
# After validation: 80% v1, 20% v2
# After validation: 50% v1, 50% v2
# After validation: 100% v2
```

**Metrics to monitor:**
- Error rate
- Response time (p95, p99)
- CPU/memory usage
- Business metrics (conversion, revenue)

**Pros:**
- Reduced risk
- Data-driven rollout
- Fast rollback
- A/B testing

**Cons:**
- Complex setup
- Need monitoring
- Longer deployment time

---

## CI/CD Pipelines

### Q13. What is CI/CD?

**Answer:** CI/CD is a method to frequently deliver apps to customers by introducing automation into the stages of app development.

**CI (Continuous Integration):**
- Developers frequently merge code
- Automated builds and tests
- Early bug detection
- Fast feedback

**CD (Continuous Delivery/Deployment):**
- Automated deployment to production
- Continuous Delivery: Manual approval
- Continuous Deployment: Fully automatic

**Pipeline stages:**
```
1. Code → Developer commits
2. Build → Compile, package
3. Test → Unit, integration tests
4. Release → Create artifacts
5. Deploy → Staging/production
6. Monitor → Health checks, metrics
```

### Q14. What are the best practices for CI/CD in microservices?

**Answer:**

**1. Independent Service Pipelines**
- Each service has its own pipeline
- Trigger on service-specific changes
- Don't build all services for every change

**2. Fast Feedback**
- Unit tests in pipeline
- Stop early on failure
- Parallel execution

**3. Environment Parity**
- Dev, staging, prod are identical
- Infrastructure as code
- Container-based deployments

**4. Immutable Infrastructure**
- Never update running servers
- Replace with new instances
- Trackable deployments

**5. Feature Flags**
- Deploy code without enabling features
- Gradual rollout
- Instant rollback

**Example GitHub Actions pipeline:**
```yaml
name: Order Service CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'order-service/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd order-service && npm ci
      
      - name: Run tests
        run: cd order-service && npm test
      
      - name: Build
        run: cd order-service && npm run build

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Docker image
        run: |
          docker build -t order-service:${{ github.sha }} ./order-service
          docker tag order-service:${{ github.sha }} order-service:latest
      
      - name: Push to registry
        run: |
          echo ${{ secrets.REGISTRY_PASSWORD }} | docker login -u ${{ secrets.REGISTRY_USER }} --password-stdin
          docker push order-service:${{ github.sha }}
          docker push order-service:latest

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/order-service \
            order-service=order-service:${{ github.sha }}
```

### Q15. How do you handle database migrations in CI/CD?

**Answer:**

**Strategies for database migrations:**

**1. Versioned Migrations**
- Use migration tools (Flyway, Liquibase, Prisma)
- Version number in migration file
- Track applied migrations

**Example with Prisma:**
```prisma
// migrations/20240101_create_users/migration.sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE
);
```

**2. Backward Compatible Migrations**
- Never break old code
- Add new columns before removing old ones
- Use feature flags

```sql
-- Step 1: Add new column (nullable)
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);

-- Deploy new code (reads both columns)

-- Step 2: Migrate data
UPDATE users SET full_name = name;

-- Deploy new code (writes to new column)

-- Step 3: Make new column required
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;

-- Step 4: Remove old column
ALTER TABLE users DROP COLUMN name;
```

**3. Zero Downtime Migrations**
- Use online schema changes
- Avoid long-running locks
- Test in staging first

**Pipeline integration:**
```yaml
deploy:
  steps:
    - name: Run database migrations
      run: |
        kubectl run migration-job \
          --image=migration-tool:latest \
          --env=DB_HOST=postgres \
          --restart=OnFailure
    
    - name: Wait for migrations
      run: kubectl wait --for=condition=complete job/migration-job
    
    - name: Deploy application
      run: kubectl set image deployment/order-service ...
```

**4. Rollback Strategy**
- Keep migration scripts reversible
- Test rollback in staging
- Document rollback procedure

### Q16. What are feature flags?

**Answer:** Feature flags (feature toggles) allow you to enable/disable functionality without deploying new code.

**Benefits:**
- Deploy without releasing
- Gradual rollout
- A/B testing
- Instant rollback (disable flag)
- Kill switch for emergencies

**Types:**

**1. Release Flags**
- Temporary flags for new features
- Removed after feature is stable

**2. Ops Flags**
- Permanent flags for operational control
- Disable features during incidents

**3. Experiment Flags**
- A/B testing
- Gradual rollout

**Implementation:**
```javascript
// Feature flag service
class FeatureFlagService {
  async isEnabled(feature, userId) {
    const flag = await redis.get(`flag:${feature}`);
    
    if (!flag) return false;
    
    const config = JSON.parse(flag);
    
    // Check user percentage
    if (config.percentage < 100) {
      const hash = crypto.createHash('md5')
        .update(userId + feature)
        .digest('hex');
      const score = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
      return score < (config.percentage / 100);
    }
    
    // Check allow list
    if (config.allowList && config.allowList.includes(userId)) {
      return true;
    }
    
    return config.enabled;
  }
}

// Usage in code
const newCheckoutEnabled = await featureFlags.isEnabled('new-checkout', userId);

if (newCheckoutEnabled) {
  await processNewCheckout(order);
} else {
  await processOldCheckout(order);
}
```

**Best practices:**
- Remove old flags after rollout
- Don't overuse (technical debt)
- Test with flags on/off
- Monitor flag usage
- Central flag management

---

## Infrastructure as Code

### Q17. What is Infrastructure as Code (IaC)?

**Answer:** Infrastructure as Code is the practice of managing and provisioning infrastructure through machine-readable definition files, rather than physical hardware configuration or interactive configuration tools.

**Benefits:**
- Version control for infrastructure
- Reproducible environments
- Faster provisioning
- Reduced configuration drift
- Documentation as code

**Tools:**
- **Terraform**: Multi-cloud, declarative
- **CloudFormation**: AWS only
- **Pulumi**: Programming languages
- **Ansible**: Configuration management

**Example Terraform:**
```hcl
# provider.tf
provider "aws" {
  region = "us-east-1"
}

# vpc.tf
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  
  tags = {
    Name = "microservices-vpc"
  }
}

# ecs.tf
resource "aws_ecs_cluster" "main" {
  name = "microservices-cluster"
}

resource "aws_ecs_task_definition" "order_service" {
  family                   = "order-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  
  cpu    = 256
  memory = 512
  
  container_definitions = jsonencode([
    {
      name      = "order-service"
      image     = "order-service:latest"
      cpu       = 256
      memory    = 512
      essential = true
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
    }
  ])
}

# output.tf
output "cluster_id" {
  value = aws_ecs_cluster.main.id
}
```

**Usage:**
```bash
terraform init
terraform plan
terraform apply
terraform destroy
```

### Q18. What is the difference between declarative and imperative IaC?

**Answer:**

| Aspect | Declarative | Imperative |
|--------|------------|-----------|
| **Focus** | What state you want | How to achieve state |
| **Example** | Terraform, CloudFormation | Ansible, Chef, Puppet |
| **Idempotency** | Built-in | Must be coded |
| **Learning Curve** | Lower | Higher |
| **Complexity** | Simple for common cases | More flexible |
| **State Management** | Maintains state | Usually no state |

**Declarative example (Terraform):**
```hcl
resource "aws_instance" "web" {
  ami           = "ami-12345678"
  instance_type = "t2.micro"
  
  tags = {
    Name = "web-server"
  }
}
```

**Imperative example (Ansible):**
```yaml
- name: Create EC2 instance
  ec2_instance:
    image_id: ami-12345678
    instance_type: t2.micro
    tags:
      Name: web-server
    wait: yes
```

**When to use:**
- **Declarative**: Most infrastructure, cloud resources
- **Imperative**: Complex configuration, OS-level tasks

### Q19. What is configuration drift?

**Answer:** Configuration drift occurs when the actual state of infrastructure diverges from the desired state defined in IaC.

**Causes:**
- Manual changes to production
- Unauthorized modifications
- Inconsistent updates
- Drift over time

**Prevention:**
```yaml
# Terraform with drift detection
terraform plan -refresh-only

# Detects changes:
# # aws_instance.web will be updated in-place
#   ~ tags.Name = "web-server-prod" -> "web-server"
```

**Solutions:**

**1. Automated Drift Detection**
- Run regularly (e.g., daily)
- Alert on drift
- Auto-remediate or manual review

**2. Immutable Infrastructure**
- Never modify running instances
- Replace instead of update
- Prevents manual changes

**3. Access Control**
- Limit SSH access to production
- Require approval for changes
- Audit all modifications

**4. State Locking**
```bash
# Terraform state locking
terraform {
  backend "s3" {
    bucket         = "terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}
```

### Q20. What is GitOps?

**Answer:** GitOps is an operational framework that uses Git as the single source of truth for infrastructure and application deployments.

**Key principles:**
1. **Declarative**: Infrastructure defined in Git
2. **Versioned**: All changes committed to Git
3. **Pulled Automatically**: Agents sync desired state
4. **Continuous Reconciliation**: Agents detect and fix drift

**Workflow:**
```
1. Developer makes change → Git commit/PR
2. CI/CD validates change
3. Merge to main branch
4. GitOps operator detects change
5. Operator applies change to cluster
6. Operator monitors and reconciles drift
```

**Tools:**
- **ArgoCD**: Kubernetes GitOps
- **Flux**: Kubernetes GitOps
- **Weaveworks**: Enterprise GitOps

**Example ArgoCD Application:**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: order-service
  namespace: argocd
spec:
  project: default
  
  source:
    repoURL: https://github.com/org/infrastructure.git
    targetRevision: HEAD
    path: k8s/order-service
  
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

**Benefits:**
- Audit trail in Git
- Rollback with git revert
- Prevent manual changes (self-heal)
- Git-based review process
- Consistent across environments