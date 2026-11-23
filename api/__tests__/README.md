# Backend Tests (`app/api/__tests__`)

Jest (`ts-jest`, `testEnvironment: 'node'`) + Supertest unit, integration, security-hardening, and red-team regression test suites for the backend API. Configured in `app/jest.config.js` (transforms with `api/tsconfig.json`). Back to [app/api/README.md](../README.md).

## Running Tests

From `app/`:

```bash
npx jest                          # Run all test suites
npx jest api/__tests__/<file>     # Run a single suite
```

## Key Files

### Security, Auth & Abuse-Control Suites

| File | Scope & Verified Controls |
| --- | --- |
| `auth-isolation.test.ts` | Authentication and session isolation audit (cache-control headers, token isolation, role boundaries). |
| `auth-lifecycle.test.ts` | `AUTH-1`, `AUTH-2`, `AUTH-5`: `tokenVersion` revocation + Redis auth cache invalidation, login lockout, and Turnstile fail-closed behavior. |
| `admin-authz.test.ts` | `ADM-1`, `ADM-2`, `ADM-3`, `MOD-1`, `AUTH-7`: granular admin/moderator RBAC and privilege-escalation prevention. |
| `abuse-controls.test.ts` | `SOC-7/8/9/10/17`, `ETK-8`: per-endpoint rate limiter wiring and abuse throttling. |
| `response-shape.test.ts` | `SOC-1`–`SOC-6`: guarantees private `DjProfile` KYC/payout fields never appear in public API responses. |
| `upload-security.test.ts` | `UPL-3`, `UPL-4`, `UPL-10`, `INFRA-5`: `deleteFile` path-traversal rejection, `/api/proxy-image` SSRF allowlist & private-IP blocking, separator-aware download containment. |
| `mix-audio-gating.test.ts` | `UPL-1`, `UPL-2`, `UPL-8`: blocks static `/uploads/mixes/*`, JWT-gates sensitive `/uploads` folders, enforces `/api/mixes/:id/audio` gating, removes `directAudioUrl` leak. |
| `event-ticketing-security.test.ts` | `ETK-1`, `ETK-2`, `TKT-3`: ticketing authorization, onsite staff isolation, and attendee PII read restrictions. |
| `adversarial-batch-a.test.ts` | Adversarial review regressions: encoded `/uploads` traversal bypass, `ADMIN` -> `SUPER_ADMIN` self-grant, same-origin token attachment (`UPL-9`), rightmost-XFF `getClientIp` (`INFRA-16`), booking double-pay TOCTOU (`PAY-5`), smart playlist raw audio leak, PayPal 422 capture self-heal. |
| `red-team-remediations.test.ts` | Automated regression suite covering Red Team findings `RT-01` through `RT-18`. |

### Domain, Integrity & Infrastructure Suites

| File | Scope & Verified Controls |
| --- | --- |
| `payment-integrity.test.ts` | `PAY-1`, `PAY-2`, `PAY-4`, `PAY-10`: idempotent Pro subscription approve/reject, single pricing config source, PayPal 422 capture preservation. |
| `ranking-integrity.test.ts` | `RANK-1`, `RANK-2`, `RANK-4`, `RANK-5`, `RANK-10` / `DB-6`: 24 h play dedup, distinct authenticated `monthlyListeners` excluding self-plays, battle entry ownership, atomic battle close, `ranking_history` unique constraint migration. |
| `hardening.test.ts` | Phase-2 hardening `D1`–`D6`: multer error mapping (`413`/`400`), `redactUrlToken`, `Cache-Control: no-store` on gated uploads, `/health/readiness` DB+Redis check, scheduler stop/start idempotency, `uploadLimiter` & `audioLimiter` wiring. |
| `infra-drift.test.ts` | Static/migration guards for `DB-1` (`idempotencyKey`), `DB-3` (payment ledger `SET NULL` + purge anonymization), `DB-4` (`SupportTicket` purge order), `DB-6`, `INFRA-7` (`deploy.sh`), and `INFRA-2/4` (non-root Dockerfile). |
| `functional-regressions.test.ts` | Regression checks `C3`–`C6`: moderator ranking adjustment `week` field, idempotent Hall of Fame boolean `value`, bounded `/customers/export` (`take: 10000`), and 12-tuple `Promise.all` destructuring in `/ticketing/dashboard`. |
| `performance-optimization.test.ts` | Regression checks for platform performance optimizations (Phases 2–9). |

### Feature & Unit Suites

| File | Scope |
| --- | --- |
| `dj.service.test.ts` | Unit tests for `DjService` with mocked Prisma and Redis cache. |
| `logger.test.ts` | Unit tests for Winston `logger` configuration and redaction. |
| `redis.test.ts` | Unit tests for `utils/redis.ts` cache hit/miss, prefix clearing, and fallback behavior. |
| `subscription.test.ts` | Unit tests for `getSubscriptionState`, `addMonths`, and expiry/grace day counters. |
| `subscription-management.test.ts` | API tests for subscription cancel and restore endpoints. |
| `timezoneScheduler.test.ts` | Unit tests for IANA timezone conversion, quiet hours, days off, DND, and scheduling windows. |
| `onboarding-and-notifications.test.ts` | Multi-role onboarding endpoints and intelligent notification dispatch/preferences. |
| `organizer-and-phone-otp.test.ts` | `EVENT_ORGANIZER` role toggle and mobile phone OTP sign-up flows. |

## Conventions & Notes

- **Mocked Dependencies**: Suites mock Prisma, Redis, bcrypt, DNS, and/or external HTTP providers so the full test suite runs offline without a live PostgreSQL or Redis instance.
- **Excluded from Build**: `app/api/tsconfig.json` excludes `__tests__/` and `**/*.test.ts` from production `dist/` compilation while `app/jest.config.js` compiles them via `ts-jest`.
