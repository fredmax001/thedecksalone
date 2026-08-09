import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Headphones,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Send,
  LogOut,
  Menu,
  Search,
  MessageSquare,
  User,
  ArrowUpRight,
  Tag,
  ChevronLeft,
} from 'lucide-react';

const SIDEBAR_ITEMS = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'assigned', label: 'Assigned to Me', icon: User },
  { id: 'resolved', label: 'Resolved', icon: CheckCircle2 },
  { id: 'escalated', label: 'Escalated', icon: AlertTriangle },
  { id: 'all', label: 'All Tickets', icon: MessageSquare },
];

type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'escalated' | 'closed';

interface Ticket {
  id: string;
  user: string;
  email: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: TicketStatus;
  assigned?: string;
  created: string;
  lastResponse: string;
  messages: { from: string; text: string; time: string }[];
}

const TICKETS: Ticket[] = [
  {
    id: 'TKT-001',
    user: 'DJ Fred Max',
    email: 'djfredmax221@gmail.com',
    subject: 'Cannot upload mix cover image',
    category: 'Technical',
    priority: 'high',
    status: 'open',
    assigned: 'Support Agent 1',
    created: '2026-08-08 09:23',
    lastResponse: '2026-08-08 10:15',
    messages: [
      { from: 'DJ Fred Max', text: 'Every time I try to upload a cover image for my new mix, it shows an error. Please help.', time: '2026-08-08 09:23' },
      { from: 'Support', text: 'Hi Fred, sorry for the trouble. What file format and size are you trying to upload?', time: '2026-08-08 10:15' },
    ],
  },
  {
    id: 'TKT-002',
    user: 'Max Rick',
    email: 'maxrick221@gmail.com',
    subject: 'Payment not reflected in account',
    category: 'Billing',
    priority: 'urgent',
    status: 'in-progress',
    assigned: 'Support Agent 1',
    created: '2026-08-07 14:30',
    lastResponse: '2026-08-08 08:00',
    messages: [
      { from: 'Max Rick', text: 'I sent SLL 350,000 via Orange Money yesterday but my Pro+ subscription is still not active.', time: '2026-08-07 14:30' },
      { from: 'Support', text: 'Thanks for reaching out. We are checking with our payment processor. Can you share the transaction ID?', time: '2026-08-07 15:00' },
      { from: 'Max Rick', text: 'Transaction ID: OM-7748291', time: '2026-08-07 15:30' },
      { from: 'Support', text: 'We found the payment. It is being processed and should reflect within 2 hours. We will update you.', time: '2026-08-08 08:00' },
    ],
  },
  {
    id: 'TKT-003',
    user: 'Samuel Dawodu',
    email: 'samueldawodu1998@gmail.com',
    subject: 'How to become a verified DJ?',
    category: 'Account',
    priority: 'medium',
    status: 'resolved',
    assigned: 'Support Agent 2',
    created: '2026-08-06 11:00',
    lastResponse: '2026-08-06 13:45',
    messages: [
      { from: 'Samuel Dawodu', text: 'I just created my DJ profile. What do I need to do to get the verified badge?', time: '2026-08-06 11:00' },
      { from: 'Support', text: 'To become verified, please submit your ID, proof of DJ equipment, and a portfolio of your mixes. The verification team will review within 48 hours.', time: '2026-08-06 11:30' },
      { from: 'Samuel Dawodu', text: 'Thank you! I have submitted everything.', time: '2026-08-06 13:45' },
    ],
  },
  {
    id: 'TKT-004',
    user: 'DJ Neptune',
    email: 'djneptune@example.com',
    subject: 'Report inappropriate content on mix',
    category: 'Report',
    priority: 'high',
    status: 'escalated',
    assigned: 'Support Agent 1',
    created: '2026-08-05 16:20',
    lastResponse: '2026-08-05 17:00',
    messages: [
      { from: 'DJ Neptune', text: 'There is a mix uploaded by someone using my artwork without permission. Mix ID: mix-8841.', time: '2026-08-05 16:20' },
      { from: 'Support', text: 'Thank you for reporting this. We have escalated this to our moderation team for immediate review.', time: '2026-08-05 17:00' },
    ],
  },
  {
    id: 'TKT-005',
    user: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    subject: 'Forgot password and cannot reset',
    category: 'Technical',
    priority: 'medium',
    status: 'closed',
    assigned: 'Support Agent 2',
    created: '2026-08-04 08:10',
    lastResponse: '2026-08-04 09:30',
    messages: [
      { from: 'Sarah Johnson', text: 'I forgot my password and the reset email is not arriving.', time: '2026-08-04 08:10' },
      { from: 'Support', text: 'Please check your spam folder. If not there, we can manually reset it for you.', time: '2026-08-04 08:45' },
      { from: 'Sarah Johnson', text: 'Found it in spam, thank you!', time: '2026-08-04 09:30' },
    ],
  },
  {
    id: 'TKT-006',
    user: 'DJ Shady',
    email: 'djshady@example.com',
    subject: 'Request to delete account',
    category: 'Account',
    priority: 'low',
    status: 'open',
    created: '2026-08-08 07:00',
    lastResponse: '2026-08-08 07:00',
    messages: [
      { from: 'DJ Shady', text: 'I would like to delete my account permanently. Please confirm the process.', time: '2026-08-08 07:00' },
    ],
  },
  {
    id: 'TKT-007',
    user: 'Christy B',
    email: 'christy@example.com',
    subject: 'Booking inquiry not showing in dashboard',
    category: 'Technical',
    priority: 'medium',
    status: 'in-progress',
    assigned: 'Support Agent 2',
    created: '2026-08-07 10:00',
    lastResponse: '2026-08-07 12:00',
    messages: [
      { from: 'Christy B', text: 'I received a booking request but it does not appear in my DJ dashboard.', time: '2026-08-07 10:00' },
      { from: 'Support', text: 'We are investigating this sync issue. Can you share the booking reference number?', time: '2026-08-07 12:00' },
    ],
  },
  {
    id: 'TKT-008',
    user: 'Big Joe',
    email: 'bigjoe@example.com',
    subject: 'Subscription upgrade failed',
    category: 'Billing',
    priority: 'high',
    status: 'resolved',
    assigned: 'Support Agent 1',
    created: '2026-08-03 18:00',
    lastResponse: '2026-08-03 19:30',
    messages: [
      { from: 'Big Joe', text: 'Tried upgrading to Pro but payment failed twice.', time: '2026-08-03 18:00' },
      { from: 'Support', text: 'We identified a temporary issue with Orange Money. It is resolved now. Please try again.', time: '2026-08-03 19:30' },
    ],
  },
];

