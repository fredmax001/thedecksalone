import { Lock, Crown, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from './ui/button';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { cn } from '@/lib/utils';

interface FeatureLockProps {
    children: React.ReactNode;
    /** Old API: pass isLocked explicitly */
    isLocked?: boolean;
    /** New API: auto-checks tier access. requiredTier defaults to 'pro'. */
    feature?: string;
    requiredTier?: 'pro' | 'legend';
    /** Alias for tier (legacy) */
    tier?: 'pro' | 'legend';
    message?: string;
    blur?: boolean;
}

const tierConfig = {
    pro: {
        icon: Zap,
        gradient: 'from-gold/20 via-gold/10 to-transparent',
        border: 'border-gold/30',
        text: 'text-gold',
        bg: 'bg-gold/20',
    },
    legend: {
        icon: Crown,
        gradient: 'from-yellow-400/20 via-yellow-400/10 to-transparent',
        border: 'border-yellow-400/30',
        text: 'text-yellow-400',
        bg: 'bg-yellow-400/20',
    },
};

/**
 * FeatureLock - Show feature content but blur/lock if user lacks subscription
 */
export const FeatureLock: React.FC<FeatureLockProps> = ({
    children,
    isLocked: isLockedProp,
    feature,
    requiredTier,
    tier: tierProp = 'pro',
    message,
    blur = true,
}) => {
    const { openUpgradeModal, hasTier } = useFeatureAccess();
    const [isHovered, setIsHovered] = useState(false);

    // Resolve tier: prefer requiredTier, fallback to tier prop
    const tier = (requiredTier || tierProp) as 'pro' | 'legend';

    // Resolve isLocked: prefer explicit prop, otherwise compute from feature access
    const isLocked = isLockedProp !== undefined ? isLockedProp : !hasTier(tier);

    const config = tierConfig[tier];
    const Icon = config.icon;

    if (!isLocked) return <>{children}</>;

    return (
        <div
            className="relative group rounded-xl overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Blurred Content */}
            <div
                className={cn(
                    "transition-all duration-500",
                    blur ? 'opacity-30 pointer-events-none blur-sm' : 'opacity-50 pointer-events-none',
                    isHovered && blur ? 'blur-[2px] opacity-40' : ''
                )}
            >
                {children}
            </div>

            {/* Lock Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent backdrop-blur-[2px]">

                {/* Animated Icon */}
                <div className={cn(
                    "relative w-16 h-16 rounded-full flex items-center justify-center border transition-transform duration-500 mb-4",
                    config.bg, config.border,
                    isHovered ? 'scale-110' : 'scale-100'
                )}>
                    {/* Subtle pulse ring behind icon */}
                    <div className="absolute inset-0 rounded-full border border-current opacity-20 animate-ping" style={{ animationDuration: '3s' }} />
                    <Lock className={cn("w-6 h-6 absolute -bottom-1 -right-1", config.text)} />
                    <Icon className={cn("w-8 h-8", config.text)} />
                </div>

                {/* Text */}
                <div className="text-center max-w-[280px]">
                    <h4 className="font-display font-bold text-white text-lg mb-1 tracking-wide">
                        {tier.toUpperCase()} FEATURE
                    </h4>
                    <p className="text-sm text-white/60 mb-6 leading-relaxed">
                        {message || `Upgrade to ${tier === 'pro' ? 'Pro' : 'Legend'} to unlock this feature and elevate your DJ career.`}
                    </p>

                    <Button
                        onClick={() => openUpgradeModal(feature || message || 'Premium Feature', tier)}
                        className={cn(
                            "rounded-full px-8 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0)] hover:shadow-[0_0_20px_rgba(212,162,74,0.3)]",
                            tier === 'pro' ? 'bg-gold-gradient text-black' : 'bg-gradient-to-r from-yellow-400 to-amber-300 text-black'
                        )}
                    >
                        <Lock className="w-4 h-4 mr-2" />
                        Unlock Now
                    </Button>
                </div>
            </div>
        </div>
    );
};

/**
 * Variant: FullPageLock - For entire pages/sections
 */
export const FullPageLock: React.FC<{
    children: React.ReactNode;
    isLocked: boolean;
    tier?: 'pro' | 'legend';
    title?: string;
    description?: string;
}> = ({ children, isLocked, tier = 'pro', title, description }) => {
    const { openUpgradeModal } = useFeatureAccess();
    const config = tierConfig[tier];
    const Icon = config.icon;

    if (!isLocked) return <>{children}</>;

    return (
        <div className="relative min-h-[60vh] flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/[0.05] bg-black">
            {/* Abstract Background Pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className={cn("absolute inset-0 bg-gradient-to-b", config.gradient)} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-3xl" />
            </div>

            {/* Ghosted Content (very faint in background) */}
            <div className="absolute inset-0 opacity-10 pointer-events-none blur-md select-none overflow-hidden" aria-hidden="true">
                {children}
            </div>

            {/* Main Lock UI */}
            <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-md mx-auto">

                {/* Tier Badge */}
                <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border mb-6 text-xs font-semibold tracking-widest uppercase", config.bg, config.border, config.text)}>
                    <Icon className="w-3.5 h-3.5" />
                    {tier} Exclusive
                </div>

                {/* Lock Icon */}
                <div className="relative mb-6">
                    <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center border", config.bg, config.border)}>
                        <Lock className={cn("w-10 h-10", config.text)} />
                    </div>
                    {/* Subtle glow */}
                    <div className={cn("absolute inset-0 blur-2xl -z-10 opacity-50", config.bg)} />
                </div>

                {/* Content */}
                <h2 className="text-3xl font-display font-bold text-white mb-3">
                    {title || 'Feature Locked'}
                </h2>

                <p className="text-white/60 mb-8 leading-relaxed">
                    {description || `This section is exclusive to ${tier === 'pro' ? 'Pro' : 'Legend'} members. Upgrade your subscription to unlock this and many other premium tools.`}
                </p>

                <Button
                    onClick={() => openUpgradeModal(title || 'Premium Feature', tier)}
                    size="lg"
                    className={cn(
                        "rounded-xl px-8 w-full font-semibold uppercase tracking-wider transition-all duration-300",
                        tier === 'pro' ? 'bg-gold-gradient text-black hover:opacity-90' : 'bg-gradient-to-r from-yellow-400 to-amber-300 text-black hover:opacity-90'
                    )}
                >
                    Upgrade Subscription
                </Button>

                <p className="text-xs text-white/30 mt-4">
                    Unlocks instantly upon approval
                </p>
            </div>
        </div>
    );
};
