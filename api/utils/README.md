# Utilities (`app/api/utils`)

Shared backend helper modules for database access, caching, authentication/security, rate limiting, media storage/processing, rankings, discovery, subscriptions, ticketing QR crypto, and outbound communications. Back to [app/api/README.md](../README.md).

## Key Files

### Database, Caching, Logging & HTTP Helpers

| File | Key Exports & Responsibility |
| --- | --- |
| `prisma.ts` | Singleton `prisma` (`PrismaClient`) with slow-query logging (`SLOW_QUERY_THRESHOLD_MS`, default 500 ms), plus public-safe field selects `DJ_PUBLIC_SELECT` and `DJ_PROFILE_PUBLIC_SELECT` (excludes KYC/payout/private fields). |
| `redis.ts` | Optional `ioredis` client (`default`) with bounded in-memory LRU fallback (`MAX_MEMORY_CACHE_KEYS = 2000`). Exports `withCache()`, `getCache()`, `setCache()`, `clearCache()`, `clearCachePrefix()`, and `getCacheStats()`. |
| `cache.ts` | Standalone in-memory cache wrapper exporting `withCache()`, `clearCache()`, and `cacheStats()` (used by select admin/read endpoints). |
| `logger.ts` | Winston `logger`, `redactUrlToken()` (strips `token=` JWTs from logged URLs), and `sendErrorAlert()` for 5xx ops notifications. |
| `bugReport.ts` | Exports `logSystemError()` (persists to `SystemErrorLog`) and `checkAndSendDailyBugReport()` (dispatches daily error digest to admins). |
| `readiness.ts` | Exports `readinessHandler` for `GET /health/readiness` — returns `200` only when both PostgreSQL (`SELECT 1`) and Redis (`PING`) succeed, else `503`. |
| `response.ts` | Standardized JSON response helpers: `ok(res, data, message?)` and `fail(res, status, error, extra?)`. |
| `pagination.ts` | Exports `parsePagination()` to clamp and normalize `page`/`limit`/`skip` query parameters. |
| `url.ts` | Exports `getFrontendUrl()` resolving the canonical frontend origin from env vars. |
| `platformConfig.ts` | Reads/writes global feature flags stored in `SystemConfig` via `getPlatformConfig()` and `updatePlatformConfig()`. |

### Auth, Security & Rate Limiting

