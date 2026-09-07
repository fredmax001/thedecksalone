import { useState } from "react";
import { Share2, Link as LinkIcon, Check, MapPin, Music, Calendar } from "lucide-react";
import StoryPosterModal from "./StoryPosterModal";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatCompactNumber } from "@/lib/formatting";
import { toast } from "sonner";

// ─── Preview card types ──────────────────────────────────────────────────────
// ─── Preview card types ──────────────────────────────────────────────────────
export interface DjPreview {
  type: "dj";
  avatar?: string;
  stageName: string;
  city?: string;
  genres?: string[];
  followers?: number;
  rankingPosition?: number;
}

export interface MixPreview {
  type: "mix";
  coverImage?: string;
  title: string;
  djName?: string;
  djAvatar?: string;
  artist?: string;
  genre?: string;
  plays?: number;
  duration?: number;
}

export interface EventPreview {
  type: "event";
  image?: string;
  title: string;
  date?: string;
  venue?: string;
  city?: string;
  djName?: string;
  djAvatar?: string;
}

export interface UserPreview {
  type: "user";
  avatar?: string;
  name?: string;
  username: string;
  location?: string;
  bio?: string;
}

export interface HallOfFamePreview {
  type: "hall_of_fame";
  avatar?: string;
  coverImage?: string;
  stageName: string;
  title?: string;
  year?: string;
}

