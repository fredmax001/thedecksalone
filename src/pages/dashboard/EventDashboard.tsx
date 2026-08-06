import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  ArrowLeft, Loader2, Users, BarChart3, ScanLine,
  DollarSign, Ticket, UserCheck, Clock, Calendar,
  Eye, EyeOff, Crown,
} from 'lucide-react';
import { useEventDashboard, usePublishEvent } from '@/hooks/useEventTicketing';
import { useEvent } from '@/hooks/useEvents';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
  const isProPlus = user?.djProfile?.subscriptionTier === 'legend';
  const { data: event } = useEvent(eventId);
  const { data: dashboard, isLoading } = useEventDashboard(eventId);
  const publishMutation = usePublishEvent(eventId);

  const handlePublishToggle = async () => {
    try {
      await publishMutation.mutateAsync(event?.publishStatus !== 'published');
      toast.success(event?.publishStatus === 'published' ? 'Event unpublished' : 'Event published');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update');
    }
  };

  if (isLoading || !dashboard) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
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
            {event?.date && new Date(event.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
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
        <KPICard icon={DollarSign} label="Revenue" value={`${event?.ticketCurrency || 'SLE'} ${summary.totalRevenue.toLocaleString()}`} color="gold" />
        <KPICard icon={Ticket} label="Tickets Sold" value={summary.ticketsSold.toLocaleString()} subtext={summary.ticketsRemaining !== null ? `${summary.ticketsRemaining} remaining` : undefined} color="green" />
        <KPICard icon={Clock} label="Pending" value={summary.pending.toLocaleString()} color="orange" />
        <KPICard icon={UserCheck} label="Checked In" value={summary.checkedIn.toLocaleString()} subtext={`${summary.attendancePct}% attendance`} color="blue" />
      </div>

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
                    <p className="text-sm font-bold text-gold">{event?.ticketCurrency || 'SLE'} {tb.revenue.toLocaleString()}</p>
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
                      <p className="text-[10px] text-text-muted">{sale.ticketType?.name} · {new Date(sale.createdAt).toLocaleString()}</p>
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
