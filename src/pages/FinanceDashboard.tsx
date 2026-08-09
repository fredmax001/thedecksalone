import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  useAdminStats,
  useAdminAnalytics,
  useAdminPayments,
  useAdminProSubscriptionRequests,
  useApproveProSubscriptionRequest,
  useRejectProSubscriptionRequest,
  useAdminDjs,
  useGrantPlan,
} from '@/hooks/useAdmin';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  Users,
  CreditCard,
  TrendingUp,
  FileText,
  Download,
  LogOut,
  Menu,
  BarChart3,
  Receipt,
  Landmark,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Eye,
  Gift,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { getMediaUrl } from '@/lib/api';

const SIDEBAR_ITEMS = [
  { id: 'overview', label: 'Financial Overview', icon: BarChart3 },
  { id: 'subscriptions', label: 'Subscriptions & Approvals', icon: Users },
  { id: 'payments', label: 'Payment Transactions', icon: CreditCard },
  { id: 'reports', label: 'Financial Reports', icon: FileText },
];

function formatCurrency(amount: number) {
  return `SLE ${new Intl.NumberFormat('en-SL', { maximumFractionDigits: 0 }).format(amount || 0)}`;
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  const variants: Record<string, string> = {
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    pending_verification: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    failed: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    rejected: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    refunded: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };
  return (
    <Badge variant="outline" className={`capitalize font-semibold text-[11px] ${variants[s] || 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'}`}>
      {s.replace('_', ' ')}
    </Badge>
  );
}

