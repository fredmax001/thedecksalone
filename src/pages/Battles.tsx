import { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, parseISO, getWeek } from 'date-fns';
import {
  Megaphone,
  Upload,
  Users,
  Crown,
  Trophy,
  Flame,
  CheckCircle2,
  Play,
  Eye,
  Headphones,
  ArrowRight,
  Zap,
  Loader2,
} from 'lucide-react';
import FadeIn from '../components/FadeIn';
import CountdownTimer from '../components/CountdownTimer';
import { useCurrentBattle, useBattles, useVoteBattle } from '@/hooks/useBattles';
import { useAuthStore } from '@/stores/authStore';

/* ──────────────────────────── data ──────────────────────────── */

const howItWorksSteps = [
  {
    icon: Megaphone,
    title: 'DJs Submit Mixes',
    description: 'A new battle theme is announced every Monday. Two DJs are selected or volunteer to compete.',
  },
  {
    icon: Upload,
    title: 'Upload Your Mix',
    description: 'Each DJ has until Friday midnight to upload their best mix fitting the battle theme.',
  },
  {
    icon: Users,
    title: 'Community Votes',
    description: 'Fans listen to both mixes and vote for their favorite. Voting is open 48 hours.',
  },
  {
    icon: Crown,
    title: 'Winner Advances',
    description: 'The DJ with the most votes wins. Winners earn points on the battle leaderboard.',
  },
];

/* ──────────────────────────── types ──────────────────────────── */

interface BattleDJ {
  id: string;
  stageName: string;
  avatar?: string;
}

interface BattleEntry {
  id: string;
  battleId: string;
  djId: string;
  mixId?: string | null;
  baseScore: number;
  voteScore: number;
  finalScore: number;
  votes: number;
  dj: BattleDJ;
  votesCast?: { id: string }[];
  voteCount?: number;
  position?: number;
}

interface Battle {
  id: string;
  title: string;
  weekStart: string;
  weekEnd: string;
  status: string;
  theme?: string | null;
  metricType?: string;
  createdAt: string;
  entries: BattleEntry[];
}

/* ──────────────────────────── helpers ──────────────────────────── */

function getInitials(name: string) {
  return name?.charAt(0).toUpperCase() || '?';
}

function getEntryVotes(entry: BattleEntry) {
  return entry.voteCount ?? entry.votes ?? entry.votesCast?.length ?? 0;
}

