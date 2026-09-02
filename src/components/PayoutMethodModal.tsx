import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Smartphone,
  Building2,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiErrors';

export const SL_BANKS = [
  'Rokel Commercial Bank',
  'Sierra Leone Commercial Bank (SLCB)',
  'Ecobank Sierra Leone',
  'United Bank for Africa (UBA)',
  'Zenith Bank Sierra Leone',
  'Guaranty Trust Bank (GTBank)',
  'Standard Chartered Bank',
  'Vista Bank Sierra Leone',
  'Union Trust Bank (UTB)',
  'Keystone Bank',
];

interface PayoutMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMethod?: any;
  onSuccess: () => void;
}

export function PayoutMethodModal({
  isOpen,
  onClose,
  currentMethod,
  onSuccess,
}: PayoutMethodModalProps) {
  const [methodType, setMethodType] = useState<'ORANGE_MONEY' | 'AFRIMONEY' | 'BANK_TRANSFER'>('ORANGE_MONEY');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('Rokel Commercial Bank');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentMethod) {
      setMethodType(currentMethod.type || 'ORANGE_MONEY');
      setAccountName(currentMethod.accountName || '');
      setAccountNumber(currentMethod.accountNumber || '');
      setBankName(currentMethod.bankName || 'Rokel Commercial Bank');
    }
  }, [currentMethod, isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) {
      toast.error('Please enter the account / beneficiary name');
      return;
    }
    if (!accountNumber.trim()) {
      toast.error('Please enter the mobile money number or bank account number');
      return;
    }

    try {
      setSaving(true);
      const res = await api.put('/djs/me/payout-method', {
        type: methodType,
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        bankName: methodType === 'BANK_TRANSFER' ? bankName : undefined,
      });

      if (res.data.success) {
        toast.success('Payout method saved successfully! 💰');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to save payout method'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

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
          className="relative z-10 w-full max-w-lg bg-[#121212] border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
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
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display uppercase tracking-wide">
                Configure Payout Method
              </h2>
              <p className="text-xs text-text-muted">
                Receive DJ gig payouts & fan subscriber earnings directly
              </p>
            </div>
          </div>

          {/* Payment Type Tabs */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <button
              type="button"
              onClick={() => setMethodType('ORANGE_MONEY')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                methodType === 'ORANGE_MONEY'
                  ? 'bg-[#FF6600]/15 border-[#FF6600] text-[#FF8533] shadow-[0_0_12px_rgba(255,102,0,0.2)]'
                  : 'bg-white/[0.03] border-white/10 text-text-muted hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4 text-[#FF6600]" />
              <span>Orange Money</span>
            </button>

            <button
              type="button"
              onClick={() => setMethodType('AFRIMONEY')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                methodType === 'AFRIMONEY'
                  ? 'bg-purple/15 border-purple text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                  : 'bg-white/[0.03] border-white/10 text-text-muted hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4 text-purple-400" />
              <span>Afrimoney</span>
            </button>

            <button
              type="button"
              onClick={() => setMethodType('BANK_TRANSFER')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                methodType === 'BANK_TRANSFER'
                  ? 'bg-gold/15 border-gold text-gold shadow-[0_0_12px_rgba(244,224,89,0.2)]'
                  : 'bg-white/[0.03] border-white/10 text-text-muted hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4 text-gold" />
              <span>SL Bank</span>
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5 block">
                Account / Beneficiary Name
              </Label>
              <Input
                required
                type="text"
                placeholder="e.g. Mohamed Sesay / Fredrick Max"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="bg-black-elevated border-dark-gray text-white text-sm"
              />
              <p className="text-[11px] text-text-muted mt-1">
                Must match the registered legal name on your account.
              </p>
            </div>

            {methodType === 'BANK_TRANSFER' && (
              <div>
                <Label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5 block">
                  Select Sierra Leone Bank
                </Label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-[#181818] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:border-gold focus:outline-none"
                >
                  {SL_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5 block">
                {methodType === 'BANK_TRANSFER' ? 'Bank Account Number / BBAN' : 'Mobile Money Phone Number'}
              </Label>
              <Input
                required
                type="text"
                placeholder={
                  methodType === 'ORANGE_MONEY'
                    ? '076 123 456 / +232 76...'
                    : methodType === 'AFRIMONEY'
                    ? '088 123 456 / 030...'
                    : 'Account or BBAN Number'
                }
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="bg-black-elevated border-dark-gray text-white text-sm"
              />
            </div>

            <div className="p-3 rounded-xl bg-gold/5 border border-gold/15 flex items-start gap-2.5 text-xs text-text-secondary">
              <ShieldCheck className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <span>
                Deck Salone secures your payment details with 256-bit encryption. Payouts are delivered automatically in Sierra Leone Leones (SLE).
              </span>
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
                disabled={saving}
                className="bg-gold-gradient text-black font-bold hover:opacity-90 min-w-[120px]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Save Method
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
