import { motion } from 'framer-motion';
import {
  Music,
  Loader2,
  Play,
  Heart,
  Eye,
  MoreVertical,
  Plus,
  Upload,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Mix {
  id: string;
  title: string;
  genre: string;
  coverImage?: string;
  plays: number;
  likes: number;
  isPublic: boolean;
  createdAt: string;
  duration?: string;
}

export default function Mixes() {
  const { user } = useAuthStore();
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [loading, setLoading] = useState(true);
  const isDj = user?.role === 'DJ';
  const djId = user?.djProfile?.id;

  useEffect(() => {
    if (!isDj || !djId) {
      setLoading(false);
      return;
    }

    const fetchMixes = async () => {
      try {
        const res = await api.get(`/mixes?djId=${djId}`);
        if (res.data.success) {
          setMixes(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load mixes', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMixes();
  }, [isDj, djId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Mixes
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage your mixes, track performance, and upload new content.
          </p>
        </div>
        <Link to="/mixes">
          <Button className="bg-gold-gradient text-black hover:opacity-90">
            <Upload className="w-4 h-4 mr-2" />
            Upload New Mix
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="my-mixes" className="w-full">
        <TabsList className="bg-black-elevated border border-dark-gray">
          <TabsTrigger value="my-mixes" className="data-[state=active]:bg-gold data-[state=active]:text-black">
            My Mixes ({mixes.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-gold data-[state=active]:text-black">
            Mix Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-mixes" className="mt-4">
          {mixes.length === 0 ? (
            <Card className="bg-black-surface border-dark-gray">
              <CardContent className="py-12 text-center">
                <Music className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary mb-2">No mixes uploaded yet</p>
                <p className="text-sm text-text-muted mb-4">
                  Upload your mixes to showcase your talent and attract bookings.
                </p>
                <Link to="/mixes">
                  <Button className="bg-gold-gradient text-black">
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Your First Mix
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {mixes.map((mix) => (
                <motion.div
                  key={mix.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="bg-black-surface border-dark-gray overflow-hidden group hover:border-gold/30 transition-colors">
                    <div className="relative aspect-square bg-black-elevated">
                      {mix.coverImage ? (
                        <img
                          src={mix.coverImage}
                          alt={mix.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-12 h-12 text-text-muted" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="icon" className="bg-gold/90 text-black hover:bg-gold rounded-full">
                          <Play className="w-5 h-5 ml-0.5" />
                        </Button>
                      </div>
                      <div className="absolute top-2 right-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 bg-black/50 text-text-primary hover:bg-black/70"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-black-surface border-dark-gray">
                            <DropdownMenuItem className="cursor-pointer">Edit</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">View on Site</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">Share</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-red">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <Badge
                        className={cn(
                          'absolute bottom-2 left-2 border-0 text-xs',
                          mix.isPublic ? 'bg-green/10 text-green' : 'bg-yellow-500/10 text-yellow-500'
                        )}
                      >
                        {mix.isPublic ? 'Public' : 'Draft'}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-text-primary truncate mb-1">{mix.title}</h3>
                      <p className="text-xs text-text-secondary capitalize mb-3">{mix.genre}</p>
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          {mix.plays.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {mix.likes.toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="py-12 text-center">
              <Eye className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary mb-2">Mix analytics coming soon</p>
              <p className="text-sm text-text-muted">
                Detailed play tracking, listener demographics, and engagement metrics will be available here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
