import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Loader2,
  Search,
  MessageSquare,
  Check,
  CheckCheck,
  Music,
  Plus,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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
  avatar?: string | null;
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
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [newChatResults, setNewChatResults] = useState<Array<{ id: string; name: string; avatar?: string | null }>>([]);
  const [newChatLoading, setNewChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolvedContactRef = useRef<string | null>(null);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Auto-select conversation from route state
  useEffect(() => {
    if (!contactUserId || resolvedContactRef.current === contactUserId) return;

    const existing = conversations.find((c) => c.userId === contactUserId);
    if (existing) {
      resolvedContactRef.current = contactUserId;
      setActiveConversation(contactUserId);
      return;
    }

    api.get(`/messages/${contactUserId}`)
      .then((res) => {
        const partnerData = res.data.partner;
        if (partnerData) {
          setConversations((prev) => [
            {
              userId: partnerData.id,
              name: partnerData.name,
              avatar: partnerData.avatar,
              lastMessage: '',
              lastMessageAt: new Date().toISOString(),
              unreadCount: 0,
            },
            ...prev.filter((c) => c.userId !== partnerData.id),
          ]);
        }
        resolvedContactRef.current = contactUserId;
        setActiveConversation(contactUserId);
      })
      .catch(() => {
        resolvedContactRef.current = contactUserId;
      });
  }, [contactUserId, conversations]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!activeConversation) return;
    fetchMessages(activeConversation);

    // Polling for new messages
    intervalRef.current = setInterval(() => {
      fetchMessages(activeConversation, true);
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
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

  const searchDjs = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setNewChatResults([]);
      return;
    }
    try {
      setNewChatLoading(true);
      const res = await api.get(`/djs?search=${encodeURIComponent(query.trim())}&limit=10`);
      if (res.data.success) {
        setNewChatResults(
          (res.data.data || []).map((dj: any) => ({
            id: dj.userId,
            name: dj.stageName || dj.username || 'DJ',
            avatar: dj.avatar || null,
          }))
        );
      }
    } catch (err: any) {
      setNewChatResults([]);
    } finally {
      setNewChatLoading(false);
    }
  };

  const startNewConversation = (userId: string, name: string, avatar?: string | null) => {
    setNewChatOpen(false);
    setNewChatSearch('');
    setNewChatResults([]);

    const existing = conversations.find((c) => c.userId === userId);
    if (existing) {
      setActiveConversation(userId);
      return;
    }

    const newConversation: Conversation = {
      userId,
      name,
      avatar: avatar || null,
      lastMessage: '',
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
    };

    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversation(userId);
  };

  const fetchMessages = async (partnerId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await api.get(`/messages/${partnerId}`);
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

  const sendMessage = async () => {
    if (!input.trim() || !activeConversation || !user) return;

    const content = input.trim();
    setInput('');
    setSending(true);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: MessageItem = {
      id: tempId,
      content,
      senderId: user.id,
      receiverId: activeConversation,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await api.post('/messages', {
        receiverId: activeConversation,
        content,
      });
      if (res.data.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? res.data.data : m))
        );
        // Update conversation last message
        setConversations((prev) =>
          prev.map((c) =>
            c.userId === activeConversation
              ? { ...c, lastMessage: content, lastMessageAt: new Date().toISOString() }
              : c
          )
        );
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
          Messages
        </h1>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red/10 border border-red/30 text-red text-sm">
          {error}
        </div>
      )}

      <div className="flex h-[calc(100vh-220px)] min-h-[500px] gap-4">
        {/* Conversations Sidebar */}
        <Card className="w-full max-w-sm bg-black-elevated border-dark-gray flex flex-col">
          <div className="p-3 border-b border-dark-gray">
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-dark-gray text-text-primary hover:bg-black-surface hover:text-gold"
                onClick={() => setNewChatOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                New Chat
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-black-surface border-dark-gray text-text-primary placeholder:text-text-muted text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-secondary">No conversations yet</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => setActiveConversation(conv.userId)}
                  className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                    activeConversation === conv.userId
                      ? 'bg-gold/10 border-l-2 border-gold'
                      : 'hover:bg-black-surface border-l-2 border-transparent'
                  }`}
                >
                  <div className="relative">
                    <Avatar className="w-10 h-10 border border-gold/20">
                      <AvatarImage src={conv.avatar || undefined} />
                      <AvatarFallback className="bg-gold/10 text-gold text-xs">
                        <Music className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    {conv.unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-gold text-black text-[10px]">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {conv.name}
                      </p>
                      <span className="text-[10px] text-text-muted ml-2 flex-shrink-0">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary truncate mt-0.5">
                      {conv.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 bg-black-elevated border-dark-gray flex flex-col">
          {activeConversation && partner ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b border-dark-gray">
                <Avatar className="w-8 h-8 border border-gold/20">
                  <AvatarImage src={partner.avatar || undefined} />
                  <AvatarFallback className="bg-gold/10 text-gold text-xs">
                    <Music className="w-3 h-3" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-text-primary">{partner.name}</p>
                  <p className="text-[10px] text-text-muted">DJ</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 text-gold animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-8 h-8 text-text-muted mx-auto mb-2" />
                    <p className="text-sm text-text-secondary">Start a conversation</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.senderId === user?.id;
                    const showAvatar = i === 0 || messages[i - 1].senderId !== msg.senderId;

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : ''}`}>
                          {showAvatar && !isMe && (
                            <Avatar className="w-6 h-6 mt-1 border border-gold/20">
                              <AvatarImage src={partner.avatar || undefined} />
                              <AvatarFallback className="bg-gold/10 text-gold text-[8px]">
                                <Music className="w-2 h-2" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`px-3 py-2 rounded-xl text-sm ${
                              isMe
                                ? 'bg-gold/20 text-text-primary rounded-br-sm'
                                : 'bg-black-surface text-text-secondary rounded-bl-sm'
                            }`}
                          >
                            <p>{msg.content}</p>
                            <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                              <span className="text-[10px] text-text-muted">
                                {formatTime(msg.createdAt)}
                              </span>
                              {isMe && (
                                msg.readAt ? (
                                  <CheckCheck className="w-3 h-3 text-gold" />
                                ) : (
                                  <Check className="w-3 h-3 text-text-muted" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-dark-gray">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 bg-black-surface border-dark-gray text-text-primary placeholder:text-text-muted"
                    disabled={sending}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="bg-gold text-black hover:bg-gold-light"
                    size="icon"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="w-12 h-12 text-text-muted mb-4" />
              <p className="text-text-secondary">Select a conversation to start chatting</p>
              <p className="text-xs text-text-muted mt-2">
                Reach out to DJs about bookings, events, or collaborations
              </p>
            </div>
          )}
        </Card>

        {/* New Chat Dialog */}
        <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
          <DialogContent className="bg-black-elevated border-dark-gray text-text-primary max-w-md">
            <DialogHeader>
              <DialogTitle className="text-text-primary">Start New Chat</DialogTitle>
              <DialogDescription className="text-text-secondary">
                Search for a DJ to start a conversation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <Input
                  placeholder="Search by stage name..."
                  value={newChatSearch}
                  onChange={(e) => {
                    setNewChatSearch(e.target.value);
                    searchDjs(e.target.value);
                  }}
                  className="pl-10 bg-black-surface border-dark-gray text-text-primary placeholder:text-text-muted"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {newChatLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 text-gold animate-spin" />
                  </div>
                ) : newChatResults.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-text-muted">
                      {newChatSearch.trim().length >= 2 ? 'No DJs found' : 'Type at least 2 characters to search'}
                    </p>
                  </div>
                ) : (
                  newChatResults.map((dj) => (
                    <button
                      key={dj.id}
                      onClick={() => startNewConversation(dj.id, dj.name, dj.avatar)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-black-surface"
                    >
                      <Avatar className="w-10 h-10 border border-gold/20">
                        <AvatarImage src={dj.avatar || undefined} />
                        <AvatarFallback className="bg-gold/10 text-gold text-xs">
                          <Music className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{dj.name}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
