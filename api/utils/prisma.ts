import { PrismaClient } from '@prisma/client';
import logger from './logger';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  // Use emit for query so we can track query execution time
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
});

if (!globalForPrisma.prisma) {
  // Setup slow query logging (e.g. queries > 500ms)
  // @ts-ignore
  prisma.$on('query' as any, (e: any) => {
    if (e.duration >= 500) {
      logger.warn(`Slow Query [${e.duration}ms]: ${e.query}`);
    } else if (process.env.NODE_ENV === 'development') {
      logger.info(`Query [${e.duration}ms]: ${e.query}`);
    }
  });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
