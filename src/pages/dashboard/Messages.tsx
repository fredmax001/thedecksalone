import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Loader2,
  Search,
  MessageSquare,
  Check,
  CheckCheck,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface MessageItem {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  bookingId?: string;
  readAt?: string;
  createdAt: string;
}

interface Conversation {
  userId: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface PartnerInfo {
  id: string;
  name: string;
  avatar: string | null;
}

export default function Messages() {
  const { user } = useAuthStore();
  const location = useLocation();
  const contactUserId = (location.state as { contactUserId?: string } | null)?.contactUserId;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolvedContactRef = useRef<string | null>(null);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Auto-select conversation from route state (e.g. Message button on DJ profile)
  useEffect(() => {
    if (!contactUserId || resolvedContactRef.current === contactUserId) return;

    const existing = conversations.find((c) => c.userId === contactUserId);
    if (existing) {
      resolvedContactRef.current = contactUserId;
      setActiveConversation(contactUserId);
      return;
    }

    // Fetch partner info and create a placeholder conversation so the chat opens
    api.get(`/messages/${contactUserId}`)
      .then((res) => {
        if (res.data.success && res.data.partner) {
          const partner = res.data.partner;
          setConversations((prev) => {
            if (prev.some((c) => c.userId === partner.id)) return prev;
            return [
              {
                userId: partner.id,
                name: partner.name,
                avatar: partner.avatar || undefined,
                lastMessage: '',
                lastMessageAt: new Date().toISOString(),
                unreadCount: 0,
              },
              ...prev,
            ];
          });
          setActiveConversation(contactUserId);
        }
      })
      .catch(() => {
        // Ignore — user will see the normal empty state
      })
      .finally(() => {
        resolvedContactRef.current = contactUserId;
      });
  }, [contactUserId, conversations]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
      // Poll every 10 seconds
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        fetchMessages(activeConversation, true);
      }, 10000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/messages/conversations');
      if (res.data.success) {
        setConversations(res.data.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string, silent = false) => {
    try {
      if (!silent) setLoadingMessages(true);
      const res = await api.get(`/messages/${userId}`);
      if (res.data.success) {
        setMessages(res.data.data || []);
        setPartner(res.data.partner || null);
      }
    } catch (err: any) {
      if (!silent) setError(err.response?.data?.error || 'Failed to load messages');
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConversation) return;

    const tempMessage: MessageItem = {
      id: `temp-${Date.now()}`,
      content: input.trim(),
      senderId: user?.id || '',
      receiverId: activeConversation,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setInput('');
    setSending(true);

    try {
      const res = await api.post('/messages', {
        receiverId: activeConversation,
        content: input.trim(),
      });
      if (res.data.success) {
        // Replace temp message with real one
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMessage.id ? res.data.data : m))
        );
        // Refresh conversation list
        fetchConversations();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send message');
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConv = conversations.find((c) => c.userId === activeConversation);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return formatTime(dateStr);
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Messages
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Communicate with clients and fans.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red/10 border border-red/30 text-red text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Conversation List */}
        <Card className="w-full md:w-80 flex-shrink-0 bg-black-surface border-dark-gray flex flex-col">
          <div className="p-3 border-b border-dark-gray">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-black-elevated border-dark-gray text-text-primary placeholder:text-text-muted"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-gold animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-secondary">
                  {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => setActiveConversation(conv.userId)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-black-elevated',
                    activeConversation === conv.userId && 'bg-black-elevated'
                  )}
                >
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={conv.avatar || undefined} />
                    <AvatarFallback className="bg-gold/20 text-gold text-xs font-bold">
                      {conv.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-text-primary truncate">{conv.name}</p>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-gold text-black text-xs border-0 ml-2">{conv.unreadCount}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary truncate">{conv.lastMessage}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{formatDate(conv.lastMessageAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Chat Thread */}
        <Card className="flex-1 bg-black-surface border-dark-gray flex flex-col min-w-0 hidden md:flex">
          {activeConversation && partner ? (
            <>
              <div className="p-4 border-b border-dark-gray flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={partner.avatar || undefined} />
                  <AvatarFallback className="bg-gold/20 text-gold text-xs font-bold">
                    {partner.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-text-primary">{partner.name}</p>
                  <p className="text-xs text-text-muted">{activeConv?.unreadCount ? `${activeConv.unreadCount} unread` : 'Online'}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 text-gold animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-text-muted">No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'max-w-[70%] px-4 py-2.5 rounded-2xl text-sm',
                            isMe
                              ? 'bg-gold text-black rounded-tr-sm'
                              : 'bg-black-elevated text-text-primary rounded-tl-sm'
                          )}
                        >
                          <p>{msg.content}</p>
                          <div className={cn('flex items-center gap-1 mt-1 text-[10px]', isMe ? 'text-black/60' : 'text-text-muted')}>
                            <span>{formatTime(msg.createdAt)}</span>
                            {isMe && (
                              msg.readAt ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t border-dark-gray">
                <div className="flex items-center gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 bg-black-elevated border-dark-gray text-text-primary placeholder:text-text-muted"
                  />
                  <Button
                    size="icon"
                    className="bg-gold hover:bg-gold/90 text-black"
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="w-12 h-12 text-text-muted mb-3" />
              <p className="text-text-secondary font-medium mb-1">Select a conversation</p>
              <p className="text-sm text-text-muted">Choose a chat from the sidebar to start messaging</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
