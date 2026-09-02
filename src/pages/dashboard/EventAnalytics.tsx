import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEventAnalytics } from '@/hooks/useEventTicketing';
import { useEvent } from '@/hooks/useEvents';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatting';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

const COLORS = ['#f4e059', '#ceb100', '#22C55E', '#3B82F6', '#8B5CF6', '#EF4444', '#F97316', '#06B6D4', '#EC4899'];

const tooltipStyle = {
  backgroundColor: '#111111', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#F5F5F5',
};

export default function EventAnalytics() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event } = useEvent(eventId);
  const { data: analytics, isLoading } = useEventAnalytics(eventId);

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate(`/dashboard/events/${eventId}`)} className="flex items-center gap-1 text-xs text-text-muted hover:text-gold mb-2">
          <ArrowLeft className="w-3 h-3" /> Back to Dashboard
        </button>
        <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">{event?.title} — Analytics</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black-surface border-dark-gray"><CardContent className="p-5"><p className="text-xs text-text-muted uppercase">Total Revenue</p><p className="text-2xl font-bold text-gold font-display">{formatCurrency(analytics.revenue, event?.ticketCurrency || 'SLE')}</p></CardContent></Card>
        <Card className="bg-black-surface border-dark-gray"><CardContent className="p-5"><p className="text-xs text-text-muted uppercase">Checked In</p><p className="text-2xl font-bold text-green font-display">{analytics.attendance.checkedIn}</p></CardContent></Card>
        <Card className="bg-black-surface border-dark-gray"><CardContent className="p-5"><p className="text-xs text-text-muted uppercase">Conversion Rate</p><p className="text-2xl font-bold text-blue-400 font-display">{analytics.conversionRate}%</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-5">
            <h3 className="text-sm font-display font-bold text-text-primary uppercase mb-4">Daily Sales</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="date" stroke="#6B6B6B" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="#6B6B6B" fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="tickets" fill="#f4e059" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-5">
            <h3 className="text-sm font-display font-bold text-text-primary uppercase mb-4">Hourly Sales</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.hourlySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="hour" stroke="#6B6B6B" fontSize={10} />
                  <YAxis stroke="#6B6B6B" fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="sales" stroke="#22C55E" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-5">
            <h3 className="text-sm font-display font-bold text-text-primary uppercase mb-4">Ticket Type Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.ticketTypeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {analytics.ticketTypeDistribution.map((_: any, idx: number) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-5">
            <h3 className="text-sm font-display font-bold text-text-primary uppercase mb-4">Revenue by Ticket Type</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.ticketTypeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="name" stroke="#6B6B6B" fontSize={10} />
                  <YAxis stroke="#6B6B6B" fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="revenue" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}