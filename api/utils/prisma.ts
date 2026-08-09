import { PrismaClient } from '@prisma/client';
import logger from './logger';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const isProduction = process.env.NODE_ENV === 'production';

const logConfig = isProduction
  ? [{ emit: 'stdout' as const, level: 'error' as const }]
  : [
      { emit: 'event' as const, level: 'query' as const },
      { emit: 'stdout' as const, level: 'error' as const },
      { emit: 'stdout' as const, level: 'warn' as const },
    ];

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: logConfig,
});

if (!globalForPrisma.prisma && !isProduction) {
  // Setup slow query logging (e.g. queries > 500ms) — DEV only
  // @ts-ignore
  prisma.$on('query' as any, (e: any) => {
    if (e.duration >= 500) {
      logger.warn(`Slow Query [${e.duration}ms]: ${e.query}`);
    } else {
      logger.info(`Query [${e.duration}ms]: ${e.query}`);
    }
  });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
