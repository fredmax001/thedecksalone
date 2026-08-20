import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Unlock,
  CheckCircle2,
  X,
  UploadCloud,
  Loader2,
  PhoneCall,
  Crown,
  Sparkles,
  Download,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface DjFanSubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  dj: {
    id: string;
    stageName: string;
    avatar?: string;
    subscriptionPrice?: number;
  };
  onSuccess?: () => void;
}

export function DjFanSubscribeModal({
  isOpen,
  onClose,
  dj,
  onSuccess,
}: DjFanSubscribeModalProps) {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [selectedTier, setSelectedTier] = useState<'standard' | 'vip'>('standard');
  const [paymentReference, setPaymentReference] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const standardPrice = dj.subscriptionPrice || 50;
  const vipPrice = 100;
  const currentPrice = selectedTier === 'standard' ? standardPrice : vipPrice;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    toast.success('Payment receipt screenshot attached!');
  };

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to subscribe to this DJ.');
      navigate('/login');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('amount', String(currentPrice));
      formData.append('tier', selectedTier);
      if (paymentReference) formData.append('paymentReference', paymentReference);
      if (selectedFile) formData.append('proof', selectedFile);

      const res = await api.post(`/djs/${dj.id}/subscribe`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        toast.success(`🎉 Subscribed to ${dj.stageName}!`, {
          description: selectedTier === 'vip' 
            ? 'You have unlocked 60 days of VIP streaming & offline downloads.' 
            : 'You have unlocked 30 days of exclusive mixes.',
        });
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Subscription failed.';
      toast.error('Error', { description: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg rounded-3xl bg-[#111] border border-white/10 shadow-2xl overflow-hidden p-6 text-text-primary max-h-[90vh] overflow-y-auto"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-56 h-56 bg-[#f4e059]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-text-muted hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-black shrink-0 border border-[#f4e059]/40">
              <img
                src={dj.avatar || '/dj-avatar.png'}
                alt={dj.stageName}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 right-0 p-0.5 bg-[#f4e059] rounded-tl text-black">
                <Crown className="w-3 h-3" />
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-[#f4e059] bg-[#f4e059]/10 px-2 py-0.5 rounded border border-[#f4e059]/30">
                FAN PASS
              </span>
              <h3 className="font-display text-xl font-bold uppercase tracking-tight text-white mt-1">
                Subscribe to {dj.stageName}
              </h3>
            </div>
          </div>

          {/* Tier Selector Buttons (SLE 50 and SLE 100) */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              onClick={() => setSelectedTier('standard')}
              className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                selectedTier === 'standard'
                  ? 'bg-[#f4e059]/15 border-[#f4e059] shadow-lg shadow-[#f4e059]/10'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-text-muted">Standard Pass</span>
                <span className="font-mono text-sm font-black text-[#f4e059]">SLE {standardPrice}</span>
              </div>
              <p className="text-xs font-bold text-white mt-1">30 Days Streaming</p>
              <span className="text-[10px] text-text-muted block mt-0.5">All exclusive mixes</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTier('vip')}
              className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                selectedTier === 'vip'
                  ? 'bg-[#f4e059]/15 border-[#f4e059] shadow-lg shadow-[#f4e059]/10'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="absolute -top-2 right-3 px-1.5 py-0.2 bg-[#f4e059] text-black text-[9px] font-black uppercase rounded">
                VIP
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-text-muted">VIP Supporter</span>
                <span className="font-mono text-sm font-black text-[#f4e059]">SLE {vipPrice}</span>
              </div>
              <p className="text-xs font-bold text-white mt-1">60 Days + Downloads</p>
              <span className="text-[10px] text-text-muted block mt-0.5">MP3 offline + VIP badge</span>
            </button>
          </div>

          {/* Exclusive Perks List */}
          <div className="space-y-2 mb-5 p-3.5 rounded-2xl bg-black/40 border border-white/5">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <CheckCircle2 className="w-4 h-4 text-[#f4e059] shrink-0" />
              <span>Full access to <strong>exclusive & private mixes</strong> by {dj.stageName}</span>
            </div>
            {selectedTier === 'vip' ? (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Direct 320kbps MP3 Downloads</strong> for offline listening</span>
              </div>
            ) : null}
            {selectedTier === 'vip' ? (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>VIP Fan Badge</strong> on DJ profile and mix comments</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <CheckCircle2 className="w-4 h-4 text-[#f4e059] shrink-0" />
              <span>Direct support to the DJ (100% of revenue paid directly)</span>
            </div>
          </div>

          {/* Payment Steps */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3 mb-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-white">
              <PhoneCall className="w-3.5 h-3.5 text-[#f4e059]" />
              <span>Payment Details (Orange Money / Afrimoney):</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Send <strong>SLE {currentPrice}</strong> via Orange Money or Afrimoney to <strong>+232 72 011156</strong> or the DJ's official number, then attach your screenshot or enter transaction ID below:
            </p>

            <div className="space-y-2 pt-1">
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Transaction ID / Sender Phone Number (Optional)"
                className="w-full h-10 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder:text-text-muted outline-none focus:border-[#f4e059]"
              />

              <label className="flex items-center justify-center gap-2 h-10 px-3.5 rounded-xl bg-white/[0.04] border border-dashed border-white/[0.15] hover:border-[#f4e059] cursor-pointer text-xs text-text-muted hover:text-white transition-colors">
                {selectedFile ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    <span className="truncate max-w-[240px] text-green-400 font-medium">{selectedFile.name}</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5 text-[#f4e059]" /> Upload Payment Screenshot
                  </>
                )}
                <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              disabled={submitting}
              onClick={handleSubscribe}
              className="flex-1 py-3 px-4 rounded-full bg-[#f4e059] hover:brightness-110 disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-[#f4e059]/20 flex items-center justify-center gap-2 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" /> Processing...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" /> Unlock & Subscribe (SLE {currentPrice})
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white uppercase"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default DjFanSubscribeModal;
