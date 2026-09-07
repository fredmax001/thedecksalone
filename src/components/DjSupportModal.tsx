import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  CheckCircle2,
  X,
  UploadCloud,
  Loader2,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { getAvatarImageUrl } from '@/lib/utils';

interface DjSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dj: {
    id: string;
    stageName: string;
    avatar?: string;
  };
  onSuccess?: () => void;
}

export function DjSupportModal({ isOpen, onClose, dj, onSuccess }: DjSupportModalProps) {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [amount, setAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    toast.success('Payment receipt screenshot attached!');
  };

  const handleSupport = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to support this DJ.');
      navigate('/login');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('amount', String(parsedAmount));
      if (paymentReference) formData.append('paymentReference', paymentReference);
      if (message) formData.append('message', message);
      if (selectedFile) formData.append('proof', selectedFile);

      const res = await api.post(`/djs/${dj.id}/support`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        toast.success(`🙏 Thank you for supporting ${dj.stageName}!`, {
          description: 'Your support request has been sent to the DJ.',
        });
        if (onSuccess) onSuccess();
        onClose();
        setAmount('');
        setPaymentReference('');
        setMessage('');
        setSelectedFile(null);
      }
    } catch (err: any) {
      const errorMsg = getApiErrorMessage(err, 'Support request failed.');
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
            className="btn-press-subtle absolute top-5 right-5 p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-text-muted hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-black shrink-0 border border-[#f4e059]/40">
              <img
                src={getAvatarImageUrl(dj.avatar)}
                alt={dj.stageName}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 right-0 p-0.5 bg-[#f4e059] rounded-tl text-black">
                <Heart className="w-3 h-3" />
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-[#f4e059] bg-[#f4e059]/10 px-2 py-0.5 rounded border border-[#f4e059]/30">
                SUPPORT
              </span>
              <h3 className="font-display text-xl font-bold uppercase tracking-tight text-white mt-1">
                Support {dj.stageName}
              </h3>
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-5 p-4 rounded-2xl bg-[#f4e059]/10 border border-[#f4e059]/30">
            <label className="text-[10px] uppercase font-bold text-text-muted block mb-2">
              Enter any amount (SLE)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-[#f4e059]">SLE</span>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50"
                className="flex-1 h-12 px-4 rounded-xl bg-black/40 border border-white/10 text-xl font-black text-white placeholder:text-text-muted outline-none focus:border-[#f4e059]"
              />
            </div>
          </div>

          {/* Perks List */}
          <div className="space-y-2 mb-5 p-3.5 rounded-2xl bg-black/40 border border-white/5">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <CheckCircle2 className="w-4 h-4 text-[#f4e059] shrink-0" />
              <span>100% of your support goes directly to <strong>{dj.stageName}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Leave an optional message of encouragement</span>
            </div>
          </div>

          {/* Payment Steps */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3 mb-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-white">
              <PhoneCall className="w-3.5 h-3.5 text-[#f4e059]" />
              <span>Payment Details (Orange Money / Afrimoney):</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Send <strong>SLE {amount || 'any amount'}</strong> via Orange Money or Afrimoney to <strong>+232 72 011156</strong> or the DJ's official number, then attach your screenshot or enter transaction ID below:
            </p>

            <div className="space-y-2 pt-1">
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Transaction ID / Sender Phone Number (Optional)"
                className="w-full h-10 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder:text-text-muted outline-none focus:border-[#f4e059]"
              />

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Leave a message for the DJ (Optional)"
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder:text-text-muted outline-none focus:border-[#f4e059] resize-none"
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
              onClick={handleSupport}
              className="btn-press flex-1 py-3 px-4 rounded-full bg-[#f4e059] hover:brightness-110 disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-[#f4e059]/20 flex items-center justify-center gap-2 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" /> Processing...
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4" /> Send Support {amount ? `(SLE ${amount})` : ''}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default DjSupportModal;
