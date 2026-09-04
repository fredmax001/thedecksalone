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
  ChevronsLeft,
  Search,
  MessageSquare,
  User,
  ArrowUpRight,
  ChevronLeft,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { formatEventDate } from '@/lib/dateTime';
import {
  useSupportTicketCounts,
  useSupportTickets,
  useSupportTicket,
  useReplySupportTicket,
  useUpdateSupportTicketStatus,
  type SupportTicketStatus,
  type SupportTicketListItem,
} from '@/hooks/useSupport';

const PAGE_SIZE = 10;

type StatusTab = 'all' | SupportTicketStatus;

const STATUS_TABS: Array<{ id: StatusTab; label: string; icon: typeof Inbox }> = [
  { id: 'all', label: 'All Tickets', icon: MessageSquare },
  { id: 'open', label: 'Open', icon: Inbox },
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'resolved', label: 'Resolved', icon: CheckCircle2 },
  { id: 'closed', label: 'Closed', icon: XCircle },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    pending: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
    closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  const icons: Record<string, typeof CheckCircle2> = {
    open: Clock,
    pending: MessageSquare,
    resolved: CheckCircle2,
    closed: XCircle,
  };
  const Icon = icons[status] || MessageSquare;
  return (
    <Badge variant="outline" className={`${map[status] || map.open} capitalize flex items-center gap-1 w-fit`}>
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
  return <Badge className={`${map[priority] || map.medium} border-0 capitalize text-[10px]`}>{priority}</Badge>;
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatEventDate(date);
}

