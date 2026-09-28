/**
 * Regression tests for the hardening/phase-2 security-fix cluster:
 *   DB-1  — migration exists for EventTicket.idempotencyKey (idempotent form)
 *   DB-6  — sanity: ranking_history (djId, week) unique migration exists
 *   DB-4  — account purge deletes SupportTicket replies + tickets before user.delete()
 *   INFRA-7 — deploy.sh no longer uses `prisma db push --accept-data-loss`
 *   INFRA-2/4 — Dockerfile runs as non-root via USER; entrypoint exec's node
 */
import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const MIGRATIONS_DIR = path.resolve(__dirname, '../prisma/migrations');

// ---------------------------------------------------------------------------
// DB-1: EventTicket.idempotencyKey migration
// ---------------------------------------------------------------------------
describe('DB-1: EventTicket.idempotencyKey migration', () => {
  const migrationDir = path.join(MIGRATIONS_DIR, '20260928140000_add_event_ticket_idempotency_key');
  const migrationPath = path.join(migrationDir, 'migration.sql');
  const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : '';

  it('migration file exists', () => {
    expect(fs.existsSync(migrationDir)).toBe(true);
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('adds the column idempotently (prod was db push\'d — column may already exist)', () => {
    expect(sql).toMatch(/ALTER TABLE "event_tickets" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT/);
  });

  it('creates the unique index idempotently (Prisma @unique -> unique index)', () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS "event_tickets_idempotencyKey_key" ON "event_tickets"\("idempotencyKey"\)/);
  });
});

// ---------------------------------------------------------------------------
// DB-6 sanity: ranking_history @@unique([djId, week]) migration still present
// ---------------------------------------------------------------------------
describe('DB-6 sanity: ranking_history unique migration', () => {
  it('migration exists and enforces one row per (djId, week)', () => {
    const migrationPath = path.join(MIGRATIONS_DIR, '20260928120352_add_ranking_history_unique_dj_week', 'migration.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toMatch(/CREATE UNIQUE INDEX .*"ranking_history_djId_week_key" ON "ranking_history"\("djId", "week"\)/);
  });
});

// ---------------------------------------------------------------------------
// DB-4: purge transaction deletes SupportTicket rows before user.delete()
// ---------------------------------------------------------------------------
const mockScheduled: Record<string, () => Promise<void>> = {};

jest.mock('node-cron', () => ({
  schedule: jest.fn((expression: string, fn: () => Promise<void>) => {
    mockScheduled[expression] = fn;
  }),
}));

jest.mock('../utils/prisma', () => ({
  prisma: {
    user: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../utils/rankingAlgorithm', () => ({
  recalculateAllRankingsV2: jest.fn(),
}));

jest.mock('../jobs/recalculateDiscoveryScores', () => ({
  recalculateAllDiscoveryScores: jest.fn(),
  recalculateStaleDiscoveryScores: jest.fn(),
}));

jest.mock('../utils/subscriptionExpiry', () => ({
  processSubscriptionExpirations: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require('../utils/prisma');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { startScheduledJobs } = require('../jobs/scheduler');

describe('DB-4: purge job detaches support tickets before deleting the user', () => {
  const DAILY_PURGE_CRON = '0 3 * * *'; // CRON_JOBS.dailyAccountPurge

  beforeAll(() => {
    // startScheduledJobs() registers a 30s startup-backfill setTimeout; keep it
    // virtual so the worker can exit cleanly. The purge callback itself is
    // invoked directly and awaited.
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('deletes ticket replies, then tickets, then the user (FK RESTRICT safe)', async () => {
    startScheduledJobs();
    const purge = mockScheduled[DAILY_PURGE_CRON];
    expect(purge).toBeDefined();

    // User with no DJ profile — the purge must still remove their support tickets.
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1', djProfile: null }]);

    // Mocked interactive transaction client recording call order.
    const tx = {
      notification: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      battleVote: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      mixLike: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      follow: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      message: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      review: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      payment: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      booking: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      supportTicketReply: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      supportTicket: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      user: { delete: jest.fn().mockResolvedValue({ id: 'user-1' }) },
    };
    prisma.$transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));

    await purge();

    expect(tx.supportTicketReply.deleteMany).toHaveBeenCalledWith({
      where: { ticket: { userId: 'user-1' } },
    });
    expect(tx.supportTicket.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });

    // The RESTRICT foreign key is satisfied only if both deletes happen first.
    const repliesOrder = tx.supportTicketReply.deleteMany.mock.invocationCallOrder[0];
    const ticketsOrder = tx.supportTicket.deleteMany.mock.invocationCallOrder[0];
    const userOrder = tx.user.delete.mock.invocationCallOrder[0];
    expect(repliesOrder).toBeLessThan(userOrder);
    expect(ticketsOrder).toBeLessThan(userOrder);
  });
});

// ---------------------------------------------------------------------------
// INFRA-7: deploy.sh uses prisma migrate deploy, never db push --accept-data-loss
// ---------------------------------------------------------------------------
describe('INFRA-7: deploy.sh migration step', () => {
  const deploySh = fs.readFileSync(path.join(REPO_ROOT, 'deploy.sh'), 'utf8');

  it('no longer contains --accept-data-loss', () => {
    expect(deploySh).not.toContain('--accept-data-loss');
  });

  it('applies schema via prisma migrate deploy', () => {
    expect(deploySh).toContain('npx prisma migrate deploy');
  });
});

// ---------------------------------------------------------------------------
// INFRA-2/4: Dockerfile + entrypoint
// ---------------------------------------------------------------------------
describe('INFRA-2/4: Dockerfile non-root user and signal-forwarding entrypoint', () => {
  const dockerfile = fs.readFileSync(path.join(REPO_ROOT, 'Dockerfile'), 'utf8');

  it('declares a non-root USER in the runner stage', () => {
    expect(dockerfile).toMatch(/^USER\s+\S+/m);
    expect(dockerfile).not.toMatch(/^USER\s+root/m);
  });

  it('creates the runtime user and chowns writable dirs (uploads/, logs/)', () => {
    expect(dockerfile).toMatch(/adduser\s+-S\s+app/);
    expect(dockerfile).toMatch(/chown\s+-R\s+app:app/);
  });

  it('no longer wraps startup in `sh -c` (which swallowed SIGTERM as PID 1)', () => {
    expect(dockerfile).not.toMatch(/CMD \[\"sh\", \"-c\"/);
  });

  it('entrypoint script execs node so it becomes PID 1', () => {
    const entrypointPath = path.join(REPO_ROOT, 'docker-entrypoint.sh');
    expect(fs.existsSync(entrypointPath)).toBe(true);
    const entrypoint = fs.readFileSync(entrypointPath, 'utf8');
    expect(entrypoint).toMatch(/npx prisma migrate deploy/);
    expect(entrypoint).toMatch(/exec node dist\/cluster\.js/);
  });
});
