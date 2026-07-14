import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, MapPin, Music, ArrowLeft, User, Calendar } from 'lucide-react';
import { usePublicUser } from '@/hooks/usePublicUser';
import { usePageMeta } from '@/hooks/usePageMeta';
import ShareButton from '@/components/ShareButton';

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function UserPublicProfile() {
  const { username } = useParams<{ username: string }>();
  const { data: profile, isLoading, error } = usePublicUser(username);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const profileUrl = `${baseUrl}/user/${username}`;

  const title = useMemo(
    () => (profile ? `${profile.name || profile.username} — The Deck Salone` : 'User — The Deck Salone'),
    [profile]
  );
  const description = useMemo(
    () => profile?.bio?.slice(0, 160) || `Check out ${profile?.name || profile?.username || 'this user'} on The Deck Salone.`,
    [profile]
  );
  const image = useMemo(() => profile?.avatar || `${baseUrl}/default-avatar.jpg`, [profile, baseUrl]);

  usePageMeta(title, description, image, profileUrl);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-text-primary">
        <div className="text-center">
          <p className="text-xl font-display uppercase">User not found</p>
          <Link to="/discover" className="text-gold text-sm mt-4 inline-flex items-center gap-1 hover:underline">
            <ArrowLeft size={14} /> Back to discover
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile.name || profile.username;
  const isDj = profile.role === 'DJ' && profile.djProfile;
  const publicUrl = profile.djProfile ? `/dj/${profile.djProfile.user?.username || profile.djProfile.id}` : profileUrl;

  return (
    <div className="min-h-screen bg-black pb-20">
      <section className="relative pt-24 pb-12">
        <div className="container-main relative z-10">
          <Link
            to="/discover"
            className="inline-flex items-center gap-1 text-text-muted hover:text-gold text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Discover
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-center md:items-start gap-8"
          >
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-gold/30 shrink-0 bg-white/5">
              {profile.avatar ? (
                <img src={profile.avatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gold">
                  <User size={48} />
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="font-display text-2xl md:text-4xl font-semibold uppercase tracking-tight text-text-primary">
                {displayName}
              </h1>
              <p className="text-text-muted mt-1">@{profile.username}</p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 text-sm text-text-muted">
                {profile.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} className="text-gold" />
                    {profile.location}
                  </span>
                )}
                {profile.createdAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={14} className="text-gold" />
                    Joined {formatDate(profile.createdAt)}
                  </span>
                )}
                {isDj && (
                  <Link to={publicUrl} className="inline-flex items-center gap-1.5 text-gold hover:underline">
                    <Music size={14} />
                    DJ Profile
                  </Link>
                )}
              </div>

              {profile.bio && (
                <p className="mt-6 text-text-secondary leading-relaxed max-w-2xl mx-auto md:mx-0">{profile.bio}</p>
              )}

              {profile.favoriteGenres && profile.favoriteGenres.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-3">Favorite Genres</h3>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    {profile.favoriteGenres.map((g) => (
                      <span
                        key={g}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-text-secondary border border-white/10"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center md:justify-start gap-3 mt-8">
                {isDj && (
                  <Link
                    to={publicUrl}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-gradient text-black text-sm font-semibold uppercase tracking-wide rounded-full hover:scale-[1.02] transition-transform"
                  >
                    <Music size={16} />
                    View DJ Page
                  </Link>
                )}
                <ShareButton url={profileUrl} title={title} description={description} size="md" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
