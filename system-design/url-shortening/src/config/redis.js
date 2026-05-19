const redis = require('redis');

/**
 * Singleton Pattern for Redis Connection
 * Ensures only one instance of Redis client exists throughout the application
 */
class Redis {
  constructor() {
    if (!Redis.instance) {
      this.client = null;
      Redis.instance = this;
    }
    return Redis.instance;
  }

  async connect() {
    if (this.client) {
      return this.client;
    }

    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD || undefined,
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.quit();
        console.log('✅ Redis disconnected successfully');
      } catch (error) {
        console.error('❌ Redis disconnection failed:', error);
        throw error;
      }
    }
  }

  getClient() {
    return this.client;
  }
}

module.exports = new Redis();