function formatDateRange(start: string, end: string) {
  const s = parseISO(start);
  const e = parseISO(end);
  const sameMonth = format(s, 'MMM') === format(e, 'MMM');
  if (sameMonth) {
    return `${format(s, 'MMM d')} – ${format(e, 'd, yyyy')}`;
  }
  return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`;
}

function computeLeaderboard(battles: Battle[]) {
  const stats: Record<
    string,
    {
      id: string;
      name: string;
      avatar?: string;
      battles: number;
      wins: number;
      points: number;
    }
  > = {};

  for (const battle of battles) {
    const entries = [...battle.entries].sort((a, b) => b.finalScore - a.finalScore);
    const winnerId = entries[0]?.djId;

    for (const entry of entries) {
      const dj = entry.dj;
      if (!stats[dj.id]) {
        stats[dj.id] = {
          id: dj.id,
          name: dj.stageName,
          avatar: dj.avatar,
          battles: 0,
          wins: 0,
          points: 0,
        };
      }
      stats[dj.id].battles += 1;
      stats[dj.id].points += entry.finalScore;
      if (entry.djId === winnerId) {
        stats[dj.id].wins += 1;
      }
    }
  }

  return Object.values(stats)
    .map((dj, index) => ({
      rank: index + 1,
      ...dj,
      winRate: dj.battles > 0 ? Math.round((dj.wins / dj.battles) * 100) : 0,
      streak: 0,
    }))
    .sort((a, b) => b.points - a.points)
    .map((dj, index) => ({ ...dj, rank: index + 1 }));
}

/* ──────────────────────────── Vote Button (isolated animation) ──────────────────────────── */

const VoteButton = memo(function VoteButton({
  djName,
  color,
  disabled,
  loading,
  onVote,
}: {
  djName: string;
  color: 'gold' | 'purple';
  disabled?: boolean;
  loading?: boolean;
  onVote: () => void;
}) {
  return (
    <motion.button
      onClick={onVote}
      disabled={disabled || loading}
      className={`w-full py-4 rounded-full font-semibold uppercase text-sm transition-colors flex items-center justify-center gap-2 ${
        color === 'gold'
          ? 'bg-gold-gradient text-black'
          : 'bg-purple text-white'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      animate={disabled ? undefined : { scale: [1, 1.02, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      Vote for {djName}
    </motion.button>
  );
});

/* ──────────────────────────── page ──────────────────────────── */

export default function Battles() {
  const { data: currentBattle, isLoading: currentLoading } = useCurrentBattle() as {
    data: Battle | null | undefined;
    isLoading: boolean;
  };
  const { data: allBattlesData, isLoading: allBattlesLoading } = useBattles({ limit: 100 }) as {
    data: { data?: Battle[] } | undefined;
    isLoading: boolean;
  };
  const { data: pastBattlesData, isLoading: pastBattlesLoading } = useBattles({ status: 'CLOSED', limit: 20 }) as {
    data: { data?: Battle[] } | undefined;
    isLoading: boolean;
  };
  const voteBattle = useVoteBattle();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [hasVoted, setHasVoted] = useState<'left' | 'right' | null>(null);

  const allBattles = allBattlesData?.data || [];
  const pastBattles = pastBattlesData?.data || [];

  const leaderboardData = useMemo(() => computeLeaderboard(allBattles), [allBattles]);

  const activeEntries = useMemo(() => {
    if (!currentBattle) return [];
    return [...currentBattle.entries]
      .sort((a, b) => b.finalScore - a.finalScore || (a.position ?? 0) - (b.position ?? 0))
      .slice(0, 2);
  }, [currentBattle]);

  const leftEntry = activeEntries[0];
  const rightEntry = activeEntries[1];

  const leftVotes = leftEntry ? getEntryVotes(leftEntry) : 0;
  const rightVotes = rightEntry ? getEntryVotes(rightEntry) : 0;
  const totalVotes = leftVotes + rightVotes;
  const leftPercent = totalVotes > 0 ? Math.round((leftVotes / totalVotes) * 100) : 50;
  const rightPercent = 100 - leftPercent;

  const targetDate = currentBattle ? parseISO(currentBattle.weekEnd) : new Date(Date.now() + 48 * 60 * 60 * 1000);

  const handleVote = (side: 'left' | 'right') => {
    if (!isAuthenticated) {
      toast.info('Please log in to vote');
      window.location.href = '/login';
      return;
    }
    const entry = side === 'left' ? leftEntry : rightEntry;
    if (!entry || !currentBattle) return;
    if (hasVoted === side) return;

    voteBattle.mutate(
      { battleId: currentBattle.id, entryId: entry.id },
      {
        onSuccess: () => {
          setHasVoted(side);
          toast.success(`Vote cast for ${entry.dj.stageName}!`);
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.error || 'Could not cast vote. You may have already voted.');
        },
      }
    );
  };

  const weekLabel = currentBattle
    ? `Week ${getWeek(parseISO(currentBattle.weekStart))} of ${format(parseISO(currentBattle.weekStart), 'yyyy')} — Voting Open`
    : 'Voting Open';

  const battleTheme = currentBattle?.theme || currentBattle?.title || 'Afrobeats vs Amapiano';
  const hasVsTheme = battleTheme.toLowerCase().includes(' vs ');
  const [themeLeftRaw, themeRightRaw] = battleTheme.split(' vs ');
  const themeLeft = themeLeftRaw || battleTheme;
  const themeRight = themeRightRaw;

  return (
    <div className="bg-black min-h-[100dvh]">
      {/* ═══════════════ SECTION 1: HERO ═══════════════ */}
      <section className="relative h-[500px] sm:h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="/placeholder.jpg"
            alt="Battle arena"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/90" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-[800px] mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">
              Weekly Competition
            </span>
          </motion.div>

          <motion.h1
            className="font-display text-4xl sm:text-5xl lg:text-[56px] font-semibold uppercase tracking-tight text-text-primary mt-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            Battle Arena
          </motion.h1>

          {/* VS with pulse glow */}
          <motion.div
            className="mt-4"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.7, type: 'spring', stiffness: 200 }}
          >
            <span className="font-mono text-[80px] sm:text-[120px] font-bold text-gold animate-pulse-glow leading-none">
              VS
            </span>
          </motion.div>

          <motion.p
            className="mt-2 text-lg text-text-secondary max-w-[480px] mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          >
            DJs go head-to-head. Fans vote. One winner rises.
          </motion.p>

          {/* Live indicator */}
          <motion.div
            className="mt-6 flex items-center justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-red opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-primary">
              {weekLabel}
            </span>
          </motion.div>

          {/* Timer */}
          <motion.div
            className="mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
          >
            <span className="text-xs text-text-muted uppercase tracking-wider">
              Ends in
            </span>
            <CountdownTimer targetDate={targetDate} className="mt-1 justify-center" />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ SECTION 2: CURRENT BATTLE ═══════════════ */}
      <section className="py-12 sm:py-16">
        <div className="container-main">
          <div className="text-center mb-10">
            <FadeIn>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">
                This Week&apos;s Battle
              </span>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold uppercase tracking-tight mt-2">
                {hasVsTheme ? (
                  <>
                    <span className="text-gold">{themeLeft}</span>{' '}
                    <span className="text-text-muted">vs</span>{' '}
                    <span className="text-purple">{themeRight}</span>
                  </>
                ) : (
                  <span className="text-gold">{battleTheme}</span>
                )}
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-2 text-text-secondary text-sm">
                {currentBattle
                  ? formatDateRange(currentBattle.weekStart, currentBattle.weekEnd)
                  : 'Two genres. Two DJs. One winner.'}
              </p>
            </FadeIn>
          </div>

          {currentLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-gold animate-spin" />
            </div>
          ) : !currentBattle || activeEntries.length < 2 ? (
            <FadeIn>
              <div className="text-center py-16 bg-black-elevated rounded-2xl border border-white/5">
                <Trophy className="w-12 h-12 text-gold mx-auto" />
                <h3 className="mt-4 font-display text-xl text-text-primary uppercase">
                  No Active Battle
                </h3>
                <p className="mt-2 text-text-secondary text-sm max-w-md mx-auto">
                  There isn&apos;t a battle running right now. Check back soon or browse the leaderboard and past battles.
                </p>
              </div>
            </FadeIn>
          ) : (
            <>
              {/* VS Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-4 items-start">
                {/* Left DJ */}
                <FadeIn direction="right">
                  <motion.div
                    className="bg-black-elevated rounded-2xl p-6 sm:p-8 border-l-4 border-gold"
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex flex-col items-center text-center">
                      <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-gold text-black rounded-full">
                        Challenger
                      </span>
                      <div className="w-24 h-24 rounded-full bg-gold/10 border-[3px] border-gold flex items-center justify-center mt-4 overflow-hidden">
                        {leftEntry.dj.avatar ? (
                          <img
                            src={leftEntry.dj.avatar}
                            alt={leftEntry.dj.stageName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Headphones className="w-10 h-10 text-gold" />
                        )}
                      </div>
                      <h3 className="font-display text-2xl font-semibold text-gold mt-4 uppercase">
                        {leftEntry.dj.stageName}
                      </h3>
                      <span className="mt-2 px-3 py-1 text-xs border border-gold text-gold rounded-full">
                        {themeLeft}
                      </span>

                      {/* Mini mix player mock */}
                      <div className="w-full mt-5 p-4 bg-black rounded-xl">
                        <div className="flex items-center gap-3">
                          <button className="w-10 h-10 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
                            <Play className="w-4 h-4 text-black fill-black" />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-text-primary truncate">
                              {leftEntry.dj.stageName}&apos;s Battle Mix
                            </p>
                            <p className="text-xs text-text-muted mt-0.5">
                              {leftVotes.toLocaleString()} votes
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 h-2 bg-dark-gray rounded-full overflow-hidden">
                          <div className="h-full w-1/3 bg-gold rounded-full" />
                        </div>
                      </div>

                      <div className="w-full mt-5">
                        <VoteButton
                          djName={leftEntry.dj.stageName}
                          color="gold"
                          disabled={hasVoted === 'right' || !isAuthenticated}
                          loading={voteBattle.isPending && hasVoted !== 'right'}
                          onVote={() => handleVote('left')}
                        />
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={leftVotes}
                            className="mt-3 font-mono text-lg text-gold"
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          >
                            {leftVotes} votes ({leftPercent}%)
                          </motion.p>
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                </FadeIn>

                {/* Center VS */}
                <FadeIn delay={0.3} className="hidden lg:flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="#1E1E1E" strokeWidth="6" />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="#D4A24A"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 52}`}
                        strokeDashoffset={`${2 * Math.PI * 52 * (1 - leftPercent / 100)}`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-mono text-2xl font-bold text-gold">VS</span>
                    </div>
                  </div>
                  <p className="mt-4 font-mono text-xs text-text-muted uppercase">
                    Total: {totalVotes} votes
                  </p>
                </FadeIn>

                {/* Right DJ */}
                <FadeIn direction="left">
                  <motion.div
                    className="bg-black-elevated rounded-2xl p-6 sm:p-8 border-r-4 border-purple"
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex flex-col items-center text-center">
                      <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-purple text-white rounded-full">
                        Defender
                      </span>
                      <div className="w-24 h-24 rounded-full bg-purple/10 border-[3px] border-purple flex items-center justify-center mt-4 overflow-hidden">
                        {rightEntry.dj.avatar ? (
                          <img
                            src={rightEntry.dj.avatar}
                            alt={rightEntry.dj.stageName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Headphones className="w-10 h-10 text-purple" />
                        )}
                      </div>
                      <h3 className="font-display text-2xl font-semibold text-purple mt-4 uppercase">
                        {rightEntry.dj.stageName}
                      </h3>
                      <span className="mt-2 px-3 py-1 text-xs border border-purple text-purple rounded-full">
                        {themeRight || 'Battle'}
                      </span>

                      {/* Mini mix player mock */}
                      <div className="w-full mt-5 p-4 bg-black rounded-xl">
                        <div className="flex items-center gap-3">
                          <button className="w-10 h-10 rounded-full bg-purple flex items-center justify-center flex-shrink-0">
                            <Play className="w-4 h-4 text-white fill-white" />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-text-primary truncate">
                              {rightEntry.dj.stageName}&apos;s Battle Mix
                            </p>
                            <p className="text-xs text-text-muted mt-0.5">
                              {rightVotes.toLocaleString()} votes
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 h-2 bg-dark-gray rounded-full overflow-hidden">
                          <div className="h-full w-1/3 bg-purple rounded-full" />
                        </div>
                      </div>

                      <div className="w-full mt-5">
                        <VoteButton
                          djName={rightEntry.dj.stageName}
                          color="purple"
                          disabled={hasVoted === 'left' || !isAuthenticated}
                          loading={voteBattle.isPending && hasVoted !== 'left'}
                          onVote={() => handleVote('right')}
                        />
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={rightVotes}
                            className="mt-3 font-mono text-lg text-purple"
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          >
                            {rightVotes} votes ({rightPercent}%)
                          </motion.p>
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                </FadeIn>
              </div>

              {/* Overall progress bar */}
              <FadeIn delay={0.5}>
                <div className="mt-8">
                  <div className="h-6 bg-dark-gray rounded-full overflow-hidden flex">
                    <motion.div
                      className="h-full bg-gold-gradient flex items-center justify-end pr-2"
                      initial={{ width: 0 }}
                      animate={{ width: `${leftPercent}%` }}
                      transition={{ duration: 1, delay: 0.8 }}
                    >
                      {leftPercent > 15 && (
                        <span className="text-[10px] font-bold text-black">{leftPercent}%</span>
                      )}
                    </motion.div>
                    <motion.div
                      className="h-full bg-purple flex items-center justify-start pl-2"
                      initial={{ width: 0 }}
                      animate={{ width: `${rightPercent}%` }}
                      transition={{ duration: 1, delay: 0.8 }}
                    >
                      {rightPercent > 15 && (
                        <span className="text-[10px] font-bold text-white">{rightPercent}%</span>
                      )}
                    </motion.div>
                  </div>
                </div>
              </FadeIn>

              {!isAuthenticated && (
                <FadeIn delay={0.6}>
                  <p className="mt-4 text-center text-sm text-text-muted">
                    <a href="/login" className="text-gold hover:underline">
                      Log in
                    </a>{' '}
                    to cast your vote.
                  </p>
                </FadeIn>
              )}
            </>
          )}
        </div>
      </section>

      {/* ═══════════════ SECTION 3: HOW IT WORKS ═══════════════ */}
      <section className="py-16 sm:py-24 bg-black-elevated">
        <div className="container-main">
          <div className="text-center mb-12 lg:mb-16">
            <FadeIn>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">
                The Rules
              </span>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-text-primary mt-3">
                How Battles Work
              </h2>
            </FadeIn>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {howItWorksSteps.map((step, index) => (
              <FadeIn key={step.title} delay={0.15 * index}>
                <div className="text-center relative">
                  <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto">
                    <step.icon className="w-7 h-7 text-gold" />
                  </div>
                  <div className="mt-4 w-8 h-8 rounded-full bg-gold text-black flex items-center justify-center text-sm font-bold mx-auto">
                    {index + 1}
                  </div>
                  <h4 className="font-display text-lg font-semibold text-text-primary mt-4">
                    {step.title}
                  </h4>
                  <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                    {step.description}
                  </p>

                  {/* Connecting line */}
                  {index < howItWorksSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-[calc(50%+2rem)] right-[calc(-50%+2rem)] h-[2px] bg-dark-gray">
                      <motion.div
                        className="h-full bg-gold"
                        initial={{ width: 0 }}
                        whileInView={{ width: '100%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.3 + index * 0.15 }}
                      />
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 4: ALL-TIME LEADERBOARD ═══════════════ */}
      <section className="py-16 sm:py-24">
        <div className="container-main">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
            <div>
              <FadeIn>
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Battle Leaderboard
                </span>
              </FadeIn>
              <FadeIn delay={0.1}>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-text-primary mt-2">
                  All-Time Champions
                </h2>
              </FadeIn>
            </div>
          </div>

          <FadeIn delay={0.2}>
            {allBattlesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-gold animate-spin" />
              </div>
            ) : leaderboardData.length === 0 ? (
              <div className="text-center py-12 bg-black-elevated rounded-2xl border border-white/5">
                <p className="text-text-secondary text-sm">No battle history yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-dark-gray">
                      <th className="text-left py-4 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Rank
                      </th>
                      <th className="text-left py-4 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                        DJ
                      </th>
                      <th className="text-center py-4 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Battles
                      </th>
                      <th className="text-center py-4 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Wins
                      </th>
                      <th className="text-left py-4 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Win Rate
                      </th>
                      <th className="text-right py-4 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Points
                      </th>
                      <th className="text-center py-4 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Streak
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.map((dj, i) => (
                      <motion.tr
                        key={dj.id}
                        className={`border-b border-white/5 hover:bg-medium-gray/50 transition-colors ${
                          i % 2 === 0 ? 'bg-black' : 'bg-black-elevated'
                        } ${i < 3 ? 'bg-rank-gradient-top' : ''}`}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <td className="py-4 px-3">
                          {dj.rank === 1 ? (
                            <div className="flex items-center gap-1">
                              <Trophy className="w-5 h-5 text-gold" />
                              <span className="font-mono text-lg font-bold text-gold">1</span>
                            </div>
                          ) : dj.rank === 2 ? (
                            <span className="font-mono text-lg font-bold text-gray-400">2</span>
                          ) : dj.rank === 3 ? (
                            <span className="font-mono text-lg font-bold text-[#CD7F32]">3</span>
                          ) : (
                            <span className="font-mono text-base font-semibold text-text-muted">
                              {dj.rank}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                i < 3
                                  ? 'bg-gold/10 text-gold border border-gold/30'
                                  : 'bg-dark-gray text-text-muted'
                              }`}
                            >
                              {dj.avatar ? (
                                <img
                                  src={dj.avatar}
                                  alt={dj.name}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                getInitials(dj.name)
                              )}
                            </div>
                            <span className="font-display text-sm font-semibold text-text-primary">
                              {dj.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-center font-mono text-sm text-text-primary">
                          {dj.battles}
                        </td>
                        <td className="py-4 px-3 text-center font-mono text-sm text-gold">
                          {dj.wins}
                        </td>
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-dark-gray rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gold-gradient rounded-full"
                                initial={{ width: 0 }}
                                whileInView={{ width: `${dj.winRate}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: i * 0.06 }}
                              />
                            </div>
                            <span className="font-mono text-xs text-text-muted">{dj.winRate}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-right font-mono text-base font-semibold text-gold">
                          {Math.round(dj.points).toLocaleString()}
                        </td>
                        <td className="py-4 px-3 text-center">
                          {dj.streak > 0 ? (
                            <motion.span
                              className="inline-flex items-center gap-1 text-orange font-mono text-sm"
                              initial={{ scale: 0 }}
                              whileInView={{ scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ type: 'spring', stiffness: 300, delay: i * 0.06 }}
                            >
                              <Flame className="w-4 h-4" />
                              {dj.streak}
                            </motion.span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════ SECTION 5: PAST BATTLES ═══════════════ */}
      <section className="py-16 sm:py-24 bg-black-elevated">
        <div className="container-main">
          <div className="mb-10">
            <FadeIn>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">
                Archive
              </span>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-text-primary mt-2">
                Past Battles
              </h2>
            </FadeIn>
          </div>

          {pastBattlesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-gold animate-spin" />
            </div>
          ) : pastBattles.length === 0 ? (
            <FadeIn>
              <div className="text-center py-12 bg-black rounded-2xl border border-white/5">
                <p className="text-text-secondary text-sm">No past battles yet. The first winner will be shown here soon.</p>
              </div>
            </FadeIn>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastBattles.map((battle, index) => {
                const entries = [...battle.entries].sort((a, b) => b.finalScore - a.finalScore);
                const e1 = entries[0];
                const e2 = entries[1];
                if (!e1 || !e2) return null;
                const total = getEntryVotes(e1) + getEntryVotes(e2);
                const s1 = total > 0 ? Math.round((getEntryVotes(e1) / total) * 100) : 50;
                const s2 = 100 - s1;
                const theme = battle.theme || battle.title;
                return (
                  <FadeIn key={battle.id} delay={0.1 * index}>
                    <motion.div
                      className="bg-black rounded-2xl overflow-hidden border border-white/5 hover:border-gold/30 transition-all duration-300"
                      whileHover={{ y: -4 }}
                    >
                      {/* Gold strip at top */}
                      <div className="h-2 bg-gold-gradient" />
                      <div className="p-6">
                        <span className="text-xs text-text-muted uppercase tracking-wider">
                          Week {getWeek(parseISO(battle.weekStart))}, {format(parseISO(battle.weekStart), 'yyyy')}
                        </span>
                        <h4 className="font-display text-lg font-semibold text-text-primary mt-2 uppercase">
                          {theme}
                        </h4>

                        {/* VS row */}
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-xs font-bold text-gold overflow-hidden">
                              {e1.dj.avatar ? (
                                <img
                                  src={e1.dj.avatar}
                                  alt={e1.dj.stageName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                getInitials(e1.dj.stageName)
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-text-primary">
                                {e1.dj.stageName}
                              </p>
                              {e1.finalScore >= e2.finalScore && (
                                <span className="text-[10px] font-semibold text-green uppercase tracking-wider">
                                  Won
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-mono text-sm text-gold font-bold">VS</span>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-purple/10 flex items-center justify-center text-xs font-bold text-purple overflow-hidden">
                              {e2.dj.avatar ? (
                                <img
                                  src={e2.dj.avatar}
                                  alt={e2.dj.stageName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                getInitials(e2.dj.stageName)
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-text-primary">
                                {e2.dj.stageName}
                              </p>
                              {e2.finalScore > e1.finalScore && (
                                <span className="text-[10px] font-semibold text-green uppercase tracking-wider">
                                  Won
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Score bar */}
                        <div className="mt-4 h-3 bg-dark-gray rounded-full overflow-hidden flex">
                          <motion.div
                            className="h-full bg-gold rounded-l-full"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${s1}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                          />
                          <motion.div
                            className="h-full bg-purple rounded-r-full"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${s2}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-text-muted text-center">
                          {e1.dj.stageName} {s1}% — {e2.dj.stageName} {s2}%
                        </p>

                        <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                          <span>{total} votes cast</span>
                          <span>{formatDateRange(battle.weekStart, battle.weekEnd)}</span>
                        </div>
                      </div>
                    </motion.div>
                  </FadeIn>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════ SECTION 6: APPLY TO BATTLE ═══════════════ */}
      <section className="py-16 sm:py-24">
        <div className="container-main">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <FadeIn>
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">
                  For DJs
                </span>
              </FadeIn>
              <FadeIn delay={0.1}>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-text-primary mt-3">
                  Want to Battle?
                </h2>
              </FadeIn>
              <FadeIn delay={0.2}>
                <p className="mt-4 text-lg text-text-secondary leading-relaxed">
                  Think you have what it takes? Join the Battle Arena and prove
                  your skills against Sierra Leone&apos;s best.
                </p>
              </FadeIn>

              <div className="mt-8 space-y-4">
                {[
                  'Verified DJ profile',
                  'Minimum 5 mixes uploaded',
                  'Active in last 30 days',
                  'No strikes for fake engagement',
                ].map((req, i) => (
                  <FadeIn key={req} delay={0.3 + i * 0.08}>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green flex-shrink-0" />
                      <span className="text-sm text-text-secondary">{req}</span>
                    </div>
                  </FadeIn>
                ))}
              </div>

              <FadeIn delay={0.7}>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 mt-8 px-8 py-4 bg-gold-gradient text-black font-semibold uppercase text-sm rounded-full hover:scale-[1.02] transition-transform"
                >
                  <Zap className="w-4 h-4" />
                  Apply to Join
                </a>
              </FadeIn>
            </div>

            <FadeIn direction="left" delay={0.3}>
              <div className="relative flex items-center justify-center">
                <motion.div
                  className="flex items-center gap-8"
                  animate={{ rotate: [-1, 1, -1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <div className="w-32 h-40 bg-black-elevated rounded-xl border border-gold/20 flex items-center justify-center">
                    <Headphones className="w-16 h-16 text-gold/40" />
                  </div>
                  <span className="font-mono text-5xl font-bold text-gold animate-pulse-glow">
                    VS
                  </span>
                  <div className="w-32 h-40 bg-black-elevated rounded-xl border border-purple/20 flex items-center justify-center">
                    <Headphones className="w-16 h-16 text-purple/40" />
                  </div>
                </motion.div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 7: FAN ENGAGEMENT ═══════════════ */}
      <section className="py-16 sm:py-24 bg-black-elevated">
        <div className="container-main">
          <div className="text-center mb-12">
            <FadeIn>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">
                For Fans
              </span>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-text-primary mt-3">
                Your Vote Matters
              </h2>
            </FadeIn>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FadeIn delay={0}>
              <div className="bg-black rounded-2xl p-8 border border-white/5 text-center">
                <CheckCircle2 className="w-12 h-12 text-gold mx-auto" />
                <h4 className="font-display text-lg font-semibold text-text-primary mt-5">
                  Voting Power
                </h4>
                <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                  Every vote counts equally. Listen to both mixes before voting
                  — quality over loyalty.
                </p>
                <p className="mt-3 text-xs text-text-muted">
                  1 vote per account per battle
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.12}>
              <div className="bg-black rounded-2xl p-8 border border-white/5 text-center">
                <Flame className="w-12 h-12 text-orange mx-auto" />
                <h4 className="font-display text-lg font-semibold text-text-primary mt-5">
                  Voter Streaks
                </h4>
                <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                  Vote in 3 consecutive battles to start a streak. Streak
                  holders get a special badge and early access.
                </p>
                <p className="mt-3 text-xs text-text-muted">
                  Current record: 12-week streak
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.24}>
              <div className="bg-black rounded-2xl p-8 border border-white/5 text-center">
                <Eye className="w-12 h-12 text-purple mx-auto" />
                <h4 className="font-display text-lg font-semibold text-text-primary mt-5">
                  Community Rewards
                </h4>
                <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                  Top voters each month win exclusive merch, free event tickets,
                  and shoutouts from battling DJs.
                </p>
                <p className="mt-3 text-xs text-text-muted">
                  This month: Freetown Vibes Festival tickets
                </p>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.5}>
            <div className="mt-12 text-center">
              <a
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gold-gradient text-black font-semibold uppercase text-sm rounded-full hover:scale-[1.02] transition-transform"
              >
                Sign Up to Start Voting
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