export default function FinanceDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  const [grantModalDjId, setGrantModalDjId] = useState<string | null>(null);
  const [grantPlanTier, setGrantPlanTier] = useState<'pro' | 'legend'>('pro');
  const [grantMonths, setGrantMonths] = useState<number>(1);
  const [grantReason, setGrantReason] = useState<string>('');

  // Real Queries
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: analytics, isLoading: analyticsLoading } = useAdminAnalytics('6m');
  const { data: paymentsData, isLoading: paymentsLoading } = useAdminPayments({ page: 1, limit: 100 });
  const { data: proRequests, isLoading: proRequestsLoading } = useAdminProSubscriptionRequests();
  const { data: djsData } = useAdminDjs({ limit: 100 });

  // Real Mutations
  const approveProRequest = useApproveProSubscriptionRequest();
  const rejectProRequest = useRejectProSubscriptionRequest();
  const grantPlanMutation = useGrantPlan();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleApprovePro = async (id: string) => {
    try {
      await approveProRequest.mutateAsync({ id });
      toast.success('Pro subscription request approved successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleRejectPro = async (id: string) => {
    const reason = prompt('Enter rejection reason for this payment request:');
    if (!reason) return;
    try {
      await rejectProRequest.mutateAsync({ id, note: reason });
      toast.success('Subscription request rejected.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject request');
    }
  };

  const handleGrantPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantModalDjId) return;
    try {
      await grantPlanMutation.mutateAsync({
        djId: grantModalDjId,
        plan: grantPlanTier,
        months: grantMonths,
        reason: grantReason || 'Granted by Finance Admin',
      });
      toast.success(`Plan ${grantPlanTier.toUpperCase()} granted successfully!`);
      setGrantModalDjId(null);
      setGrantReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to grant plan');
    }
  };

  const exportPaymentsCSV = () => {
    if (!paymentsData?.data || paymentsData.data.length === 0) {
      toast.error('No payment transactions to export.');
      return;
    }
    const headers = ['ID', 'User Email', 'Amount', 'Currency', 'Status', 'Payment Method', 'Date'];
    const rows = paymentsData.data.map((p: any) => [
      p.id,
      p.user?.email || p.userId || 'N/A',
      p.amount,
      p.currency || 'SLE',
      p.status,
      p.paymentMethod || 'Orange Money',
      p.createdAt ? new Date(p.createdAt).toISOString() : '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r: any) => r.map((c: any) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DeckSalone_Payments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Payments log CSV exported successfully!');
  };

  // Filter payments
  const paymentsList = (paymentsData?.data || []).filter((p: any) => {
    if (paymentFilter === 'ALL') return true;
    return (p.status || '').toUpperCase() === paymentFilter;
  });

  // Calculate live tier counts
  const allDjs = djsData?.data || [];
  const proCount = allDjs.filter((d: any) => d.subscriptionTier === 'pro' || d.isPro).length;
  const legendCount = allDjs.filter((d: any) => d.subscriptionTier === 'legend').length;
  const freeCount = Math.max(0, (stats?.totalDjs || allDjs.length) - proCount - legendCount);

  const ActiveIcon = SIDEBAR_ITEMS.find((i) => i.id === activeTab)?.icon || BarChart3;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-text-primary flex">
      {/* ─── Sidebar ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-black-surface border-r border-dark-gray transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-dark-gray">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-wide">Finance Admin</h1>
                <span className="text-[10px] bg-gold/20 text-gold font-mono px-2 py-0.5 rounded border border-gold/30">
                  💳 FINANCIAL CONSOLE
                </span>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-gold/15 text-gold border border-gold/30 shadow-[0_0_15px_rgba(212,162,74,0.15)]'
                      : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="p-4 border-t border-dark-gray">
            <div className="flex items-center gap-3 px-3 py-2 bg-black-elevated rounded-xl border border-dark-gray">
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold border border-gold/30">
                {user?.email?.slice(0, 2).toUpperCase() || 'FA'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-white">{user?.name || user?.email?.split('@')[0]}</p>
                <p className="text-[10px] text-gold uppercase font-bold">Finance Admin</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-red hover:bg-red/10 rounded-lg transition-colors border border-red/20"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Mobile Overlay ─── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── Main View ─── */}
      <main className="flex-1 min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-dark-gray px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-text-secondary hover:text-gold">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <ActiveIcon className="w-5 h-5 text-gold hidden sm:block" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase">{activeTab.replace('_', ' ')}</h2>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs py-1 px-3">
              <DollarSign className="w-3.5 h-3.5 mr-1" />
              Total Revenue: {formatCurrency(stats?.estimatedRevenue || 0)}
            </Badge>
            <Button size="sm" onClick={exportPaymentsCSV} className="bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 text-xs font-semibold gap-1.5 hidden sm:flex">
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>
        </header>

        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

          {/* ─── OVERVIEW TAB ─── */}
          {activeTab === 'overview' && (
            <>
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-black-surface border-dark-gray p-5 hover:border-gold/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] text-text-muted font-bold uppercase tracking-wider">Estimated Revenue</p>
                      <p className="text-2xl font-black text-white mt-1">
                        {statsLoading ? <Loader2 className="w-5 h-5 animate-spin text-gold" /> : formatCurrency(stats?.estimatedRevenue || 0)}
                      </p>
                      <p className="text-xs text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" /> Live Platform Balance
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-gold/15 text-gold border border-gold/30">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>
                </Card>

                <Card className="bg-black-surface border-dark-gray p-5 hover:border-gold/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] text-text-muted font-bold uppercase tracking-wider">Total Transactions</p>
                      <p className="text-2xl font-black text-white mt-1">
                        {statsLoading ? <Loader2 className="w-5 h-5 animate-spin text-gold" /> : (stats?.totalPayments || 0)}
                      </p>
                      <p className="text-xs text-blue-400 mt-1 font-semibold flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5" /> Recorded Payment Logs
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      <CreditCard className="w-6 h-6" />
                    </div>
                  </div>
                </Card>

                <Card className="bg-black-surface border-dark-gray p-5 hover:border-gold/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] text-text-muted font-bold uppercase tracking-wider">Pending Approvals</p>
                      <p className="text-2xl font-black text-amber-400 mt-1">
                        {proRequestsLoading ? <Loader2 className="w-5 h-5 animate-spin text-amber-400" /> : (proRequests?.length || 0)}
                      </p>
                      <p className="text-xs text-amber-400 mt-1 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Pro Upgrade Proofs
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>
                </Card>

                <Card className="bg-black-surface border-dark-gray p-5 hover:border-gold/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] text-text-muted font-bold uppercase tracking-wider">Paid Subscription DJs</p>
                      <p className="text-2xl font-black text-emerald-400 mt-1">
                        {proCount + legendCount}
                      </p>
                      <p className="text-xs text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> {proCount} Pro • {legendCount} Pro+
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Monthly Revenue Trend & Tier Share */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-black-surface border-dark-gray p-5">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
                      <span>Monthly Revenue Trend</span>
                      <span className="text-xs text-gold font-normal">Last 6 Months</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {analyticsLoading ? (
                      <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-gold mx-auto" /></div>
                    ) : (
                      <div className="h-56 flex items-end gap-3 pt-6 px-2">
                        {(analytics || []).map((item: any, i: number) => {
                          const maxRev = Math.max(...(analytics || []).map((a: any) => a.revenue || 1), 100);
                          const pct = Math.min(100, Math.max(15, Math.round(((item.revenue || 0) / maxRev) * 100)));
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                              <span className="text-[10px] font-mono text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                                {formatCurrency(item.revenue || 0)}
                              </span>
                              <div
                                className="w-full rounded-t-lg bg-gradient-to-t from-gold/30 via-gold/70 to-gold group-hover:brightness-125 transition-all shadow-[0_0_12px_rgba(212,162,74,0.3)]"
                                style={{ height: `${pct}%` }}
                              />
                              <span className="text-[11px] font-semibold text-text-muted">{item.month}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* DJ Subscription Tier Share */}
                <Card className="bg-black-surface border-dark-gray p-5">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-sm font-bold text-white">Tier Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-text-primary">Free Tier</span>
                        <span className="text-text-muted">{freeCount} DJs</span>
                      </div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-zinc-600 rounded-full" style={{ width: `${Math.min(100, Math.round((freeCount / Math.max(1, stats?.totalDjs || 1)) * 100))}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-blue-400">Pro Tier</span>
                        <span className="text-blue-400">{proCount} DJs</span>
                      </div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, Math.round((proCount / Math.max(1, stats?.totalDjs || 1)) * 100))}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-gold">Pro+ (Legend) Tier</span>
                        <span className="text-gold">{legendCount} DJs</span>
                      </div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gold rounded-full" style={{ width: `${Math.min(100, Math.round((legendCount / Math.max(1, stats?.totalDjs || 1)) * 100))}%` }} />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-dark-gray text-xs text-text-muted flex justify-between">
                      <span>Total Registered DJs:</span>
                      <strong className="text-white">{stats?.totalDjs || allDjs.length}</strong>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* ─── SUBSCRIPTIONS & APPROVALS TAB ─── */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-6">
              {/* Pending Payment Verification Proof Requests */}
              <Card className="bg-black-surface border-dark-gray p-5">
                <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-400" />
                      Pending Pro Upgrade Payment Proofs
                    </CardTitle>
                    <p className="text-xs text-text-muted mt-1">
                      Review payment screenshot proofs submitted by DJs requesting Pro/Pro+ upgrades.
                    </p>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {proRequests?.length || 0} Pending
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  {proRequestsLoading ? (
                    <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-gold mx-auto" /></div>
                  ) : !proRequests || proRequests.length === 0 ? (
                    <div className="py-10 text-center text-xs text-text-muted bg-black-elevated rounded-xl border border-dark-gray">
                      No pending subscription payment proofs to review.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dark-gray overflow-hidden">
                      <Table>
                        <TableHeader className="bg-black-elevated">
                          <TableRow className="border-dark-gray">
                            <TableHead className="text-xs text-text-muted">DJ Stage Name</TableHead>
                            <TableHead className="text-xs text-text-muted">Requested Plan</TableHead>
                            <TableHead className="text-xs text-text-muted">Payment Method</TableHead>
                            <TableHead className="text-xs text-text-muted">Date Submitted</TableHead>
                            <TableHead className="text-xs text-text-muted">Proof Image</TableHead>
                            <TableHead className="text-xs text-text-muted text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {proRequests.map((req: any) => (
                            <TableRow key={req.id} className="border-dark-gray">
                              <TableCell className="font-semibold text-white">
                                {req.dj?.stageName || req.djId}
                              </TableCell>
                              <TableCell>
                                <Badge className={req.plan === 'legend' ? 'bg-gold/20 text-gold border-gold/40' : 'bg-blue-500/20 text-blue-400 border-blue-500/40'}>
                                  {req.plan?.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-text-secondary">{req.paymentMethod || 'Orange Money'}</TableCell>
                              <TableCell className="text-xs text-text-muted font-mono">{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '--'}</TableCell>
                              <TableCell>
                                {req.proofUrl ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setProofModalUrl(getMediaUrl(req.proofUrl))}
                                    className="border-gold/30 text-gold hover:bg-gold/10 text-xs h-7 gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> View Proof
                                  </Button>
                                ) : (
                                  <span className="text-xs text-text-muted">No Proof</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprovePro(req.id)}
                                    disabled={approveProRequest.isPending}
                                    className="bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs h-8 px-3"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRejectPro(req.id)}
                                    disabled={rejectProRequest.isPending}
                                    className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs h-8 px-3"
                                  >
                                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Roster & Manual Plan Grant Actions */}
              <Card className="bg-black-surface border-dark-gray p-5">
                <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold text-white">DJ Subscription Roster & Manual Plan Grants</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="rounded-xl border border-dark-gray overflow-hidden">
                    <Table>
                      <TableHeader className="bg-black-elevated">
                        <TableRow className="border-dark-gray">
                          <TableHead className="text-xs text-text-muted">Stage Name</TableHead>
                          <TableHead className="text-xs text-text-muted">Email</TableHead>
                          <TableHead className="text-xs text-text-muted">Current Tier</TableHead>
                          <TableHead className="text-xs text-text-muted">Referrals</TableHead>
                          <TableHead className="text-xs text-text-muted text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allDjs.slice(0, 15).map((dj: any) => (
                          <TableRow key={dj.id} className="border-dark-gray">
                            <TableCell className="font-semibold text-white">{dj.stageName}</TableCell>
                            <TableCell className="text-xs text-text-secondary">{dj.email}</TableCell>
                            <TableCell>
                              <Badge className={dj.subscriptionTier === 'legend' ? 'bg-gold/20 text-gold border-gold/40' : dj.subscriptionTier === 'pro' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-zinc-800 text-zinc-400'}>
                                {dj.subscriptionTier ? dj.subscriptionTier.toUpperCase() : 'FREE'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-gold">{dj.referralCount || 0} DJs</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => setGrantModalDjId(dj.id)}
                                className="bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 text-xs h-7"
                              >
                                <Gift className="w-3.5 h-3.5 mr-1" /> Grant Plan
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── PAYMENTS TAB ─── */}
          {activeTab === 'payments' && (
            <Card className="bg-black-surface border-dark-gray p-5">
              <CardHeader className="p-0 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-white">Live Payment Transactions</CardTitle>
                  <p className="text-xs text-text-muted mt-1">Real-time ledger of recorded payments across subscriptions, event tickets, and DJ bookings.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {['ALL', 'COMPLETED', 'PENDING', 'FAILED'].map((st) => (
                    <Button
                      key={st}
                      size="sm"
                      variant={paymentFilter === st ? 'default' : 'outline'}
                      onClick={() => setPaymentFilter(st)}
                      className={paymentFilter === st ? 'bg-gold text-black font-bold text-xs h-8' : 'border-dark-gray text-text-secondary text-xs h-8'}
                    >
                      {st}
                    </Button>
                  ))}
                  <Button size="sm" onClick={exportPaymentsCSV} className="bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 text-xs h-8">
                    <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {paymentsLoading ? (
                  <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-gold mx-auto" /></div>
                ) : paymentsList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-text-muted bg-black-elevated rounded-xl border border-dark-gray">
                    No payment logs matching filter.
                  </div>
                ) : (
                  <div className="rounded-xl border border-dark-gray overflow-hidden">
                    <Table>
                      <TableHeader className="bg-black-elevated">
                        <TableRow className="border-dark-gray">
                          <TableHead className="text-xs text-text-muted">Transaction ID</TableHead>
                          <TableHead className="text-xs text-text-muted">Customer Email</TableHead>
                          <TableHead className="text-xs text-text-muted">Amount</TableHead>
                          <TableHead className="text-xs text-text-muted">Payment Method</TableHead>
                          <TableHead className="text-xs text-text-muted">Status</TableHead>
                          <TableHead className="text-xs text-text-muted">Date & Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentsList.map((p: any) => (
                          <TableRow key={p.id} className="border-dark-gray">
                            <TableCell className="font-mono text-xs text-gold">{p.id.slice(0, 12)}...</TableCell>
                            <TableCell className="text-xs text-white font-medium">{p.user?.email || p.userId || 'N/A'}</TableCell>
                            <TableCell className="text-xs text-emerald-400 font-bold">{formatCurrency(p.amount)}</TableCell>
                            <TableCell className="text-xs text-text-secondary">{p.paymentMethod || 'Orange Money'}</TableCell>
                            <TableCell><StatusBadge status={p.status || 'COMPLETED'} /></TableCell>
                            <TableCell className="text-xs text-text-muted font-mono">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '--'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ─── REPORTS TAB ─── */}
          {activeTab === 'reports' && (
            <Card className="bg-black-surface border-dark-gray p-5 space-y-6">
              <CardHeader className="p-0 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-white">Financial Statement Reports</CardTitle>
                  <p className="text-xs text-text-muted mt-1">Export official platform revenue statements and transaction digests.</p>
                </div>
                <Button size="sm" onClick={exportPaymentsCSV} className="bg-gold text-black font-bold text-xs">
                  <Download className="w-3.5 h-3.5 mr-1" /> Export Full Audit CSV
                </Button>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Monthly Revenue Digest</h4>
                    <p className="text-xs text-text-muted">Total platform revenue and transaction ledger for current month.</p>
                    <Button size="sm" onClick={exportPaymentsCSV} variant="outline" className="w-full border-gold/30 text-gold text-xs">
                      Generate Statement
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Subscription Revenue Audit</h4>
                    <p className="text-xs text-text-muted">Pro & Pro+ subscription breakdown, active trials, and grant history.</p>
                    <Button size="sm" onClick={exportPaymentsCSV} variant="outline" className="w-full border-gold/30 text-gold text-xs">
                      Generate Audit Report
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Ticketing & Booking Payouts</h4>
                    <p className="text-xs text-text-muted">Event ticket sales revenue and DJ booking deposit ledgers.</p>
                    <Button size="sm" onClick={exportPaymentsCSV} variant="outline" className="w-full border-gold/30 text-gold text-xs">
                      Generate Payout Log
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* ─── PROOF PREVIEW MODAL ─── */}
      {proofModalUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setProofModalUrl(null)}>
          <div className="bg-black-surface border border-gold/30 rounded-2xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-dark-gray pb-3">
              <h3 className="text-sm font-bold text-white">Payment Screenshot Proof</h3>
              <Button size="sm" variant="ghost" onClick={() => setProofModalUrl(null)} className="text-text-muted hover:text-white">✕</Button>
            </div>
            <div className="bg-black rounded-xl border border-dark-gray overflow-hidden flex items-center justify-center min-h-[250px]">
              <img src={proofModalUrl} alt="Payment Proof" className="max-h-[70vh] w-full object-contain" />
            </div>
            <Button size="sm" onClick={() => window.open(proofModalUrl, '_blank')} className="w-full bg-gold/15 text-gold border border-gold/30 text-xs">
              <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Open Original Image
            </Button>
          </div>
        </div>
      )}

      {/* ─── MANUAL PLAN GRANT MODAL ─── */}
      {grantModalDjId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setGrantModalDjId(null)}>
          <form onSubmit={handleGrantPlanSubmit} className="bg-black-surface border border-gold/30 rounded-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-dark-gray pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-gold" /> Grant Subscription Plan
              </h3>
              <Button size="sm" type="button" variant="ghost" onClick={() => setGrantModalDjId(null)} className="text-text-muted hover:text-white">✕</Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Select Tier</label>
                <select
                  value={grantPlanTier}
                  onChange={(e) => setGrantPlanTier(e.target.value as 'pro' | 'legend')}
                  className="w-full bg-black-elevated border border-dark-gray text-white text-xs rounded-xl p-2.5 focus:border-gold outline-none"
                >
                  <option value="pro">Pro Tier</option>
                  <option value="legend">Pro+ (Legend) Tier</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Duration (Months)</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={grantMonths}
                  onChange={(e) => setGrantMonths(Number(e.target.value))}
                  className="w-full bg-black-elevated border border-dark-gray text-white text-xs rounded-xl p-2.5 focus:border-gold outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Granted for partnership promo"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  className="w-full bg-black-elevated border border-dark-gray text-white text-xs rounded-xl p-2.5 focus:border-gold outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-dark-gray">
              <Button type="button" size="sm" variant="outline" onClick={() => setGrantModalDjId(null)} className="border-dark-gray text-text-secondary text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={grantPlanMutation.isPending} className="bg-gold text-black font-bold text-xs">
                {grantPlanMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Grant'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
