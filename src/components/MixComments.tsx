import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Trash2, ShieldCheck, CornerDownRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import ModeratorBadge from '@/components/ModeratorBadge';

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
  replies?: MixCommentItem[];
}

export default function MixComments({ mixId, djUserId }: { mixId: string; djUserId?: string }) {
  const { user, isAuthenticated } = useAuthStore();
  const [comments, setComments] = useState<MixCommentItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

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
      toast.error(err.response?.data?.error || 'Failed to post comment');
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
      toast.error(err.response?.data?.error || 'Failed to post reply');
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

  const renderAuthorName = (author: CommentUser, isDjCreator?: boolean) => {
    const name = author.djProfile?.stageName || author.name || author.username || 'User';
    return (
      <span className="flex items-center gap-1.5 font-bold text-xs text-text-primary">
        {name}
        {isDjCreator && (
          <span className="bg-gold-gradient text-black text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <ShieldCheck className="w-2.5 h-2.5" /> CREATOR DJ
          </span>
        )}
        {(author.role === 'MODERATOR' || author.role === 'ADMIN') && (
          <ModeratorBadge user={author} showText size="sm" />
        )}
      </span>
    );
  };

  return (
    <div id="comments" className="mt-12 pt-8 border-t border-white/10 space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg uppercase text-text-primary flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gold" />
          COMMENTS ({totalCount})
        </h3>
      </div>

      {/* Input box */}
      <form onSubmit={handleSubmitComment} className="space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="w-9 h-9 border border-gold/30 flex-shrink-0 mt-1">
            <AvatarImage src={user?.avatar || user?.djProfile?.avatar} />
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
              className="bg-black-elevated border-dark-gray text-xs focus:border-gold min-h-[72px] resize-none"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="bg-gold-gradient text-black font-bold text-xs uppercase px-4 h-8"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1" /> Post Comment</>}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 text-gold animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 bg-black-surface border border-white/5 rounded-2xl">
          <p className="text-xs text-text-muted">No comments yet. Be the first to comment on this mix!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const canDelete =
              user?.id === comment.userId ||
              user?.id === djUserId ||
              ['ADMIN', 'MODERATOR'].includes(user?.role || '');

            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black-surface border border-white/5 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 border border-white/10">
                      <AvatarImage src={comment.user?.djProfile?.avatar || comment.user?.avatar} />
                      <AvatarFallback className="bg-dark-gray text-xs font-bold text-gold">
                        {(comment.user?.username || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      {renderAuthorName(comment.user, comment.isDjCreator)}
                      <span className="text-[10px] text-text-muted">
                        {new Date(comment.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-text-muted hover:text-red h-7 w-7 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <p className="text-xs text-text-secondary pl-11 leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>

                {/* Reply action */}
                <div className="pl-11 pt-1 flex items-center gap-3">
                  <button
                    onClick={() =>
                      setReplyingToId(replyingToId === comment.id ? null : comment.id)
                    }
                    className="text-[11px] font-bold text-gold hover:underline flex items-center gap-1"
                  >
                    <CornerDownRight className="w-3 h-3" /> Reply
                  </button>
                </div>

                {/* Nested Reply form */}
                {replyingToId === comment.id && (
                  <div className="pl-11 pt-2 space-y-2">
                    <Textarea
                      placeholder="Write a reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="bg-black-elevated border-dark-gray text-xs h-16"
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

                {/* Nested Replies list */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="pl-11 pt-2 space-y-3 border-t border-white/5 mt-3">
                    {comment.replies.map((reply) => {
                      const canDeleteReply =
                        user?.id === reply.userId ||
                        user?.id === djUserId ||
                        ['ADMIN', 'MODERATOR'].includes(user?.role || '');

                      return (
                        <div key={reply.id} className="bg-black-elevated rounded-xl p-3 space-y-2 border border-white/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="w-6 h-6 border border-white/10">
                                <AvatarImage src={reply.user?.djProfile?.avatar || reply.user?.avatar} />
                                <AvatarFallback className="bg-dark-gray text-[10px] font-bold text-gold">
                                  {(reply.user?.username || 'U')[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                {renderAuthorName(reply.user, reply.isDjCreator)}
                                <span className="text-[9px] text-text-muted block">
                                  {new Date(reply.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            {canDeleteReply && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteComment(reply.id)}
                                className="text-text-muted hover:text-red h-6 w-6 p-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary pl-8">{reply.content}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
