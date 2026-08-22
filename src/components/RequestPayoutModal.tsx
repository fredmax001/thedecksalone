import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Smartphone,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/api';

interface RequestPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  payoutMethod: any;
  onSuccess: () => void;
  onConfigureMethod: () => void;
}

export function RequestPayoutModal({
  isOpen,
  onClose,
  availableBalance,
  payoutMethod,
  onSuccess,
  onConfigureMethod,
}: RequestPayoutModalProps) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const isMethodConfigured = !!payoutMethod && !!payoutMethod.accountNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isMethodConfigured) {
      toast.error('Please configure your payout method first');
      onConfigureMethod();
      return;
    }

    if (numAmount < 50) {
      toast.error('Minimum payout amount is SLE 50');
      return;
    }

    if (numAmount > availableBalance) {
      toast.error(`Withdrawal amount exceeds your available balance of SLE ${availableBalance.toLocaleString()}`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/djs/me/payout-requests', {
        amount: numAmount,
        notes: notes.trim() || undefined,
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Payout request submitted successfully! 💸');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit payout request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        <motion.div
          className="relative z-10 w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl overflow-hidden"
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display uppercase tracking-wide">
                Request Payout
              </h2>
              <p className="text-xs text-text-muted">
                Transfer your earnings to your mobile money or bank
              </p>
            </div>
          </div>

          {/* Balance Preview */}
          <div className="p-4 rounded-xl bg-black-surface border border-dark-gray mb-5">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>Available for Withdrawal</span>
              <span className="text-[11px] text-gold font-semibold">SLE Currency</span>
            </div>
            <p className="text-2xl font-bold text-white font-display">
              SLE {availableBalance.toLocaleString()}
            </p>
          </div>

          {/* Destination Method Info */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Payout Destination
              </span>
              <button
                type="button"
                onClick={onConfigureMethod}
                className="text-xs text-gold hover:underline font-semibold"
              >
                {isMethodConfigured ? 'Change' : 'Configure'}
              </button>
            </div>

            {isMethodConfigured ? (
              <div className="flex items-center gap-2.5 text-xs text-white">
                {payoutMethod.type === 'BANK_TRANSFER' ? (
                  <Building2 className="w-4 h-4 text-gold shrink-0" />
                ) : (
                  <Smartphone className="w-4 h-4 text-[#FF8533] shrink-0" />
                )}
                <div>
                  <p className="font-semibold">{payoutMethod.accountName}</p>
                  <p className="text-text-muted font-mono text-[11px]">
                    {payoutMethod.bankName ? `${payoutMethod.bankName} • ` : `${payoutMethod.type} • `}
                    {payoutMethod.accountNumber}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-400 flex items-center gap-1.5 mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> No payout method configured yet.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Amount to Withdraw (SLE)
                </Label>
                <button
                  type="button"
                  onClick={() => setAmount(String(availableBalance))}
                  className="text-xs text-gold hover:underline"
                >
                  Max: SLE {availableBalance.toLocaleString()}
                </button>
              </div>
              <Input
                required
                type="number"
                min="50"
                max={availableBalance}
                step="1"
                placeholder="e.g. 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-black-elevated border-dark-gray text-white text-base font-semibold"
              />
              <p className="text-[11px] text-text-muted mt-1">Minimum payout is SLE 50.</p>
            </div>

            <div>
              <Label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5 block">
                Notes (Optional)
              </Label>
              <Textarea
                placeholder="e.g. DJ gig payment for Radisson Blu wedding"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-black-elevated border-dark-gray text-white text-xs h-20 placeholder:text-text-muted"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-dark-gray text-text-secondary hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !isMethodConfigured || numAmount <= 0}
                className="bg-gold-gradient text-black font-bold hover:opacity-90 min-w-[140px]"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowUpRight className="w-4 h-4 mr-2" />}
                Withdraw SLE
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
