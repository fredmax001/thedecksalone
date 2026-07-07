import { useState, useEffect } from 'react';
import {
  Wallet,
  Loader2,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Download,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Payment {
  id: string;
  amount: number;
  status: string;
  type: string;
  createdAt: string;
  booking?: { eventType: string; eventDate: string };
}



export default function Earnings() {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const isDj = user?.role === 'DJ';

  useEffect(() => {
    if (!isDj) {
      setLoading(false);
      return;
    }

    const fetchPayments = async () => {
      try {
        const res = await api.get('/dashboard');
        if (res.data.success) {
          setPayments(res.data.data.payments || []);
        }
      } catch (err) {
        console.error('Failed to load earnings', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [isDj]);

  const totalEarnings = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingPayout = payments.filter((p) => p.status === 'PENDING').reduce((sum, p) => sum + (p.amount || 0), 0);

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
    if (p.status !== 'COMPLETED') return; // Only count completed earnings in chart if needed, or all. We'll count all for now to match old behavior but typically only completed.
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
            Earnings
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Track your income, payouts, and financial performance.
          </p>
        </div>
      </div>

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
              <ArrowUpRight className="w-4 h-4 text-blue" />
              <span className="text-xs text-text-secondary">Next Payout</span>
            </div>
            <p className="text-2xl font-bold text-text-primary font-display">Jul 1</p>
          </CardContent>
        </Card>
      </div>

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
                <Bar dataKey="earnings" fill="#D4A24A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card className="bg-black-surface border-dark-gray">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-text-primary">Recent Transactions</CardTitle>
          <Button variant="outline" size="sm" className="border-dark-gray text-text-primary">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary mb-2">No transactions yet</p>
              <p className="text-sm text-text-muted">
                Completed bookings will appear here as payments.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-black-elevated"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {payment.booking?.eventType || 'Booking'} Payment
                    </p>
                    <p className="text-xs text-text-secondary">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gold">SLE {payment.amount.toLocaleString()}</p>
                    <Badge
                      className={cn(
                        'border-0 text-xs',
                        payment.status === 'COMPLETED' ? 'bg-green/10 text-green' : 'bg-yellow-500/10 text-yellow-500'
                      )}
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

      {/* Payout Settings */}
      <Card className="bg-black-surface border-dark-gray">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-text-primary">Payout Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-text-secondary mb-4">
              Payout methods and scheduling will be configurable here.
            </p>
            <Button variant="outline" className="border-dark-gray text-text-primary">
              Configure Payout Method
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
