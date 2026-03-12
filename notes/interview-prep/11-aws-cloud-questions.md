# AWS Cloud Interview Questions & Answers
## For 10+ Years Experienced Node.js Developer

---

## Table of Contents
1. [AWS Core Services](#aws-core-services)
2. [Serverless with Lambda](#serverless-with-lambda)
3. [Database Services](#database-services)
4. [Infrastructure as Code](#infrastructure-as-code)
5. [Cost Optimization](#cost-optimization)

---

## AWS Core Services

### Q1: Explain key AWS services and their use cases for Node.js applications.

**Answer:**

```javascript
/**
 * AWS Services for Node.js Applications
 */

const awsServices = {
  compute: {
    ec2: 'Elastic Compute Cloud - Virtual servers',
    lambda: 'AWS Lambda - Serverless functions',
    ecs: 'Elastic Container Service - Container orchestration',
    elasticBeanstalk: 'Elastic Beanstalk - Platform as a Service'
  },
  storage: {
    s3: 'Simple Storage Service - Object storage',
    ebs: 'Elastic Block Store - Block storage for EC2',
    efs: 'Elastic File System - Network file system'
  },
  database: {
    rds: 'Relational Database Service - Managed SQL databases',
    dynamodb: 'DynamoDB - NoSQL database',
    elasticache: 'ElastiCache - In-memory caching (Redis/Memcached)'
  },
  networking: {
    vpc: 'Virtual Private Cloud - Isolated network',
    alb: 'Application Load Balancer - Layer 7 load balancing',
    cloudfront: 'CloudFront - Content delivery network'
  },
  messaging: {
    sqs: 'Simple Queue Service - Message queue',
    sns: 'Simple Notification Service - Pub/sub messaging',
    msk: 'Managed Streaming for Kafka - Kafka clusters'
  }
};

// Deployment Architecture
const deploymentArchitectures = {
  traditional: {
    services: ['EC2', 'RDS', 'S3'],
    description: 'Traditional EC2-based deployment'
  },
  containerized: {
    services: ['ECS/EKS', 'ECR', 'ALB'],
    description: 'Container-based deployment'
  },
  serverless: {
    services: ['Lambda', 'API Gateway', 'DynamoDB', 'S3'],
    description: 'Serverless functions deployment'
  },
  paas: {
    services: ['Elastic Beanstalk'],
    description: 'Platform as a Service deployment'
  }
};
```

---

## Serverless with Lambda

### Q2: Implement a serverless API with Lambda and API Gateway.

**Answer:**

```javascript
// Lambda function for HTTP API
const handler = async (event) => {
  const path = event.path;
  const method = event.httpMethod;

  // Router
  const routes = {
    'GET /users': getUsers,
    'POST /users': createUser,
    'GET /users/{id}': getUser,
    'PUT /users/{id}': updateUser,
    'DELETE /users/{id}:'
  };

  const handler = routes[`${method} ${path}`];
  
  if (!handler) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not Found' })
    };
  }

  try {
    const result = await handler(event);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function getUsers(event) {
  // Extract query parameters
  const { page = '1', limit = '10' } = event.queryStringParameters || {};
  
  // Connect to DynamoDB
  const result = await dynamodbClient.scan({
    TableName: 'Users',
    Limit: parseInt(limit)
  }).promise();
  
  return {
    users: result.Items,
    count: result.Count
  };
}
```

---

## Summary

**Key Takeaways:**
1. **Lambda** - Serverless functions, pay-per-use
2. **API Gateway** - REST and WebSocket APIs
3. **DynamoDB** - NoSQL database, auto-scaling
4. **S3** - Object storage for files and media
5. **RDS** - Managed SQL databases
6. **ElastiCache** - In-memory caching layer
7. **CloudFront** - CDN for global distribution
8. **SQS/SNS** - Asynchronous messaging
9. **Infrastructure as Code** - Terraform, CloudFormation
10. **Cost optimization** - Right-sizing, spot instances