export default function SupportDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data: counts } = useSupportTicketCounts();
  const {
    data: ticketsData,
    isLoading: ticketsLoading,
    isError: ticketsError,
    refetch: refetchTickets,
  } = useSupportTickets({
    status: activeTab === 'all' ? undefined : activeTab,
    page,
    limit: PAGE_SIZE,
  });

  const { data: detail, isLoading: detailLoading } = useSupportTicket(selectedTicketId);
  const replyMutation = useReplySupportTicket();
  const statusMutation = useUpdateSupportTicketStatus();

  const handleLogout = () => { logout(); navigate('/login'); };

  const tabCount = (tab: StatusTab) => {
    if (!counts) return undefined;
    return tab === 'all' ? counts.total : counts[tab];
  };

  const tickets = ticketsData?.tickets ?? [];
  const meta = ticketsData?.meta;
  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1;

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.subject?.toLowerCase().includes(q) ||
      t.user?.username?.toLowerCase().includes(q) ||
      t.user?.email?.toLowerCase().includes(q)
    );
  });

  const selectTicket = (ticket: SupportTicketListItem) => {
    setSelectedTicketId(ticket.id);
    setReplyText('');
  };

  const switchTab = (tab: StatusTab) => {
    setActiveTab(tab);
    setPage(1);
    setSelectedTicketId(null);
    closeSidebarOnMobile();
  };

  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleSendReply = () => {
    if (!selectedTicketId || !replyText.trim()) return;
    replyMutation.mutate(
      { id: selectedTicketId, message: replyText.trim() },
      { onSuccess: () => setReplyText('') }
    );
  };

  const handleMarkResolved = () => {
    if (!selectedTicketId) return;
    statusMutation.mutate({ id: selectedTicketId, status: 'resolved' });
  };

  const handleEscalate = () => {
    if (!selectedTicketId) return;
    statusMutation.mutate({ id: selectedTicketId, status: 'pending', priority: 'high' });
  };

  const handleReopen = () => {
    if (!selectedTicketId) return;
    statusMutation.mutate({ id: selectedTicketId, status: 'open' });
  };

  const selectedStatus = detail?.ticket?.status;
  const mutationPending = replyMutation.isPending || statusMutation.isPending;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-text-primary flex">
      {/* ─── Sidebar ─── */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-black-surface border-r border-dark-gray transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0 md:relative md:translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-dark-gray">
            <h1 className="text-xl font-bold text-gold flex items-center gap-2">
              <Headphones className="w-6 h-6" />
              Support
            </h1>
            <p className="text-xs text-text-muted mt-1">Deck Salone Support Center</p>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {STATUS_TABS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const count = tabCount(item.id);
              return (
                <button key={item.id} onClick={() => switchTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-gold/10 text-gold border border-gold/20' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}>
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {count !== undefined && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-gold/20 text-gold' : 'bg-white/5 text-text-muted'}`}>
                      {count}
                    </span>
                  )}
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

      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ─── Main ─── */}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-dark-gray px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-2 rounded-lg text-text-secondary hover:text-gold hover:bg-white/5 transition-colors"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? <ChevronsLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {selectedTicketId ? (
            <button onClick={() => setSelectedTicketId(null)} className="flex items-center gap-2 text-text-secondary hover:text-gold">
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
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">{counts?.open ?? 0} Open</Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">{counts?.pending ?? 0} Pending</Badge>
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">{counts?.resolved ?? 0} Resolved</Badge>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          {/* ─── TICKET DETAIL VIEW ─── */}
          {selectedTicketId ? (
            detailLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
              </div>
            ) : !detail ? (
              <Card className="bg-black-surface border-dark-gray">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-10 h-10 text-text-muted mx-auto mb-3" />
                  <p className="text-text-secondary">Ticket not found or you don't have access.</p>
                  <Button size="sm" variant="outline" className="mt-4 border-dark-gray text-text-secondary" onClick={() => setSelectedTicketId(null)}>
                    Back to tickets
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card className="bg-black-surface border-dark-gray">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-xs text-text-muted">#{detail.ticket.id.slice(0, 8)}</span>
                      <StatusBadge status={detail.ticket.status} />
                      <PriorityBadge priority={detail.ticket.priority} />
                    </div>
                    <CardTitle className="text-lg mt-2">{detail.ticket.subject}</CardTitle>
                    <div className="flex flex-wrap gap-4 text-xs text-text-muted mt-1">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{detail.ticket.user?.username || 'User'}</span>
                      <span>{detail.ticket.user?.email}</span>
                      <span>Created: {formatTime(detail.ticket.createdAt)}</span>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="bg-black-surface border-dark-gray">
                  <CardContent className="p-5 space-y-4">
                    {detail.ticket.message && (
                      <div className="flex gap-3">
                        <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white/5 text-text-primary">
                          <p className="text-xs font-medium text-gold mb-1">{detail.ticket.user?.username || 'User'}</p>
                          <p className="text-sm whitespace-pre-wrap">{detail.ticket.message}</p>
                          <p className="text-[10px] text-text-muted mt-1">{formatTime(detail.ticket.createdAt)}</p>
                        </div>
                      </div>
                    )}
                    {detail.replies.map((reply) => (
                      <div key={reply.id} className={`flex gap-3 ${reply.isStaff ? 'flex-row-reverse' : ''}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${reply.isStaff ? 'bg-gold/10 border border-gold/20 text-text-primary' : 'bg-white/5 text-text-primary'}`}>
                          <p className="text-xs font-medium text-gold mb-1">{reply.isStaff ? 'Support' : (reply.author?.username || 'User')}</p>
                          <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                          <p className="text-[10px] text-text-muted mt-1">{formatTime(reply.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                    {detail.replies.length === 0 && !detail.ticket.message && (
                      <p className="text-center text-text-muted text-sm py-4">No messages yet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-black-surface border-dark-gray">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type your reply..." className="bg-black border-dark-gray text-text-primary placeholder:text-text-muted resize-none" rows={3} />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button size="sm" className="bg-gold text-black hover:bg-gold-light" disabled={!replyText.trim() || replyMutation.isPending} onClick={handleSendReply}>
                        {replyMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}Send Reply
                      </Button>
                      {selectedStatus !== 'resolved' && (
                        <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10" disabled={mutationPending} onClick={handleMarkResolved}>
                          <CheckCircle2 className="w-4 h-4 mr-1" />Mark Resolved
                        </Button>
                      )}
                      {selectedStatus === 'open' && (
                        <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" disabled={mutationPending} onClick={handleEscalate}>
                          <AlertTriangle className="w-4 h-4 mr-1" />Escalate
                        </Button>
                      )}
                      {(selectedStatus === 'resolved' || selectedStatus === 'closed') && (
                        <Button size="sm" variant="outline" className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10" disabled={mutationPending} onClick={handleReopen}>
                          <RotateCcw className="w-4 h-4 mr-1" />Reopen
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
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
                  {ticketsLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 text-gold animate-spin" />
                    </div>
                  ) : ticketsError ? (
                    <div className="py-16 text-center">
                      <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                      <p className="text-text-secondary mb-4">Failed to load tickets.</p>
                      <Button size="sm" variant="outline" className="border-dark-gray text-text-secondary" onClick={() => refetchTickets()}>
                        Try again
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-dark-gray hover:bg-transparent">
                            <TableHead className="text-text-muted text-xs">ID</TableHead>
                            <TableHead className="text-text-muted text-xs">User</TableHead>
                            <TableHead className="text-text-muted text-xs">Subject</TableHead>
                            <TableHead className="text-text-muted text-xs">Priority</TableHead>
                            <TableHead className="text-text-muted text-xs">Status</TableHead>
                            <TableHead className="text-text-muted text-xs">Replies</TableHead>
                            <TableHead className="text-text-muted text-xs">Created</TableHead>
                            <TableHead className="text-text-muted text-xs">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTickets.map((t) => (
                            <TableRow key={t.id} className="border-dark-gray cursor-pointer hover:bg-white/5" onClick={() => selectTicket(t)}>
                              <TableCell className="font-mono text-xs">#{t.id.slice(0, 8)}</TableCell>
                              <TableCell className="text-text-primary text-sm">
                                {t.user?.username || '—'}
                                <span className="block text-[10px] text-text-muted">{t.user?.email}</span>
                              </TableCell>
                              <TableCell className="text-text-primary text-sm max-w-[220px] truncate">{t.subject}</TableCell>
                              <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                              <TableCell><StatusBadge status={t.status} /></TableCell>
                              <TableCell className="text-text-muted text-xs">{t.replyCount ?? 0}</TableCell>
                              <TableCell className="text-text-muted text-xs">{formatTime(t.createdAt)}</TableCell>
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
                  )}
                </CardContent>
              </Card>

              {/* Pagination */}
              {meta && meta.total > 0 && (
                <div className="flex items-center justify-between mt-4 text-sm text-text-muted">
                  <span>
                    Showing page {meta.page} of {totalPages} · {meta.total} ticket{meta.total === 1 ? '' : 's'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-dark-gray text-text-secondary"
                      disabled={page <= 1 || ticketsLoading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-dark-gray text-text-secondary"
                      disabled={page >= totalPages || ticketsLoading}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next<ArrowUpRight className="w-4 h-4 rotate-180" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
