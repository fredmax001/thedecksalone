import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MixTrack } from '@/stores/playerStore';

export interface UserPlaylist {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  tracks: MixTrack[];
  createdAt: string;
  updatedAt: string;
}

interface PlaylistState {
  playlists: UserPlaylist[];
  
  // Actions
  createPlaylist: (title: string, description?: string, initialTrack?: MixTrack) => UserPlaylist;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, title: string, description?: string) => void;
  addTrackToPlaylist: (playlistId: string, track: MixTrack) => { added: boolean; message: string };
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  getPlaylist: (id: string) => UserPlaylist | undefined;
}

export const usePlaylistStore = create<PlaylistState>()(
  persist(
    (set, get) => ({
      playlists: [],

      createPlaylist: (title: string, description?: string, initialTrack?: MixTrack) => {
        const newPlaylist: UserPlaylist = {
          id: `playlist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: title.trim() || 'My Playlist',
          description: description?.trim() || '',
          coverImage: initialTrack?.cover || undefined,
          tracks: initialTrack ? [initialTrack] : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          playlists: [newPlaylist, ...state.playlists],
        }));

        return newPlaylist;
      },

      deletePlaylist: (id: string) => {
        set((state) => ({
          playlists: state.playlists.filter((p) => p.id !== id),
        }));
      },

      renamePlaylist: (id: string, title: string, description?: string) => {
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === id
              ? {
                  ...p,
                  title: title.trim() || p.title,
                  description: description !== undefined ? description.trim() : p.description,
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      addTrackToPlaylist: (playlistId: string, track: MixTrack) => {
        const playlist = get().playlists.find((p) => p.id === playlistId);
        if (!playlist) {
          return { added: false, message: 'Playlist not found' };
        }

        const exists = playlist.tracks.some((t) => t.id === track.id);
        if (exists) {
          return { added: false, message: `Already in "${playlist.title}"` };
        }

        const updatedTracks = [...playlist.tracks, track];
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? {
                  ...p,
                  tracks: updatedTracks,
                  coverImage: p.coverImage || track.cover,
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));

        return { added: true, message: `Added to "${playlist.title}"` };
      },

      removeTrackFromPlaylist: (playlistId: string, trackId: string) => {
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? {
                  ...p,
                  tracks: p.tracks.filter((t) => t.id !== trackId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      getPlaylist: (id: string) => {
        return get().playlists.find((p) => p.id === id);
      },
    }),
    {
      name: 'decksalone_user_playlists',
    }
  )
);