export type SharePreview = DjPreview | MixPreview | EventPreview | UserPreview | HallOfFamePreview;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatEventDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Preview Card sub-components ─────────────────────────────────────────────
function DjPreviewCard({ preview }: { preview: DjPreview }) {
  return (
    <div className="px-4 pt-4 pb-3 border-b border-[rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <img
            src={preview.avatar || "/default-avatar.jpg"}
            alt={preview.stageName}
            className="w-14 h-14 rounded-full object-cover border-2 border-gold/40"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default-avatar.jpg";
            }}
          />
          {preview.rankingPosition && (
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gold flex items-center justify-center text-[9px] font-bold text-black border border-black">
              #{preview.rankingPosition}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold uppercase tracking-tight text-text-primary truncate">
            {preview.stageName}
          </p>
          {preview.city && (
            <p className="flex items-center gap-1 text-[11px] text-text-muted mt-0.5">
              <MapPin size={10} />
              {preview.city}
            </p>
          )}
          {preview.genres && preview.genres.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {preview.genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="px-1.5 py-0.5 rounded-full border border-gold/30 text-[9px] text-gold"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
        {preview.followers !== undefined && (
          <div className="text-right shrink-0">
            <p className="font-mono text-sm font-bold text-gold">
              {formatCompactNumber(preview.followers)}
            </p>
            <p className="text-[9px] text-text-muted uppercase">followers</p>
          </div>
        )}
      </div>
      <div className="mt-2 px-1">
        <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        <p className="text-[10px] text-text-muted text-center mt-1.5 tracking-wider uppercase">
          Deck Salone · Official DJ Profile
        </p>
      </div>
    </div>
  );
}

function MixPreviewCard({ preview }: { preview: MixPreview }) {
  return (
    <div className="px-4 pt-4 pb-3 border-b border-[rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-[#181818] flex items-center justify-center">
          {preview.coverImage ? (
            <img
              src={preview.coverImage}
              alt={preview.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.jpg";
              }}
            />
          ) : (
            <Music size={20} className="text-gold/50" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold uppercase tracking-tight text-text-primary truncate">
            {preview.title}
          </p>
          {(preview.djName || preview.djAvatar) && (
            <div className="flex items-center gap-1.5 mt-1">
              {preview.djAvatar && (
                <img
                  src={preview.djAvatar}
                  alt={preview.djName}
                  className="w-4 h-4 rounded-full object-cover border border-gold/30"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/default-avatar.jpg";
                  }}
                />
              )}
              <span className="text-[11px] text-gold truncate">{preview.djName}</span>
            </div>
          )}
          {preview.genre && (
            <p className="text-[10px] text-text-muted mt-0.5">{preview.genre}</p>
          )}
        </div>
        {preview.plays !== undefined && (
          <div className="text-right shrink-0">
            <p className="font-mono text-sm font-bold text-text-primary">
              {formatCompactNumber(preview.plays)}
            </p>
            <p className="text-[9px] text-text-muted uppercase">plays</p>
          </div>
        )}
      </div>
      <div className="mt-2 px-1">
        <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        <p className="text-[10px] text-text-muted text-center mt-1.5 tracking-wider uppercase">
          Deck Salone · Mix
        </p>
      </div>
    </div>
  );
}

function EventPreviewCard({ preview }: { preview: EventPreview }) {
  return (
    <div className="border-b border-[rgba(255,255,255,0.05)]">
      {preview.image && (
        <div className="relative w-full h-[110px] overflow-hidden">
          <img
            src={preview.image}
            alt={preview.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.jpg";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <p className="absolute bottom-2 left-3 font-display text-sm font-bold uppercase text-white tracking-tight truncate pr-3">
            {preview.title}
          </p>
        </div>
      )}
      <div className="px-4 pt-3 pb-3">
        {!preview.image && (
          <p className="font-display text-sm font-semibold uppercase tracking-tight text-text-primary truncate mb-1">
            {preview.title}
          </p>
        )}
        <div className="flex items-center gap-3">
          {preview.djAvatar && (
            <img
              src={preview.djAvatar}
              alt={preview.djName}
              className="w-9 h-9 rounded-full object-cover border border-gold/40 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/default-avatar.jpg";
              }}
            />
          )}
          <div className="min-w-0 flex-1">
            {preview.djName && (
              <p className="text-[11px] font-semibold text-gold truncate">{preview.djName}</p>
            )}
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
              {preview.date && (
                <span className="flex items-center gap-1 text-[10px] text-text-muted">
                  <Calendar size={9} />
                  {formatEventDate(preview.date)}
                </span>
              )}
              {(preview.venue || preview.city) && (
                <span className="flex items-center gap-1 text-[10px] text-text-muted">
                  <MapPin size={9} />
                  {[preview.venue, preview.city].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-2 px-1">
          <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
          <p className="text-[10px] text-text-muted text-center mt-1.5 tracking-wider uppercase">
            Deck Salone · Event Card
          </p>
        </div>
      </div>
    </div>
  );
}

function UserPreviewCard({ preview }: { preview: UserPreview }) {
  return (
    <div className="px-4 pt-4 pb-3 border-b border-[rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-3">
        <img
          src={preview.avatar || "/default-avatar.jpg"}
          alt={preview.name || preview.username}
          className="w-12 h-12 rounded-full object-cover border-2 border-gold/40 shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/default-avatar.jpg";
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold uppercase tracking-tight text-text-primary truncate">
            {preview.name || `@${preview.username}`}
          </p>
          <p className="text-[11px] text-gold truncate">@{preview.username}</p>
          {preview.location && (
            <p className="flex items-center gap-1 text-[10px] text-text-muted mt-0.5">
              <MapPin size={9} />
              {preview.location}
            </p>
          )}
        </div>
      </div>
      <div className="mt-2 px-1">
        <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        <p className="text-[10px] text-text-muted text-center mt-1.5 tracking-wider uppercase">
          Deck Salone · User Profile
        </p>
      </div>
    </div>
  );
}

function HallOfFamePreviewCard({ preview }: { preview: HallOfFamePreview }) {
  return (
    <div className="px-4 pt-4 pb-3 border-b border-[rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <img
            src={preview.avatar || preview.coverImage || "/default-avatar.jpg"}
            alt={preview.stageName}
            className="w-14 h-14 rounded-full object-cover border-2 border-yellow-400/60 shadow-lg shadow-yellow-500/20"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default-avatar.jpg";
            }}
          />
          <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-[8px] font-black uppercase rounded border border-black shadow">
            LEGEND
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold uppercase tracking-tight text-yellow-400 truncate">
            {preview.stageName}
          </p>
          <p className="text-[11px] text-text-primary font-medium truncate mt-0.5">
            {preview.title || "Hall of Fame Legend"}
          </p>
          {preview.year && (
            <p className="text-[10px] text-text-muted mt-0.5">Inducted {preview.year}</p>
          )}
        </div>
      </div>
      <div className="mt-2 px-1">
        <div className="h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />
        <p className="text-[10px] text-yellow-400/80 text-center mt-1.5 tracking-wider uppercase font-semibold">
          Deck Salone · Hall of Fame
        </p>
      </div>
    </div>
  );
}

// ─── Official Brand Icons ──────────────────────────────────────────────────────
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#25D366]">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.134 1.585 5.938L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#1877F2]">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <defs>
      <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f09433" />
        <stop offset="25%" stopColor="#e6683c" />
        <stop offset="50%" stopColor="#dc2743" />
        <stop offset="75%" stopColor="#cc2366" />
        <stop offset="100%" stopColor="#bc1888" />
      </linearGradient>
    </defs>
    <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────
interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  preview?: SharePreview;
  className?: string;
  size?: "sm" | "md" | "lg";
  menuPosition?: "top" | "bottom";
}

