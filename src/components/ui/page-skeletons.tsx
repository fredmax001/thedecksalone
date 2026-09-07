import { Skeleton } from '@/components/ui/skeleton';

/**
 * Reusable page-level skeleton components for the Deck Salone dark theme.
 * All components use the shadcn-style Skeleton primitive (bg-accent animate-pulse).
 */

/** Full-screen public page skeleton (DJ profile, events, etc.) */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-black">
      {/* Banner */}
      <Skeleton className="h-40 md:h-64 w-full rounded-none" />

      <div className="px-4 max-w-7xl mx-auto space-y-8 py-8">
        {/* Header row */}
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl p-3 space-y-2.5"
            >
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DashboardSkeletonProps {
  /** Number of stat cards in the top row (default 4) */
  cards?: number;
}

/** Dashboard content block skeleton (renders inside the dashboard shell) */
export function DashboardSkeleton({ cards = 4 }: DashboardSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-[#101010] border border-white/5 p-5 space-y-2"
          >
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        ))}
      </div>

      {/* Panels */}
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-[#101010] border border-white/5 h-64 p-4"
          >
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface FeedSectionSkeletonProps {
  /** Number of feed sections to render (default 1) */
  sections?: number;
}

/** Public feed section skeleton (horizontal rail + card grid) */
export function FeedSectionSkeleton({ sections = 1 }: FeedSectionSkeletonProps) {
  return (
    <div className="space-y-8">
      {Array.from({ length: sections }).map((_, s) => (
        <section key={s} className="space-y-4">
          {/* Section header */}
          <Skeleton className="h-6 w-40" />

          {/* Horizontal rail */}
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-40 shrink-0 space-y-2">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-[#121110] border border-white/[0.08] rounded-2xl p-3.5 space-y-2.5"
              >
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

interface ListSkeletonProps {
  /** Number of list rows to render (default 8) */
  rows?: number;
}

/** List row skeleton (notifications, bookings, mixes lists) */
export function ListSkeleton({ rows = 8 }: ListSkeletonProps) {
  return (
    <div className="rounded-2xl bg-black-surface border border-dark-gray p-4">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl bg-black-elevated border border-dark-gray"
          >
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="w-16 h-8 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
