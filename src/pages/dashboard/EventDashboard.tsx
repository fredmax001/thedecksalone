import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  ArrowLeft, Users, BarChart3, ScanLine,
  DollarSign, Ticket, UserCheck, Clock, Calendar,
  Eye, EyeOff, Crown, Lock, Copy, Check,
} from 'lucide-react';
import { useEventDashboard, usePublishEvent, useUpdateTicketControls } from '@/hooks/useEventTicketing';
import { useEvent } from '@/hooks/useEvents';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatting';
import { formatDateTime, formatEventDate } from '@/lib/dateTime';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { DashboardSkeleton } from '@/components/ui/page-skeletons';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';

function KPICard({ icon: Icon, label, value, subtext, color = 'gold' }: any) {
  const colorMap: any = {
    gold: 'text-gold bg-gold/10',
    green: 'text-green bg-green/10',
    blue: 'text-blue-400 bg-blue-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    red: 'text-red-400 bg-red-400/10',
  };
  return (
    <Card className="bg-black-surface border-dark-gray hover:border-gold/20 transition-colors">
      <CardContent className="p-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs text-text-muted uppercase tracking-wider mt-3">{label}</p>
        <p className="text-xl font-bold text-text-primary font-display">{value}</p>
        {subtext && <p className="text-[10px] text-text-muted mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

export default function EventDashboard() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const tier = user?.djProfile?.subscriptionTier?.toLowerCase();
  const isProPlus = tier === 'pro' || tier === 'legend';
  const { data: event, refetch: refetchEvent } = useEvent(eventId);
  const { data: dashboard, isLoading } = useEventDashboard(eventId);
  const publishMutation = usePublishEvent(eventId);
  const controlsMutation = useUpdateTicketControls(eventId);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [staffUsername, setStaffUsername] = useState('staff');
  const [staffPassword, setStaffPassword] = useState('');

  // Sync staff username & password from event
  useEffect(() => {
    if (event?.onsiteUsername) {
      setStaffUsername(event.onsiteUsername);
    }
    if (event?.onsitePassword) {
      setStaffPassword(event.onsitePassword);
    }
  }, [event?.onsiteUsername, event?.onsitePassword]);

  const handlePublishToggle = async () => {
    try {
      await publishMutation.mutateAsync(event?.publishStatus !== 'published');
      toast.success(event?.publishStatus === 'published' ? 'Event unpublished' : 'Event published');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to update'));
    }
  };

  const updateControl = async (payload: any) => {
    try {
      await controlsMutation.mutateAsync(payload);
      await refetchEvent();
      toast.success(
        payload.onsitePassword !== undefined || payload.onsiteUsername !== undefined
          ? 'Staff credentials saved'
          : 'Settings saved'
      );
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to update'));
    }
  };

  const copyOnsiteLink = () => {
    const link = `${window.location.origin}/events/${eventId}/onsite`;
    const inviteText = `Sound It Salone Gate Staff Access:\nEvent: ${event?.title || 'Event'}\nEvent Code: ${event?.eventCode || eventId}\nEvent Link: ${link}\nUsername: ${staffUsername || 'staff'}\nPassword: ${staffPassword || event?.onsitePassword || '(Not set)'}`;
    navigator.clipboard.writeText(inviteText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success('Staff invite copied! (Event Link - Username - Password)');
  };

  const showSkeleton = useDelayedLoading(isLoading || !dashboard);
  if (isLoading || !dashboard) {
    return showSkeleton ? <DashboardSkeleton /> : null;
  }

  const { summary, typeBreakdown, recentSales } = dashboard;
  const isPublished = event?.publishStatus === 'published';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button onClick={() => navigate('/dashboard/events')} className="flex items-center gap-1 text-xs text-text-muted hover:text-gold mb-2">
            <ArrowLeft className="w-3 h-3" /> Back to Events
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">{event?.title}</h1>
            <Badge className={isPublished ? 'bg-green text-black' : 'bg-text-muted text-black'}>
              {isPublished ? 'Published' : event?.publishStatus}
            </Badge>
          </div>
          <p className="text-xs text-text-muted mt-1 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            {event?.date && formatEventDate(event.date)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-dark-gray text-text-secondary" onClick={handlePublishToggle}>
            {isPublished ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {isPublished ? 'Unpublish' : 'Publish'}
          </Button>
          <Link to={`/dashboard/events/${eventId}/tickets`}>
            <Button variant="outline" className="border-dark-gray text-text-secondary"><Users className="w-4 h-4 mr-2" /> Tickets</Button>
          </Link>
          <Link to={`/dashboard/events/${eventId}/analytics`}>
            <Button variant="outline" className="border-dark-gray text-text-secondary"><BarChart3 className="w-4 h-4 mr-2" /> Analytics</Button>
          </Link>
          {isProPlus && (
            <Link to={`/dashboard/events/${eventId}/scan`}>
              <Button className="bg-gold-gradient text-black"><ScanLine className="w-4 h-4 mr-2" /> Scanner</Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={DollarSign} label="Revenue" value={formatCurrency(summary.totalRevenue, event?.ticketCurrency || 'SLE')} color="gold" />
        <KPICard icon={Ticket} label="Tickets Sold" value={summary.ticketsSold.toLocaleString()} subtext={summary.ticketsRemaining !== null ? `${summary.ticketsRemaining} remaining` : undefined} color="green" />
        <KPICard icon={Clock} label="Pending" value={summary.pending.toLocaleString()} color="orange" />
        <KPICard icon={UserCheck} label="Checked In" value={summary.checkedIn.toLocaleString()} subtext={`${summary.attendancePct}% attendance`} color="blue" />
      </div>

      {/* Ticket Controls */}
      <Card className="bg-black-surface border-dark-gray">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-display font-bold text-text-primary uppercase flex items-center gap-2">
            <Lock className="w-4 h-4 text-gold" /> Ticket Sales Controls
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-black-elevated rounded-lg">
            <div>
              <p className="text-sm font-medium text-text-primary">Ticket Sales Closed</p>
              <p className="text-xs text-text-muted">Stop all ticket purchases for this event</p>
            </div>
            <button
              onClick={() => updateControl({ ticketSalesClosed: !event?.ticketSalesClosed })}
              disabled={controlsMutation.isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${event?.ticketSalesClosed ? 'bg-red-500' : 'bg-green-500'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${event?.ticketSalesClosed ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-black-elevated rounded-lg">
            <div>
              <p className="text-sm font-medium text-text-primary">Show Remaining Tickets</p>
              <p className="text-xs text-text-muted">Display remaining count on the public event page</p>
            </div>
            <button
              onClick={() => updateControl({ showRemainingTickets: !event?.showRemainingTickets })}
              disabled={controlsMutation.isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${event?.showRemainingTickets ? 'bg-green-500' : 'bg-text-muted'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${event?.showRemainingTickets ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="p-4 bg-black-elevated border border-gold/20 rounded-xl space-y-4">
            <div>
              <p className="text-sm font-bold text-text-primary uppercase flex items-center gap-1.5 text-gold">
                <Lock size={15} /> On-Site Gate Staff Access (Username &amp; Password)
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Set staff credentials to let gate personnel and bouncers scan QR tickets without sharing your DJ account.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-text-secondary uppercase font-semibold block mb-1">Staff Username</label>
                <input
                  type="text"
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  placeholder="e.g. staff or gate1"
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-[11px] text-text-secondary uppercase font-semibold block mb-1">Staff Password / PIN</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="Set password (e.g. GATE2026)"
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-gold pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-text-secondary text-xs"
                  onClick={() => {
                    const randomPass = 'GATE' + Math.floor(1000 + Math.random() * 9000);
                    setStaffPassword(randomPass);
                  }}
                >
                  Generate PIN
                </Button>
                <Button
                  size="sm"
                  className="bg-gold text-black hover:bg-gold/90 font-bold text-xs"
                  onClick={() => updateControl({ onsiteUsername: staffUsername, onsitePassword: staffPassword })}
                  disabled={controlsMutation.isPending}
                >
                  Save Credentials
                </Button>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 border-gold/30 bg-gold/5 text-gold text-xs font-semibold hover:bg-gold/15"
                  onClick={copyOnsiteLink}
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  {copiedLink ? 'Copied Staff Invite!' : 'Copy Staff Invite (Link - Username - Password)'}
                </Button>

                <a
                  href={`/events/${eventId}/onsite`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 py-1.5 px-3 bg-white/5 border border-white/10 text-white hover:border-gold/40 hover:text-gold text-xs font-semibold rounded-lg transition-colors"
                >
                  <ScanLine size={14} /> Open Portal
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-black-surface border-dark-gray"><CardContent className="p-4 text-center"><p className="text-xs text-text-muted uppercase">Approved</p><p className="text-lg font-bold text-green">{summary.approved}</p></CardContent></Card>
        <Card className="bg-black-surface border-dark-gray"><CardContent className="p-4 text-center"><p className="text-xs text-text-muted uppercase">Rejected</p><p className="text-lg font-bold text-red-400">{summary.rejected}</p></CardContent></Card>
        <Card className="bg-black-surface border-dark-gray"><CardContent className="p-4 text-center"><p className="text-xs text-text-muted uppercase">Cancelled</p><p className="text-lg font-bold text-text-muted">{summary.cancelled}</p></CardContent></Card>
        <Card className="bg-black-surface border-dark-gray"><CardContent className="p-4 text-center"><p className="text-xs text-text-muted uppercase">Capacity</p><p className="text-lg font-bold text-text-primary">{summary.capacity || '∞'}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Ticket type breakdown */}
        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-5">
            <h3 className="text-sm font-display font-bold text-text-primary uppercase mb-4 flex items-center gap-2">
              <Crown className="w-4 h-4 text-gold" /> Ticket Type Breakdown
            </h3>
            {typeBreakdown.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">No ticket sales yet</p>
            ) : (
              <div className="space-y-3">
                {typeBreakdown.map((tb: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-black-elevated rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{tb.ticketType.name}</p>
                      <p className="text-xs text-text-muted">{tb.quantity} tickets · {tb.count} orders</p>
                    </div>
                    <p className="text-sm font-bold text-gold">{formatCurrency(tb.revenue, event?.ticketCurrency || 'SLE')}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent sales */}
        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-5">
            <h3 className="text-sm font-display font-bold text-text-primary uppercase mb-4">Recent Sales</h3>
            {recentSales.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">No sales yet</p>
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale: any) => (
                  <div key={sale.id} className="flex items-center gap-3 p-3 bg-black-elevated rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-xs">
                      {sale.user?.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{sale.user?.name || sale.user?.username}</p>
                      <p className="text-[10px] text-text-muted">{sale.ticketType?.name} · {formatDateTime(sale.createdAt)}</p>
                    </div>
                    <Badge className={sale.status === 'approved' || sale.status === 'checked_in' ? 'bg-green text-black' : sale.status === 'pending' ? 'bg-orange text-black' : 'bg-text-muted text-black'}>
                      {sale.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}