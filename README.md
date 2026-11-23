# Deck Salone App (`app/`)

Monorepo-style application root housing the React + Vite frontend (`src/`), Express + Prisma backend (`api/`), and Capacitor native shells (`android/`, `ios/`) under a single `package.json` (`v1.4.0`). See the workspace overview in [../README.md](../README.md).

## Key Files

| File | Responsibility |
| --- | --- |
| `package.json` | Unified dependency manifest and npm scripts for web, API, Prisma, and linting. |
| `vite.config.ts` | Vite 7 build configuration: `@` -> `./src` alias, manual chunk splitting (`vendor`, `motion`, `icons`, `charts`, `scan`), gzip + brotli compression, `vite-plugin-pwa` Workbox caching, and `/api` + `/uploads` dev proxy (`VITE_PROXY_TARGET` or `https://decksalone.com`). |
| `vite.config.local.ts` | Standalone Vite override for local preview/dev proxying `/api` and `/uploads` to `https://decksalone.com` without the production chunk/PWA config. |
| `capacitor.config.ts` | Capacitor 8 native config (`appId: 'decksalone.com'`, `webDir: 'dist'`, HTTPS Android scheme, navigation allowlist, splash/status-bar/keyboard plugins). |
| `jest.config.js` | `ts-jest` test runner targeting `*.spec.ts(x)` and `*.test.ts(x)` across `api/` and `src/` with `@/` path mapping. |
| `index.html` | SPA HTML shell, PWA metadata, and root mount point for `src/main.tsx`. |
| `tailwind.config.js` / `postcss.config.js` / `components.json` | Tailwind CSS 3 theme tokens and shadcn/ui component generator config. |
| `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` | TypeScript project references for `tsc -b`. |
| `eslint.config.js` | Flat ESLint 9 configuration for React hooks, refresh, and TypeScript. |
| `.env.example` | Environment template covering `VITE_API_URL`, Express/Prisma, Google OAuth, SMTP, and S3/R2 storage. |
| `build-aab.sh` / `build-debug-apk.sh` | Shell helpers that build web assets with `VITE_API_URL=https://decksalone.com/api`, run `npx cap sync android`, and invoke Gradle (`bundleRelease` / `assembleDebug`). |

## Subdirectories

- [src/](./src/README.md) — React 19 + TypeScript frontend SPA (pages, components, hooks, Zustand stores, API helpers).
- [api/](./api/README.md) — Express 5 + Prisma 5 REST API, auth, workers, and database schema/migrations.
- `scripts/` — Build utilities; currently contains `optimize-images.js`, which uses `sharp` to generate responsive WebP variants (`*-640.webp` … `*-1920.webp`, plus `deck.webp`, `logo-mobile.webp`, `logo-web.webp`) inside `public/`.
- `public/` — Static web/PWA assets (icons, default images, banners, generated WebP variants, manifest assets).
- `android/` & `ios/` — Native Capacitor mobile projects synced from `dist/`.
- `uploads/` — Default local upload directory when the API runs from `app/` without S3/R2 or `UPLOADS_DIR` configured (`api/utils/storage.ts` resolves `UPLOADS_DIR || path.join(process.cwd(), 'uploads')`, so running from `app/api/` writes to `app/api/uploads/` instead).

## Local Setup & Commands

**Prerequisites**: Node.js 20+, PostgreSQL, and Redis (Redis is optional for basic local API dev with in-memory fallback, but required for `/health/readiness`, BullMQ background queues, and SSE pub/sub). Copy `.env.example` to `app/.env` (optional overrides in `app/api/.env` take precedence).

> **Important (Dev Proxy Default)**: When `VITE_PROXY_TARGET` is unset, `npm run dev` proxies `/api` and `/uploads` directly to **production (`https://decksalone.com`)**. Always set `VITE_PROXY_TARGET=http://localhost:5002` (or `:5000` if `PORT` is unset) when developing against a local API server.

Typical local bootstrap from `app/`: `npm install` → `npm run db:generate` → `npm run db:migrate` → `SEED_ADMIN_PASSWORD=<pw> npm run db:seed` → `npm run api:dev` + `VITE_PROXY_TARGET=http://localhost:5002 npm run dev`.

| Script | Action |
| --- | --- |
| `npm run dev` | Start Vite dev server on `0.0.0.0:5173`. |
| `npm run build` | Run `optimize-images`, `tsc -b`, and `vite build` into `dist/`. |
| `npm run optimize-images` | Generate responsive WebP variants in `public/` via `scripts/optimize-images.js`. |
| `npm run preview` | Preview the built `dist/` bundle locally. |
| `npm run lint` | Run ESLint across the repo. |
| `npm run audit:ci` | Run `npm audit --audit-level=high`. |
| `npm run api:dev` | Start Express API (`cd api && npx ts-node server.ts`; defaults to port `5000` if `PORT` is unset, `5002` in `.env.example`). |
| `npm run api:build` | Compile API TypeScript (`cd api && npx tsc --project tsconfig.json`). |
| `npm run db:generate` / `db:push` / `db:migrate` / `db:seed` / `db:studio` | Prisma client generation, schema push, dev migrations, seeding, and Studio UI. |
| `npx jest` | Run Jest unit/integration tests across `api/` and `src/` (no `test` script in `package.json`). |

## Conventions & Notes

- **Single `package.json`**: Both frontend (`react`, `vite`, `@capacitor/*`) and backend (`express`, `@prisma/client`, `bullmq`, `ioredis`) dependencies live at `app/package.json`; `api/` does not have its own `package.json`.
- **Image optimization fallback**: `scripts/optimize-images.js` gracefully skips optimization if `sharp` is unavailable in the environment, and preserves all original files in `public/`.
- **PWA navigation denylist**: `vite-plugin-pwa` excludes `/api` and `/uploads` from SPA `navigateFallback` so backend routes and media downloads are never intercepted by the service worker.
