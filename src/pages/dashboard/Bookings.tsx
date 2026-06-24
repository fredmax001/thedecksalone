import { motion } from 'framer-motion';
import {
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Search,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Booking {
  id: string;
  eventType: string;
  eventDate: string;
  eventLocation: string;
  duration: number;
  budget: number;
  finalPrice?: number;
  deposit?: number;
  status: string;
  notes?: string;
  requirements?: string;
  client?: { id: string; email: string };
  dj?: { id: string; stageName: string; avatar: string };
  createdAt: string;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-500',
  NEGOTIATING: 'bg-purple/10 text-purple',
  CONFIRMED: 'bg-green/10 text-green',
  DEPOSIT_PAID: 'bg-blue/10 text-blue',
  COMPLETED: 'bg-green/10 text-green',
  CANCELLED: 'bg-red/10 text-red',
  REFUNDED: 'bg-red/10 text-red',
};

export default function Bookings() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'decline' | 'negotiate' | null>(null);
  const [finalPrice, setFinalPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [counterOffer, setCounterOffer] = useState('');
  const [counterNote, setCounterNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDj = user?.role === 'DJ';

  useEffect(() => {
    if (!isDj) {
      setLoading(false);
      return;
    }
    fetchBookings();
  }, [isDj, filter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('asDj', 'true');
      if (filter !== 'ALL') params.set('status', filter);
      const res = await api.get(`/bookings?${params.toString()}`);
      if (res.data.success) {
        setBookings(res.data.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId: string, status: string, extra?: any) => {
    try {
      setProcessing(true);
      const payload: any = { status };
      if (extra?.finalPrice !== undefined) payload.finalPrice = parseFloat(extra.finalPrice);
      if (extra?.deposit !== undefined) payload.deposit = parseFloat(extra.deposit);
      await api.put(`/bookings/${bookingId}/status`, payload);
      await fetchBookings();
      setSelectedBooking(null);
      setActionType(null);
      setFinalPrice('');
      setDeposit('');
      setDeclineReason('');
      setCounterOffer('');
      setCounterNote('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update booking');
    } finally {
      setProcessing(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.eventType.toLowerCase().includes(q) ||
      b.eventLocation.toLowerCase().includes(q) ||
      b.client?.email?.toLowerCase().includes(q)
    );
  });

  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;
  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'DEPOSIT_PAID').length;
  const totalEarnings = bookings
    .filter((b) => b.status === 'COMPLETED' || b.status === 'DEPOSIT_PAID')
    .reduce((sum, b) => sum + (b.finalPrice || b.budget || 0), 0);

  if (!isDj) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">This page is only available for DJs.</p>
        <Button variant="outline" className="mt-4 border-dark-gray" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Bookings
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage your bookings, requests, and calendar.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red/10 border border-red/30 text-red text-sm">
          {error}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-text-primary font-display">{bookings.length}</p>
            <p className="text-xs text-text-secondary mt-1">Total Bookings</p>
          </CardContent>
        </Card>
        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-yellow-500 font-display">{pendingCount}</p>
            <p className="text-xs text-text-secondary mt-1">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green font-display">{confirmedCount}</p>
            <p className="text-xs text-text-secondary mt-1">Confirmed</p>
          </CardContent>
        </Card>
        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-gold font-display">SLE {totalEarnings.toLocaleString()}</p>
            <p className="text-xs text-text-secondary mt-1">Total Earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="Search bookings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-black-elevated border-dark-gray text-text-primary placeholder:text-text-muted"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px] bg-black-elevated border-dark-gray text-text-primary">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-black-surface border-dark-gray">
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="NEGOTIATING">Negotiating</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Booking Cards */}
      <div className="space-y-3">
        {filteredBookings.length === 0 ? (
          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary mb-2">
                {filter === 'ALL' ? 'No bookings yet' : `No ${filter.toLowerCase()} bookings`}
              </p>
              <p className="text-sm text-text-muted">
                When clients book you, they will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredBookings.map((booking) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-black-surface border-dark-gray hover:border-gold/20 transition-colors">
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Event Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-semibold text-text-primary capitalize">
                          {booking.eventType}
                        </h3>
                        <Badge className={cn('border-0 text-xs', statusColors[booking.status] || 'bg-medium-gray text-text-secondary')}>
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(booking.eventDate).toLocaleDateString()}
                        </span>
                        <span>{booking.eventLocation}</span>
                        <span>{booking.duration}h</span>
                        <span className="text-gold font-medium">SLE {booking.budget?.toLocaleString()}</span>
                      </div>
                      {booking.client && (
                        <p className="text-xs text-text-muted mt-1">Client: {booking.client.email}</p>
                      )}
                      {booking.notes && (
                        <p className="text-xs text-text-muted mt-1 italic">"{booking.notes}"</p>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {booking.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green hover:bg-green/90 text-black"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setActionType('accept');
                            }}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-purple text-purple hover:bg-purple/10"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setActionType('negotiate');
                            }}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Negotiate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red text-red hover:bg-red/10"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setActionType('decline');
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                        </>
                      )}
                      {booking.status === 'NEGOTIATING' && (
                        <Button
                          size="sm"
                          className="bg-green hover:bg-green/90 text-black"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setActionType('accept');
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Confirm
                        </Button>
                      )}
                      {booking.status === 'CONFIRMED' && (
                        <Badge className="bg-green/10 text-green border-0">Awaiting deposit</Badge>
                      )}
                      {booking.status === 'COMPLETED' && (
                        <Badge className="bg-green/10 text-green border-0">Completed</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Accept Dialog */}
      <Dialog open={actionType === 'accept' && !!selectedBooking} onOpenChange={() => { setActionType(null); setSelectedBooking(null); }}>
        <DialogContent className="bg-black-surface border-dark-gray text-text-primary">
          <DialogHeader>
            <DialogTitle>Accept Booking</DialogTitle>
            <DialogDescription className="text-text-secondary">
              Confirm the final price and deposit for this booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Final Price (SLE)</label>
              <Input
                type="number"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                placeholder={String(selectedBooking?.budget || '')}
                className="bg-black-elevated border-dark-gray text-text-primary"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Deposit (SLE)</label>
              <Input
                type="number"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                placeholder="0"
                className="bg-black-elevated border-dark-gray text-text-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-dark-gray text-text-primary" onClick={() => { setActionType(null); setSelectedBooking(null); }}>
              Cancel
            </Button>
            <Button
              className="bg-green hover:bg-green/90 text-black"
              onClick={() => selectedBooking && handleStatusUpdate(selectedBooking.id, 'CONFIRMED', { finalPrice, deposit })}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Confirm Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={actionType === 'decline' && !!selectedBooking} onOpenChange={() => { setActionType(null); setSelectedBooking(null); }}>
        <DialogContent className="bg-black-surface border-dark-gray text-text-primary">
          <DialogHeader>
            <DialogTitle>Decline Booking</DialogTitle>
            <DialogDescription className="text-text-secondary">
              Optionally provide a reason for declining.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="I'm unavailable on this date..."
              className="bg-black-elevated border-dark-gray text-text-primary placeholder:text-text-muted"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-dark-gray text-text-primary" onClick={() => { setActionType(null); setSelectedBooking(null); }}>
              Cancel
            </Button>
            <Button
              className="bg-red hover:bg-red/90 text-black"
              onClick={() => selectedBooking && handleStatusUpdate(selectedBooking.id, 'CANCELLED')}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Negotiate Dialog */}
      <Dialog open={actionType === 'negotiate' && !!selectedBooking} onOpenChange={() => { setActionType(null); setSelectedBooking(null); }}>
        <DialogContent className="bg-black-surface border-dark-gray text-text-primary">
          <DialogHeader>
            <DialogTitle>Negotiate Booking</DialogTitle>
            <DialogDescription className="text-text-secondary">
              Propose a counter offer to the client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Counter Offer (SLE)</label>
              <Input
                type="number"
                value={counterOffer}
                onChange={(e) => setCounterOffer(e.target.value)}
                placeholder={String(selectedBooking?.budget || '')}
                className="bg-black-elevated border-dark-gray text-text-primary"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Note to Client</label>
              <Textarea
                value={counterNote}
                onChange={(e) => setCounterNote(e.target.value)}
                placeholder="I'd be happy to do this for a slightly higher fee because..."
                className="bg-black-elevated border-dark-gray text-text-primary placeholder:text-text-muted"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-dark-gray text-text-primary" onClick={() => { setActionType(null); setSelectedBooking(null); }}>
              Cancel
            </Button>
            <Button
              className="bg-purple hover:bg-purple/90 text-white"
              onClick={() => selectedBooking && handleStatusUpdate(selectedBooking.id, 'NEGOTIATING', { finalPrice: counterOffer })}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Send Counter Offer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
