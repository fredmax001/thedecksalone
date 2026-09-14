

export interface VerifiedBadgeProps {
  dj: {
    verified?: boolean;
    verificationBadgeType?: string | null;
    isPro?: boolean;
    subscriptionTier?: string;
    [key: string]: any;
  };
  className?: string;
  size?: number;
}

export function VerifiedBadge({ dj, className = '', size = 16 }: VerifiedBadgeProps) {
  if (!dj?.verified) return null;

  const isGold =
    dj.verificationBadgeType === 'gold' ||
    dj.verificationBadgeType === 'yellow' ||
    dj.subscriptionTier === 'legend' ||
    dj.subscriptionTier === 'pro' ||
    dj.isPro === true;

  const color = isGold ? '#FACC15' : '#9CA3AF';

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle cx="8" cy="8" r="8" fill={color} />
      <path
        d="M5 8L7 10L11 6"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