export default function ShareButton({
  url,
  title,
  description = "",
  preview,
  className,
  size = "md",
  menuPosition = "bottom",
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [posterInitialFormat, setPosterInitialFormat] = useState<"story" | "square" | "wide">("story");

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "px-4 py-2.5",
    lg: "px-6 py-3",
  };

  const encodedUrl = encodeURIComponent(url);

  // Build rich WhatsApp share text based on preview type
  const getWhatsAppShareMsg = () => {
    if (preview?.type === "event") {
      return `🎉 Upcoming Event: "${preview.title}"\n📅 Date: ${preview.date ? formatEventDate(preview.date) : "Upcoming"}\n📍 Venue: ${[preview.venue, preview.city].filter(Boolean).join(", ") || "Sierra Leone"}${preview.djName ? `\n🎧 DJ: ${preview.djName}` : ""}\n\n🎟️ Check event & get tickets on Deck Salone:\n${url}`;
    }
    if (preview?.type === "dj") {
      return `🎧 Check out DJ ${preview.stageName} on Deck Salone!${preview.rankingPosition ? `\n🏆 Rank: #${preview.rankingPosition} DJ in Sierra Leone` : ""}${preview.city ? `\n📍 Location: ${preview.city}` : ""}${preview.genres?.length ? `\n🔥 Genres: ${preview.genres.join(", ")}` : ""}\n\n👉 Listen & Book now:\n${url}`;
    }
    if (preview?.type === "user") {
      return `👤 Check out ${preview.name || preview.username}'s profile on Deck Salone!${preview.location ? `\n📍 ${preview.location}` : ""}\n\n👉 View profile:\n${url}`;
    }
    if (preview?.type === "mix") {
      return `🎵 Now Playing on Deck Salone: "${preview.title}"${preview.djName ? ` by ${preview.djName}` : ""}\n🔥 Genre: ${preview.genre || "Mix"}\n\n👉 Listen now:\n${url}`;
    }
    if (preview?.type === "hall_of_fame") {
      return `👑 Hall of Fame Legend: ${preview.stageName}\n🏆 ${preview.title || "Legendary DJ"}\n\n👉 View Legend Profile on Deck Salone:\n${url}`;
    }
    if (description) {
      return `🔥 Check out "${title}" on Deck Salone:\n${description}\n${url}`;
    }
    return `🔥 Check out "${title}" on Deck Salone:\n${url}`;
  };

  const shareOptions = [
    {
      key: "native_share",
      label: "Share Link",
      icon: Share2,
      action: async () => {
        if (navigator.share) {
          try {
            await navigator.share({ title, text: getWhatsAppShareMsg(), url });
            return;
          } catch {
            // User cancelled or share failed
          }
        }
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      },
      className: "text-text-primary font-medium",
    },
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
      className: copied ? "text-green font-bold" : "text-text-primary",
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: WhatsAppIcon,
      action: () => {
        const shareMsg = encodeURIComponent(getWhatsAppShareMsg());
        window.open(
          `https://wa.me/?text=${shareMsg}`,
          "_blank",
          "noopener,noreferrer"
        );
      },
      className: "text-text-primary font-medium",
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: FacebookIcon,
      action: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
          "_blank",
          "noopener,noreferrer"
        );
      },
      className: "text-text-primary font-medium",
    },
    {
      key: "twitter",
      label: "X (Twitter)",
      icon: XIcon,
      action: () => {
        const shareMsg = encodeURIComponent(`🎧 Check out "${title}" on Deck Salone!`);
        window.open(
          `https://twitter.com/intent/tweet?text=${shareMsg}&url=${encodedUrl}`,
          "_blank",
          "noopener,noreferrer"
        );
      },
      className: "text-text-primary font-medium",
    },
    {
      key: "instagram",
      label: "Instagram Story",
      icon: InstagramIcon,
      action: () => {
        setOpen(false);
        setPosterInitialFormat("story");
        setPosterOpen(true);
      },
      className: "text-text-primary font-medium",
    },
    {
      key: "story_poster",
      label: "Create Share Card",
      icon: () => (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      ),
      action: () => {
        setOpen(false);
        setPosterInitialFormat("story");
        setPosterOpen(true);
      },
      className: "text-text-primary font-medium",
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "btn-press-subtle rounded-full border border-[rgba(255,255,255,0.2)] text-sm font-medium text-text-primary hover:bg-[rgba(255,255,255,0.05)] transition-colors flex items-center justify-center gap-2",
            sizeClasses[size]
          )}
          title="Share"
        >
          <Share2 size={size === "sm" ? 14 : 16} />
          {size === "lg" && <span>Share</span>}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side={menuPosition}
        align="end"
        sideOffset={8}
        className={cn(
          "w-[270px] max-w-[calc(100vw-1rem)] max-h-[80vh] overflow-y-auto bg-[#111111] border border-[rgba(255,255,255,0.12)] rounded-xl shadow-card p-0",
          className
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Rich Preview Card */}
        {preview?.type === "dj" && <DjPreviewCard preview={preview} />}
        {preview?.type === "mix" && <MixPreviewCard preview={preview} />}
        {preview?.type === "event" && <EventPreviewCard preview={preview} />}
        {preview?.type === "user" && <UserPreviewCard preview={preview} />}
        {preview?.type === "hall_of_fame" && <HallOfFamePreviewCard preview={preview} />}

        {/* Header (shown when no preview) */}
        {!preview && (
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.05)]">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Share
            </p>
          </div>
        )}

        {/* Section label when preview is shown */}
        {preview && (
          <div className="px-4 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Share via
            </p>
          </div>
        )}

        {/* Options */}
        <div className={cn("py-1", preview && "pt-0")}>
          {shareOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.key}
                onClick={() => {
                  option.action();
                  if (option.key !== "copy") {
                    setOpen(false);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[rgba(255,255,255,0.06)] transition-colors",
                  option.className
                )}
              >
                <Icon />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Preview URL */}
        <div className="px-4 py-2 border-t border-[rgba(255,255,255,0.05)] bg-black/40">
          <p className="text-[10px] text-text-muted truncate" title={url}>
            {url}
          </p>
        </div>
      </PopoverContent>

      {/* Story Poster Modal */}
      <StoryPosterModal
        isOpen={posterOpen}
        onClose={() => setPosterOpen(false)}
        url={url}
        title={title}
        description={description}
        preview={preview}
        initialFormat={posterInitialFormat}
      />
    </Popover>
  );
}
