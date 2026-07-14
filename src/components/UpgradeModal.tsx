import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Lock, Zap, Crown, Check, ArrowRight, X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature: string;
    requiredTier: 'pro' | 'legend';
}

const tierConfig = {
    pro: {
        name: 'Pro',
        price: '250',
        currency: 'SLE',
        icon: Zap,
        primaryColor: '#D4A24A',
        accentColor: '#F0C060',
        gradient: 'linear-gradient(135deg, rgba(212,162,74,0.15) 0%, rgba(212,162,74,0.04) 60%, transparent 100%)',
        borderGlow: 'rgba(212,162,74,0.3)',
        buttonStyle: 'from-[#D4A24A] to-[#F0C060]',
        badge: 'bg-gold/15 text-gold border border-gold/30',
        tagline: 'For serious DJs ready to grow',
        features: [
            'Unlimited mix uploads',
            'Advanced analytics & revenue charts',
            'HearThis.at sync integration',
            'Apply for booking opportunities',
            'Direct payment processing',
            'Verified badge eligibility',
            'Priority search ranking',
            'Email & chat support',
        ],
        excluded: ['Exclusive Pro+ gigs', 'Dedicated account manager', 'API access'],
    },
    legend: {
        name: 'Pro+',
        price: '750',
        currency: 'SLE',
        icon: Crown,
        primaryColor: '#FACC15',
        accentColor: '#FDE68A',
        gradient: 'linear-gradient(135deg, rgba(250,204,21,0.18) 0%, rgba(212,162,74,0.08) 60%, transparent 100%)',
        borderGlow: 'rgba(250,204,21,0.35)',
        buttonStyle: 'from-yellow-400 to-amber-300',
        badge: 'bg-yellow-400/15 text-yellow-300 border border-yellow-400/30',
        tagline: 'The ultimate DJ status in Sierra Leone',
        features: [
            'Everything in Pro, plus:',
            'Featured on homepage spotlight',
            'Exclusive Pro+ opportunities',
            'Dedicated account manager',
            'Priority #1 search placement',
            'API access for integrations',
            '24/7 priority support',
            'Gold Pro+ badge on all posts',
        ],
        excluded: [],
    },
};

