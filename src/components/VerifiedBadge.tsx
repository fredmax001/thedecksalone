

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

  let color = '#9CA3AF'; // Default Grey

  if (dj.verificationBadgeType === 'gold') {
    color = '#FACC15';
  } else if (dj.verificationBadgeType === 'grey') {
    color = '#9CA3AF';
  } else if (dj.isPro || dj.subscriptionTier === 'pro' || dj.subscriptionTier === 'legend') {
    color = '#FACC15';
  }

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
