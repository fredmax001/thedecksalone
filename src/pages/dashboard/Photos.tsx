import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

interface DjPhoto {
  id: string;
  url: string;
  caption?: string;
  sortOrder: number;
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<DjPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const res = await api.get('/photos/me');
      if (res.data.success) {
        setPhotos(res.data.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load photos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photos.length >= 10) {
      setError('Maximum 10 photos allowed');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('photo', file);
      const uploadRes = await api.post('/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (uploadRes.data.success) {
        await fetchPhotos();
      } else {
        throw new Error(uploadRes.data.error || 'Upload failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this photo?')) return;
    try {
      await api.delete(`/photos/${id}`);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold uppercase text-text-primary">Photos</h1>
          <p className="text-sm text-text-muted mt-1">
            {photos.length}/10 photos uploaded
          </p>
        </div>
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            id="photo-upload"
            disabled={uploading || photos.length >= 10}
          />
          <label htmlFor="photo-upload">
            <Button
              asChild
              disabled={uploading || photos.length >= 10}
              className="bg-gold-gradient text-black font-semibold cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Upload Photo
              </span>
            </Button>
          </label>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red/10 border border-red/20 text-red text-sm">
          {error}
        </div>
      )}

      {photos.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <ImageIcon size={48} className="text-text-muted mb-4" />
          <p className="text-text-muted text-sm">No photos yet. Upload your first photo.</p>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {photos.map((photo, i) => (
            <motion.div
              key={photo.id}
              className="group relative aspect-square rounded-xl overflow-hidden bg-[#111111] border border-white/5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <img
                src={photo.url}
                alt={photo.caption || 'DJ photo'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="p-2 rounded-full bg-red/80 text-white hover:bg-red transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-xs text-white/80 truncate">{photo.caption}</p>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
