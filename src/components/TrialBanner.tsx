import { Link } from 'react-router-dom';
import { Sparkles, Lock, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';

export default function TrialBanner() {
  const { user } = useAuthStore();
  const trial = user?.trialStatus;

  // Don't display for non-DJs or active Pro subscribers
  if (user?.role !== 'DJ' || !trial || trial.isSubscribed) {
    return null;
  }

  if (trial.isTrialActive) {
    return (
      <div className="bg-gradient-to-r from-gold/20 via-black-surface to-gold/20 border border-gold/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-gold" />
          </div>
          <div>
            <p className="text-xs font-bold text-gold uppercase tracking-wider">
              Free Trial Active — {trial.daysLeft} {trial.daysLeft === 1 ? 'Day' : 'Days'} Remaining
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Enjoy all major features for 14 days. Upgrade to Pro before trial ends to keep your uploads & contacts active.
            </p>
          </div>
        </div>

        <Link to="/dashboard/subscription" className="w-full sm:w-auto flex-shrink-0">
          <Button size="sm" className="w-full bg-gold-gradient text-black font-bold uppercase text-xs px-4 py-2 rounded-full">
            Upgrade to Pro <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-3 text-center sm:text-left">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <p className="text-xs font-bold text-red-400 uppercase tracking-wider">
            14-Day Free Trial Expired
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            Your free trial has ended. Subscribe to Pro or Legend to unlock mix uploads, DJ sets, and direct WhatsApp handles.
          </p>
        </div>
      </div>

      <Link to="/dashboard/subscription" className="w-full sm:w-auto flex-shrink-0">
        <Button size="sm" className="w-full bg-gold-gradient text-black font-bold uppercase text-xs px-4 py-2 rounded-full">
          Subscribe Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </Link>
    </div>
  );
}
