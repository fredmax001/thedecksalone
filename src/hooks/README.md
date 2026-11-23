# Frontend Hooks (`app/src/hooks`)

Custom React hooks combining TanStack React Query server-state wrappers (queries and optimistic mutations) with reusable UI, viewport, SEO, role, and subscription-gating helpers. See [app/src/README.md](../README.md).

## Key Files

### UI, Access & Utility Hooks

| File | Primary Export(s) | Responsibility |
| --- | --- | --- |
| `use-delayed-loading.ts` | `useDelayedLoading(isLoading, delay = 300)` | Delays skeleton display until loading persists past `delay` ms to prevent flash on fast responses. |
| `use-mobile.ts` | `useIsMobile()` | Responsive `< 768px` boolean backed by `window.matchMedia`. |
| `useDebouncedValue.ts` | `useDebouncedValue<T>(value, delayMs = 300)` | Debounces fast-changing search/filter state. |
| `useLongPress.ts` | `useLongPress({ onLongPress, onClick, threshold = 500, disabled })` | Mouse/touch long-press handler with 10px touch-move cancellation and `navigator.vibrate(40)` feedback. |
| `usePageMeta.ts` | `usePageMeta(title, description, image?, url?)` | Updates `document.title` (via `formatPageTitle`), OpenGraph/Twitter meta tags, and `<link rel="canonical">`. |
| `useFeatureAccess.ts` | `useFeatureAccess`, `useRequiresTier` | Evaluates effective tier (`free` < `pro` < `legend`) with a 3-day post-expiry grace period (`GRACE_DAYS = 3`, lifetime if `subscriptionExpiresAt` is `null`), grants `EVENT_ORGANIZER` Pro access, and opens `useUpgradeModalStore` when `checkFeature()` blocks. |
| `useUserRole.ts` | `useUserRole()` | Returns `{ isStaff, isDj, isOrganizer, role }` from `useAuthStore` + `isAdminRole()`. |
| `useRequireDj.ts` | `useRequireDj()` | Returns boolean `isDj` (`DJ`, `EVENT_ORGANIZER`, admin role, or `djProfile` present); callers render fallback UI. |

### Discovery, Content & Social Data Hooks

| File | Primary Export(s) | Responsibility |
| --- | --- | --- |
| `useHomeData.ts` | `useHomeData` | Aggregates Home page queries (`featuredDJs`, `rankings`, `mixCategories`, `events`, `homeAdBoard`, `officialPlaylists` merging `/official-playlists` + `/smart-playlists`, `trendingMixes`). `currentBattle` and `platformStats` are defined with `enabled: false`. |
| `useDJs.ts` | `useDJs`, `useDJ`, `useDJCities`, `useDJGenres`, `useIsFollowingDj`, `useFollowDj`, `useHallOfFameDJs`, `useHallOfFameLegends` | DJ discovery/profile queries, Hall of Fame data, and optimistic follow/unfollow mutations (`dj-follow-status` + `dj.totalFollowers`). |
| `useMixes.ts` | `useMixes`, `useTrendingMixes`, `useMixCategories`, `useMixGenres`, `useMix`, `useMixLike`, `useLikeMix`, `useHallOfFameMixes`, `useImportHearthis` | Mix catalog/detail (by ID or `/mixes/by-slug/:dj/:slug`), cache-driven optimistic likes (`['mixLike', id]` synced into `['mixes']`), and Hearthis.at bulk import. |
| `useSets.ts` | `useDJSets`, `useMySets`, `useSet`, `useCreateSet`, `useUpdateSet`, `useDeleteSet`, `useAddMixToSet`, `useRemoveMixFromSet`, `useReorderSetItems` | Curated DJ sets CRUD and track ordering with optimistic cache updates and rollback. |
| `useHighlights.ts` | `useDJHighlights`, `useMyHighlights`, `useAddHighlight`, `useRemoveHighlight`, `useReorderHighlights` | DJ profile pinned highlight mixes CRUD and reordering. |
| `useReposts.ts` | `useRepostStatus`, `useRepostMix`, `useUnrepostMix` | Mix repost status and optimistic toggle mutations. |
| `useReups.ts` | `useReupStatus`, `useReupMix`, `useUnreupMix` | DJ mix re-up status and optimistic toggle mutations. |
| `useRankings.ts` | `useRankings`, `useRankingOverview`, `useRankingHistory` | Leaderboard rankings, overview metrics, and per-DJ historical ranking data. |
| `useBattles.ts` | `useBattles`, `useCurrentBattle`, `useBattle`, `useVoteBattle` | Weekly DJ battles queries and optimistic vote casting across `currentBattle` and `battles`. |
| `useRecommendations.ts` | `useRecommendedDjs`, `useForYouPlaylists`, `useFeedStats` | Personalized DJ/playlist discovery and new-drop feed stats (`markFeedAsSeen` via [lib/recommendations.ts](../lib/recommendations.ts)). |
| `useReviews.ts` | `useReviews`, `useCreateReview` | DJ reviews list and review submission. |
| `useUsers.ts` | `useUsers` | Paginated public user discovery (`/discover/users`). |
| `usePublicUser.ts` | `usePublicUser` | Public listener/DJ profile lookup (`/users/public/:username`). |

### Events, Ticketing, Bookings, Gigs & Campaigns

