import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  Link as LinkIcon,
  Check,
  Facebook,
  Twitter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;

  className?: string;
  size?: "sm" | "md" | "lg";
}

const shareIcons = {
  copy: LinkIcon,
  whatsapp: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.134 1.585 5.938L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  ),
  facebook: Facebook,
  twitter: Twitter,
};

export default function ShareButton({
  url,
  title,
  description = "",
  className,
  size = "md",
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "px-4 py-2.5",
    lg: "px-6 py-3",
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareOptions = [
    {
      key: "copy",
      label: copied ? "Copied!" : "Copy Link",
      icon: copied ? Check : LinkIcon,
      action: async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Fallback: create temporary input
          const input = document.createElement("input");
          input.value = url;
          document.body.appendChild(input);
          input.select();
          document.execCommand("copy");
          document.body.removeChild(input);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      },
      className: copied ? "text-green" : "text-text-primary",
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: shareIcons.whatsapp,
      action: () => {
        window.open(
          `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
          "_blank",
          "noopener,noreferrer"
        );
      },
      className: "text-text-primary",
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: Facebook,
      action: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
          "_blank",
          "noopener,noreferrer"
        );
      },
      className: "text-text-primary",
    },
    {
      key: "twitter",
      label: "X (Twitter)",
      icon: Twitter,
      action: () => {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
          "_blank",
          "noopener,noreferrer"
        );
      },
      className: "text-text-primary",
    },
  ];

  // Native Web Share API (mobile)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
        return;
      } catch {
        // User cancelled or share failed, fall through to open menu
      }
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={handleNativeShare}
        className={cn(
          "rounded-full border border-[rgba(255,255,255,0.2)] text-sm font-medium text-text-primary hover:bg-[rgba(255,255,255,0.05)] transition-colors flex items-center justify-center gap-2",
          sizeClasses[size]
        )}
        title="Share"
      >
        <Share2 size={size === "sm" ? 14 : 16} />
        {size === "lg" && <span>Share</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Share Menu */}
            <motion.div
              className="absolute right-0 top-full mt-2 z-50 min-w-[200px] bg-[#111111] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-card overflow-hidden"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.05)]">
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Share
                </p>
              </div>

              {/* Options */}
              <div className="py-1">
                {shareOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.key}
                      onClick={() => {
                        option.action();
                        if (option.key !== "copy") {
                          setIsOpen(false);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[rgba(255,255,255,0.05)] transition-colors",
                        option.className
                      )}
                    >
                      <Icon size={16} />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Preview URL */}
              <div className="px-4 py-2 border-t border-[rgba(255,255,255,0.05)]">
                <p className="text-[10px] text-text-muted truncate" title={url}>
                  {url}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
