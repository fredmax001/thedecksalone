import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, Search, Filter, CheckCircle2, XCircle, Ban,
  QrCode, Download, Users, CheckSquare, RefreshCw,
} from 'lucide-react';
import { useEventTickets, useEventCustomers, useTicketAction, useBulkTicketAction } from '@/hooks/useEventTicketing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusColor: Record<string, string> = {
  pending: 'bg-orange/15 text-orange border-orange/30',
  approved: 'bg-green/15 text-green border-green/30',
  checked_in: 'bg-blue-400/15 text-blue-400 border-blue-400/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
  cancelled: 'bg-text-muted/15 text-text-muted border-white/10',
};

export default function EventTicketManagement() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'tickets' | 'customers'>('tickets');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data: ticketsData, isLoading: ticketsLoading } = useEventTickets(eventId, { search, status, page, limit: 50 });
  const { data: customersData, isLoading: customersLoading } = useEventCustomers(eventId, { search, status, page, limit: 50 });
  const ticketAction = useTicketAction(eventId);
  const bulkAction = useBulkTicketAction(eventId);

  const handleAction = async (ticketId: string, action: string, payload?: any) => {
    try {
      await ticketAction.mutateAsync({ ticketId, action, payload });
      toast.success(`Ticket ${action.replace('-', ' ')}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || `Failed to ${action}`);
    }
  };

  const handleApproveAll = async () => {
    if (!confirm('Approve all pending tickets?')) return;
    try {
      const res = await bulkAction.mutateAsync('approve-all');
      toast.success(`${res.approvedCount} tickets approved`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to approve all');
    }
  };

  const exportCsv = () => {
    window.open(`/api/events/${eventId}/ticketing/customers/export`, '_blank');
  };

  const isLoading = activeView === 'tickets' ? ticketsLoading : customersLoading;
  const items = activeView === 'tickets' ? ticketsData?.data || [] : customersData?.data || [];
  const meta = activeView === 'tickets' ? ticketsData?.meta : customersData?.meta;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button onClick={() => navigate(`/dashboard/events/${eventId}`)} className="flex items-center gap-1 text-xs text-text-muted hover:text-gold mb-2">
            <ArrowLeft className="w-3 h-3" /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">Ticket Management</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-dark-gray text-text-secondary" onClick={handleApproveAll}>
            <CheckSquare className="w-4 h-4 mr-2" /> Approve All
          </Button>
          <Button variant="outline" className="border-dark-gray text-text-secondary" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Link to={`/dashboard/events/${eventId}/scan`}>
            <Button className="bg-gold-gradient text-black"><QrCode className="w-4 h-4 mr-2" /> Scanner</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-gray pb-1">
        {[
          { key: 'tickets', label: 'Tickets', icon: QrCode },
          { key: 'customers', label: 'Customers', icon: Users },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveView(tab.key as any); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-t-lg transition-colors ${activeView === tab.key ? 'text-gold border-b-2 border-gold' : 'text-text-muted hover:text-text-primary'}`}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="Search name, email, ticket number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10 bg-black-elevated border-dark-gray text-text-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-black-elevated border border-dark-gray text-text-primary text-sm rounded-md px-3 py-2"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      <Card className="bg-black-surface border-dark-gray">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <QrCode className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted">No {activeView} found</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-gray">
              {items.map((item: any) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="p-4 hover:bg-black-elevated/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm flex-shrink-0">
                      {item.user?.name?.[0] || item.buyerName?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-text-primary">{item.user?.name || item.buyerName || 'Unknown'}</p>
                        <Badge className={`text-[10px] ${statusColor[item.status] || 'text-text-muted border-white/10 bg-white/5'}`}>
                          {item.status}
                        </Badge>
                        {item.paymentStatus && (
                          <Badge className="text-[10px] bg-white/5 text-text-muted border-white/10">
                            {item.paymentStatus}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">{item.user?.email || item.buyerEmail || 'No email'}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-text-secondary">
                        <span>{item.ticketType?.name || 'Ticket'}</span>
                        <span>{item.ticketNumber}</span>
                        <span>{item.quantity} qty</span>
                        <span>{item.currency} {item.amount.toLocaleString()}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {activeView === 'tickets' && (
                      <div className="flex flex-wrap gap-2">
                        {item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAction(item.id, 'approve')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green/15 border border-green/30 text-green text-xs font-bold rounded-lg hover:bg-green/25"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Reason for rejection (optional):');
                                if (reason !== null) handleAction(item.id, 'reject', { reason });
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}
                        {(item.status === 'approved' || item.status === 'checked_in') && (
                          <button
                            onClick={() => handleAction(item.id, 'reissue-qr')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold text-xs font-bold rounded-lg hover:bg-gold/20"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Reissue QR
                          </button>
                        )}
                        {item.status !== 'checked_in' && item.status !== 'cancelled' && (
                          <button
                            onClick={() => { if (confirm('Cancel this ticket?')) handleAction(item.id, 'cancel'); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/10 text-text-secondary text-xs font-bold rounded-lg hover:bg-white/10"
                          >
                            <Ban className="w-3.5 h-3.5" /> Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" className="border-dark-gray text-text-secondary" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
          <span className="text-sm text-text-muted">{page} / {meta.totalPages}</span>
          <Button variant="outline" className="border-dark-gray text-text-secondary" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
