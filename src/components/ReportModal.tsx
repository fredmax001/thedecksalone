import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, X, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiErrors';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId?: string;
  mixId?: string;
  eventId?: string;
  commentId?: string;
  itemTitle?: string;
}

export default function ReportModal({
  isOpen,
  onClose,
  targetUserId,
  mixId,
  eventId,
  commentId,
  itemTitle,
}: ReportModalProps) {
  const [reason, setReason] = useState<string>('terms_violation');
  const [details, setDetails] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (details.trim().length < 10) {
      setError('Please enter at least 10 characters explaining the violation.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/reports', {
        targetUserId,
        mixId,
        eventId,
        commentId,
        reason,
        details,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setDetails('');
        onClose();
      }, 2500);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to submit report. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-black-surface border border-red/30 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(239,68,68,0.2)] z-10 text-white"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red/20 border border-red/40 flex items-center justify-center text-red shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold uppercase tracking-tight text-white">
                Report Violation
              </h3>
              <p className="text-xs text-text-muted">
                {itemTitle ? `Reporting: "${itemTitle}"` : 'Report Terms & Privacy Policy Violation'}
              </p>
            </div>
          </div>

          {success ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 mx-auto flex items-center justify-center">
                <CheckCircle size={28} />
              </div>
              <h4 className="font-bold text-white text-base">Report Submitted</h4>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Thank you for helping keep Deck Salone safe. An urgent Admin Alert has been dispatched to our compliance team.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red/10 border border-red/30 text-red text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-white/70 mb-1">
                  Violation Category
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-red focus:outline-none"
                >
                  <option value="terms_violation">Terms of Service Violation</option>
                  <option value="privacy_violation">Privacy Policy & Data Violation</option>
                  <option value="copyright_infringement">Copyright & IP Infringement (Copyright Act 2011)</option>
                  <option value="fraud">Scam, Payment Fraud & Ticket Counterfeiting</option>
                  <option value="hate_speech">Hate Speech & Cyberstalking (Cyber Crimes Act 2021)</option>
                  <option value="harassment">Harassment, Abuse & Threats</option>
                  <option value="illegal_content">Explicit or Illegal Content</option>
                  <option value="other">Other Violation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-white/70 mb-1">
                  Explanation / Evidence Details
                </label>
                <textarea
                  rows={4}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Please describe the violation, timestamp, or details clearly..."
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-white/30 focus:border-red focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-red hover:bg-red/90 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] disabled:opacity-50 flex items-center gap-2"
                >
                  <Flag size={14} />
                  <span>{loading ? 'Submitting Alert...' : 'Submit Report'}</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
