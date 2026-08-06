import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Share2,
  Sparkles,
  Loader2,
  Check,
  Smartphone,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import type { SharePreview } from "./ShareButton";

interface StoryPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  description?: string;
  preview?: SharePreview;
}

function formatCompact(n: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

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

export default function StoryPosterModal({
  isOpen,
  onClose,
  url,
  title,
  preview,
}: StoryPosterModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  // Extract poster details based on preview type
  const getImage = () => {
    if (!preview) return "/default-avatar.jpg";
    if (preview.type === "dj") return preview.avatar || "/default-avatar.jpg";
    if (preview.type === "mix") return preview.coverImage || preview.djAvatar || "/placeholder.jpg";
    if (preview.type === "event") return preview.image || preview.djAvatar || "/placeholder.jpg";
    if (preview.type === "user") return preview.avatar || "/default-avatar.jpg";
    if (preview.type === "hall_of_fame") return preview.avatar || preview.coverImage || "/default-avatar.jpg";
    return "/default-avatar.jpg";
  };

  const getCategoryTag = () => {
    if (!preview) return "DECK SALONE PLATFORM";
    if (preview.type === "dj") return "OFFICIAL DJ";
    if (preview.type === "mix") return "EXCLUSIVE MIX";
    if (preview.type === "event") return "UPCOMING EVENT";
    if (preview.type === "user") return "COMMUNITY MEMBER";
    if (preview.type === "hall_of_fame") return "HALL OF FAME LEGEND";
    return "DECK SALONE";
  };

  const getMainTitle = () => {
    if (!preview) return title;
    if (preview.type === "dj") return preview.stageName;
    if (preview.type === "mix") return preview.title;
    if (preview.type === "event") return preview.title;
    if (preview.type === "user") return preview.name || `@${preview.username}`;
    if (preview.type === "hall_of_fame") return preview.stageName;
    return title;
  };

  const getSubtitle = () => {
    if (!preview) return "Sierra Leone's Official DJ Platform";
    if (preview.type === "dj") return preview.city ? `Based in ${preview.city}` : "Sierra Leonean DJ";
    if (preview.type === "mix") return preview.djName ? `Mixed by ${preview.djName}` : "Official DJ Mix";
    if (preview.type === "event") return preview.djName ? `Featured DJ: ${preview.djName}` : "Official Event";
    if (preview.type === "user") return `@${preview.username}`;
    if (preview.type === "hall_of_fame") return preview.title || "Pioneer DJ of Sierra Leone";
    return "Sierra Leone's Official DJ Platform";
  };

  // Build 4 rich details pills for the poster (addressing "with more details not empty like this one above")
  const getDetails = () => {
    const details: { label: string; icon: string }[] = [];
    if (!preview) {
      return [
        { label: "Sierra Leone #1 DJ App", icon: "🏆" },
        { label: "Mixes & Bookings", icon: "🎧" },
        { label: "decksalone.com", icon: "🌐" },
        { label: "Live Streaming", icon: "🔥" },
      ];
    }

    if (preview.type === "dj") {
      if (preview.rankingPosition) details.push({ label: `#${preview.rankingPosition} Ranked DJ`, icon: "🏆" });
      if (preview.city) details.push({ label: preview.city, icon: "📍" });
      if (preview.genres?.length) details.push({ label: preview.genres.slice(0, 2).join(" • "), icon: "🎵" });
      if (preview.followers) details.push({ label: `${formatCompact(preview.followers)} Followers`, icon: "⭐" });
      if (details.length < 4) details.push({ label: "Verified DJ", icon: "✅" });
    } else if (preview.type === "mix") {
      if (preview.genre) details.push({ label: `Genre: ${preview.genre}`, icon: "🎵" });
      if (preview.djName) details.push({ label: `DJ: ${preview.djName}`, icon: "🎧" });
      if (preview.plays) details.push({ label: `${formatCompact(preview.plays)} Plays`, icon: "🔥" });
      details.push({ label: "Deck Salone Exclusive", icon: "⭐" });
    } else if (preview.type === "event") {
      if (preview.date) details.push({ label: formatEventDate(preview.date), icon: "📅" });
      if (preview.venue || preview.city) details.push({ label: [preview.venue, preview.city].filter(Boolean).join(", "), icon: "📍" });
      if (preview.djName) details.push({ label: `DJ: ${preview.djName}`, icon: "🎧" });
      details.push({ label: "Official Event", icon: "🎟️" });
    } else if (preview.type === "user") {
      details.push({ label: `@${preview.username}`, icon: "👤" });
      if (preview.location) details.push({ label: preview.location, icon: "📍" });
      if (preview.bio) details.push({ label: preview.bio.slice(0, 30), icon: "💬" });
      details.push({ label: "Deck Salone Member", icon: "🎵" });
    } else if (preview.type === "hall_of_fame") {
      details.push({ label: "Hall of Fame Legend", icon: "👑" });
      if (preview.year) details.push({ label: `Inducted: ${preview.year}`, icon: "🏛️" });
      if (preview.title) details.push({ label: preview.title.slice(0, 32), icon: "🏆" });
      details.push({ label: "Culture Pioneer", icon: "⭐" });
    }

    return details.slice(0, 4);
  };

  // High Resolution 1080x1920 Canvas Poster Generator
  const drawCanvasPoster = useCallback(async (): Promise<string | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    // 1. Dark Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#08080a");
    bgGrad.addColorStop(0.3, "#121217");
    bgGrad.addColorStop(0.7, "#181820");
    bgGrad.addColorStop(1, "#0a0a0d");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle Gold Radial Glow in top center
    const glowGrad = ctx.createRadialGradient(width / 2, 450, 50, width / 2, 450, 700);
    glowGrad.addColorStop(0, "rgba(234, 179, 8, 0.15)");
    glowGrad.addColorStop(0.5, "rgba(202, 138, 4, 0.05)");
    glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Top Header Branding
    ctx.font = "900 36px sans-serif";
    ctx.fillStyle = "#EAB308"; // Gold
    ctx.textAlign = "left";
    ctx.fillText("DECK SALONE", 90, 110);

    ctx.font = "600 24px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillText("• SIERRA LEONE'S OFFICIAL DJ PLATFORM", 370, 110);

    // Top border line
    ctx.strokeStyle = "rgba(234, 179, 8, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(90, 145);
    ctx.lineTo(width - 90, 145);
    ctx.stroke();

    // 3. Main Center Media Image Box (Rounded with Gold Border)
    const imgSize = 720;
    const imgX = (width - imgSize) / 2;
    const imgY = 200;
    const radius = 40;

    // Load and draw center image
    const mainImg = new Image();
    mainImg.crossOrigin = "anonymous";
    mainImg.src = getImage();

    await new Promise((resolve) => {
      mainImg.onload = resolve;
      mainImg.onerror = () => {
        mainImg.src = "/default-avatar.jpg";
        mainImg.onload = resolve;
        mainImg.onerror = resolve;
      };
    });

    // Draw Image Shadow & Border Box
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgSize, imgSize, radius);
    ctx.clip();
    ctx.drawImage(mainImg, imgX, imgY, imgSize, imgSize);
    ctx.restore();

    // Gold Image Border
    ctx.strokeStyle = "#EAB308";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgSize, imgSize, radius);
    ctx.stroke();

    // 4. Category Tag Badge
    const badgeY = imgY + imgSize + 55;
    const badgeText = getCategoryTag();
    ctx.font = "bold 24px sans-serif";
    const badgeWidth = ctx.measureText(badgeText).width + 48;
    const badgeX = 90;

    ctx.fillStyle = "rgba(234, 179, 8, 0.15)";
    ctx.strokeStyle = "rgba(234, 179, 8, 0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, 54, 27);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#EAB308";
    ctx.textAlign = "left";
    ctx.fillText(badgeText, badgeX + 24, badgeY + 36);

    // 5. Main Title & Subtitle
    const titleY = badgeY + 130;
    ctx.font = "900 68px sans-serif";
    ctx.fillStyle = "#FFFFFF";
    const mainTitle = getMainTitle();
    // Truncate if too long
    const truncatedTitle = mainTitle.length > 24 ? `${mainTitle.slice(0, 22)}...` : mainTitle;
    ctx.fillText(truncatedTitle, 90, titleY);

    const subY = titleY + 55;
    ctx.font = "600 32px sans-serif";
    ctx.fillStyle = "#EAB308";
    ctx.fillText(getSubtitle(), 90, subY);

    // 6. Rich Details Grid (2x2 Pill Grid)
    const details = getDetails();
    let detailY = subY + 70;

    ctx.font = "600 26px sans-serif";
    details.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const px = 90 + col * 460;
      const py = detailY + row * 85;

      // Draw Detail Pill
      const itemText = `${item.icon}  ${item.label}`;
      const textWidth = ctx.measureText(itemText).width;

      ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(px, py, Math.min(textWidth + 40, 430), 65, 32);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#E2E8F0";
      ctx.textAlign = "left";
      ctx.fillText(itemText, px + 20, py + 43);
    });

    // 7. Divider Line before QR Code
    const qrSectionY = height - 320;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(90, qrSectionY - 40);
    ctx.lineTo(width - 90, qrSectionY - 40);
    ctx.stroke();

    // 8. Scannable QR Code Box
    const qrSvg = qrContainerRef.current?.querySelector("svg");
    if (qrSvg) {
      const xml = new XMLSerializer().serializeToString(qrSvg);
      const svg64 = btoa(xml);
      const b64Start = "data:image/svg+xml;base64,";
      const image64 = b64Start + svg64;

      const qrImg = new Image();
      qrImg.src = image64;

      await new Promise((resolve) => {
        qrImg.onload = resolve;
        qrImg.onerror = resolve;
      });

      // Draw QR Code White Rounded Card Background
      const qrBoxX = 90;
      const qrBoxY = qrSectionY;
      const qrBoxSize = 220;

      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28);
      ctx.fill();

      // Draw QR Code inside
      ctx.drawImage(qrImg, qrBoxX + 15, qrBoxY + 15, 190, 190);

      // QR Code Side Captions
      const textX = qrBoxX + qrBoxSize + 40;
      ctx.textAlign = "left";

      ctx.font = "900 42px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Scan QR Code to View", textX, qrBoxY + 75);

      ctx.font = "600 28px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillText("Available live on decksalone.com", textX, qrBoxY + 130);

      ctx.font = "bold 26px sans-serif";
      ctx.fillStyle = "#EAB308";
      ctx.fillText(url.replace(/^https?:\/\//, ""), textX, qrBoxY + 180);
    }

    return canvas.toDataURL("image/png");
  }, [preview, title, url]);

  // Handle Download PNG
  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const dataUrl = await drawCanvasPoster();
      if (!dataUrl) {
        toast.error("Failed to generate story poster");
        return;
      }
      const link = document.createElement("a");
      link.download = `DeckSalone_Story_${getMainTitle().replace(/\s+/g, "_")}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("HD Story Poster downloaded! 📸 Share to Instagram or Snapchat!");
    } catch {
      toast.error("Error generating poster");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Mobile Direct Native Share
  const handleNativeShare = async () => {
    setIsGenerating(true);
    try {
      const dataUrl = await drawCanvasPoster();
      if (!dataUrl) return;

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `DeckSalone_${getMainTitle()}.png`, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Check out ${getMainTitle()} on Deck Salone!`,
          text: `Scan or visit: ${url}`,
          url,
        });
        toast.success("Shared successfully!");
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        toast.info("Story poster & link ready! Paste link sticker on Instagram Story 📎", { duration: 5000 });
      }
    } catch {
      // User cancelled share
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const details = getDetails();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          {/* Hidden Canvas & SVG QR container used for high-res PNG rendering */}
          <div className="hidden">
            <canvas ref={canvasRef} />
            <div ref={qrContainerRef}>
              <QRCodeSVG value={url} size={256} level="H" includeMargin={false} />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm rounded-3xl bg-black-surface border border-gold/30 shadow-2xl p-5 my-8 text-left"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-text-muted hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            {/* Poster Header */}
            <div className="text-center mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gold/15 border border-gold/40 rounded-full text-gold text-[10px] font-bold uppercase tracking-wider">
                <Sparkles size={12} /> Instagram & Snapchat Story Card
              </span>
            </div>

            {/* 9:16 Aspect Ratio Visual Poster Box */}
            <div className="relative aspect-[9/16] w-full rounded-2xl bg-gradient-to-b from-[#0b0c10] via-[#14151c] to-[#0a0a0d] border border-gold/30 p-4 flex flex-col justify-between overflow-hidden shadow-card">
              {/* Gold Top Light Glow Overlay */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-gold/20 blur-3xl pointer-events-none" />

              {/* Branding Top */}
              <div className="relative z-10 flex items-center justify-between border-b border-gold/20 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-black text-xs text-gold uppercase tracking-wider">
                    DECK SALONE
                  </span>
                  <span className="text-[9px] text-text-muted">
                    • OFFICIAL PLATFORM
                  </span>
                </div>
              </div>

              {/* Center Image */}
              <div className="relative z-10 my-2 flex justify-center">
                <div className="relative w-44 h-44 rounded-2xl overflow-hidden border-2 border-gold shadow-lg">
                  <img
                    src={getImage()}
                    alt={getMainTitle()}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/default-avatar.jpg";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
              </div>

              {/* Title & Category Badge */}
              <div className="relative z-10 space-y-1.5">
                <span className="inline-block px-2.5 py-0.5 bg-gold/20 border border-gold/50 text-gold text-[9px] font-bold uppercase tracking-wider rounded-full">
                  {getCategoryTag()}
                </span>
                <h3 className="font-display text-lg font-black text-white uppercase tracking-tight truncate">
                  {getMainTitle()}
                </h3>
                <p className="text-xs text-gold font-medium truncate">
                  {getSubtitle()}
                </p>

                {/* 2x2 Details Grid */}
                <div className="grid grid-cols-2 gap-1.5 pt-2">
                  {details.map((d, idx) => (
                    <div
                      key={idx}
                      className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center gap-1 min-w-0"
                    >
                      <span className="text-xs shrink-0">{d.icon}</span>
                      <span className="text-[9px] font-medium text-text-secondary truncate">
                        {d.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scannable Bottom QR Code Box */}
              <div className="relative z-10 pt-3 border-t border-white/10 flex items-center gap-3">
                <div className="p-1.5 bg-white rounded-xl shrink-0 shadow-md">
                  <QRCodeSVG value={url} size={54} level="H" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-bold text-white leading-tight">
                    Scan QR Code to View
                  </p>
                  <p className="text-[10px] text-text-muted leading-tight mt-0.5 truncate">
                    Available live on decksalone.com
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 space-y-2">
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full py-2.5 bg-gold-gradient text-black font-bold text-xs uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Download HD Story Poster (PNG)
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleNativeShare}
                  disabled={isGenerating}
                  className="flex-1 py-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Share2 size={13} />
                  Share to Instagram / Snapchat
                </button>

                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    toast.success("Link copied!");
                  }}
                  className="px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copied ? <Check size={13} className="text-green" /> : <Smartphone size={13} />}
                  {copied ? "Copied" : "Copy Link"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
