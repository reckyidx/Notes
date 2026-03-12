# Authentication & Security Interview Questions & Answers
## For 10+ Years Experienced Node.js Developer

---

## Table of Contents
1. [Authentication Methods](#authentication-methods)
2. [Authorization](#authorization)
3. [Security Best Practices](#security-best-practices)
4. [JWT Implementation](#jwt-implementation)
5. [Complex Scenarios](#complex-scenarios)

---

## Authentication Methods

### Q1: Implement JWT-based authentication with refresh tokens.

**Answer:**

```javascript
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthService {
  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET;
    this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
    this.accessTokenExpiry = '15m';
    this.refreshTokenExpiry = '7d';
  }

  generateTokens(user) {
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpiry }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, tokenId: crypto.randomUUID() },
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry }
    );

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.accessTokenSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      }
      throw new Error('Invalid access token');
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.refreshTokenSecret);
      
      // Check if token is blacklisted
      if (await this.isTokenBlacklisted(decoded.tokenId)) {
        throw new Error('Refresh token has been revoked');
      }

      // Get fresh user data
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { userId: user.id, role: user.role },
        this.accessTokenSecret,
        { expiresIn: this.accessTokenExpiry }
      );

      return { accessToken };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async logout(refreshToken) {
    const decoded = jwt.verify(refreshToken, this.refreshTokenSecret);
    await this.blacklistToken(decoded.tokenId);
  }

  async blacklistToken(tokenId) {
    // Store in Redis with TTL matching token expiry
    await redis.setex(`blacklist:${tokenId}`, 7 * 24 * 3600, '1');
  }

  async isTokenBlacklisted(tokenId) {
    return await redis.exists(`blacklist:${tokenId}`);
  }
}
```

---

## Authorization

### Q2: Implement role-based access control (RBAC).

**Answer:**

```javascript
const ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user'
};

const PERMISSIONS = {
  users: {
    read: ['admin', 'moderator'],
    write: ['admin'],
    delete: ['admin']
  },
  posts: {
    read: ['admin', 'moderator', 'user'],
    write: ['admin', 'moderator'],
    delete: ['admin']
  },
  comments: {
    read: ['admin', 'moderator', 'user'],
    write: ['admin', 'moderator', 'user'],
    delete: ['admin', 'moderator']
  }
};

class AuthorizationService {
  hasPermission(role, resource, action) {
    const resourcePermissions = PERMISSIONS[resource];
    if (!resourcePermissions) {
      return false;
    }

    const actionPermissions = resourcePermissions[action];
    if (!actionPermissions) {
      return false;
    }

    return actionPermissions.includes(role);
  }

  requirePermission(resource, action) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (this.hasPermission(req.user.role, resource, action)) {
        next();
      } else {
        res.status(403).json({ error: 'Insufficient permissions' });
      }
    };
  }

  requireRole(...allowedRoles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (allowedRoles.includes(req.user.role)) {
        next();
      } else {
        res.status(403).json({ error: 'Insufficient permissions' });
      }
    };
  }
}
```

---

## Advanced Security Patterns

### Q3: Implement zero-trust architecture and OAuth2/OIDC for enterprise applications.

**Answer:**

**1. Zero-Trust Architecture**

```javascript
class ZeroTrustAuthenticator {
  constructor(config) {
    this.config = config;
    this.trustedProviders = new Set();
    this.riskScorer = new RiskScorer();
  }

  async authenticate(request) {
    // Never trust the request by default
    const riskScore = await this.assessRisk(request);

    if (riskScore > this.config.riskThreshold) {
      // Require additional verification
      return await this.requireMFA(request);
    }

    // Validate every request
    return {
      isValid: true,
      riskScore,
      requiresMFA: riskScore > this.config.mfaThreshold
    };
  }

  async assessRisk(request) {
    let riskScore = 0;

    // Device risk
    if (!await this.isDeviceTrusted(request.deviceId)) {
      riskScore += 30;
    }

    // Location risk
    if (this.isAnomalousLocation(request.location, request.userId)) {
      riskScore += 25;
    }

    // IP reputation
    const ipReputation = await this.checkIPReputation(request.ip);
    riskScore += ipReputation.riskScore;

    // Time-based risk
    if (this.isAnomalousTime(request.timestamp, request.userId)) {
      riskScore += 15;
    }

    // Behavior analysis
    const behaviorRisk = await this.analyzeBehavior(request.userId, request);
    riskScore += behaviorRisk;

    return Math.min(riskScore, 100);
  }

  async isDeviceTrusted(deviceId) {
    // Check device fingerprint, certificate
    const trusted = await redis.exists(`trusted_device:${deviceId}`);
    return trusted === 1;
  }

  isAnomalousLocation(location, userId) {
    // Check if location is significantly different from usual
    // Could use geohashing, distance calculations
    return false; // Simplified
  }

  async checkIPReputation(ip) {
    // Check against threat intelligence feeds
    const reputation = await threatIntelAPI.checkIP(ip);
    return {
      riskScore: reputation.maliciousCount > 5 ? 40 : 0,
      isMalicious: reputation.maliciousCount > 10
    };
  }

  isAnomalousTime(timestamp, userId) {
    // Check if login time is unusual for user
    return false; // Simplified
  }

  async analyzeBehavior(userId, request) {
    // ML-based behavior analysis
    const result = await behaviorAnalysisService.predict(userId, request);
    return result.anomalyScore || 0;
  }

  async requireMFA(request) {
    const mfaMethods = await this.getAvailableMFAMethods(request.userId);
    
    // Send challenge
    await this.sendMFAChallenge(request.userId, mfaMethods[0]);

    return {
      requiresMFA: true,
      challenge: mfaMethods[0],
      timeout: 300 // 5 minutes
    };
  }
}
```

**2. OAuth2/OIDC Implementation**

```javascript
const { Issuer, generators } = require('openid-client');

class OAuth2OIDCProvider {
  constructor(config) {
    this.config = config;
    this.clients = new Map();
  }

  async initializeProvider() {
    // Discover provider metadata
    const issuer = await Issuer.discover(this.config.issuerURL);
    
    const client = new issuer.Client({
      client_id: this.config.clientID,
      client_secret: this.config.clientSecret,
      redirect_uris: [this.config.redirectURI],
      response_types: ['code'],
      grant_types: ['authorization_code', 'refresh_token']
    });

    this.client = client;
  }

  // Authorization Code Flow (most secure)
  generateAuthorizationURL(state, nonce) {
    return this.client.authorizationUrl({
      scope: 'openid profile email',
      state,
      nonce,
      prompt: 'login', // Force re-authentication
      max_age: 3600,
      ui_locales: 'en-US'
    });
  }

  async handleCallback(code, state, nonce) {
    // Verify state
    const storedState = await redis.get(`oauth_state:${state}`);
    if (!storedState) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for tokens
    const tokenSet = await this.client.callback(
      this.config.redirectURI,
      { code, state },
      { state, nonce }
    );

    // Verify ID token
    const verified = await this.client.validateIdToken(tokenSet);

    return {
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token,
      idToken: tokenSet.id_token,
      userInfo: verified
    };
  }

  // Client Credentials Flow (for service-to-service)
  async getServiceToken() {
    const tokenSet = await this.client.grant({
      grant_type: 'client_credentials',
      scope: 'api'
    });

    return tokenSet.access_token;
  }

  // Resource Owner Password Credentials (Legacy, less secure)
  async getLegacyToken(username, password) {
    // Only use for legacy systems
    const tokenSet = await this.client.grant({
      grant_type: 'password',
      username,
      password,
      scope: 'openid profile'
    });

    return tokenSet;
  }
}
```

**3. Secrets Management**

```javascript
const AWS = require('aws-sdk');

class SecretsManager {
  constructor() {
    this.sm = new AWS.SecretsManager();
    this.cache = new Map();
  }

  async getSecret(secretName, cacheTTL = 3600) {
    // Check cache first
    const cached = this.cache.get(secretName);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const result = await this.sm.getSecretValue({ SecretId: secretName }).promise();
      
      const secret = result.SecretString || result.SecretBinary;

      // Cache with TTL
      this.cache.set(secretName, {
        value: secret,
        expiresAt: Date.now() + (cacheTTL * 1000)
      });

      return secret;
    } catch (error) {
      if (cached) {
        console.warn(`Using stale cached secret for ${secretName}`);
        return cached.value;
      }
      throw error;
    }
  }

  async rotateSecret(secretName) {
    // Initiate rotation
    await this.sm.rotateSecret({
      SecretId: secretName,
      RotationRules: {
        AutomaticallyAfterDays: 30
      }
    }).promise();

    // Invalidate cache
    this.cache.delete(secretName);
  }

  // Encryption at rest
  async encryptSecret(plaintext, keyId) {
    const kms = new AWS.KMS();
    const result = await kms.encrypt({
      KeyId: keyId,
      Plaintext: plaintext
    }).promise();

    return result.CiphertextBlob.toString('base64');
  }

  async decryptSecret(ciphertext, keyId) {
    const kms = new AWS.KMS();
    const result = await kms.decrypt({
      CiphertextBlob: Buffer.from(ciphertext, 'base64')
    }).promise();

    return result.Plaintext.toString();
  }
}
```

**4. API Key Management**

```javascript
class APIKeyManager {
  constructor(db) {
    this.db = db;
  }

  async generateAPIKey(userId, keyName, expiresIn = 90) {
    const key = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    const expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);

    await this.db.query(
      `INSERT INTO api_keys (user_id, key_hash, key_name, expires_at, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, hash, keyName, expiresAt]
    );

    // Return unhashed key (only shown once)
    return {
      apiKey: key,
      createdAt: new Date(),
      expiresAt,
      warning: 'Save this key securely. You will not be able to see it again.'
    };
  }

  async validateAPIKey(key) {
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    const { rows } = await this.db.query(
      `SELECT user_id, key_name, expires_at, last_used_at
       FROM api_keys
       WHERE key_hash = $1
       AND expires_at > NOW()
       AND revoked_at IS NULL`,
      [hash]
    );

    if (rows.length === 0) {
      return { valid: false };
    }

    const keyData = rows[0];

    // Rate limit by key
    await this.enforceRateLimit(keyData.user_id, key);

    // Update last used
    await this.db.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1',
      [hash]
    );

    return {
      valid: true,
      userId: keyData.user_id,
      keyName: keyData.key_name,
      expiresAt: keyData.expires_at
    };
  }

  async revokeAPIKey(userId, keyId) {
    await this.db.query(
      `UPDATE api_keys
       SET revoked_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [keyId, userId]
    );
  }

  async enforceRateLimit(userId, key) {
    // Implement rate limiting per API key
    const rateLimitKey = `api_key_ratelimit:${hashOf(key)}`;
    // ... rate limiting logic
  }
}
```

**5. Vulnerability Scanning & Dependency Management**

```javascript
class VulnerabilityScanner {
  async scanDependencies() {
    const { execSync } = require('child_process');
    
    try {
      // Run npm audit
      const auditOutput = execSync('npm audit --json').toString();
      const audit = JSON.parse(auditOutput);

      const critical = Object.values(audit.vulnerabilities || {})
        .filter(v => v.severity === 'critical');

      if (critical.length > 0) {
        throw new Error(`Found ${critical.length} critical vulnerabilities`);
      }

      return {
        status: 'safe',
        vulnerabilities: audit.vulnerabilities || {}
      };
    } catch (error) {
      return {
        status: 'vulnerable',
        error: error.message
      };
    }
  }

  async scanSecrets() {
    // Check for secrets in code
    const secretPatterns = [
      /aws_access_key_id\s*=\s*[\w\-]+/i,
      /aws_secret_access_key\s*=\s*[\w\-]+/i,
      /password\s*=\s*[\w\-]+/i,
      /api[_-]?key\s*=\s*[\w\-]+/i,
      /token\s*=\s*[\w\-]+/i
    ];

    const files = await this.getSourceFiles();
    const secrets = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          secrets.push({
            file,
            pattern: pattern.toString(),
            message: 'Potential secret detected'
          });
        }
      }
    }

    return secrets;
  }

  async getSourceFiles() {
    // Exclude node_modules, config files, etc.
    return glob.sync('src/**/*.{js,ts}', {
      ignore: ['**/node_modules/**', '**/.git/**']
    });
  }
}
```

**6. Security Incident Response**

```javascript
class SecurityIncidentHandler {
  constructor(notificationService) {
    this.notificationService = notificationService;
    this.incidents = [];
  }

  async handleCompromisedAccount(userId) {
    const incident = {
      id: generateId(),
      userId,
      type: 'account_compromise',
      timestamp: new Date(),
      status: 'investigating'
    };

    // Immediate actions
    await Promise.all([
      // Revoke all sessions
      this.revokeAllSessions(userId),
      
      // Invalidate tokens
      this.invalidateTokens(userId),
      
      // Notify user
      this.notifyUser(userId, { type: 'account_compromised' }),
      
      // Alert security team
      this.alertSecurityTeam(incident),
      
      // Log incident
      this.logIncident(incident)
    ]);

    // Investigation
    const audit = await this.auditUserActivity(userId);
    incident.auditTrail = audit;

    return incident;
  }

  async revokeAllSessions(userId) {
    // Revoke all session tokens
    await redis.del(`user_sessions:${userId}`);
    
    // Remove from active sessions
    await db.query(
      'UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1',
      [userId]
    );
  }

  async invalidateTokens(userId) {
    const { rows: refreshTokens } = await db.query(
      'SELECT token_id FROM refresh_tokens WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );

    for (const { token_id } of refreshTokens) {
      await redis.setex(`blacklist:${token_id}`, 604800, 1); // 7 days
    }
  }

  async auditUserActivity(userId, hoursBack = 24) {
    const { rows } = await db.query(
      `SELECT * FROM audit_log
       WHERE user_id = $1
       AND timestamp > NOW() - INTERVAL '${hoursBack} hours'
       ORDER BY timestamp DESC`,
      [userId]
    );

    return rows;
  }

  async alertSecurityTeam(incident) {
    await this.notificationService.send({
      to: process.env.SECURITY_TEAM_EMAIL,
      subject: `SECURITY INCIDENT: ${incident.type}`,
      body: JSON.stringify(incident, null, 2)
    });
  }

  async logIncident(incident) {
    // Log to immutable audit store
    await db.query(
      `INSERT INTO security_incidents (id, user_id, type, timestamp, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [incident.id, incident.userId, incident.type, incident.timestamp, JSON.stringify(incident)]
    );
  }
}
```

---

## Summary

**Key Takeaways:**
1. **JWT** - Stateless authentication with access and refresh tokens
2. **RBAC** - Role-based access control with permissions
3. **Zero-Trust** - Never trust by default, always verify
4. **OAuth2/OIDC** - Standard protocols for identity
5. **Secrets Management** - Never hardcode secrets
6. **API Key Rotation** - Regular rotation of credentials
7. **Hashing** - Always hash passwords (bcrypt, argon2)
8. **HTTPS** - Encrypt all communications
9. **Rate Limiting** - Prevent brute force attacks
10. **CORS** - Configure cross-origin requests properly
11. **CSRF Protection** - Prevent cross-site request forgery
12. **Input Validation** - Validate and sanitize all inputs
13. **Security Headers** - Set proper HTTP security headers
14. **Vulnerability Scanning** - Regular dependency audits
15. **Incident Response** - Have procedures in place
16. **Threat Intelligence** - Monitor and respond to threats
17. **Compliance** - Adhere to GDPR, SOC2, PCI-DSS, etc.
10. **Token Blacklisting** - Revoke compromised tokens