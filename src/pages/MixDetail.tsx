import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Heart, Clock, Music, Loader2, ArrowLeft } from 'lucide-react';
import { useMix, useLikeMix } from '@/hooks/useMixes';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useAuthStore } from '@/stores/authStore';
import ShareButton from '@/components/ShareButton';
import { toast } from 'sonner';

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export default function MixDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: mix, isLoading, error } = useMix(id);
  const { isAuthenticated } = useAuthStore();
  const { mutate: likeMix } = useLikeMix();

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const mixUrl = `${baseUrl}/mix/${id}`;

  const title = useMemo(
    () => (mix ? `${mix.title} by ${mix.dj?.stageName || 'DJ'} — The Deck Salone` : 'Mix — The Deck Salone'),
    [mix]
  );
  const description = useMemo(
    () => mix?.description?.slice(0, 160) || `Listen to this mix on The Deck Salone.`,
    [mix]
  );
  const image = useMemo(() => mix?.coverImage || mix?.dj?.avatar || `${baseUrl}/mix-placeholder.jpg`, [mix, baseUrl]);

  usePageMeta(title, description, image, mixUrl);

  const handlePlay = () => {
    if (!mix) return;
    window.dispatchEvent(
      new CustomEvent('play-mix', { detail: { track: {
        id: mix.id,
        title: mix.title,
        dj: mix.dj?.stageName || 'DJ',
        duration: mix.duration || 0,
        cover: mix.coverImage || '/placeholder.jpg',
        genre: mix.genre || mix.category || 'Mix',
        audioUrl: mix.audioUrl,
        audioSource: mix.audioSource,
        originalUrl: mix.originalUrl,
        plays: mix.plays || 0,
        djTier: mix.dj?.subscriptionTier,
      }, queue: undefined } })
    );
  };

  const handleLike = () => {
    if (!mix) return;
    if (!isAuthenticated) {
      toast.info('Sign in to like mixes');
      return;
    }
    likeMix(mix.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (error || !mix) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-text-primary">
        <div className="text-center">
          <p className="text-xl font-display uppercase">Mix not found</p>
          <Link to="/mixes" className="text-gold text-sm mt-4 inline-flex items-center gap-1 hover:underline">
            <ArrowLeft size={14} /> Back to mixes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Hero */}
      <section className="relative pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={mix.coverImage || '/mix-placeholder.jpg'}
            alt={mix.title}
            className="w-full h-full object-cover opacity-20 blur-xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
        </div>

        <div className="container-main relative z-10">
          <Link to="/mixes" className="inline-flex items-center gap-1 text-text-muted hover:text-gold text-sm mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to Mixes
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Cover */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative w-full md:w-80 lg:w-96 shrink-0 aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-card"
            >
              <img
                src={mix.coverImage || '/mix-placeholder.jpg'}
                alt={mix.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={handlePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
              >
                <div className="w-16 h-16 rounded-full bg-gold-gradient flex items-center justify-center hover:scale-105 transition-transform">
                  <Play size={28} className="text-black ml-1" />
                </div>
              </button>
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1"
            >
              <h1 className="font-display text-2xl md:text-4xl font-semibold uppercase tracking-tight text-text-primary">
                {mix.title}
              </h1>

              <Link
                to={`/dj/${mix.dj?.user?.username || mix.dj?.id}`}
                className="inline-flex items-center gap-3 mt-4 group"
              >
                <img
                  src={mix.dj?.avatar || '/default-avatar.jpg'}
                  alt={mix.dj?.stageName}
                  className="w-10 h-10 rounded-full object-cover border border-gold/30"
                />
                <span className="text-gold group-hover:text-gold-light transition-colors">
                  {mix.dj?.stageName || 'DJ'}
                </span>
              </Link>

              <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Music size={14} className="text-gold" />
                  {mix.genre || mix.category || 'Mix'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} className="text-gold" />
                  {formatDuration(mix.duration || 0)}
                </span>
                <span>{formatCompact(mix.plays || 0)} plays</span>
                <span>{formatCompact(mix.likes || 0)} likes</span>
              </div>

              {mix.description && (
                <p className="mt-6 text-text-secondary leading-relaxed max-w-2xl">{mix.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-8">
                <button
                  onClick={handlePlay}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gold-gradient text-black text-sm font-semibold uppercase tracking-wide rounded-full hover:scale-[1.02] transition-transform"
                >
                  <Play size={16} />
                  Play Mix
                </button>
                <button
                  onClick={handleLike}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/10 text-text-primary text-sm font-medium hover:border-gold hover:text-gold transition-colors"
                >
                  <Heart size={16} />
                  Like
                </button>
                <ShareButton
                  url={mixUrl}
                  title={title}
                  description={description}
                  size="md"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