| File | Key Exports & Responsibility |
| --- | --- |
| `jwt.ts` | Exports `signToken()` (7-day expiry, HS256) and `verifyToken()`. Throws at startup if `JWT_SECRET` is missing or shorter than 32 characters. |
| `authSecurity.ts` | Payload sanitization (`sanitizeAuthPayload`), brute-force lockout (`checkAccountLockout`, `recordFailedAttempt` — 5 attempts / 15 min, `recordSuccessfulLogin`, `sendLockoutNotification`), `hashPassword` (bcrypt 12 rounds), and `verifyAndMigratePassword`. |
| `passport.ts` | Configures `passport-google-oauth20` strategy using `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `BACKEND_URL`. |
| `otp.ts` | 10-minute / 3-attempt phone OTP flow backed by Redis/memory: `sendOtp()` and `verifyOtp()`. |
| `rateLimiter.ts` | Trusted client IP resolver `getClientIp()` (rightmost XFF behind 1 trusted proxy) and Express rate limiters backed by Redis when available: `generalLimiter`, `loginRateLimiter`, `authLimiter`, `bookingLimiter`, `voteLimiter`, `playLimiter`, `downloadLimiter`, `purchaseLimiter`, `searchLimiter`, `conditionalSearchLimiter`, `reportLimiter`, `messageLimiter`, `analyticsVisitLimiter`, `developerApplyLimiter`, `uploadLimiter`, `audioLimiter`. |
| `username.ts` | Username validation (`isValidUsername`), `RESERVED_USERNAMES`, and collision-safe `generateUsername(email)`. |
| `slug.ts` | Exports `slugify()` and `generateUniqueMixSlug()` for per-DJ unique mix slugs. |

### Storage, Uploads, Images & Audio

| File | Key Exports & Responsibility |
| --- | --- |
| `storage.ts` | Dual S3/R2 (`@aws-sdk/client-s3`) + local `uploads/` storage abstraction with traversal guards (`UPL-3`). Exports `uploadBuffer()`, `deleteFile()`, `keyFromUrl()`, `isSafeUploadUrl()`, and `isS3Enabled`. |
| `upload.ts` | Multer uploaders (`uploadAvatar`, `uploadCover`, `uploadMixAudio`, `uploadMixCover`, `uploadMix`, `uploadEventImage`, `uploadHallOfFameImage`, `uploadDjProfileImages`, `uploadDocument`, `uploadAdminMedia`), `getUploadErrorResponse()` (maps `LIMIT_FILE_SIZE` -> `413`, filter errors -> `400`), `serveUploads()`, `gatedUploadsAuth()` (blocks `/mixes/*` statically; JWT-gates `/documents/`, `/subscription-proofs/`, `/tickets/` with `Cache-Control: no-store`), and on-the-fly `sharp` WebP thumbnailing (`?w=` snapped to `[100..1200]`). |
| `imageProcessor.ts` | `sharp`-based image validation and WebP optimization: `validateImage()`, `processAvatar()`, `processCover()`, `processMixCover()`, `processEventImage()`, `processHallOfFameImage()`. |
| `imageProxy.ts` | SSRF-hardened URL validator for `/api/proxy-image`: `assertSafeProxyUrl()`, `ProxyUrlError`, `PROXY_ALLOWED_CONTENT_TYPES` (host allowlist + post-DNS private IPv4/IPv6 rejection). |
| `audioResolver.ts` | External audio URL parser/resolver (`detectPlatform()`, `parseHearthisUrl()`, `resolveHearthisSet()`, SoundCloud/HearThis/direct audio resolution). |
| `mixAudio.ts` | Exports `toPublicAudioUrl(mix)` to rewrite local mix storage paths to the authorized streaming endpoint `/api/mixes/:id/audio`. |

### Rankings, Discovery, Subscriptions, Ticketing & Reference Data

| File | Key Exports & Responsibility |
| --- | --- |
| `rankingAlgorithm.ts` | Production v2 DJ ranking engine (`WEIGHTS_V2`, `computeDjScoreV2()`, `recalculateAllRankingsV2()`, `sendTop3WeeklyNotifications()`, `getRisingDjs()`, `getBattleLeaders()`, `calculateBattleBaseScore()`). |
| `ranking.ts` | Backward-compatible adapter re-exporting `rankingAlgorithm.ts` under legacy aliases (`computeDjScore`, `recalculateAllRankings`, `updateAllDjRankings`, `WEIGHTS`). |
| `mixDiscovery.ts` | Mix scoring & discovery queries: `computeMixScore()`, `discoverMixes()`, `getTrendingMixes()`, `getPersonalizedRecommendations()`, `getHallOfFameCandidates()`. |
| `monthlyListeners.ts` | 24 h deduplicated play recording (`recordMixPlay()`) and 30-day distinct authenticated listener calculation (`getMonthlyListeners()`, `recalculateMonthlyListeners()`), excluding the DJ's own plays. |
| `campaignBoost.ts` | Fetches active `AdCampaign` boosts (`getActiveCampaigns()`) and injects sponsored placement metadata via `applyCampaignBoost()`. |
| `subscription.ts` | Pure subscription date/state helpers (`SUBSCRIPTION_GRACE_DAYS = 3`, `addMonths()`, `getSubscriptionState()`, `getGraceEndDate()`, `daysUntilExpiry()`, `daysUntilGraceEnd()`). |
| `subscriptionConfig.ts` | Single source of truth for subscription pricing & mobile money config stored in `SystemConfig`: `getSubscriptionConfig()`, `setSubscriptionConfig()`, `getExpectedPlanAmount()`. |
| `subscriptionExpiry.ts` | Daily batch sweep `processSubscriptionExpirations()` that downgrades lapsed accounts past grace and dispatches renewal reminders. |
| `trial.ts` | 14-day DJ trial status (`calculateTrialStatus()`), route guard `requireTrialOrSubscription()`, and `checkAndSendTrialNotifications()`. |
| `ticketQr.ts` | AES-256-GCM encrypted event ticket QR payloads (`TICKET_QR_SECRET`): `generateTicketNumber()`, `generateNonce()`, `encryptQrPayload()`, `decryptQrPayload()`, `generateTicketQrPayload()`, `reissueQrPayload()`, `buildLegacyTicketQr()`. |
| `onboarding.ts` | Multi-role onboarding status & completeness validators (`normalizeUserRoles()`, `validateOrganiserProfileCompleteness()`, `validateDjProfileCompleteness()`, `computeOnboardingStatus()`, `loadUserOnboardingStatus()`). |
| `profileCompletion.ts` | Computes DJ/user profile completion percentage (`calculateProfileCompletion()`) and sends nudge emails (`sendProfileNudgeEmail()`, `nudgeIncompleteProfiles()`). |
| `africanCountries.ts` | Exports `AFRICAN_COUNTRIES` and `isAfricanCountry()`. |
| `sierraLeoneLocations.ts` | Exports `SIERRA_LEONE_LOCATIONS`, `SIERRA_LEONE_CITIES`, and `CITY_TO_COMMUNITIES` lookup map. |

### Outbound Communications & Notifications

| File | Key Exports & Responsibility |
| --- | --- |
| `notifications.ts` | Core inbox notification helpers (`createNotification()`, `createNotificationForDj()`, `getNotificationBadges()`, `emitBadgesUpdate()`, `getUnreadCount()`, `markAllAsRead()`, `cleanupOldNotifications()`, `TYPE_TO_CATEGORY`, `TYPE_TO_PRIORITY`) with 15 s duplicate suppression and SSE fan-out. |
| `email.ts` | Nodemailer SMTP mailer with disposable-domain filtering (`isDeliverableEmailAddress()`), `isEmailConfigured()`, `sendEmail()`, and branded templates (`sendWelcomeEmail`, `sendOtpEmail`, `sendPasswordResetEmail`, `sendTicketApprovalEmail`, `sendAdminEmail`, `sendWeeklyTop3RankingEmail`, `sendAdminViolationAlertEmail`). |
| `push.ts` | Firebase Cloud Messaging (FCM HTTP v1) push sender (`sendPushToUser()`) with automatic pruning of invalid `PushToken` records. |
| `sms.ts` | Sent.dm WhatsApp/SMS delivery (`sendSentDmSms()`) and E.164 phone normalization (`formatPhoneNumber()`). |

## Conventions & Notes

- **Security Invariants**: Never expose raw `/uploads/mixes/*` URLs (always pass through `toPublicAudioUrl()`), always spread `DJ_PROFILE_PUBLIC_SELECT` for public DJ queries, and always derive client IPs via `getClientIp()` for rate limiting, lockouts, and play deduplication.
- **Dual Module Exports**: Several utilities export both ESM `export` and CommonJS `module.exports` so both `ts-node` / `tsc` CommonJS `require()` callers and Jest TypeScript imports work cleanly.
