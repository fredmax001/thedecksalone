import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Check,
  ListMusic,
  ListPlus,
  Music,
  Sparkles,
} from 'lucide-react';
import { usePlaylistStore, type UserPlaylist } from '@/stores/playlistStore';
import { usePlayerStore, type MixTrack } from '@/stores/playerStore';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: MixTrack | null;
}

export default function AddToPlaylistModal({
  isOpen,
  onClose,
  track,
}: AddToPlaylistModalProps) {
  const { playlists, createPlaylist, addTrackToPlaylist } = usePlaylistStore();
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  if (!isOpen || !track) return null;

  const handleAddToPlaylist = (playlist: UserPlaylist) => {
    triggerHaptic();
    const result = addTrackToPlaylist(playlist.id, track);
    if (result.added) {
      toast.success(result.message);
      onClose();
    } else {
      toast.info(result.message);
    }
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    triggerHaptic();
    const newPlaylist = createPlaylist(newTitle.trim(), newDescription.trim(), track);
    toast.success(`Created "${newPlaylist.title}" and added mix!`);
    setNewTitle('');
    setNewDescription('');
    setIsCreating(false);
    onClose();
  };

  const handleAddToQueue = () => {
    triggerHaptic();
    addToQueue(track);
    toast.success(`Added "${track.title}" to play queue`);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-[#121212] border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 z-10 text-text-primary max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                <ListPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight font-display">
                  Add to Playlist
                </h3>
                <p className="text-[11px] text-text-muted truncate max-w-[240px]">
                  {track.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-text-muted hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Queue Action */}
          <div className="py-3 border-b border-white/5">
            <button
              onClick={handleAddToQueue}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                  <ListMusic className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-text-primary group-hover:text-gold transition-colors">
                    Add to Play Queue
                  </p>
                  <p className="text-[10px] text-text-muted">
                    Play next after current track
                  </p>
                </div>
              </div>
              <Plus className="w-4 h-4 text-text-muted group-hover:text-gold transition-colors" />
            </button>
          </div>

          {/* Playlist Content List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1 custom-scrollbar">
            {/* Create Playlist Form / Toggle */}
            {isCreating || playlists.length === 0 ? (
              <form onSubmit={handleCreateAndAdd} className="p-3.5 rounded-xl bg-gold/5 border border-gold/20 space-y-3">
                <div className="flex items-center gap-2 text-gold">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {playlists.length === 0 ? 'Create Your First Playlist' : 'New Playlist'}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Playlist Name (e.g. Afrobeats Vibez)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                  className="w-full h-10 px-3 rounded-lg bg-black border border-white/15 text-xs text-white placeholder:text-text-muted focus:border-gold outline-none"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-black border border-white/10 text-[11px] text-white placeholder:text-text-muted focus:border-gold outline-none"
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 h-9 rounded-lg bg-gold-gradient text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-gold/10"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create & Add
                  </button>
                  {playlists.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-3 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-text-muted hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-gold/40 hover:border-gold bg-gold/5 hover:bg-gold/10 text-gold text-xs font-bold uppercase tracking-wider transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Playlist</span>
              </button>
            )}

            {/* Existing Playlists */}
            {playlists.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted px-1">
                  Your Playlists ({playlists.length})
                </p>
                {playlists.map((pl) => {
                  const alreadyInPlaylist = pl.tracks.some((t) => t.id === track.id);
                  return (
                    <div
                      key={pl.id}
                      onClick={() => handleAddToPlaylist(pl)}
                      className={cn(
                        'flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer group',
                        alreadyInPlaylist
                          ? 'bg-gold/10 border-gold/30 text-white'
                          : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 hover:border-white/15'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black border border-white/10 shrink-0 flex items-center justify-center">
                          {pl.coverImage ? (
                            <img src={pl.coverImage} alt={pl.title} className="w-full h-full object-cover" />
                          ) : (
                            <Music className="w-4 h-4 text-gold/60" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary group-hover:text-gold truncate transition-colors">
                            {pl.title}
                          </p>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            {pl.tracks.length} {pl.tracks.length === 1 ? 'mix' : 'mixes'}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 pl-2">
                        {alreadyInPlaylist ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-gold bg-gold/20 px-2 py-0.5 rounded-full border border-gold/30">
                            <Check className="w-3 h-3" /> Added
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="p-1.5 rounded-lg bg-white/5 group-hover:bg-gold group-hover:text-black text-text-secondary transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
