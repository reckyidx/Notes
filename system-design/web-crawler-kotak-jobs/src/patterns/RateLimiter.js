// Token Bucket Rate Limiter Pattern
export class TokenBucketRateLimiter {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.refillRate = refillRate; // tokens per second
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async allow(tokens = 1) {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // Convert to seconds
    const refillTokens = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + refillTokens);
    this.lastRefill = now;
  }

  getWaitTime(tokens = 1) {
    this.refill();

    if (this.tokens >= tokens) {
      return 0;
    }

    const needed = tokens - this.tokens;
    return (needed / this.refillRate) * 1000; // Convert to milliseconds
  }
}

// Distributed Rate Limiter (Redis-based)
export class DistributedRateLimiter {
  constructor(redisClient, capacity, refillRate, keyPrefix = 'ratelimit:') {
    this.redis = redisClient;
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.keyPrefix = keyPrefix;
  }

  async allow(key, tokens = 1) {
    const redisKey = `${this.keyPrefix}${key}`;
    
    const luaScript = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local tokens = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])
      
      local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
      local currentTokens = tonumber(bucket[1]) or capacity
      local lastRefill = tonumber(bucket[2]) or now
      
      local elapsed = now - lastRefill
      local refillTokens = math.floor(elapsed * refillRate / 1000)
      currentTokens = math.min(capacity, currentTokens + refillTokens)
      
      if currentTokens >= tokens then
        currentTokens = currentTokens - tokens
        redis.call('HMSET', key, 'tokens', currentTokens, 'lastRefill', now)
        redis.call('EXPIRE', key, 3600)
        return 1
      else
        return 0
      end
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      redisKey,
      this.capacity,
      this.refillRate,
      tokens,
      Date.now()
    );

    return result === 1;
  }

  async getWaitTime(key, tokens = 1) {
    const redisKey = `${this.keyPrefix}${key}`;
    const bucket = await this.redis.hmget(redisKey, 'tokens', 'lastRefill');
    const currentTokens = parseInt(bucket[0]) || this.capacity;
    const lastRefill = parseInt(bucket[1]) || Date.now();

    const now = Date.now();
    const elapsed = now - lastRefill;
    const refillTokens = Math.floor(elapsed * this.refillRate / 1000);
    const availableTokens = Math.min(this.capacity, currentTokens + refillTokens);

    if (availableTokens >= tokens) {
      return 0;
    }

    const needed = tokens - availableTokens;
    return (needed / this.refillRate) * 1000;
  }
}

export default TokenBucketRateLimiter;