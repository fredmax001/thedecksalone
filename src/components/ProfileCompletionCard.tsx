import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight, Sparkles, User, FileText, Music, ShieldCheck, Share2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export function ProfileCompletionCard() {
  const { user } = useAuthStore();
  const completion = (user as any)?.profileCompletion;


  if (!completion || completion.percentage >= 100) {
    return null;
  }

  const stepIcons = [User, FileText, Music, ShieldCheck, Share2];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-black-surface to-black-elevated p-5 md:p-6 shadow-xl mb-6">
      {/* Glow highlight background */}
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Sparkles className="w-3.5 h-3.5" /> Action Checklist
            </span>
            <span className="text-xs text-text-muted">{completion.completedCount} of {completion.totalSteps} Completed</span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-text-primary">
            Welcome to Deck Salone! 👋
          </h2>
          <p className="text-xs md:text-sm text-text-secondary mt-0.5 max-w-2xl">
            Complete these 5 simple steps to activate your profile and help fans, promoters, and event organizers discover you.
          </p>
        </div>

        {/* Progress Circle / Badge */}
        <div className="flex items-center gap-3 bg-black-elevated/80 border border-amber-500/20 px-4 py-2.5 rounded-xl self-start md:self-auto">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">Profile Strength</p>
            <p className="text-lg font-black text-amber-400">{completion.percentage}%</p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 flex items-center justify-center bg-amber-500/10">
            <span className="text-xs font-bold text-amber-300">{completion.completedCount}/5</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-black-elevated/60 h-2.5 rounded-full overflow-hidden mb-5 border border-white/5">
        <div 
          className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 h-full rounded-full transition-all duration-500"
          style={{ width: `${completion.percentage}%` }}
        />
      </div>

      {/* 5 Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {completion.steps.map((step: any, idx: number) => {
          const Icon = stepIcons[idx] || CheckCircle2;

          return (
            <div
              key={step.id}
              className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
                step.completed
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                  : 'bg-black-elevated/80 border-white/10 hover:border-amber-500/40 text-text-primary'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 rounded-lg ${step.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {step.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4 text-text-muted" />
                  )}
                </div>
                <h3 className={`text-xs font-bold ${step.completed ? 'text-emerald-300' : 'text-text-primary'}`}>
                  {step.title}
                </h3>
                <p className="text-[11px] text-text-muted mt-1 leading-snug line-clamp-2">
                  {step.description}
                </p>
              </div>

              <div className="mt-3">
                {step.completed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    Done ✓
                  </span>
                ) : (
                  <Link
                    to={step.actionUrl}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline"
                  >
                    {step.actionLabel} <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
