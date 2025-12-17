import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma client instance for development
 * Prevents multiple instances during hot reloading
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create Prisma client with logging configuration
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
}

/**
 * Singleton Prisma client instance
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Database connection health check
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Graceful shutdown helper
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Transaction helper with automatic retry
 */
export async function withTransaction<T>(
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  options?: {
    maxRetries?: number;
    timeout?: number;
  }
): Promise<T> {
  const { maxRetries = 3, timeout = 10000 } = options ?? {};

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        timeout,
        maxWait: timeout,
      });
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable (deadlock, serialization failure)
      const isRetryable =
        (error as { code?: string }).code === 'P2034' || // Prisma write conflict
        (error as { code?: string }).code === '40001' || // Serialization failure
        (error as { code?: string }).code === '40P01';   // Deadlock

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }

  throw lastError;
}

// Default export for convenience
export default prisma;
