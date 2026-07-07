import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Search,
  Star,
  Clock,
  MapPin,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Music,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  useUserBookings,
  useRespondToCounterOffer,
  type UserBooking,
} from '@/hooks/useUserDashboard';
import api from '@/lib/api';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  NEGOTIATING: 'bg-purple/10 text-purple border-purple/20',
  CONFIRMED: 'bg-green/10 text-green border-green/20',
  DEPOSIT_PAID: 'bg-blue/10 text-blue border-blue/20',
  COMPLETED: 'bg-gold/10 text-gold border-gold/20',
  CANCELLED: 'bg-red/10 text-red border-red/20',
  REFUNDED: 'bg-red/10 text-red border-red/20',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  NEGOTIATING: 'Under Negotiation',
  CONFIRMED: 'Confirmed',
  DEPOSIT_PAID: 'Deposit Paid',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export default function MyBookings() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<UserBooking | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const { data: bookings = [], isLoading, error, refetch } = useUserBookings(filter);
  const respondToCounter = useRespondToCounterOffer();

  const filteredBookings = bookings.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.eventType.toLowerCase().includes(q) ||
      b.eventLocation.toLowerCase().includes(q) ||
      b.dj?.stageName?.toLowerCase().includes(q)
    );
  });

  const handleAcceptCounter = async (bookingId: string, finalPrice?: number) => {
    await respondToCounter.mutateAsync({ bookingId, accept: true, finalPrice });
    refetch();
    setExpandedId(null);
  };

  const handleDeclineCounter = async (bookingId: string) => {
    await respondToCounter.mutateAsync({ bookingId, accept: false });
    refetch();
    setExpandedId(null);
  };

  const submitReview = async () => {
    if (!selectedBooking || reviewRating === 0) return;
    setReviewSubmitting(true);
    try {
      await api.post(`/bookings/${selectedBooking.id}/review`, {
        rating: reviewRating,
        review: reviewText,
      });
      setShowReviewDialog(false);
      setReviewRating(0);
      setReviewText('');
      refetch();
    } finally {
      setReviewSubmitting(false);
    }
  };

  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;
  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'DEPOSIT_PAID').length;
  const completedCount = bookings.filter((b) => b.status === 'COMPLETED').length;

  if (isLoading) {
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
            My Bookings
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Track your booking requests and manage your events.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red/10 border border-red/30 text-red text-sm">
          Failed to load bookings. Please try again.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black-elevated border-dark-gray">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-text-primary">{bookings.length}</p>
            <p className="text-xs text-text-muted mt-1">Total Requests</p>
          </CardContent>
        </Card>
        <Card className="bg-black-elevated border-dark-gray">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
            <p className="text-xs text-text-muted mt-1">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-black-elevated border-dark-gray">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green">{confirmedCount}</p>
            <p className="text-xs text-text-muted mt-1">Confirmed</p>
          </CardContent>
        </Card>
        <Card className="bg-black-elevated border-dark-gray">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-gold">{completedCount}</p>
            <p className="text-xs text-text-muted mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="Search by event type, location, or DJ..."
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
            <SelectItem value="DEPOSIT_PAID">Deposit Paid</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">No bookings found.</p>
          <Button
            variant="outline"
            className="mt-4 border-gold/30 text-gold hover:bg-gold/10"
            onClick={() => navigate('/discover')}
          >
            Discover DJs
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking, idx) => {
            const isExpanded = expandedId === booking.id;
            const canReview = booking.status === 'COMPLETED' && !booking.rating;

            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="bg-black-elevated border-dark-gray hover:border-gold/20 transition-colors">
                  <CardContent className="p-4">
                    {/* Top Row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-gold/20">
                          <AvatarImage src={booking.dj?.avatar} />
                          <AvatarFallback className="bg-gold/10 text-gold text-xs">
                            <Music className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-text-primary">{booking.eventType}</p>
                          <p className="text-xs text-text-muted">with {booking.dj?.stageName || 'DJ'}</p>
                        </div>
                      </div>
                      <Badge className={`${statusColors[booking.status]} border`}>
                        {statusLabels[booking.status]}
                      </Badge>
                    </div>

                    {/* Details Row */}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(booking.eventDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {booking.eventLocation}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {booking.duration}h
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        ${booking.finalPrice || booking.budget}
                      </span>
                    </div>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-4 pt-4 border-t border-dark-gray space-y-3"
                      >
                        {booking.notes && (
                          <div>
                            <p className="text-xs text-text-muted mb-1">Your Notes</p>
                            <p className="text-sm text-text-secondary">{booking.notes}</p>
                          </div>
                        )}
                        {booking.requirements && (
                          <div>
                            <p className="text-xs text-text-muted mb-1">Requirements</p>
                            <p className="text-sm text-text-secondary">{booking.requirements}</p>
                          </div>
                        )}

                        {/* Counter Offer Actions */}
                        {booking.status === 'NEGOTIATING' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green/20 text-green hover:bg-green/30 border border-green/30"
                              onClick={() => handleAcceptCounter(booking.id, booking.finalPrice)}
                              disabled={respondToCounter.isPending}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red/30 text-red hover:bg-red/10"
                              onClick={() => handleDeclineCounter(booking.id)}
                              disabled={respondToCounter.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}

                        {/* Review Action */}
                        {canReview && (
                          <Button
                            size="sm"
                            className="bg-gold/20 text-gold hover:bg-gold/30 border border-gold/30"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowReviewDialog(true);
                            }}
                          >
                            <Star className="w-4 h-4 mr-1" />
                            Leave Review
                          </Button>
                        )}

                        {/* Message DJ */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-dark-gray text-text-secondary hover:text-text-primary"
                          onClick={() =>
                            navigate('/user/messages', { state: { contactUserId: booking.dj?.id } })
                          }
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Message DJ
                        </Button>
                      </motion.div>
                    )}

                    {/* Expand Toggle */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                      className="flex items-center gap-1 mt-3 text-xs text-text-muted hover:text-text-secondary transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> View details
                        </>
                      )}
                    </button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="bg-black-surface border-dark-gray text-text-primary">
          <DialogHeader>
            <DialogTitle className="text-text-primary">Rate Your Experience</DialogTitle>
            <DialogDescription className="text-text-secondary">
              How was {selectedBooking?.dj?.stageName || 'the DJ'}? Leave a review for your booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= reviewRating ? 'text-gold fill-gold' : 'text-text-muted'
                    }`}
                  />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Share your experience..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="bg-black-elevated border-dark-gray text-text-primary placeholder:text-text-muted"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
              className="border-dark-gray text-text-secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              disabled={reviewRating === 0 || reviewSubmitting}
              className="bg-gold text-black hover:bg-gold-light"
            >
              {reviewSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
