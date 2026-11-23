# Middleware (`app/api/middleware`)

Reusable Express middleware for JWT authentication, role-based access control, subscription-tier gating, Cloudflare Turnstile verification, and async error handling. Back to [app/api/README.md](../README.md).

## Key Files

| File | Exports & Responsibility |
| --- | --- |
| `auth.ts` | JWT session verification and RBAC. Exports `authMiddleware` (requires `Authorization: Bearer <token>`, rejects `onsite_staff` tokens and inactive users, validates `tokenVersion` against DB/Redis 30 s cache `auth_user:<id>`, populates `req.user`), `softAuthMiddleware` (aliased as `optionalAuthMiddleware`, populates `req.user` if valid without failing anonymous requests), `requireRole(...roles)`, `invalidateUserAuthCache(userId)`, and `getActiveUserFromToken(token)`. |
| `permissions.ts` | Subscription tier enforcement (`SubscriptionTier`: `free` < `pro` < `legend`, where `legend` is branded **Pro+** in the UI) and lifecycle helpers. Exports tier/feature predicates (`hasSubscriptionTier`, `canUploadMix`, `canUploadUnlimitedMixes`, `canCheckMixUploadLimit` [5-mix Free cap], `canSyncHearThis`, `canApplyForOpportunity`, `canReceiveDirectPayments`, `canViewAdvancedAnalytics`, `canGetVerified`, `hasPrioritySearch`, `canAccessPremiumOpportunities`, `isLegendFeatured`, `hasApiAccess`), Express guards (`requireSubscriptionTier`, `requirePro`, `requireLegend`, `requireProOrAdmin`), read-only DB helper (`getUserSubscription`), and DB mutators (`activateSubscriptionFeatures`, `resetSubscriptionFeatures`). |
| `turnstile.ts` | Exports `verifyTurnstile` for server-side Cloudflare Turnstile validation (`/turnstile/v0/siteverify`) using `turnstileToken` / `cf-turnstile-response` and trusted peer IP from `getClientIp(req)`. |
| `asyncHandler.ts` | Exports `asyncHandler(fn)` wrapper that catches rejected promises from async Express handlers and responds directly with `{ success: false, error: 'Internal server error' }` (HTTP `500`) instead of calling `next(error)`. |

## Conventions & Notes

- **Token Revocation**: `getActiveUserFromToken()` compares the JWT's `tokenVersion` claim against the user's current `tokenVersion` (cached in Redis for 30 s). Password changes, resets, role changes, and status updates must call `await invalidateUserAuthCache(userId)` so revoked tokens are rejected immediately.
- **Subscription Tiers & Lazy Expiry**: Tiers follow `free` (default) < `pro` < `legend` (**Pro+**), with a 3-day post-expiry grace window (`utils/subscription.ts`). `requireSubscriptionTier()` and `requireProOrAdmin()` check `getSubscriptionState(profile)` on each request; if `'expired'` (past grace), they immediately downgrade via `resetSubscriptionFeatures(userId)` and return `403` with `subscriptionExpired: true`.
- **Renewal Stacking**: `activateSubscriptionFeatures()` stacks newly purchased months onto any remaining valid `subscriptionExpiresAt` across `User` and `DjProfile` (`months <= 0` grants lifetime access with `expiresAt: null`).
- **`asyncHandler` Global Error Handler Bypass**: Because `asyncHandler` terminates responses directly with HTTP `500` rather than forwarding to `next(error)`, rejected promises inside wrapped routes bypass `server.ts`'s global error handler (so `SystemErrorLog` persistence, ops alerts, and multer `413`/`400` mapping do not run).
- **Fail-Closed Captcha**: `verifyTurnstile` only bypasses verification when `NODE_ENV` is explicitly `'development'` or `'test'`. Missing `TURNSTILE_SECRET_KEY`, use of Cloudflare's public test key, or upstream outages fail closed with `500` in all other environments (including unset `NODE_ENV`).
- **Role Allowance in `requireProOrAdmin`**: Grants bypass to staff roles (`ADMIN`, `SUPER_ADMIN`, `FINANCE_ADMIN`, `SUPPORT_ADMIN`, `VERIFICATION_ADMIN`, `MODERATOR`) and `EVENT_ORGANIZER` without requiring a DJ profile.
