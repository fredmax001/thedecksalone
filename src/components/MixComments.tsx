import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Trash2,
  ShieldCheck,
  CornerDownRight,
  Loader2,
  Heart,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api, { getMediaUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useLongPress } from '@/hooks/useLongPress';
import ModeratorBadge from '@/components/ModeratorBadge';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/apiErrors';

interface CommentUser {
  id: string;
  name?: string;
  username: string;
  avatar?: string;
  role: string;
  djProfile?: {
    id: string;
    stageName: string;
    avatar?: string;
  };
}

interface MixCommentItem {
  id: string;
  mixId: string;
  userId: string;
  content: string;
  parentId?: string | null;
  createdAt: string;
  user: CommentUser;
  isDjCreator?: boolean;
  likeCount?: number;
  isLiked?: boolean;
  replies?: MixCommentItem[];
}

function formatCommentDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MixComments({
  mixId,
  djUserId,
  className,
}: {
  mixId: string;
  djUserId?: string;
  className?: string;
}) {
  const { user, isAuthenticated } = useAuthStore();
  const [comments, setComments] = useState<MixCommentItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [likingId, setLikingId] = useState<string | null>(null);

  const fetchComments = async () => {
    try {
      const res = await api.get(`/mixes/${mixId}/comments`);
      if (res.data.success) {
        setComments(res.data.data?.comments || []);
        setTotalCount(res.data.data?.total || 0);
      }
    } catch {
      // Quiet fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mixId) {
      fetchComments();
    }
  }, [mixId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.info('Sign in to leave a comment');
      return;
    }
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/mixes/${mixId}/comments`, {
        content: newComment.trim(),
      });
      if (res.data.success) {
        toast.success('Comment posted!');
        setNewComment('');
        fetchComments();
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to post comment'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!isAuthenticated) {
      toast.info('Sign in to reply');
      return;
    }
    if (!replyText.trim()) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/mixes/${mixId}/comments`, {
        content: replyText.trim(),
        parentId,
      });
      if (res.data.success) {
        toast.success('Reply posted!');
        setReplyText('');
        setReplyingToId(null);
        fetchComments();
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to post reply'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      const res = await api.delete(`/mixes/${mixId}/comments/${commentId}`);
      if (res.data.success) {
        toast.success('Comment deleted');
        fetchComments();
      }
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const handleLikeComment = useCallback(
    async (commentId: string) => {
      if (!isAuthenticated) {
        toast.info('Sign in to like comments');
        return;
      }
      setLikingId(commentId);
      try {
        const res = await api.post(`/mixes/${mixId}/comments/${commentId}/like`);
        if (res.data.success) {
          const liked = res.data.data?.liked;
          toast.success(liked ? 'Liked comment' : 'Unliked comment');
          setComments((prev) =>
            prev.map((c) => {
              const mapItem = (item: MixCommentItem): MixCommentItem => {
                if (item.id === commentId) {
                  return {
                    ...item,
                    isLiked: liked,
                    likeCount: Math.max(0, (item.likeCount || 0) + (liked ? 1 : -1)),
                  };
                }
                if (item.replies) {
                  return { ...item, replies: item.replies.map(mapItem) };
                }
                return item;
              };
              return mapItem(c);
            })
          );
        }
      } catch (err: any) {
        toast.error(getApiErrorMessage(err, 'Failed to like comment'));
      } finally {
        setLikingId(null);
      }
    },
    [isAuthenticated, mixId]
  );

  const renderAuthorName = (author: CommentUser, isDjCreator?: boolean) => {
    const name = author.djProfile?.stageName || author.name || author.username || 'User';
    return (
      <span className="flex items-center gap-1 font-semibold text-xs text-text-primary">
        {name}
        {isDjCreator && (
          <span className="bg-gold-gradient text-black text-[8px] font-black uppercase px-1 py-0 rounded-full flex items-center gap-0.5">
            <ShieldCheck className="w-2 h-2" /> DJ
          </span>
        )}
        {(author.role === 'MODERATOR' || author.role === 'ADMIN') && (
          <ModeratorBadge user={author} showText size="sm" />
        )}
      </span>
    );
  };

  const CommentActions = ({
    item,
    onReply,
  }: {
    item: MixCommentItem;
    onReply?: () => void;
  }) => {
    const longPressProps = useLongPress({
      onLongPress: () => handleLikeComment(item.id),
      onClick: () => handleLikeComment(item.id),
      threshold: 400,
    });

    return (
      <div className="flex items-center gap-3 mt-1">
        <button
          {...longPressProps}
          disabled={likingId === item.id}
          className={`flex items-center gap-1 text-[10px] font-bold transition-colors ${
            item.isLiked ? 'text-red-400' : 'text-text-muted hover:text-red-400'
          }`}
        >
          {likingId === item.id ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Heart className={`w-3 h-3 ${item.isLiked ? 'fill-current' : ''}`} />
          )}
          <span>{item.likeCount || 0}</span>
        </button>

        {onReply && (
          <button
            onClick={onReply}
            className="flex items-center gap-1 text-[10px] font-bold text-text-muted hover:text-gold transition-colors"
          >
            <CornerDownRight className="w-3 h-3" /> Reply
          </button>
        )}
      </div>
    );
  };

  const renderComment = (comment: MixCommentItem, isReply = false) => {
    const canDelete =
      user?.id === comment.userId ||
      user?.id === djUserId ||
      ['ADMIN', 'MODERATOR'].includes(user?.role || '');

    return (
      <div
        key={comment.id}
        className={`flex gap-2.5 ${isReply ? 'pt-2' : 'pb-3 border-b border-white/5 last:border-0'}`}
      >
        <Avatar className={`border border-white/10 shrink-0 ${isReply ? 'w-6 h-6' : 'w-8 h-8'}`}>
          <AvatarImage src={getMediaUrl(comment.user?.djProfile?.avatar || comment.user?.avatar) || undefined} />
          <AvatarFallback className={`bg-dark-gray font-bold text-gold ${isReply ? 'text-[9px]' : 'text-xs'}`}>
            {(comment.user?.username || 'U')[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {renderAuthorName(comment.user, comment.isDjCreator)}
              <span className="text-[9px] text-text-muted ml-1.5">{formatCommentDate(comment.createdAt)}</span>
            </div>
            {canDelete && (
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="text-text-muted hover:text-red transition-colors shrink-0 p-0.5"
              >
                <Trash2 className={`${isReply ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
              </button>
            )}
          </div>

          <p className={`text-text-secondary whitespace-pre-wrap mt-0.5 leading-relaxed ${isReply ? 'text-[11px]' : 'text-xs'}`}>
            {comment.content}
          </p>

          <CommentActions
            item={comment}
            onReply={!isReply ? () => setReplyingToId(replyingToId === comment.id ? null : comment.id) : undefined}
          />

          {/* Reply form */}
          {!isReply && replyingToId === comment.id && (
            <div className="mt-2 space-y-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="bg-black-elevated border-dark-gray text-xs min-h-[60px] h-auto"
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setReplyingToId(null)}
                  className="text-xs h-7"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={submitting || !replyText.trim()}
                  className="bg-gold-gradient text-black font-bold text-xs h-7 px-3 uppercase"
                >
                  Reply
                </Button>
              </div>
            </div>
          )}

          {/* Nested replies */}
          {!isReply && comment.replies && comment.replies.length > 0 && (
            <div className="mt-2 pl-3 border-l border-white/5 space-y-2">
              {comment.replies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div id="comments" className={cn("space-y-4", className || "mt-10 pt-6 border-t border-white/10")}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm uppercase text-text-primary flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gold" />
          Comments ({totalCount})
        </h3>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmitComment} className="flex gap-2.5">
        <Avatar className="w-8 h-8 border border-gold/30 shrink-0 mt-0.5">
          <AvatarImage src={getMediaUrl(user?.avatar || user?.djProfile?.avatar) || undefined} />
          <AvatarFallback className="bg-gold-gradient text-black text-xs font-bold">
            {(user?.username || 'U')[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder={
              isAuthenticated
                ? 'Add a comment or feedback on this mix...'
                : 'Sign in to join the conversation...'
            }
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="bg-black-elevated border-dark-gray text-xs focus:border-gold min-h-[64px] resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="bg-gold-gradient text-black font-bold text-xs uppercase px-4 h-8"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1" /> Post</>}
            </Button>
          </div>
        </div>
      </form>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 text-gold animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-6 bg-black-surface border border-white/5 rounded-xl">
          <p className="text-xs text-text-muted">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-black-surface border border-white/5 rounded-xl p-3 space-y-1"
        >
          {comments.map((comment) => renderComment(comment))}
        </motion.div>
      )}
    </div>
  );
}