function StatusBadge({ status }: { status: TicketStatus }) {
  const map: Record<TicketStatus, string> = {
    open: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
    escalated: 'bg-red-500/20 text-red-400 border-red-500/30',
    closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  const icons: Record<TicketStatus, typeof CheckCircle2> = {
    open: Clock,
    'in-progress': MessageSquare,
    resolved: CheckCircle2,
    escalated: AlertTriangle,
    closed: XCircle,
  };
  const Icon = icons[status];
  return (
    <Badge variant="outline" className={`${map[status]} capitalize flex items-center gap-1 w-fit`}>
      <Icon className="w-3 h-3" />
      {status.replace('-', ' ')}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    low: 'bg-gray-500/20 text-gray-400',
    medium: 'bg-blue-500/20 text-blue-400',
    high: 'bg-orange-500/20 text-orange-400',
    urgent: 'bg-red-500/20 text-red-400',
  };
  return <Badge className={`${map[priority]} border-0 capitalize text-[10px]`}>{priority}</Badge>;
}

export default function SupportDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inbox');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => { logout(); navigate('/login'); };

  const filteredTickets = TICKETS.filter((t) => {
    if (searchQuery && !t.subject.toLowerCase().includes(searchQuery.toLowerCase()) && !t.user.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeTab === 'inbox') return t.status === 'open' || t.status === 'in-progress';
    if (activeTab === 'assigned') return t.assigned && (t.status === 'open' || t.status === 'in-progress');
    if (activeTab === 'resolved') return t.status === 'resolved';
    if (activeTab === 'escalated') return t.status === 'escalated';
    return true;
  });

  const stats = {
    open: TICKETS.filter((t) => t.status === 'open').length,
    inProgress: TICKETS.filter((t) => t.status === 'in-progress').length,
    resolved: TICKETS.filter((t) => t.status === 'resolved').length,
    escalated: TICKETS.filter((t) => t.status === 'escalated').length,
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-text-primary flex">
      {/* ─── Sidebar ─── */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-black-surface border-r border-dark-gray transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-dark-gray">
            <h1 className="text-xl font-bold text-gold flex items-center gap-2">
              <Headphones className="w-6 h-6" />
              Support
            </h1>
            <p className="text-xs text-text-muted mt-1">Deck Salone Support Center</p>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); setSelectedTicket(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-gold/10 text-gold border border-gold/20' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}>
                  <Icon className="w-4 h-4" />{item.label}
                </button>
              );
            })}
          </nav>
          <div className="p-4 border-t border-dark-gray">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold">{user?.email?.slice(0, 2).toUpperCase() || 'SA'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{user?.email || 'Support Admin'}</p>
                <p className="text-[10px] text-gold uppercase">Support Admin</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full mt-3 flex items-center gap-2 px-4 py-2 text-xs text-red hover:bg-red/10 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />Logout
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ─── Main ─── */}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-dark-gray px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-text-secondary hover:text-gold"><Menu className="w-5 h-5" /></button>
          {selectedTicket ? (
            <button onClick={() => setSelectedTicket(null)} className="flex items-center gap-2 text-text-secondary hover:text-gold">
              <ChevronLeft className="w-4 h-4" /><span className="text-sm">Back to tickets</span>
            </button>
          ) : (
            <>
              <Headphones className="w-5 h-5 text-gold hidden sm:block" />
              <h2 className="text-lg font-semibold">Support Inbox</h2>
            </>
          )}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3">
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">{stats.open} Open</Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">{stats.inProgress} In Progress</Badge>
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20">{stats.escalated} Escalated</Badge>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          {/* ─── TICKET DETAIL VIEW ─── */}
          {selectedTicket ? (
            <div className="space-y-4">
              <Card className="bg-black-surface border-dark-gray">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs text-text-muted">{selectedTicket.id}</span>
                    <StatusBadge status={selectedTicket.status} />
                    <PriorityBadge priority={selectedTicket.priority} />
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20"><Tag className="w-3 h-3 mr-1" />{selectedTicket.category}</Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">{selectedTicket.subject}</CardTitle>
                  <div className="flex flex-wrap gap-4 text-xs text-text-muted mt-1">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{selectedTicket.user}</span>
                    <span>{selectedTicket.email}</span>
                    <span>Created: {selectedTicket.created}</span>
                    {selectedTicket.assigned && <span className="text-gold">Assigned: {selectedTicket.assigned}</span>}
                  </div>
                </CardHeader>
              </Card>

              <Card className="bg-black-surface border-dark-gray">
                <CardContent className="p-5 space-y-4">
                  {selectedTicket.messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.from === 'Support' ? 'flex-row-reverse' : ''}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.from === 'Support' ? 'bg-gold/10 border border-gold/20 text-text-primary' : 'bg-white/5 text-text-primary'}`}>
                        <p className="text-xs font-medium text-gold mb-1">{msg.from}</p>
                        <p className="text-sm">{msg.text}</p>
                        <p className="text-[10px] text-text-muted mt-1">{msg.time}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-black-surface border-dark-gray">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type your reply..." className="bg-black border-dark-gray text-text-primary placeholder:text-text-muted resize-none" rows={3} />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button size="sm" className="bg-gold text-black hover:bg-gold-light" onClick={() => setReplyText('')}><Send className="w-4 h-4 mr-1" />Send Reply</Button>
                    <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10"><CheckCircle2 className="w-4 h-4 mr-1" />Mark Resolved</Button>
                    <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10"><AlertTriangle className="w-4 h-4 mr-1" />Escalate</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tickets by subject or user..." className="pl-10 bg-black-surface border-dark-gray text-text-primary placeholder:text-text-muted" />
              </div>

              {/* Tickets Table */}
              <Card className="bg-black-surface border-dark-gray">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-dark-gray hover:bg-transparent">
                          <TableHead className="text-text-muted text-xs">ID</TableHead>
                          <TableHead className="text-text-muted text-xs">User</TableHead>
                          <TableHead className="text-text-muted text-xs">Subject</TableHead>
                          <TableHead className="text-text-muted text-xs">Category</TableHead>
                          <TableHead className="text-text-muted text-xs">Priority</TableHead>
                          <TableHead className="text-text-muted text-xs">Status</TableHead>
                          <TableHead className="text-text-muted text-xs">Last Response</TableHead>
                          <TableHead className="text-text-muted text-xs">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTickets.map((t) => (
                          <TableRow key={t.id} className="border-dark-gray cursor-pointer hover:bg-white/5" onClick={() => setSelectedTicket(t)}>
                            <TableCell className="font-mono text-xs">{t.id}</TableCell>
                            <TableCell className="text-text-primary text-sm">{t.user}</TableCell>
                            <TableCell className="text-text-primary text-sm max-w-[200px] truncate">{t.subject}</TableCell>
                            <TableCell><Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px]">{t.category}</Badge></TableCell>
                            <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                            <TableCell><StatusBadge status={t.status} /></TableCell>
                            <TableCell className="text-text-muted text-xs">{t.lastResponse}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" className="text-gold hover:bg-gold/10 h-7 px-2"><ArrowUpRight className="w-3.5 h-3.5" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredTickets.length === 0 && (
                          <TableRow><TableCell colSpan={8} className="text-center text-text-muted py-8">No tickets found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
