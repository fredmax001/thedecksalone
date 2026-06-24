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
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  read: boolean;
}

interface Conversation {
  userId: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export default function Messages() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // NOTE: The messages API is not yet implemented on the backend.
  // This page shows the UI structure. When the backend is ready,
  // replace the mock data with real API calls.

  useEffect(() => {
    // TODO: Replace with real API call
    // GET /api/messages/conversations
    setConversations([
      {
        userId: '1',
        name: 'Alice Johnson',
        avatar: '',
        lastMessage: 'Hey, are you available for my wedding on July 15th?',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        unreadCount: 2,
      },
      {
        userId: '2',
        name: 'Bob Smith',
        avatar: '',
        lastMessage: 'Thanks for the great set last night!',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        unreadCount: 0,
      },
    ]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeConversation) {
      // TODO: Replace with real API call
      // GET /api/messages/:userId
      setMessages([
        {
          id: '1',
          content: 'Hey, are you available for my wedding on July 15th?',
          senderId: activeConversation,
          createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          read: true,
        },
        {
          id: '2',
          content: 'Hi! Yes, I am available. Can you share more details about the venue and time?',
          senderId: user?.id || '',
          createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          read: true,
        },
        {
          id: '3',
          content: 'It\'s at the Grand Ballroom, starting at 6 PM. About 200 guests.',
          senderId: activeConversation,
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          read: false,
        },
      ]);
    }
  }, [activeConversation, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeConversation) return;

    const newMessage: Message = {
      id: String(Date.now()),
      content: input.trim(),
      senderId: user?.id || '',
      createdAt: new Date().toISOString(),
      read: false,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput('');
    setSending(true);

    // TODO: POST /api/messages
    // await api.post('/messages', { recipientId: activeConversation, content: input.trim() });

    setTimeout(() => setSending(false), 500);
  };

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConv = conversations.find((c) => c.userId === activeConversation);

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
        <Badge variant="outline" className="border-yellow-500/30 text-yellow-500">
          <MessageSquare className="w-3 h-3 mr-1" />
          Backend API needed
        </Badge>
      </div>

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
                <p className="text-sm text-text-secondary">No conversations yet</p>
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
                    <AvatarImage src={conv.avatar} />
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
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Chat Thread */}
        <Card className="flex-1 bg-black-surface border-dark-gray flex flex-col min-w-0 hidden md:flex">
          {activeConversation && activeConv ? (
            <>
              <div className="p-4 border-b border-dark-gray flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={activeConv.avatar} />
                  <AvatarFallback className="bg-gold/20 text-gold text-xs font-bold">
                    {activeConv.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-text-primary">{activeConv.name}</p>
                  <p className="text-xs text-text-muted">Online</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
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
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && (
                            msg.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
