const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

// Handle connection errors
prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (error) {
    // Log database errors
    console.error('Database error:', error);
    throw error;
  }
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;