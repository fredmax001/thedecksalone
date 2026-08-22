import { useState, useEffect } from 'react';
import {
  Wallet,
  Loader2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle2,
  AlertCircle,
  Plus,
  History,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FeatureLock } from '@/components/FeatureLock';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PayoutMethodModal } from '@/components/PayoutMethodModal';
import { RequestPayoutModal } from '@/components/RequestPayoutModal';

interface Payment {
  id: string;
  amount: number;
  status: string;
  type: string;
  createdAt: string;
  booking?: { eventType: string; eventDate: string };
}

interface PayoutRequestItem {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSED' | 'REJECTED';
  payoutMethod: any;
  notes?: string;
  createdAt: string;
  processedAt?: string;
}

export default function Earnings() {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payoutMethod, setPayoutMethod] = useState<any>(null);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequestItem[]>([]);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const isDj = user?.role === 'DJ';

  const loadData = async () => {
    try {
      const [dashRes, methodRes, requestsRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/djs/me/payout-method').catch(() => ({ data: { success: false } })),
        api.get('/djs/me/payout-requests').catch(() => ({ data: { success: false } })),
      ]);

      if (dashRes.data.success) {
        setPayments(dashRes.data.data.payments || []);
      }
      if (methodRes.data.success) {
        setPayoutMethod(methodRes.data.data);
      }
      if (requestsRes.data.success) {
        setPayoutRequests(requestsRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load earnings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isDj) {
      setLoading(false);
      return;
    }
    loadData();
  }, [isDj]);

  const totalEarnings = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingPayout = payments.filter((p) => p.status === 'PENDING').reduce((sum, p) => sum + (p.amount || 0), 0);
  const completedEarnings = payments.filter((p) => p.status === 'COMPLETED').reduce((sum, p) => sum + (p.amount || 0), 0);

  // Total amount already requested or processed
  const requestedTotal = payoutRequests
    .filter((r) => r.status === 'PENDING' || r.status === 'PROCESSED')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const availableBalance = Math.max(0, (user?.djProfile?.isPro ? completedEarnings : totalEarnings) - requestedTotal);

  // Generate real monthly earnings chart data (last 6 months)
  const realMonthlyEarnings = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return {
      month: d.toLocaleString('en-US', { month: 'short' }),
      earnings: 0,
      year: d.getFullYear(),
      monthNum: d.getMonth(),
    };
  });

  payments.forEach((p) => {
    if (p.status !== 'COMPLETED') return;
    const pDate = new Date(p.createdAt);
    const match = realMonthlyEarnings.find(m => m.monthNum === pDate.getMonth() && m.year === pDate.getFullYear());
    if (match) {
      match.earnings += (p.amount || 0);
    }
  });

  const thisMonthEarnings = realMonthlyEarnings[5].earnings;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Earnings & Payouts
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Track revenue from gig bookings, VIP fan passes & request balance withdrawals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsRequestModalOpen(true)}
            className="bg-gold-gradient text-black font-bold hover:opacity-90 text-xs px-4 py-2"
          >
            <ArrowUpRight className="w-4 h-4 mr-1.5" />
            Request Payout
          </Button>
        </div>
      </div>

      <FeatureLock feature="Earnings Tracking" requiredTier="pro">
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-black-surface border-dark-gray">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-gold" />
                  <span className="text-xs text-text-secondary">Total Earnings</span>
                </div>
                <p className="text-2xl font-bold text-text-primary font-display">SLE {totalEarnings.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-black-surface border-dark-gray">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green" />
                  <span className="text-xs text-text-secondary">This Month</span>
                </div>
                <p className="text-2xl font-bold text-text-primary font-display">SLE {thisMonthEarnings.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-black-surface border-dark-gray">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-text-secondary">Pending Payout</span>
                </div>
                <p className="text-2xl font-bold text-text-primary font-display">SLE {pendingPayout.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-black-surface border-dark-gray">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-text-secondary">Available to Withdraw</span>
                </div>
                <p className="text-2xl font-bold text-emerald-400 font-display">SLE {availableBalance.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Payout Method & Withdrawal Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payout Method Card */}
            <Card className="bg-black-surface border-dark-gray">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-text-primary flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gold" />
                  Active Payout Destination
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPayoutModalOpen(true)}
                  className="border-dark-gray text-gold hover:text-white text-xs h-8"
                >
                  {payoutMethod ? 'Edit' : 'Configure'}
                </Button>
              </CardHeader>
              <CardContent>
                {payoutMethod && payoutMethod.accountNumber ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-black-elevated border border-white/10 flex items-center gap-3">
                      {payoutMethod.type === 'BANK_TRANSFER' ? (
                        <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#FF6600]/10 border border-[#FF6600]/20 flex items-center justify-center text-[#FF8533] shrink-0">
                          <Smartphone className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{payoutMethod.accountName}</p>
                        <p className="text-xs text-text-muted font-mono">
                          {payoutMethod.bankName ? `${payoutMethod.bankName} • ` : `${payoutMethod.type} • `}
                          {payoutMethod.accountNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-green">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready to receive automatic & manual withdrawals</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-xs text-text-secondary mb-3">
                      No payout method configured yet. Add your Orange Money, Afrimoney, or Bank account.
                    </p>
                    <Button
                      onClick={() => setIsPayoutModalOpen(true)}
                      className="bg-gold-gradient text-black font-semibold text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Set Up Payout Method
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payout Withdrawal Action Card */}
            <Card className="bg-black-surface border-dark-gray lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-text-primary flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-green" />
                  Instant Withdrawal Request
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col justify-between space-y-4">
                <p className="text-xs text-text-secondary">
                  Request transfer of your balance directly to your configured Sierra Leone mobile money or bank account. Payout requests are verified and disbursed promptly.
                </p>
                <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-black-elevated border border-white/10">
                  <div>
                    <p className="text-[11px] text-text-muted uppercase">Ready for Withdrawal</p>
                    <p className="text-xl font-bold text-emerald-400 font-display">SLE {availableBalance.toLocaleString()}</p>
                  </div>
                  <Button
                    onClick={() => {
                      if (!payoutMethod?.accountNumber) {
                        setIsPayoutModalOpen(true);
                      } else {
                        setIsRequestModalOpen(true);
                      }
                    }}
                    disabled={availableBalance <= 0}
                    className="bg-gold-gradient text-black font-bold hover:opacity-90 text-xs px-5 py-2.5"
                  >
                    <ArrowUpRight className="w-4 h-4 mr-1.5" />
                    Withdraw Available Balance
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payout Requests History */}
          {payoutRequests.length > 0 && (
            <Card className="bg-black-surface border-dark-gray">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-text-primary flex items-center gap-2">
                  <History className="w-4 h-4 text-gold" />
                  Withdrawal Requests History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {payoutRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-black-elevated border border-white/5 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-white">
                          Withdrawal: SLE {req.amount.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {new Date(req.createdAt).toLocaleDateString()} • {req.payoutMethod?.type || 'Payout'} ({req.payoutMethod?.accountNumber || '--'})
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={`text-[10px] uppercase font-semibold ${
                            req.status === 'PROCESSED'
                              ? 'bg-green/20 text-green border-green/30'
                              : req.status === 'PENDING'
                              ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                              : 'bg-red-500/20 text-red-300 border-red-500/30'
                          }`}
                        >
                          {req.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Earnings Chart */}
          <Card className="bg-black-surface border-dark-gray">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-text-primary">Monthly Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={realMonthlyEarnings}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis dataKey="month" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111111',
                        border: '1px solid #2A2A2A',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#F5F5F5',
                      }}
                      formatter={(value: number) => [`SLE ${value.toLocaleString()}`, 'Earnings']}
                    />
                    <Bar dataKey="earnings" fill="#f4e059" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Transactions */}
          <Card className="bg-black-surface border-dark-gray">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-text-primary">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-60" />
                  <p className="text-text-secondary mb-2">No transactions yet</p>
                  <p className="text-sm text-text-muted">
                    Completed bookings and VIP fan passes will appear here as payments.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-black border border-dark-gray"
                    >
                      <div>
                        <p className="font-semibold text-text-primary text-sm">
                          {payment.type === 'BOOKING' && payment.booking
                            ? `Booking: ${payment.booking.eventType}`
                            : 'Payout / VIP Fan Pass'}
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gold text-sm font-display">
                          +SLE {payment.amount.toLocaleString()}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] mt-1 ${
                            payment.status === 'COMPLETED'
                              ? 'text-green border-green/30'
                              : 'text-yellow-500 border-yellow-500/30'
                          }`}
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </FeatureLock>

      {/* Modals */}
      <PayoutMethodModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        currentMethod={payoutMethod}
        onSuccess={loadData}
      />

      <RequestPayoutModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        availableBalance={availableBalance}
        payoutMethod={payoutMethod}
        onSuccess={loadData}
        onConfigureMethod={() => {
          setIsRequestModalOpen(false);
          setIsPayoutModalOpen(true);
        }}
      />
    </div>
  );
}


