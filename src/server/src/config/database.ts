import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Prisma client singleton
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
};

// Declare global prisma variable
declare global {
  var prisma: ReturnType<typeof prismaClientSingleton> | undefined;
}

// Initialize database connection
export async function initializeDatabase() {
  try {
    // Get or create prisma instance
    const prisma = globalThis.prisma ?? prismaClientSingleton();
    
    if (process.env.NODE_ENV !== 'production') {
      globalThis.prisma = prisma;
    }

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database connected successfully');

    return prisma;
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Export prisma client
export const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;
