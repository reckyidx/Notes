const { PrismaClient } = require('@prisma/client');

/**
 * Singleton Pattern for Database Connection
 * Ensures only one instance of PrismaClient exists throughout the application
 */
class Database {
  constructor() {
    if (!Database.instance) {
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
      Database.instance = this;
    }
    return Database.instance;
  }

  async connect() {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
      throw error;
    }
  }

  getClient() {
    return this.prisma;
  }
}

module.exports = new Database();
