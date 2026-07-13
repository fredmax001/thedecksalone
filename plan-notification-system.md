# Notification System Implementation Plan

## Overview
Build a complete notification system for the Deck Salone platform with:
- Database model for persistent notifications
- Backend API routes for CRUD operations
- Frontend notification bell dropdown with real-time unread count
- Notification creation triggers on key events (bookings, messages, etc.)
- Email notifications for important events

## Stage 1: Database Schema
- Add `Notification` model to Prisma schema
- Add `NotificationType` enum
- Add relation from User to Notification
- Run migration

## Stage 2: Backend
- Create `api/routes/notifications.ts` — full CRUD routes
- Create `api/utils/notifications.ts` — helper for creating notifications
- Wire routes into `api/server.ts`
- Integrate notification creation into existing routes (bookings, messages)

## Stage 3: Frontend
- Create `src/hooks/useNotifications.ts` — React Query hooks
- Update `src/components/Navbar.tsx` — add notification bell with unread count + dropdown
- Update `src/components/Layout.tsx` — add notification bell with unread count + dropdown
- Update `src/components/UserDashboardLayout.tsx` — notification dropdown with real data
- Update `src/pages/user/Notifications.tsx` — use real data from new API
- Update `src/hooks/useUserDashboard.ts` — point to new notification endpoints

## Stage 4: Email Integration
- Add notification email templates to `api/utils/email.ts`
- Trigger emails on important notifications

## Files to Change
1. `api/prisma/schema.prisma` — add Notification model
2. `api/server.ts` — register notification routes
3. `api/routes/notifications.ts` — NEW
4. `api/utils/notifications.ts` — NEW
5. `api/routes/bookings.ts` — trigger notifications on booking events
6. `api/routes/messages.ts` — trigger notifications on new messages
7. `src/hooks/useNotifications.ts` — NEW
8. `src/hooks/useUserDashboard.ts` — update notification hooks
9. `src/components/Navbar.tsx` — add notification bell
10. `src/components/Layout.tsx` — add notification bell dropdown
11. `src/components/UserDashboardLayout.tsx` — real notification dropdown
12. `src/pages/user/Notifications.tsx` — use real data
13. `api/utils/email.ts` — add notification email helper
