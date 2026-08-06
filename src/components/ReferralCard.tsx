import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Copy, Check, Share2, Sparkles, Trophy } from 'lucide-react';
import { useDJReferral } from '@/hooks/useAdmin';
import { toast } from 'sonner';


export default function ReferralCard() {
  const { data: referral, isLoading } = useDJReferral();
  const [copied, setCopied] = useState(false);

  if (isLoading || !referral) return null;

  const copyLink = () => {
    if (!referral.referralLink) return;
    navigator.clipboard.writeText(referral.referralLink);
    setCopied(true);
    toast.success('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const shareWhatsApp = () => {
    if (!referral.referralLink) return;
    const text = encodeURIComponent(
      `Hey! Join me on Deck Salone — Sierra Leone's #1 DJ Platform! Create your DJ account here: ${referral.referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const progressPercent = Math.min(100, (referral.referralCount / referral.promoThreshold) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-6 border border-[#D4A24A]/30 bg-gradient-to-br from-[#1a160d] via-[#121212] to-[#0d0d0d] shadow-xl"
    >
      {/* Background Decorative Glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#D4A24A]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4A24A]/15 border border-[#D4A24A]/30 text-[#D4A24A] text-xs font-bold uppercase tracking-wider">
            <Gift className="w-3.5 h-3.5" /> Special DJ Promo
          </div>
          <h3 className="text-lg md:text-xl font-extrabold text-white">
            Share to 5 DJs & Get <span className="text-[#D4A24A]">1 Month Free Pro+</span>
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            Invite fellow DJs to create their profile on Deck Salone using your unique referral link. Once 5 DJs sign up, you unlock a free 1-month Pro+ upgrade!
          </p>

          {/* Progress Bar */}
          <div className="pt-2">
            <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
              <span className="text-text-secondary flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-[#D4A24A]" /> Progress: {referral.referralCount} / {referral.promoThreshold} DJs referred
              </span>
              <span className="text-[#D4A24A] font-bold">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#D4A24A] to-[#F3E0A2] transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Eligibility Badge */}
          {referral.isEligible && (
            <div className="inline-flex items-center gap-1.5 text-xs text-green-400 font-bold bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded-xl mt-2 animate-bounce">
              <Sparkles className="w-4 h-4 text-green-400" /> 🎉 You reached 5 referrals! Your Pro+ upgrade is ready for activation!
            </div>
          )}
        </div>

        {/* Share Action Box */}
        <div className="w-full md:w-auto bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-3 min-w-[260px]">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Your Referral Link</span>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-2">
            <input
              type="text"
              readOnly
              value={referral.referralLink || 'Generating link...'}
              className="bg-transparent text-xs text-text-primary focus:outline-none w-full truncate font-mono"
            />
            <button
              onClick={copyLink}
              className="p-1.5 hover:bg-white/10 rounded-md text-[#D4A24A] transition-colors"
              title="Copy Link"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-[#D4A24A]" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={shareWhatsApp}
              className="py-2 px-3 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