/* ── Animated Background Particles ── */
const ParticleField: React.FC<{ color: string }> = ({ color }) => {
    const count = 20;
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: count }).map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width: `${2 + Math.random() * 3}px`,
                        height: `${2 + Math.random() * 3}px`,
                        background: color,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        opacity: 0,
                    }}
                    animate={{
                        y: [0, -(40 + Math.random() * 60)],
                        opacity: [0, 0.5 + Math.random() * 0.4, 0],
                        scale: [1, 1.2, 0.8],
                    }}
                    transition={{
                        duration: 3 + Math.random() * 3,
                        repeat: Infinity,
                        delay: Math.random() * 4,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
};

/* ── Glow Ring ── */
const GlowRing: React.FC<{ color: string; size: number; delay?: number }> = ({ color, size, delay = 0 }) => (
    <motion.div
        className="absolute rounded-full border"
        style={{
            width: size,
            height: size,
            borderColor: color,
            top: '50%',
            left: '50%',
            marginTop: -size / 2,
            marginLeft: -size / 2,
            opacity: 0,
        }}
        animate={{ scale: [0.8, 1.4], opacity: [0.3, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, delay, ease: 'easeOut' }}
    />
);

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
    isOpen,
    onClose,
    feature,
    requiredTier,
}) => {
    const navigate = useNavigate();
    const tier = tierConfig[requiredTier];
    const Icon = tier.icon;

    const handleUpgrade = () => {
        onClose();
        navigate('/dashboard/subscription');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-transparent border-none shadow-none p-0 max-w-md w-full overflow-visible">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.88, y: 24 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.93, y: 12 }}
                            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                            className="relative rounded-3xl overflow-hidden"
                            style={{
                                background: 'rgba(8, 8, 8, 0.97)',
                                border: `1px solid ${tier.borderGlow}`,
                                boxShadow: `0 0 0 1px rgba(255,255,255,0.03), 0 0 60px ${tier.borderGlow}, 0 32px 80px rgba(0,0,0,0.8)`,
                            }}
                        >
                            {/* Particle background */}
                            <ParticleField color={tier.primaryColor} />

                            {/* Gradient overlay */}
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{ background: tier.gradient }}
                            />

                            {/* Top shimmer line */}
                            <motion.div
                                className="absolute top-0 left-0 right-0 h-px"
                                style={{ background: `linear-gradient(90deg, transparent, ${tier.primaryColor}, transparent)` }}
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 3, repeat: Infinity }}
                            />

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110"
                            >
                                <X size={13} className="text-white/50" />
                            </button>

                            <div className="relative p-8 z-10">

                                {/* Hero Icon Section */}
                                <div className="flex justify-center mb-7">
                                    <div className="relative">
                                        {/* Glow rings */}
                                        <GlowRing color={tier.primaryColor} size={100} delay={0} />
                                        <GlowRing color={tier.primaryColor} size={130} delay={0.8} />

                                        {/* Icon container */}
                                        <motion.div
                                            className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
                                            style={{
                                                background: `linear-gradient(135deg, ${tier.primaryColor}25, ${tier.primaryColor}10)`,
                                                border: `1px solid ${tier.primaryColor}40`,
                                                boxShadow: `0 0 30px ${tier.primaryColor}20, inset 0 1px 0 ${tier.primaryColor}20`,
                                            }}
                                            animate={{ y: [0, -4, 0] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                        >
                                            <Icon size={34} style={{ color: tier.primaryColor }} />
                                        </motion.div>

                                        {/* Lock badge */}
                                        <div
                                            className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center border border-white/10"
                                            style={{ background: 'rgba(0,0,0,0.9)' }}
                                        >
                                            <Lock size={11} className="text-white/50" />
                                        </div>
                                    </div>
                                </div>

                                {/* Tier badge */}
                                <div className="flex justify-center mb-3">
                                    <motion.span
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.15 }}
                                        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full"
                                        style={{
                                            background: `${tier.primaryColor}18`,
                                            border: `1px solid ${tier.primaryColor}35`,
                                            color: tier.primaryColor,
                                        }}
                                    >
                                        <Sparkles size={9} />
                                        {tier.name} Feature
                                    </motion.span>
                                </div>

                                {/* Title */}
                                <motion.div
                                    className="text-center mb-2"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <h2 className="text-2xl font-display font-bold text-white uppercase tracking-tight">
                                        Unlock {feature}
                                    </h2>
                                    <p className="text-sm text-white/40 mt-2 leading-relaxed">
                                        This feature requires a{' '}
                                        <span style={{ color: tier.primaryColor }} className="font-semibold">
                                            {tier.name}
                                        </span>{' '}
                                        subscription.{' '}
                                        <span className="text-white/30 italic">{tier.tagline}.</span>
                                    </p>
                                </motion.div>

                                {/* Price */}
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 }}
                                    className="flex items-baseline justify-center gap-1 my-6 py-4"
                                    style={{
                                        borderTop: '1px solid rgba(255,255,255,0.05)',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    }}
                                >
                                    <span className="text-sm text-white/30 mr-1">{tier.currency}</span>
                                    <span
                                        className="text-4xl font-display font-black"
                                        style={{ color: tier.primaryColor }}
                                    >
                                        {tier.price}
                                    </span>
                                    <span className="text-white/30 text-sm">/month</span>
                                </motion.div>

                                {/* Features list */}
                                <ul className="space-y-2 mb-8">
                                    {tier.features.map((feat, i) => (
                                        <motion.li
                                            key={feat}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + i * 0.05, ease: 'easeOut' }}
                                            className="flex items-start gap-3"
                                        >
                                            <div
                                                className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{ background: `${tier.primaryColor}22`, border: `1px solid ${tier.primaryColor}40` }}
                                            >
                                                <Check size={9} style={{ color: tier.primaryColor }} />
                                            </div>
                                            <span
                                                className="text-sm leading-snug"
                                                style={{ color: i === 0 && requiredTier === 'legend' ? tier.primaryColor : 'rgba(255,255,255,0.65)' }}
                                            >
                                                {feat}
                                            </span>
                                        </motion.li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <motion.button
                                    onClick={handleUpgrade}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.55 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    className={`w-full h-13 rounded-xl font-bold text-sm uppercase tracking-wider text-black flex items-center justify-center gap-2 transition-all duration-300`}
                                    style={{
                                        background: `linear-gradient(135deg, ${tier.primaryColor}, ${tier.accentColor})`,
                                        boxShadow: `0 4px 24px ${tier.primaryColor}40, 0 1px 0 ${tier.primaryColor}60 inset`,
                                        paddingTop: '14px',
                                        paddingBottom: '14px',
                                    }}
                                >
                                    Upgrade to {tier.name}
                                    <ArrowRight size={16} />
                                </motion.button>

                                <p className="text-center text-[11px] text-white/20 mt-4">
                                    Cancel anytime · Manual payment approval · Instant activation
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
};