| File | Primary Export(s) | Responsibility |
| --- | --- | --- |
| `useEvents.ts` | `useEvents`, `useEventTypes`, `useEvent` | Public event listing, event type taxonomy, and detail queries. |
| `useEventTicketing.ts` | `useEventAvailability`, `useEventDashboard`, `useEventTickets`, `useEventCustomers`, `useEventAnalytics`, `useMyTickets`, `useMyTicket`, `usePurchaseTicket`, `useTicketAction`, `useBulkTicketAction`, `usePublishEvent`, `useTicketTypeMutations`, `useUpdateTicketControls`, `useOnsiteAuth`, `useOnsiteDashboard`, `useOnsiteGuests`, `useOnsiteCheckin`, `useOnsiteWalkin` | Full buyer, organizer, and door-staff ticketing suite. On-site hooks authenticate with `sessionStorage['onsite_token_<eventId>']` sent in the `X-Onsite-Token` header; `useOnsiteWalkin` requires a per-sale `idempotencyKey`. |
| `useBookings.ts` | `useBookings`, `useCreateBooking` | Booking retrieval and creation (converts `eventDate` to ISO string). |
| `useGigs.ts` | `useGigs`, `useGig`, `useCreateGig`, `useGigMatches`, `useApplyToGig`, `useUpdateGigApplication` | DJ gig board listing, matching scores, applications, and status updates. |
| `useCampaigns.ts` | `useMyCampaigns`, `useCampaignTargets`, `useCreateCampaign`, `useDeleteCampaign` | DJ self-serve promotional ad campaigns (`multipart/form-data` creative upload). |

### Account, Notifications, Onboarding, Popups, Support & Admin

| File | Primary Export(s) | Responsibility |
| --- | --- | --- |
| `useUserDashboard.ts` | `useUserBookings`, `useRespondToCounterOffer`, `useLikedMixes`, `useFollowing`, `useUserActivity`, `useUserNotifications`, `useMarkNotificationRead`, `useMarkAllNotificationsRead`, `useUpdateUserProfile`, `useUpdateUserPassword` | Listener dashboard queries/mutations (bookings, counter-offers, likes, following, activity feed, profile/password). |
| `useNotifications.ts` | `useNotifications`, `useUnreadNotificationCount`, `useNotificationBadges`, `useRealtimeNotifications`, `updateAppBadge`, `useMarkNotificationRead`, `useOpenNotification`, `useMarkAllNotificationsRead`, `useClearAllNotifications`, `useDeleteNotification`, `useNotificationPreferences`, `useUpdateNotificationPreferences` | Paginated/filtered notifications, 45s badge polling + PWA `navigator.setAppBadge`, SSE live stream (`/notifications/stream?token=...`) dispatching `<PushBannerStack />` banners, once-per-session IANA timezone sync, optimistic read/dismiss/clear mutations, and quiet-hours/DND preferences. |
| `useOnboarding.ts` | `useOnboardingStatus`, `useSelectOnboardingRoles`, `useSaveListenerPreferences`, `useActivateListenerOnboarding`, `useSaveDjOnboardingProfile`, `useSaveOrganiserOnboardingProfile`, `useUpdateOnboardingState`, `trackOnboardingAnalyticsEvent` | Multi-role onboarding checklist & wizard mutations (each refreshes `authStore.fetchMe()`) plus non-blocking `/tracking/event` telemetry. |
| `usePopups.ts` | `useActivePopups`, `useAdminPopups`, `useCreatePopup`, `useUpdatePopup`, `useDeletePopup` | Public 60s-polled modal/banner/sheet popups and admin popup CRUD. |
| `useSupport.ts` | `useSupportTicketCounts`, `useSupportTickets`, `useSupportTicket`, `useCreateSupportTicket`, `useReplySupportTicket`, `useUpdateSupportTicketStatus` | User support submission and Support Admin ticket inbox/replies (15s count polling). |
| `useAdmin.ts` | ~70 admin query & mutation hooks (plus `useDJReferral`) | Full admin console API surface: stats/analytics/geography, DJ verification/suspension/Hall of Fame (including Legends CRUD), rankings recalculation, mix feature/visibility/deletion, bookings, event ticketing moderation, users/staff roles, payments, messages, security/error logs, manual Pro subscription approvals/promos/plan grants, ad campaigns, broadcasts/custom email/profile nudges, birthdays, battles, opportunities, and platform feature flags. |

## Conventions & Notes

- **Optimistic update pattern**: Interactive mutations (`useFollowDj`, `useLikeMix`, `useVoteBattle`, `useReposts`, `useReups`, `useSets`, `useNotifications`) cancel matching queries, snapshot prior cache state, apply optimistic patches, roll back + toast on `onError`, and invalidate in `onSettled`.
- **Request cancellation**: Public catalog hooks (`useDJs`, `useMixes`, `useEvents`, `useHomeData`, `useRecommendations`) forward React Query's AbortController `signal` into Axios requests.
- **Duplicate notification mutations**: `useMarkNotificationRead` and `useMarkAllNotificationsRead` are exported by both `useNotifications.ts` and `useUserDashboard.ts`; prefer `useNotifications.ts` for new features (it also invalidates `['notification-badges']`).
- **Co-location quirk**: `useDJReferral` (`/djs/my/referral`) is exported from `useAdmin.ts` alongside promo/referral admin hooks.
- **SSE authentication**: `useRealtimeNotifications` appends `?token=<JWT>` to `EventSource` because browser `EventSource` does not support custom `Authorization` headers.
