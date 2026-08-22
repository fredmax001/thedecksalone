import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  Loader2,
  Search,
  Sparkles,
  ExternalLink,
  Crown,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface FanSubscriber {
  id: string;
  djId: string;
  userId: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'DENIED';
  amount: number;
  paymentReference?: string;
  paymentProofUrl?: string;
  expiresAt: string;
  createdAt: string;
  user?: {
    id: string;
    name?: string;
    username: string;
    avatar?: string;
    email: string;
    phone?: string;
  };
}

export default function FanSubscriptions() {
  const { user } = useAuthStore();
  const isDj = user?.role === 'DJ';

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<{
    subscriptions: FanSubscriber[];
    pending: FanSubscriber[];
    active: FanSubscriber[];
    expiredOrDenied: FanSubscriber[];
    stats: {
      pendingCount: number;
      activeCount: number;
      totalRevenue: number;
      subscriptionPrice: number;
    };
  }>({
    subscriptions: [],
    pending: [],
    active: [],
    expiredOrDenied: [],
    stats: {
      pendingCount: 0,
      activeCount: 0,
      totalRevenue: 0,
      subscriptionPrice: 100,
    },
  });

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/djs/me/fan-subscriptions');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load fan subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDj) {
      fetchSubscriptions();
    } else {
      setLoading(false);
    }
  }, [isDj]);

  const handleApprove = async (subId: string) => {
    try {
      setActionLoadingId(subId);
      const res = await api.put(`/djs/me/fan-subscriptions/${subId}/approve`);
      if (res.data.success) {
        toast.success(res.data.message || 'Fan subscription approved! 🎉');
        fetchSubscriptions();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve subscription');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeny = async (subId: string) => {
    try {
      setActionLoadingId(subId);
      const res = await api.put(`/djs/me/fan-subscriptions/${subId}/deny`);
      if (res.data.success) {
        toast.info(res.data.message || 'Subscription request denied');
        fetchSubscriptions();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to deny subscription');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isDj) {
    return (
      <div className="p-8 text-center text-text-muted">
        <p>This page is available only for DJs.</p>
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

  const currentList =
    activeTab === 'pending'
      ? data.pending
      : activeTab === 'active'
      ? data.active
      : data.expiredOrDenied;

  const filteredList = currentList.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = s.user?.name?.toLowerCase() || '';
    const username = s.user?.username?.toLowerCase() || '';
    const email = s.user?.email?.toLowerCase() || '';
    const ref = s.paymentReference?.toLowerCase() || '';
    return name.includes(q) || username.includes(q) || email.includes(q) || ref.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide flex items-center gap-2.5">
            <Crown className="w-7 h-7 text-gold" />
            Fan Subscriptions & VIP Club
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Review incoming fan subscriber payments, approve VIP club passes & track subscriber revenue
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-text-secondary">Pending Approval</span>
            </div>
            <p className="text-2xl font-bold text-yellow-500 font-display">
              {data.stats.pendingCount}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Users className="w-4 h-4 text-green" />
              <span className="text-xs text-text-secondary">Active VIP Fans</span>
            </div>
            <p className="text-2xl font-bold text-green font-display">
              {data.stats.activeCount}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Wallet className="w-4 h-4 text-gold" />
              <span className="text-xs text-text-secondary">Monthly Fan Revenue</span>
            </div>
            <p className="text-2xl font-bold text-gold font-display">
              SLE {data.stats.totalRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-text-secondary">Monthly Pass Price</span>
            </div>
            <p className="text-2xl font-bold text-text-primary font-display">
              SLE {data.stats.subscriptionPrice.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-black-surface border border-dark-gray w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'pending'
                ? 'bg-yellow-500 text-black shadow'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Requests ({data.stats.pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'active'
                ? 'bg-green text-black shadow'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active Subscribers ({data.stats.activeCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-gold text-black shadow'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            History ({data.expiredOrDenied.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="Search subscribers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-black-elevated border-dark-gray text-xs text-text-primary placeholder:text-text-muted h-9"
          />
        </div>
      </div>

      {/* Subscriber List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <Card className="bg-black-surface border-dark-gray">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-60" />
              <p className="text-text-secondary font-medium">
                {activeTab === 'pending'
                  ? 'No pending fan subscription requests.'
                  : activeTab === 'active'
                  ? 'No active fan subscribers yet.'
                  : 'No past subscription history.'}
              </p>
              <p className="text-xs text-text-muted mt-1">
                When fans subscribe to your VIP pass with payment reference/proof, they appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredList.map((sub) => {
            const isLoading = actionLoadingId === sub.id;
            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Card className="bg-black-surface border-dark-gray hover:border-gold/30 transition-all">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* User profile & details */}
                      <div className="flex items-center gap-3.5">
                        <img
                          src={sub.user?.avatar || '/default-avatar.jpg'}
                          alt={sub.user?.name || sub.user?.username || 'Fan'}
                          className="w-12 h-12 rounded-full object-cover border border-white/10 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-avatar.jpg';
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white truncate">
                              {sub.user?.name || sub.user?.username || 'Fan Member'}
                            </p>
                            <Badge
                              className={`text-[10px] uppercase font-semibold ${
                                sub.status === 'ACTIVE'
                                  ? 'bg-green/20 text-green border-green/30'
                                  : sub.status === 'PENDING'
                                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                  : 'bg-red-500/20 text-red-300 border-red-500/30'
                              }`}
                            >
                              {sub.status}
                            </Badge>
                          </div>

                          <p className="text-xs text-text-secondary">
                            @{sub.user?.username} • {sub.user?.email}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted mt-1">
                            <span>Amount: <strong className="text-gold">SLE {sub.amount || 100}</strong></span>
                            {sub.paymentReference && (
                              <span>Ref: <strong className="text-white font-mono">{sub.paymentReference}</strong></span>
                            )}
                            <span>Requested: {new Date(sub.createdAt).toLocaleDateString()}</span>
                            {sub.status === 'ACTIVE' && (
                              <span>Expires: {new Date(sub.expiresAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {sub.paymentProofUrl && (
                          <a
                            href={sub.paymentProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
                            title="View Payment Proof Receipt"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        {sub.status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              disabled={isLoading}
                              onClick={() => handleApprove(sub.id)}
                              className="bg-green hover:bg-green/90 text-black font-bold text-xs"
                            >
                              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                              Approve Access
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isLoading}
                              onClick={() => handleDeny(sub.id)}
                              className="border-red/40 text-red hover:bg-red/10 text-xs"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Deny
                            </Button>
                          </>
                        )}

                        {sub.status === 'ACTIVE' && (
                          <Badge variant="outline" className="text-green border-green/30 py-1 text-xs">
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Active VIP
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
