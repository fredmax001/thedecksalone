import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface EmbedMixModalProps {
  isOpen: boolean;
  onClose: () => void;
  mix: {
    id: string;
    title: string;
    dj: string;
    cover: string;
  };
}

export function EmbedMixModal({ isOpen, onClose, mix }: EmbedMixModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const embedUrl = `${window.location.origin}/embed/mix/${mix.id}`;
  const iframeCode = `<iframe width="100%" height="180" src="${embedUrl}" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    toast.success('Embed code copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg rounded-3xl bg-[#111] border border-white/10 shadow-2xl overflow-hidden p-6 text-text-primary"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-text-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
              <Code2 className="w-6 h-6 text-[#f4e059]" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#f4e059]">
                Shareable Audio Widget
              </span>
              <h3 className="font-display text-lg font-bold uppercase tracking-tight text-white mt-0.5">
                Embed Mix Player
              </h3>
            </div>
          </div>

          <p className="text-xs text-text-secondary mb-4 leading-relaxed">
            Copy and paste this HTML snippet into your website, blog, or article to embed a live audio player for <strong>"{mix.title}"</strong>.
          </p>

          {/* Code Container */}
          <div className="relative rounded-2xl bg-black/80 border border-white/10 p-4 font-mono text-xs text-text-secondary break-all mb-5">
            <code>{iframeCode}</code>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 py-3 px-4 rounded-full bg-[#f4e059] hover:brightness-110 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-[#f4e059]/20 flex items-center justify-center gap-2 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" /> Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy Embed Code
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white uppercase"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default EmbedMixModal;
