import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, Search, Filter, CheckCircle2, XCircle, Ban,
  QrCode, Download, Users, CheckSquare, RefreshCw, UserPlus,
  Clock, ShieldCheck, X, FileImage, Copy, Check, Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEventTickets, useEventCustomers, useTicketAction, useBulkTicketAction, useEventAvailability } from '@/hooks/useEventTicketing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatting';
import { formatDate } from '@/lib/dateTime';
import { getApiErrorMessage } from '@/lib/apiErrors';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending DJ Approval' },
  { value: 'approved', label: 'Approved (Awaiting Entry)' },
  { value: 'checked_in', label: 'Checked In (At Venue)' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/15 text-green-400 border-green-500/30',
  checked_in: 'bg-blue-400/15 text-blue-400 border-blue-400/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
  cancelled: 'bg-zinc-500/15 text-zinc-400 border-white/10',
};

export default function EventTicketManagement() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'tickets' | 'customers'>('tickets');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [qrModalTicket, setQrModalTicket] = useState<any | null>(null);
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Add Guest Form State
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestTicketTypeId, setGuestTicketTypeId] = useState('');
  const [guestQuantity, setGuestQuantity] = useState(1);
  const [guestStatus, setGuestStatus] = useState<'approved' | 'checked_in'>('approved');
  const [guestNotes, setGuestNotes] = useState('');
  const [isSubmittingGuest, setIsSubmittingGuest] = useState(false);

  const { data: ticketsData, isLoading: ticketsLoading, refetch: refetchTickets } = useEventTickets(eventId, { search, status, page, limit: 50 });
  const { data: customersData, isLoading: customersLoading } = useEventCustomers(eventId, { search, status, page, limit: 50 });
  const { data: availability } = useEventAvailability(eventId);
  const ticketAction = useTicketAction(eventId);
  const bulkAction = useBulkTicketAction(eventId);

  const ticketTypes = availability?.ticketTypes || [];

  const handleAction = async (ticketId: string, action: string, payload?: any) => {
    try {
      await ticketAction.mutateAsync({ ticketId, action, payload });
      toast.success(`Ticket ${action.replace('-', ' ')}`);
      refetchTickets();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, `Failed to ${action}`));
    }
  };

  const handleApproveAll = async () => {
    if (!confirm('Approve all pending tickets? Automated confirmation emails with QR codes will be dispatched to buyers.')) return;
    try {
      const res = await bulkAction.mutateAsync('approve-all');
      toast.success(`${res.approvedCount} ticket(s) approved and emails sent!`);
      refetchTickets();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to approve all'));
    }
  };

  const handleAddGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast.error('Please enter guest name');
      return;
    }

    setIsSubmittingGuest(true);
    try {
      const res = await api.post(`/events/${eventId}/ticketing/guest-list`, {
        name: guestName.trim(),
        email: guestEmail.trim() || undefined,
        phone: guestPhone.trim() || undefined,
        ticketTypeId: guestTicketTypeId || undefined,
        quantity: Number(guestQuantity) || 1,
        status: guestStatus,
        notes: guestNotes.trim() || undefined,
        isComplimentary: true,
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Guest added to list!');
        setAddGuestOpen(false);
        setGuestName('');
        setGuestEmail('');
        setGuestPhone('');
        setGuestNotes('');
        setGuestQuantity(1);
        refetchTickets();
      } else {
        toast.error(res.data.error || 'Failed to add guest');
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to add guest to list'));
    } finally {
      setIsSubmittingGuest(false);
    }
  };

  const exportCsv = async () => {
    try {
      const res = await api.get(`/events/${eventId}/ticketing/customers/export`, {
        responseType: 'blob',
      });
      const disposition = res.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] || 'guest-list.csv';
      const blobUrl = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to export guest list'));
    }
  };

  const isLoading = activeView === 'tickets' ? ticketsLoading : customersLoading;
  const items = activeView === 'tickets' ? ticketsData?.data || [] : customersData?.data || [];
  const meta = activeView === 'tickets' ? ticketsData?.meta : customersData?.meta;
  const summary = (ticketsData as any)?.summary || {
    total: 0,
    pending: 0,
    approved: 0,
    checkedIn: 0,
    pendingArrival: 0,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button onClick={() => navigate(`/dashboard/events/${eventId}`)} className="flex items-center gap-1 text-xs text-text-muted hover:text-gold mb-2 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">Ticket &amp; Guest List Management</h1>
          <p className="text-xs text-text-muted mt-0.5">Approve purchases, issue QR passes, add guest list names, and monitor check-ins.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-gold text-black hover:bg-gold/90 font-bold"
            onClick={() => setAddGuestOpen(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" /> Add Guest / Pass
          </Button>
          {summary.pending > 0 && (
            <Button variant="outline" className="border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20" onClick={handleApproveAll}>
              <CheckSquare className="w-4 h-4 mr-2" /> Approve All ({summary.pending})
            </Button>
          )}
          <Button variant="outline" className="border-dark-gray text-text-secondary" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Link to={`/dashboard/events/${eventId}/scan`}>
            <Button className="bg-gold-gradient text-black font-semibold"><QrCode className="w-4 h-4 mr-2" /> Door Scanner</Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => { setStatus(''); setPage(1); }}
          className={`bg-[#111] border rounded-xl p-3 cursor-pointer transition-all ${status === '' ? 'border-gold/50 bg-gold/5' : 'border-white/10 hover:border-white/20'}`}
        >
          <p className="text-[11px] text-text-muted uppercase font-semibold">Total Issued</p>
          <p className="text-2xl font-bold text-white mt-1">{summary.total || items.length}</p>
        </div>

        <div
          onClick={() => { setStatus('checked_in'); setPage(1); }}
          className={`bg-[#111] border rounded-xl p-3 cursor-pointer transition-all ${status === 'checked_in' ? 'border-blue-400/50 bg-blue-400/5' : 'border-white/10 hover:border-white/20'}`}
        >
          <p className="text-[11px] text-blue-400 uppercase font-semibold flex items-center gap-1">
            <CheckCircle2 size={12} /> Checked In
          </p>
          <p className="text-2xl font-bold text-white mt-1">{summary.checkedIn || 0}</p>
        </div>

        <div
          onClick={() => { setStatus('approved'); setPage(1); }}
          className={`bg-[#111] border rounded-xl p-3 cursor-pointer transition-all ${status === 'approved' ? 'border-green-400/50 bg-green-400/5' : 'border-white/10 hover:border-white/20'}`}
        >
          <p className="text-[11px] text-green-400 uppercase font-semibold flex items-center gap-1">
            <Clock size={12} /> Pending Arrival
          </p>
          <p className="text-2xl font-bold text-white mt-1">{summary.pendingArrival || summary.approved || 0}</p>
        </div>

        <div
          onClick={() => { setStatus('pending'); setPage(1); }}
          className={`bg-[#111] border rounded-xl p-3 cursor-pointer transition-all ${status === 'pending' ? 'border-yellow-400/50 bg-yellow-400/5' : 'border-white/10 hover:border-white/20'}`}
        >
          <p className="text-[11px] text-yellow-400 uppercase font-semibold flex items-center gap-1">
            <ShieldCheck size={12} /> Pending Approval
          </p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{summary.pending || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-gray pb-1">
        {[
          { key: 'tickets', label: 'Tickets & Passes', icon: QrCode },
          { key: 'customers', label: 'Attendees & Buyers', icon: Users },
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
            placeholder="Search attendee name, email, ticket number (DS-...)..."
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
              <QrCode className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-40" />
              <p className="text-text-muted text-sm">No {activeView} found matching criteria</p>
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
                    <div className="w-11 h-11 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm flex-shrink-0 border border-gold/30">
                      {item.buyerName?.[0] || item.user?.name?.[0] || item.user?.username?.[0] || '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-text-primary">{item.buyerName || item.user?.name || item.user?.username || 'Attendee'}</p>
                        <Badge className={`text-[10px] ${statusColor[item.status] || 'text-text-muted border-white/10 bg-white/5'}`}>
                          {item.status === 'checked_in' ? 'Checked In' : item.status === 'approved' ? 'Approved (Awaiting Entry)' : item.status === 'pending' ? 'Pending Approval' : item.status}
                        </Badge>
                        {item.paymentMethod && (
                          <Badge className="text-[10px] bg-white/5 text-text-muted border-white/10">
                            {item.paymentMethod.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-text-muted mt-1">
                        <span>{item.buyerEmail || item.user?.email || 'No email'}</span>
                        {item.buyerPhone && <span>· {item.buyerPhone}</span>}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-text-secondary">
                        <span className="text-gold font-medium">{item.ticketType?.name || 'Standard Pass'}</span>
                        <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-white font-semibold">#{item.ticketNumber}</span>
                        <span>{formatCurrency(item.amount, item.currency)}</span>
                        <span>{formatDate(item.createdAt)}</span>
                        {item.scannedAt && (
                          <span className="text-blue-400 font-medium">Scanned at: {new Date(item.scannedAt).toLocaleTimeString()}</span>
                        )}
                      </div>

                      {/* Payment screenshot preview link if exists */}
                      {item.paymentScreenshot && (
                        <button
                          onClick={() => setProofModalUrl(item.paymentScreenshot)}
                          className="inline-flex items-center gap-1 text-[11px] text-gold hover:underline mt-2"
                        >
                          <FileImage size={12} /> View Payment Receipt Proof
                        </button>
                      )}
                    </div>

                    {activeView === 'tickets' && (
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Pending Actions */}
                        {item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAction(item.id, 'approve')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-bold rounded-lg hover:bg-green-500/25 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Reason for rejection (optional):');
                                if (reason !== null) handleAction(item.id, 'reject', { reason });
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}

                        {/* View QR Code button for all valid tickets */}
                        {(item.status === 'approved' || item.status === 'checked_in') && (
                          <button
                            onClick={() => setQrModalTicket(item)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gold/15 border border-gold/40 text-gold text-xs font-bold rounded-lg hover:bg-gold/25 transition-colors"
                          >
                            <QrCode className="w-3.5 h-3.5" /> View QR Code
                          </button>
                        )}

                        {(item.status === 'approved' || item.status === 'checked_in') && (
                          <button
                            onClick={() => handleAction(item.id, 'reissue-qr')}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 border border-white/10 text-text-secondary text-xs rounded-lg hover:bg-white/10 transition-colors"
                            title="Regenerate QR code"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {item.status !== 'checked_in' && item.status !== 'cancelled' && (
                          <button
                            onClick={() => { if (confirm('Cancel this ticket?')) handleAction(item.id, 'cancel'); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 border border-white/10 text-text-secondary text-xs rounded-lg hover:bg-white/10 transition-colors"
                            title="Cancel ticket"
                          >
                            <Ban className="w-3.5 h-3.5" />
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
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" className="border-dark-gray text-text-secondary" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
          <span className="text-sm text-text-muted">{page} / {meta.totalPages}</span>
          <Button variant="outline" className="border-dark-gray text-text-secondary" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {/* MODAL: ADD GUEST TO LIST */}
      {addGuestOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-black-surface border border-gold/30 rounded-2xl p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-text-primary text-lg uppercase flex items-center gap-2">
                <UserPlus size={18} className="text-gold" /> Add Guest to List
              </h3>
              <button onClick={() => setAddGuestOpen(false)} className="p-1 text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-text-muted">
              Add a VIP, staff, or comp attendee directly. A valid ticket and unique QR code will be generated immediately.
            </p>

            <form onSubmit={handleAddGuestSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Guest Full Name *</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Alie Sesay"
                  className="w-full bg-black-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-gold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Email (Sends QR Pass)</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="guest@example.com"
                    className="w-full bg-black-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+232..."
                    className="w-full bg-black-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Ticket Type</label>
                  <select
                    value={guestTicketTypeId}
                    onChange={(e) => setGuestTicketTypeId(e.target.value)}
                    className="w-full bg-black-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-gold"
                  >
                    <option value="">Default / Standard</option>
                    {ticketTypes.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.currency} {t.price})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={guestQuantity}
                    onChange={(e) => setGuestQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-black-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Initial Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGuestStatus('approved')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${guestStatus === 'approved' ? 'bg-gold text-black border-gold' : 'bg-black-elevated border-white/10 text-white'}`}
                  >
                    <Clock size={14} /> Approved (Awaiting Entry)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuestStatus('checked_in')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${guestStatus === 'checked_in' ? 'bg-blue-400 text-black border-blue-400' : 'bg-black-elevated border-white/10 text-white'}`}
                  >
                    <CheckCircle2 size={14} /> Checked In at Door
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Notes / Tag</label>
                <input
                  type="text"
                  value={guestNotes}
                  onChange={(e) => setGuestNotes(e.target.value)}
                  placeholder="e.g. VIP guest of DJ, Media team, etc."
                  className="w-full bg-black-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-gold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-white/10 text-text-secondary"
                  onClick={() => setAddGuestOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingGuest}
                  className="flex-1 bg-gold text-black hover:bg-gold/90 font-bold"
                >
                  {isSubmittingGuest ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Ticket Pass'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: VIEW QR CODE */}
      {qrModalTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-black-surface border border-gold/40 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase font-bold text-gold tracking-wider flex items-center gap-1">
                <Sparkles size={14} /> Official QR Ticket
              </p>
              <button onClick={() => setQrModalTicket(null)} className="p-1 text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* QR Card */}
            <div className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center shadow-2xl shadow-gold/10">
              <QRCodeSVG
                value={qrModalTicket.qrPayload || `DS-TICKET:${qrModalTicket.id}:${qrModalTicket.ticketNumber}`}
                size={200}
                level="H"
                includeMargin
              />
              <p className="text-black font-mono font-bold text-sm tracking-wider mt-3">
                #{qrModalTicket.ticketNumber}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-base font-bold text-white">{qrModalTicket.buyerName || qrModalTicket.user?.name || 'Attendee'}</p>
              <p className="text-xs text-gold font-medium">{qrModalTicket.ticketType?.name || 'Standard Ticket'}</p>
              <Badge className={`text-[10px] mt-1 ${statusColor[qrModalTicket.status] || 'bg-white/10 text-white'}`}>
                {qrModalTicket.status === 'checked_in' ? 'Checked In' : 'Valid Pass - Approved'}
              </Badge>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-white/10 text-text-secondary text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(`https://decksalone.com/user/tickets`);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                  toast.success('Ticket portal link copied');
                }}
              >
                {copiedCode ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
                {copiedCode ? 'Copied Link' : 'Copy Link'}
              </Button>
              <Button
                className="flex-1 bg-gold text-black hover:bg-gold/90 font-bold text-xs"
                onClick={() => window.print()}
              >
                Print / Save
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: PROOF SCREENSHOT PREVIEW */}
      {proofModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setProofModalUrl(null)}>
          <div className="relative max-w-lg w-full bg-black-surface border border-white/10 rounded-2xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                <FileImage size={16} className="text-gold" /> Payment Screenshot Proof
              </p>
              <button onClick={() => setProofModalUrl(null)} className="p-1 text-text-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-black max-h-[70vh] flex items-center justify-center">
              <img src={proofModalUrl} alt="Payment proof" className="w-full h-auto object-contain max-h-[68vh]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}