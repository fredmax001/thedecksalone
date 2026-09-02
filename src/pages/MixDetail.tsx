import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Heart, Clock, Music, Loader2, ArrowLeft, Calendar, UserCheck, Flag, Download, Edit2 } from 'lucide-react';
import { useMix, useLikeMix } from '@/hooks/useMixes';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useAuthStore } from '@/stores/authStore';
import ShareButton from '@/components/ShareButton';
import { RepostButton } from '@/components/RepostButton';
import ReportModal from '@/components/ReportModal';
import MixDownloadModal from '@/components/MixDownloadModal';
import DjSupportModal from '@/components/DjSupportModal';
import api, { getMediaUrl, downloadMixFile } from '@/lib/api';
import MixComments from '@/components/MixComments';
import MixRecommendations from '@/components/MixRecommendations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatCompactNumber } from '@/lib/formatting';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { getAvatarImageUrl } from '@/lib/utils';

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MixDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: mix, isLoading, error } = useMix(id);
  const { user, isAuthenticated } = useAuthStore();
  const { mutate: likeMix } = useLikeMix();
  const [showReportModal, setShowReportModal] = useState(false);
  const [downloadModalMode, setDownloadModalMode] = useState<'auth' | 'subscribe' | 'repost' | 'follow' | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const mixUrl = `${baseUrl}/mix/${id}`;

  const title = useMemo(
    () => (mix ? `${mix.title} by ${mix.dj?.stageName || 'DJ'} — Deck Salone` : 'Mix — Deck Salone'),
    [mix]
  );
  const description = useMemo(
    () => mix?.description?.slice(0, 160) || `Listen to this mix on Deck Salone.`,
    [mix]
  );
  const image = useMemo(() => mix?.coverImage || mix?.dj?.avatar || `${baseUrl}/mix-placeholder.jpg`, [mix, baseUrl]);

  usePageMeta(title, description, image, mixUrl);

  const handlePlay = () => {
    if (!mix) return;
    window.dispatchEvent(
      new CustomEvent('play-mix', {
        detail: {
          track: {
            id: mix.id,
            title: mix.title,
            dj: mix.dj?.stageName || 'DJ',
            duration: mix.duration || 0,
            cover: mix.coverImage || '/mix-placeholder.jpg',
            genre: mix.genre || mix.category || 'Mix',
            audioUrl: mix.audioUrl,
            audioSource: mix.audioSource,
            originalUrl: mix.originalUrl,
            plays: mix.plays || 0,
            djTier: mix.dj?.subscriptionTier,
          },
          queue: undefined,
        },
      })
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

  const handleDownload = async () => {
    if (!mix) return;
    if (!isAuthenticated) {
      setDownloadModalMode('auth');
      return;
    }
    try {
      setDownloading(true);
      toast.info(`Preparing download for "${mix.title}"...`);
      const res = await api.post(`/mixes/${mix.id}/download`);
      const downloadEndpoint = res.data.downloadUrl || `/api/mixes/${mix.id}/download-file`;
      await downloadMixFile(downloadEndpoint, res.data.directAudioUrl, `${mix.title}.mp3`);
      toast.success(`Download started! Enjoy the mix.`);
    } catch (err: any) {
      if (err.response?.status === 403) {
        if (err.response?.data?.requiresRepost) setDownloadModalMode('repost');
        else if (err.response?.data?.requiresFollow) setDownloadModalMode('follow');
        else if (err.response?.data?.requiresSubscription) setDownloadModalMode('subscribe');
        else toast.error('Download failed', { description: getApiErrorMessage(err, 'Unable to download this mix.') });
      } else if (err.response?.status === 401) {
        setDownloadModalMode('auth');
      } else {
        toast.error('Download failed', { description: getApiErrorMessage(err, 'Please try again.') });
      }
    } finally {
      setDownloading(false);
    }
  };

  const retryDownload = async () => {
    if (!mix) return;
    try {
      setDownloading(true);
      const res = await api.post(`/mixes/${mix.id}/download`);
      const downloadEndpoint = res.data.downloadUrl || `/api/mixes/${mix.id}/download-file`;
      await downloadMixFile(downloadEndpoint, res.data.directAudioUrl, `${mix.title}.mp3`);
      toast.success(`Download started! Enjoy the mix.`);
    } catch (err: any) {
      if (err.response?.status !== 403) {
        toast.error('Download failed', { description: getApiErrorMessage(err, 'Please try again.') });
      }
    } finally {
      setDownloading(false);
    }
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
      <div className="min-h-screen bg-black flex items-center justify-center text-text-primary px-4">
        <div className="text-center">
          <p className="text-xl font-display uppercase font-bold text-gold">Mix not found</p>
          <Link to="/mixes" className="text-gold text-sm mt-4 inline-flex items-center gap-1 hover:underline">
            <ArrowLeft size={14} /> Back to mixes
          </Link>
        </div>
      </div>
    );
  }

  const djProfile = mix.dj;
  const djIdentifier =
    djProfile?.user?.username ||
    (djProfile as any)?.username ||
    djProfile?.id ||
    djProfile?.stageName ||
    mix.djId ||
    '';

  return (
    <div className="min-h-screen bg-black pb-28">
      {/* Hero Header */}
      <section className="relative pt-20 sm:pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={mix.coverImage || '/mix-placeholder.jpg'}
            alt={mix.title}
            className="w-full h-full object-cover opacity-15 blur-2xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/90 to-black" />
        </div>

        <div className="max-w-container mx-auto px-4 sm:px-6 relative z-10">
          <Link to="/mixes" className="inline-flex items-center gap-1 text-text-muted hover:text-gold text-xs uppercase font-bold mb-6 transition-colors">
            <ArrowLeft size={14} /> Back to Mix Hub
          </Link>

          <div className="flex flex-col md:flex-row gap-6 lg:gap-10 items-start">
            {/* Artwork Cover Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-xs md:w-72 lg:w-80 shrink-0 aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl mx-auto md:mx-0 group"
            >
              <img
                src={mix.coverImage || '/mix-placeholder.jpg'}
                alt={mix.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={handlePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <div className="w-16 h-16 rounded-full bg-gold-gradient flex items-center justify-center hover:scale-105 transition-transform shadow-gold">
                  <Play size={28} className="text-black ml-1 fill-black" />
                </div>
              </button>
            </motion.div>

            {/* Mix Information */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 space-y-4 w-full"
            >
              <div>
                <Badge className="bg-gold/15 text-gold border border-gold/40 text-[10px] uppercase font-bold tracking-wider mb-2">
                  {mix.genre || mix.category || 'MIX'}
                </Badge>
                <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-tight text-text-primary leading-tight">
                  {mix.title}
                </h1>
                {mix.dj && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-text-muted">By</span>
                    <Link
                      to={`/dj/${djIdentifier}`}
                      className="text-sm sm:text-base font-semibold text-gold hover:underline inline-flex items-center gap-1.5 transition-colors"
                    >
                      {mix.dj.avatar && (
                        <img
                          src={mix.dj.avatar ? getMediaUrl(mix.dj.avatar) : '/default-avatar.jpg'}
                          alt={mix.dj.stageName}
                          className="w-5 h-5 rounded-full object-cover border border-gold/40"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-avatar.jpg';
                          }}
                        />
                      )}
                      <span>{mix.dj.stageName || 'DJ'}</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Stats Bar */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted border-y border-white/5 py-3">
                <span className="inline-flex items-center gap-1.5 font-medium text-text-secondary">
                  <Music size={14} className="text-gold" />
                  {mix.genre || 'Afrobeats'}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono">
                  <Clock size={14} className="text-gold" />
                  {formatDuration(mix.duration || 0)}
                </span>
                <span className="font-mono">{formatCompactNumber(mix.plays || 0)} Plays</span>
                <span className="font-mono">{formatCompactNumber(mix.likes || 0)} Likes</span>
              </div>

              {mix.description && (
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl bg-black-surface border border-white/5 rounded-xl p-3.5">
                  {mix.description}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={handlePlay}
                  className="bg-gold-gradient text-black font-bold uppercase text-xs tracking-wider px-6 py-3 rounded-full hover:scale-105 transition-transform"
                >
                  <Play size={16} className="mr-1.5 fill-black" /> Play Mix Now
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLike}
                  className="border-white/20 text-text-primary hover:border-gold hover:text-gold text-xs font-semibold rounded-full px-5"
                >
                  <Heart size={15} className="mr-1.5" /> <span className="hidden sm:inline">Like</span> ({mix.likes || 0})
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="border-white/20 text-text-primary hover:border-gold hover:text-gold text-xs font-semibold rounded-full px-5"
                >
                  <Download size={15} className="mr-1.5" /> <span className="hidden sm:inline">{downloading ? '...' : 'Download'}</span>
                </Button>
                <ShareButton
                  url={mixUrl}
                  title={title}
                  description={description}
                  size="md"
                  preview={{
                    type: 'mix',
                    coverImage: mix.coverImage ? getMediaUrl(mix.coverImage) : undefined,
                    title: mix.title,
                    djName: mix.dj?.stageName,
                    djAvatar: mix.dj?.avatar ? getMediaUrl(mix.dj.avatar) : undefined,
                    artist: mix.dj?.stageName,
                    genre: mix.genre || mix.category,
                    plays: mix.plays,
                    duration: mix.duration,
                  }}
                />
                <RepostButton mixId={mix.id} size="md" showCount={true} />
                {user && ((user as any).djProfile?.id === mix.dj?.id || user.id === mix.dj?.user?.id || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                  <Link
                    to={`/dashboard/mixes/${mix.id}/edit`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#f4e059] text-black font-bold text-xs uppercase shadow hover:brightness-110 transition-all"
                    title="Edit Your Mix"
                  >
                    <Edit2 size={14} /> <span>Edit Mix</span>
                  </Link>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowReportModal(true)}
                  className="border-white/10 text-text-muted hover:text-red hover:border-red/40 text-xs font-semibold rounded-full px-4"
                  title="Report Mix"
                >
                  <Flag size={14} className="mr-1.5" /> <span className="hidden sm:inline">Report</span>
                </Button>
              </div>

              <ReportModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                mixId={mix.id}
                targetUserId={mix.djId}
                itemTitle={mix.title}
              />

              <MixDownloadModal
                isOpen={!!downloadModalMode}
                onClose={() => setDownloadModalMode(null)}
                mode={downloadModalMode || 'auth'}
                mix={
                  mix
                    ? {
                        id: mix.id,
                        title: mix.title,
                        djName: mix.dj?.stageName,
                        dj: {
                          id: mix.dj?.id || mix.djId,
                          stageName: mix.dj?.stageName,
                          avatar: mix.dj?.avatar,
                        },
                      }
                    : null
                }
                onActionComplete={retryDownload}
                onOpenDjSupport={() => setSupportModalOpen(true)}
              />

              {mix?.dj && (
                <DjSupportModal
                  isOpen={supportModalOpen}
                  onClose={() => setSupportModalOpen(false)}
                  dj={{
                    id: mix.dj.id || mix.djId,
                    stageName: mix.dj.stageName || 'DJ',
                    avatar: mix.dj.avatar,
                  }}
                />
              )}

              {/* ─── Compact DJ / Artist Card ─── */}
              {djProfile && (
                <div className="mt-8 pt-4">
                  <div className="bg-black-surface border border-dark-gray hover:border-gold/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-lg">
                    <div className="flex items-center gap-3.5">
                      <Link to={`/dj/${djIdentifier}`} className="shrink-0 relative">
                        <img
                          src={getAvatarImageUrl(djProfile.avatar)}
                          alt={djProfile.stageName}
                          className="w-14 h-14 rounded-full object-cover border-2 border-gold/40"
                        />
                        {djProfile.verified && (
                          <UserCheck className="w-4 h-4 text-green bg-black rounded-full absolute -bottom-0.5 -right-0.5" />
                        )}
                      </Link>
                      <div>
                        <Link to={`/dj/${djIdentifier}`} className="font-display font-bold text-base text-text-primary hover:text-gold transition-colors flex items-center gap-1.5">
                          {djProfile.stageName}
                        </Link>
                        <p className="text-xs text-text-muted mt-0.5">
                          {djProfile.genres?.slice(0, 3).join(' • ') || 'Afrobeats • Salone Mix'}
                        </p>
                        {djProfile.city && (
                          <p className="text-[10px] text-gold font-semibold mt-0.5">📍 {djProfile.city}, Sierra Leone</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Link to={`/dj/${djIdentifier}`}>
                        <Button variant="outline" size="sm" className="border-dark-gray text-xs font-semibold rounded-full">
                          View DJ Profile
                        </Button>
                      </Link>
                      <Link to={`/booking?dj=${djIdentifier}`}>
                        <Button size="sm" className="bg-gold-gradient text-black font-bold text-xs uppercase tracking-wider rounded-full px-4">
                          <Calendar className="w-3.5 h-3.5 mr-1" /> Book DJ
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* ─── Comments Section ─── */}
          <div id="comments">
            <MixComments mixId={mix.id} djUserId={djProfile?.userId} />
          </div>

          {/* ─── Recommendations Section ─── */}
          <MixRecommendations mixId={mix.id} djName={djProfile?.stageName} />
        </div>
      </section>
    </div>
  );
}
