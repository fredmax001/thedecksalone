import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  useAdminVerificationRequests,
  useAdminDjs,
  useAdminStats,
  useVerifyDj,
  useRejectDjVerification,
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
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  Menu,
  ChevronsLeft,
  FileText,
  Eye,
  Search,
  Loader2,
  MapPin,
  Headphones,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { getMediaUrl } from '@/lib/api';

const SIDEBAR_ITEMS = [
  { id: 'pending', label: 'Pending Requests', icon: Clock },
  { id: 'verified', label: 'Verified DJ Roster', icon: CheckCircle2 },
  { id: 'rejected', label: 'Rejected Log', icon: XCircle },
  { id: 'guidelines', label: 'Verification Policy', icon: FileText },
];

export default function VerificationDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectDj, setInspectDj] = useState<any | null>(null);
  const [rejectReasonModalDj, setRejectReasonModalDj] = useState<any | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState('');
  const { data: pendingRequests, isLoading: pendingLoading } = useAdminVerificationRequests();
  const { data: verifiedDjsData, isLoading: verifiedLoading } = useAdminDjs({ verified: true, limit: 100 });
  const { data: allDjsData } = useAdminDjs({ limit: 100 });
  const { data: stats } = useAdminStats();

  // Real Mutations
  const verifyDjMutation = useVerifyDj();
  const rejectDjMutation = useRejectDjVerification();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleApproveVerification = async (dj: any) => {
    try {
      await verifyDjMutation.mutateAsync({
        id: dj.id,
        notes: 'Verification badge granted by Verification Admin',
        badgeType: 'gold',
      });
      toast.success(`Verification badge granted to ${dj.stageName || dj.user?.email}!`);
      if (inspectDj?.id === dj.id) setInspectDj(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve verification');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReasonModalDj || !rejectReasonText.trim()) {
      toast.error('Please specify a rejection reason.');
      return;
    }
    try {
      await rejectDjMutation.mutateAsync({
        id: rejectReasonModalDj.id,
        reason: rejectReasonText.trim(),
      });
      toast.success(`Verification request rejected for ${rejectReasonModalDj.stageName}`);
      setRejectReasonModalDj(null);
      setRejectReasonText('');
      if (inspectDj?.id === rejectReasonModalDj.id) setInspectDj(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject verification');
    }
  };

  // Filter list by search
  const filterList = (list: any[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((d) => (
      (d.stageName || '').toLowerCase().includes(q) ||
      (d.user?.email || d.email || '').toLowerCase().includes(q) ||
      (d.city || '').toLowerCase().includes(q)
    ));
  };

  const pendingList = filterList(pendingRequests || []);
  const verifiedList = filterList(verifiedDjsData?.data || []);

  const ActiveIcon = SIDEBAR_ITEMS.find((i) => i.id === activeTab)?.icon || Clock;

  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-text-primary flex">
      {/* ─── Sidebar ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-black-surface border-r border-dark-gray transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0 md:relative md:translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-dark-gray">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-wide">Verification Admin</h1>
                <span className="text-[10px] bg-gold/20 text-gold font-mono px-2 py-0.5 rounded border border-gold/30">
                  🛡️ DJ AUDIT PORTAL
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
                  onClick={() => { setActiveTab(item.id); closeSidebarOnMobile(); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-gold/15 text-gold border border-gold/30 shadow-[0_0_15px_rgba(244, 224, 89,0.15)]'
                      : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.id === 'pending' && (pendingRequests?.length || 0) > 0 && (
                    <span className="ml-auto bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30">
                      {pendingRequests?.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-dark-gray">
            <div className="flex items-center gap-3 px-3 py-2 bg-black-elevated rounded-xl border border-dark-gray">
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold border border-gold/30">
                {user?.email?.slice(0, 2).toUpperCase() || 'VA'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-white">{user?.name || user?.email?.split('@')[0]}</p>
                <p className="text-[10px] text-gold uppercase font-bold">Verification Admin</p>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── Main View ─── */}
      <main className="flex-1 min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-dark-gray px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-2 rounded-lg text-text-secondary hover:text-gold hover:bg-white/5 transition-colors"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? <ChevronsLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <ActiveIcon className="w-5 h-5 text-gold hidden sm:block" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase">{activeTab.replace('_', ' ')}</h2>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <div className="relative hidden sm:block w-64">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search DJ or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black-elevated border border-dark-gray text-white text-xs rounded-xl pl-9 pr-3 py-1.5 focus:border-gold outline-none"
              />
            </div>
            <Badge variant="outline" className="bg-gold/10 text-gold border-gold/30 text-xs py-1 px-3">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Verified DJs: {verifiedList.length}
            </Badge>
          </div>
        </header>

        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-black-surface border-dark-gray p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-text-muted font-bold uppercase tracking-wider">Pending Submissions</p>
                <p className="text-2xl font-black text-amber-400 mt-1">
                  {pendingLoading ? <Loader2 className="w-5 h-5 animate-spin text-amber-400" /> : (pendingRequests?.length || 0)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Clock className="w-5 h-5" />
              </div>
            </Card>

            <Card className="bg-black-surface border-dark-gray p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-text-muted font-bold uppercase tracking-wider">Verified DJ Roster</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  {verifiedLoading ? <Loader2 className="w-5 h-5 animate-spin text-emerald-400" /> : verifiedList.length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </Card>

            <Card className="bg-black-surface border-dark-gray p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-text-muted font-bold uppercase tracking-wider">Total Registered DJs</p>
                <p className="text-2xl font-black text-white mt-1">
                  {stats?.totalDjs || (allDjsData?.data?.length || 0)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gold/15 text-gold border border-gold/30">
                <Headphones className="w-5 h-5" />
              </div>
            </Card>
          </div>

          {/* ─── PENDING REQUESTS TAB ─── */}
          {activeTab === 'pending' && (
            <Card className="bg-black-surface border-dark-gray p-5">
              <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    DJ Verification Submissions Awaiting Audit
                  </CardTitle>
                  <p className="text-xs text-text-muted mt-1">Review identity, portfolio links, and equipment proof submitted by DJs.</p>
                </div>
                <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {pendingList.length} Awaiting Review
                </Badge>
              </CardHeader>

              <CardContent className="p-0">
                {pendingLoading ? (
                  <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-gold mx-auto" /></div>
                ) : pendingList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-text-muted bg-black-elevated rounded-xl border border-dark-gray">
                    No pending DJ verification requests right now.
                  </div>
                ) : (
                  <div className="rounded-xl border border-dark-gray overflow-hidden">
                    <Table>
                      <TableHeader className="bg-black-elevated">
                        <TableRow className="border-dark-gray">
                          <TableHead className="text-xs text-text-muted">DJ Stage Name</TableHead>
                          <TableHead className="text-xs text-text-muted">Location</TableHead>
                          <TableHead className="text-xs text-text-muted">Experience</TableHead>
                          <TableHead className="text-xs text-text-muted">Submitted Date</TableHead>
                          <TableHead className="text-xs text-text-muted">Audit Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingList.map((dj: any) => (
                          <TableRow key={dj.id} className="border-dark-gray">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <img
                                  src={getMediaUrl(dj.avatar) || '/default-avatar.jpg'}
                                  alt={dj.stageName}
                                  className="w-9 h-9 rounded-full object-cover border border-gold/30"
                                />
                                <div>
                                  <p className="text-xs font-bold text-white">{dj.stageName}</p>
                                  <p className="text-[10px] text-text-muted">{dj.user?.email || dj.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-text-secondary">
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gold" /> {dj.city || 'Sierra Leone'}</span>
                            </TableCell>
                            <TableCell className="text-xs text-text-secondary">
                              {dj.startYear ? `${new Date().getFullYear() - dj.startYear} Years` : '1+ Years'}
                            </TableCell>
                            <TableCell className="text-xs text-text-muted font-mono">
                              {dj.createdAt ? new Date(dj.createdAt).toLocaleDateString() : '--'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setInspectDj(dj)}
                                  className="border-gold/30 text-gold hover:bg-gold/10 text-xs h-8 px-2.5"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" /> Inspect
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveVerification(dj)}
                                  disabled={verifyDjMutation.isPending}
                                  className="bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs h-8 px-2.5"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verify
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setRejectReasonModalDj(dj)}
                                  disabled={rejectDjMutation.isPending}
                                  className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs h-8 px-2.5"
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
          )}

          {/* ─── VERIFIED DJ ROSTER TAB ─── */}
          {activeTab === 'verified' && (
            <Card className="bg-black-surface border-dark-gray p-5">
              <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Verified Official DJ Roster
                  </CardTitle>
                  <p className="text-xs text-text-muted mt-1">All DJs currently holding the official Deck Salone verified checkmark.</p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {verifiedList.length} Verified
                </Badge>
              </CardHeader>

              <CardContent className="p-0">
                {verifiedLoading ? (
                  <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-gold mx-auto" /></div>
                ) : verifiedList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-text-muted bg-black-elevated rounded-xl border border-dark-gray">
                    No verified DJs found.
                  </div>
                ) : (
                  <div className="rounded-xl border border-dark-gray overflow-hidden">
                    <Table>
                      <TableHeader className="bg-black-elevated">
                        <TableRow className="border-dark-gray">
                          <TableHead className="text-xs text-text-muted">DJ Profile</TableHead>
                          <TableHead className="text-xs text-text-muted">Location</TableHead>
                          <TableHead className="text-xs text-text-muted">Ranking Score</TableHead>
                          <TableHead className="text-xs text-text-muted">Streams</TableHead>
                          <TableHead className="text-xs text-text-muted">Bookings</TableHead>
                          <TableHead className="text-xs text-text-muted text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {verifiedList.map((dj: any) => (
                          <TableRow key={dj.id} className="border-dark-gray">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <img
                                  src={getMediaUrl(dj.avatar) || '/default-avatar.jpg'}
                                  alt={dj.stageName}
                                  className="w-9 h-9 rounded-full object-cover border border-emerald-500/30"
                                />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-bold text-white">{dj.stageName}</p>
                                    <VerifiedBadge dj={dj} size={13} />
                                  </div>
                                  <p className="text-[10px] text-text-muted">{dj.user?.email || dj.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-text-secondary">{dj.city || 'Freetown'}</TableCell>
                            <TableCell className="text-xs font-bold text-gold">{Math.round(dj.rankingScore || 0)} pts</TableCell>
                            <TableCell className="text-xs text-text-secondary">{dj.totalStreams || 0}</TableCell>
                            <TableCell className="text-xs text-emerald-400 font-semibold">{dj.completedBookings || dj.totalBookings || 0}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setInspectDj(dj)}
                                  className="border-gold/30 text-gold hover:bg-gold/10 text-xs h-7 px-2.5"
                                >
                                  Inspect
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
          )}

          {/* ─── REJECTED LOG TAB ─── */}
          {activeTab === 'rejected' && (
            <Card className="bg-black-surface border-dark-gray p-5">
              <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-rose-400" />
                    Rejected Verification Log
                  </CardTitle>
                  <p className="text-xs text-text-muted mt-1">Audit log of rejected DJ submissions with notes.</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="rounded-xl border border-dark-gray overflow-hidden">
                  <Table>
                    <TableHeader className="bg-black-elevated">
                      <TableRow className="border-dark-gray">
                        <TableHead className="text-xs text-text-muted">Stage Name</TableHead>
                        <TableHead className="text-xs text-text-muted">Email</TableHead>
                        <TableHead className="text-xs text-text-muted">Status</TableHead>
                        <TableHead className="text-xs text-text-muted text-right">Re-evaluate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(allDjsData?.data || []).filter((d: any) => !d.verified).slice(0, 10).map((dj: any) => (
                        <TableRow key={dj.id} className="border-dark-gray">
                          <TableCell className="font-semibold text-white">{dj.stageName}</TableCell>
                          <TableCell className="text-xs text-text-muted">{dj.email}</TableCell>
                          <TableCell>
                            <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px]">
                              UNVERIFIED
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleApproveVerification(dj)}
                              className="bg-emerald-500 text-black font-bold text-xs h-7"
                            >
                              Grant Badge
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── VERIFICATION POLICY TAB ─── */}
          {activeTab === 'guidelines' && (
            <Card className="bg-black-surface border-dark-gray p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-gold" /> Official Verification Guidelines
                </h3>
                <p className="text-xs text-text-muted mt-1">Criteria for granting the official ✓ Verified DJ Checkmark on Deck Salone.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray space-y-2">
                  <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase">
                    <Check className="w-4 h-4" /> 1. Identity & Profile Completeness
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    DJ profile must have a clear stage name, profile picture, location in Sierra Leone, biography, and genre tags.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray space-y-2">
                  <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase">
                    <Check className="w-4 h-4" /> 2. Audio Content & Mixes
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    At least 1 published high-quality DJ mix or live set on Deck Salone demonstrating mixing technique.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray space-y-2">
                  <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase">
                    <Check className="w-4 h-4" /> 3. Equipment & Experience Proof
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Proof of professional DJ equipment (controller, decks, mixer, software) or venue performance flyers.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black-elevated border border-dark-gray space-y-2">
                  <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase">
                    <Check className="w-4 h-4" /> 4. Social & Presence
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Active social media channels or radio/event residency in Sierra Leone.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* ─── DJ INSPECTOR MODAL ─── */}
      {inspectDj && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setInspectDj(null)}>
          <div className="bg-black-surface border border-gold/30 rounded-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-dark-gray pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={getMediaUrl(inspectDj.avatar) || '/default-avatar.jpg'}
                  alt={inspectDj.stageName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gold"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{inspectDj.stageName}</h3>
                    {inspectDj.verified && <VerifiedBadge dj={inspectDj} size={15} />}
                  </div>
                  <p className="text-xs text-text-muted">{inspectDj.user?.email || inspectDj.email}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setInspectDj(null)} className="text-text-muted hover:text-white">✕</Button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-black-elevated p-3 rounded-xl border border-dark-gray">
                <div>
                  <span className="text-text-muted block">Location:</span>
                  <strong className="text-white font-medium">{inspectDj.city || 'Sierra Leone'}</strong>
                </div>
                <div>
                  <span className="text-text-muted block">Experience:</span>
                  <strong className="text-white font-medium">{inspectDj.startYear ? `${new Date().getFullYear() - inspectDj.startYear} Years` : '1+ Years'}</strong>
                </div>
                <div>
                  <span className="text-text-muted block">Ranking Position:</span>
                  <strong className="text-gold font-bold">#{inspectDj.rankingPosition || '--'}</strong>
                </div>
                <div>
                  <span className="text-text-muted block">Ranking Score:</span>
                  <strong className="text-gold font-bold">{Math.round(inspectDj.rankingScore || 0)} pts</strong>
                </div>
              </div>

              <div>
                <span className="text-text-muted block font-semibold mb-1 uppercase tracking-wider">Biography:</span>
                <p className="text-text-secondary bg-black-elevated p-3 rounded-xl border border-dark-gray leading-relaxed">
                  {inspectDj.bio || 'No bio provided.'}
                </p>
              </div>

              <div>
                <span className="text-text-muted block font-semibold mb-1 uppercase tracking-wider">Genres & Styles:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(inspectDj.genres || ['Afrobeats', 'Salone Mix']).map((g: string, i: number) => (
                    <Badge key={i} className="bg-gold/15 text-gold border-gold/30 text-[10px]">
                      {g}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-dark-gray">
              <Button
                size="sm"
                onClick={() => handleApproveVerification(inspectDj)}
                disabled={verifyDjMutation.isPending}
                className="bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Grant Verification
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectReasonModalDj(inspectDj)}
                className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── REJECT REASON MODAL ─── */}
      {rejectReasonModalDj && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setRejectReasonModalDj(null)}>
          <form onSubmit={handleRejectSubmit} className="bg-black-surface border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-dark-gray pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" /> Reject Verification Request
              </h3>
              <Button size="sm" type="button" variant="ghost" onClick={() => setRejectReasonModalDj(null)} className="text-text-muted hover:text-white">✕</Button>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Reason for Rejection</label>
              <textarea
                rows={3}
                placeholder="Explain why the request was rejected..."
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
                className="w-full bg-black-elevated border border-dark-gray text-white text-xs rounded-xl p-3 focus:border-rose-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-dark-gray">
              <Button type="button" size="sm" variant="outline" onClick={() => setRejectReasonModalDj(null)} className="border-dark-gray text-text-secondary text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={rejectDjMutation.isPending} className="bg-rose-500 text-white font-bold text-xs hover:bg-rose-600">
                {rejectDjMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Rejection'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
