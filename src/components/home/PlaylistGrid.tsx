import { ListMusic } from 'lucide-react';
import SectionHeader from './SectionHeader';
import PlaylistCard from './PlaylistCard';
import type { HomePlaylist } from './types';

interface PlaylistGridProps {
  title?: string;
  subtitle?: string;
  playlists: HomePlaylist[];
  action?: { label: string; to: string };
}

export default function PlaylistGrid({
  title = 'Official Playlists',
  subtitle = 'Curated by Deck Salone',
  playlists,
  action = { label: 'Browse all', to: '/official-playlists' },
}: PlaylistGridProps) {
  if (!playlists || playlists.length === 0) {
    return (
      <section className="space-y-1">
        <SectionHeader title={title} subtitle={subtitle} action={action} icon={<ListMusic className="w-4 h-4" />} />
        <div className="rounded-2xl border border-dark-gray bg-black-surface p-8 text-center text-text-secondary text-sm">
          No playlists available yet.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-1">
      <SectionHeader title={title} subtitle={subtitle} action={action} icon={<ListMusic className="w-4 h-4" />} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {playlists.map((pl, i) => (
          <PlaylistCard key={pl.id} playlist={pl} index={i} />
        ))}
      </div>
    </section>
  );
}
