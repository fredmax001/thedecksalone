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

export const DJ_PUBLIC_SELECT = {
  id: true,
  stageName: true,
  avatar: true,
} as const;

/**
 * Public-safe scalar fields of DjProfile (SOC-1). Spread into per-endpoint
 * `select` objects (alongside nested relations) for ALL unauthenticated/public
 * DJ list & detail queries. Never add KYC/payout/private fields here:
 * idDocumentUrl, idDocumentType, legalName, nationality, payoutMethod,
 * whatsappNumber, verificationReason, socialProof, blockedDates.
 */
export const DJ_PROFILE_PUBLIC_SELECT = {
  id: true,
  userId: true,
  stageName: true,
  fullName: true,
  bio: true,
  avatar: true,
  coverBanner: true,
  country: true,
  city: true,
  community: true,
  genres: true,
  awards: true,
  equipment: true,
  languages: true,
  bookingFeeMin: true,
  bookingFeeMax: true,
  currency: true,
  availability: true,
  website: true,
  verified: true,
  isPublic: true,
  totalFollowers: true,
  totalStreams: true,
  totalMixes: true,
  totalEvents: true,
  totalBookings: true,
  averageRating: true,
  rankingScore: true,
  digitalScore: true,
  industryScore: true,
  communityScore: true,
  rankingPosition: true,
  rankingScoredAt: true,
  badges: true,
  createdAt: true,
  updatedAt: true,
  apiAccessEnabled: true,
  canReceivePayments: true,
  canViewAnalytics: true,
  depositPercent: true,
  eventTypes: true,
  fullDayRate: true,
  hasAccountManager: true,
  hearThisConnected: true,
  hearThisId: true,
  hourlyRate: true,
  isLegendFeatured: true,
  isModeratorFeatured: true,
  isRisingDj: true,
  isPro: true,
  isVerifiedEligible: true,
  maxTravelDistanceKm: true,
  services: true,
  socialLinks: true,
  startYear: true,
  streamingLinks: true,
  subscriptionActivatedAt: true,
  subscriptionExpiresAt: true,
  subscriptionTier: true,
  totalMixUploads: true,
  verificationNotes: true,
  verificationStatus: true,
  verificationBadgeType: true,
  verifiedAt: true,
  willTravel: true,
  monthlyListeners: true,
  hallOfFame: true,
  referralCount: true,
  promoGrantedAt: true,
  promoExpiresAt: true,
  promoGrantedById: true,
  promotionPoints: true,
  availabilitySchedule: true,
} as const;
