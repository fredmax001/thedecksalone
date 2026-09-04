import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Share2,
  Sparkles,
  Loader2,
  Check,
  Smartphone,
  Palette,
  ImageIcon,
  Square,
  RectangleHorizontal,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import type { SharePreview } from "./ShareButton";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/lib/api";
import { formatCompactNumber } from "@/lib/formatting";

// Instagram brand icon
function InstagramIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

interface StoryPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  description?: string;
  preview?: SharePreview;
  initialFormat?: CardFormat;
}

type CardFormat = "story" | "square" | "wide";

interface ColorTheme {
  name: string;
  accent: string;
  accentLight: string;
  accentDark: string;
}

const PRESET_THEMES: ColorTheme[] = [
  { name: "Deck Gold", accent: "#f4e059", accentLight: "#fdf186", accentDark: "#ceb100" },
  { name: "Salone Red", accent: "#ef4444", accentLight: "#f87171", accentDark: "#b91c1c" },
  { name: "Ocean Blue", accent: "#3b82f6", accentLight: "#60a5fa", accentDark: "#1d4ed8" },
  { name: "Violet", accent: "#8b5cf6", accentLight: "#a78bfa", accentDark: "#6d28d9" },
  { name: "Emerald", accent: "#10b981", accentLight: "#34d399", accentDark: "#047857" },
  { name: "Orange", accent: "#f97316", accentLight: "#fb923c", accentDark: "#c2410c" },
  { name: "Pink", accent: "#ec4899", accentLight: "#f472b6", accentDark: "#be185d" },
  { name: "Cyan", accent: "#06b6d4", accentLight: "#22d3ee", accentDark: "#0891b2" },
];

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
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

function hexToRgba(hex: string, alpha: number): string {
  const sanitized = hex.replace("#", "");
  const r = parseInt(sanitized.substring(0, 2), 16) || 244;
  const g = parseInt(sanitized.substring(2, 4), 16) || 224;
  const b = parseInt(sanitized.substring(4, 6), 16) || 89;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getCanvasDimensions(format: CardFormat): { width: number; height: number } {
  if (format === "story") return { width: 1080, height: 1920 };
  if (format === "square") return { width: 1080, height: 1080 };
  return { width: 1200, height: 630 };
}

export default function StoryPosterModal({
  isOpen,
  onClose,
  url,
  title,
  preview,
  initialFormat = "story",
}: StoryPosterModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<CardFormat>(initialFormat);
  const [theme, setTheme] = useState<ColorTheme>(PRESET_THEMES[0]);
  const [customAccent, setCustomAccent] = useState("#f4e059");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  // When modal opens, reset to the requested initial format
  useEffect(() => {
    if (isOpen) setFormat(initialFormat);
  }, [isOpen, initialFormat]);

  const activeAccent = theme.name === "Custom" ? customAccent : theme.accent;

  const getImage = () => {
    if (!preview) return "/default-avatar.jpg";
    let raw = "";
    if (preview.type === "dj") raw = preview.avatar || "";
    else if (preview.type === "mix") raw = preview.coverImage || preview.djAvatar || "";
    else if (preview.type === "event") raw = preview.image || preview.djAvatar || "";
    else if (preview.type === "user") raw = preview.avatar || "";
    else if (preview.type === "hall_of_fame") raw = preview.avatar || preview.coverImage || "";
    if (!raw) return "/default-avatar.jpg";
    return raw.startsWith("http") || raw.startsWith("data:") || raw.startsWith("blob:") ? raw : getMediaUrl(raw);
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

  const getMixDetails = () => {
    if (preview?.type !== "mix") return [];
    const details: { label: string; icon: string }[] = [];
    details.push({ label: "Now Playing on Deck Salone", icon: "🔥" });
    if (preview.duration) details.push({ label: `Duration: ${formatDuration(preview.duration)}`, icon: "⏱️" });
    if (preview.genre) details.push({ label: preview.genre, icon: "🎵" });
    if (preview.plays) details.push({ label: `${formatCompactNumber(preview.plays)} Plays`, icon: "▶️" });
    if (preview.artist) details.push({ label: preview.artist, icon: "🎤" });
    return details.slice(0, 4);
  };

  const getDjDetails = () => {
    if (preview?.type !== "dj") return [];
    const details: { label: string; icon: string }[] = [];
    if (preview.rankingPosition) details.push({ label: `#${preview.rankingPosition} Ranked DJ`, icon: "🏆" });
    if (preview.city) details.push({ label: preview.city, icon: "📍" });
    if (preview.genres?.length) details.push({ label: preview.genres.slice(0, 2).join(" • "), icon: "🎵" });
    if (preview.followers) details.push({ label: `${formatCompactNumber(preview.followers)} Followers`, icon: "⭐" });
    if (details.length < 4) details.push({ label: "Verified DJ", icon: "✅" });
    return details.slice(0, 4);
  };

  const getDetails = () => {
    if (preview?.type === "mix") return getMixDetails();
    if (preview?.type === "dj") return getDjDetails();

    const details: { label: string; icon: string }[] = [];
    if (!preview) {
      return [
        { label: "Sierra Leone #1 DJ App", icon: "🏆" },
        { label: "Mixes & Bookings", icon: "🎧" },
        { label: "decksalone.com", icon: "🌐" },
        { label: "Live Streaming", icon: "🔥" },
      ];
    }

    if (preview.type === "event") {
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

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [text];
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#08080a");
    bgGrad.addColorStop(0.35, "#0d0d12");
    bgGrad.addColorStop(0.7, "#111118");
    bgGrad.addColorStop(1, "#050508");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle accent radial glow near top/center
    const glowGrad = ctx.createRadialGradient(width / 2, height * 0.25, 40, width / 2, height * 0.25, height * 0.55);
    glowGrad.addColorStop(0, hexToRgba(activeAccent, 0.16));
    glowGrad.addColorStop(0.5, hexToRgba(activeAccent, 0.05));
    glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);
  };

  const drawHeader = (ctx: CanvasRenderingContext2D, width: number, padding: number) => {
    ctx.font = `900 ${width > 1100 ? 38 : 34}px sans-serif`;
    ctx.fillStyle = activeAccent;
    ctx.textAlign = "left";
    ctx.fillText("DECK SALONE", padding, padding + 30);

    ctx.font = `600 ${width > 1100 ? 24 : 20}px sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillText("• SIERRA LEONE'S OFFICIAL DJ PLATFORM", padding + (width > 1100 ? 390 : 330), padding + 30);

    ctx.strokeStyle = hexToRgba(activeAccent, 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding + 55);
    ctx.lineTo(width - padding, padding + 55);
    ctx.stroke();
  };

  const drawRoundedImage = async (
    ctx: CanvasRenderingContext2D,
    src: string,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    borderColor: string,
    borderWidth: number
  ) => {
    let fullSrc = src.startsWith("http") || src.startsWith("data:") || src.startsWith("blob:") ? src : getMediaUrl(src);

    // If external cross-origin HTTP URL, route through image proxy so canvas is never tainted
    if (fullSrc.startsWith("http://") || fullSrc.startsWith("https://")) {
      try {
        const urlObj = new URL(fullSrc);
        if (urlObj.hostname !== window.location.hostname && !urlObj.hostname.includes("localhost")) {
          fullSrc = `/api/proxy-image?url=${encodeURIComponent(fullSrc)}`;
        }
      } catch {}
    }

    const loadImage = (imgUrl: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = imgUrl;
      });
    };

    let loadedImg: HTMLImageElement | null = null;
    try {
      loadedImg = await loadImage(fullSrc);
    } catch {
      try {
        loadedImg = await loadImage("/default-avatar.jpg");
      } catch {}
    }

    if (loadedImg && loadedImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.clip();

      // Object-fit: cover aspect ratio calculation
      const imgRatio = loadedImg.naturalWidth / (loadedImg.naturalHeight || 1);
      const targetRatio = w / (h || 1);
      let sWidth = loadedImg.naturalWidth;
      let sHeight = loadedImg.naturalHeight;
      let sx = 0;
      let sy = 0;
      if (imgRatio > targetRatio) {
        sWidth = loadedImg.naturalHeight * targetRatio;
        sx = (loadedImg.naturalWidth - sWidth) / 2;
      } else {
        sHeight = loadedImg.naturalWidth / targetRatio;
        sy = (loadedImg.naturalHeight - sHeight) / 2;
      }

      ctx.drawImage(loadedImg, sx, sy, sWidth, sHeight, x, y, w, h);
      ctx.restore();

      if (borderWidth > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.stroke();
      }
    }
  };

  const drawBadge = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number) => {
    ctx.font = "bold 22px sans-serif";
    const badgeWidth = ctx.measureText(text).width + 44;

    ctx.fillStyle = hexToRgba(activeAccent, 0.14);
    ctx.strokeStyle = hexToRgba(activeAccent, 0.55);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, badgeWidth, 50, 25);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = activeAccent;
    ctx.textAlign = "left";
    ctx.fillText(text, x + 22, y + 34);
  };

  const drawPills = (
    ctx: CanvasRenderingContext2D,
    details: { label: string; icon: string }[],
    startX: number,
    startY: number,
    maxWidth: number,
    columns: number
  ) => {
    ctx.font = "600 24px sans-serif";
    const colWidth = (maxWidth - (columns - 1) * 24) / columns;
    const rowHeight = 78;

    details.forEach((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const px = startX + col * (colWidth + 24);
      const py = startY + row * rowHeight;

      const itemText = `${item.icon}  ${item.label}`;
      const textWidth = Math.min(ctx.measureText(itemText).width + 36, colWidth - 12);

      ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(px, py, textWidth, 60, 30);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#E2E8F0";
      ctx.textAlign = "left";
      ctx.fillText(itemText, px + 18, py + 39);
    });
  };

  const drawQr = async (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    const qrSvg = qrContainerRef.current?.querySelector("svg");
    if (!qrSvg) return;
    const xml = new XMLSerializer().serializeToString(qrSvg);
    const image64 = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);

    const qrImg = new Image();
    qrImg.crossOrigin = "anonymous";
    qrImg.src = image64;
    await new Promise((resolve) => {
      qrImg.onload = resolve;
      qrImg.onerror = resolve;
    });

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 24);
    ctx.fill();
    ctx.drawImage(qrImg, x + 12, y + 12, size - 24, size - 24);
  };

  const drawStory = async (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const padding = 90;
    const details = getDetails();

    drawBackground(ctx, width, height);
    drawHeader(ctx, width, padding);

    const imgSize = 720;
    const imgX = (width - imgSize) / 2;
    const imgY = 210;
    await drawRoundedImage(ctx, getImage(), imgX, imgY, imgSize, imgSize, 40, activeAccent, 6);

    const badgeY = imgY + imgSize + 55;
    drawBadge(ctx, getCategoryTag(), padding, badgeY);

    const titleY = badgeY + 120;
    ctx.font = "900 66px sans-serif";
    ctx.fillStyle = "#FFFFFF";
    const mainTitle = getMainTitle();
    const titleLines = wrapText(ctx, mainTitle.length > 28 ? `${mainTitle.slice(0, 26)}...` : mainTitle, width - padding * 2);
    titleLines.forEach((line, i) => ctx.fillText(line, padding, titleY + i * 80));

    const subY = titleY + titleLines.length * 80 + 30;
    ctx.font = "600 32px sans-serif";
    ctx.fillStyle = activeAccent;
    ctx.fillText(getSubtitle(), padding, subY);

    const pillsY = subY + 50;
    drawPills(ctx, details, padding, pillsY, width - padding * 2, 2);

    const qrY = height - 260;
    await drawQr(ctx, padding, qrY, 190);

    ctx.textAlign = "left";
    ctx.font = "900 38px sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("Listen on Deck Salone", padding + 225, qrY + 80);

    ctx.font = "600 28px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillText("decksalone.com", padding + 225, qrY + 130);
  };

  const drawSquare = async (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const padding = 80;
    const details = getDetails();

    drawBackground(ctx, width, height);
    drawHeader(ctx, width, padding);

    const isMix = preview?.type === "mix";
    const isDj = preview?.type === "dj";

    if (isMix) {
      // Square mix layout: cover left, details right
      const imgSize = 420;
      const imgX = padding;
      const imgY = 170;
      await drawRoundedImage(ctx, getImage(), imgX, imgY, imgSize, imgSize, 32, activeAccent, 5);

      const contentX = imgX + imgSize + 40;
      const contentW = width - contentX - padding;

      drawBadge(ctx, getCategoryTag(), contentX, imgY + 10);

      ctx.font = "900 46px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "left";
      const mainTitle = getMainTitle();
      const titleLines = wrapText(ctx, mainTitle, contentW);
      titleLines.slice(0, 2).forEach((line, i) => ctx.fillText(line, contentX, imgY + 95 + i * 56));

      const subY = imgY + 95 + Math.min(titleLines.length, 2) * 56 + 15;
      ctx.font = "600 24px sans-serif";
      ctx.fillStyle = activeAccent;
      ctx.fillText(getSubtitle(), contentX, subY);

      drawPills(ctx, details.slice(0, 2), contentX, subY + 30, contentW, 1);

      const qrY = height - 230;
      await drawQr(ctx, padding, qrY, 170);
      ctx.textAlign = "left";
      ctx.font = "900 34px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Scan to Listen", padding + 200, qrY + 75);
      ctx.font = "600 22px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillText("decksalone.com", padding + 200, qrY + 115);
    } else if (isDj) {
      // DJ square layout: large avatar top center, details below
      const avatarSize = 360;
      const imgX = (width - avatarSize) / 2;
      const imgY = 180;
      await drawRoundedImage(ctx, getImage(), imgX, imgY, avatarSize, avatarSize, avatarSize / 2, activeAccent, 6);

      drawBadge(ctx, getCategoryTag(), padding, imgY + avatarSize + 40);

      ctx.font = "900 64px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      const mainTitle = getMainTitle();
      const titleLines = wrapText(ctx, mainTitle, width - padding * 2);
      titleLines.slice(0, 2).forEach((line, i) => ctx.fillText(line, width / 2, imgY + avatarSize + 140 + i * 74));

      ctx.font = "600 30px sans-serif";
      ctx.fillStyle = activeAccent;
      ctx.fillText(getSubtitle(), width / 2, imgY + avatarSize + 140 + Math.min(titleLines.length, 2) * 74 + 30);

      ctx.textAlign = "left";
      drawPills(ctx, details, padding, imgY + avatarSize + 300, width - padding * 2, 2);

      const qrY = height - 200;
      await drawQr(ctx, padding, qrY, 150);
      ctx.textAlign = "left";
      ctx.font = "900 30px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Scan to Book", padding + 180, qrY + 70);
      ctx.font = "600 20px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillText("decksalone.com", padding + 180, qrY + 105);
    } else {
      // Generic square layout
      const imgSize = 520;
      const imgX = (width - imgSize) / 2;
      const imgY = 200;
      await drawRoundedImage(ctx, getImage(), imgX, imgY, imgSize, imgSize, 36, activeAccent, 5);

      ctx.textAlign = "center";
      ctx.font = "900 56px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      const mainTitle = getMainTitle();
      const titleLines = wrapText(ctx, mainTitle, width - padding * 2);
      titleLines.slice(0, 2).forEach((line, i) => ctx.fillText(line, width / 2, imgY + imgSize + 100 + i * 70));

      ctx.font = "600 28px sans-serif";
      ctx.fillStyle = activeAccent;
      ctx.fillText(getSubtitle(), width / 2, imgY + imgSize + 100 + Math.min(titleLines.length, 2) * 70 + 30);

      drawPills(ctx, details, padding, imgY + imgSize + 240, width - padding * 2, 2);

      const qrY = height - 200;
      await drawQr(ctx, padding, qrY, 150);
      ctx.textAlign = "left";
      ctx.font = "900 30px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Scan to View", padding + 180, qrY + 70);
    }
  };

  const drawWide = async (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const padding = 70;
    const details = getDetails();

    drawBackground(ctx, width, height);
    drawHeader(ctx, width, padding);

    const isMix = preview?.type === "mix";
    const isDj = preview?.type === "dj";

    if (isMix) {
      // Wide mix layout: square cover left, info right
      const imgSize = 400;
      const imgX = padding;
      const imgY = 150;
      await drawRoundedImage(ctx, getImage(), imgX, imgY, imgSize, imgSize, 28, activeAccent, 5);

      const contentX = imgX + imgSize + 50;
      const contentW = width - contentX - padding;

      drawBadge(ctx, getCategoryTag(), contentX, imgY + 10);

      ctx.font = "900 48px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      const mainTitle = getMainTitle();
      const titleLines = wrapText(ctx, mainTitle, contentW);
      titleLines.slice(0, 2).forEach((line, i) => ctx.fillText(line, contentX, imgY + 95 + i * 58));

      const subY = imgY + 95 + Math.min(titleLines.length, 2) * 58 + 20;
      ctx.font = "600 26px sans-serif";
      ctx.fillStyle = activeAccent;
      ctx.fillText(getSubtitle(), contentX, subY);

      drawPills(ctx, details, contentX, subY + 40, contentW, 2);

      await drawQr(ctx, contentX, height - 170, 120);
      ctx.textAlign = "left";
      ctx.font = "900 26px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Scan to Listen", contentX + 145, height - 118);
      ctx.font = "600 18px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillText("decksalone.com", contentX + 145, height - 88);
    } else if (isDj) {
      // Wide DJ layout: avatar left, content right
      const avatarSize = 360;
      const imgX = padding;
      const imgY = 150;
      await drawRoundedImage(ctx, getImage(), imgX, imgY, avatarSize, avatarSize, avatarSize / 2, activeAccent, 6);

      const contentX = imgX + avatarSize + 55;
      const contentW = width - contentX - padding;

      drawBadge(ctx, getCategoryTag(), contentX, imgY + 10);

      ctx.font = "900 52px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      const mainTitle = getMainTitle();
      const titleLines = wrapText(ctx, mainTitle, contentW);
      titleLines.slice(0, 2).forEach((line, i) => ctx.fillText(line, contentX, imgY + 95 + i * 64));

      const subY = imgY + 95 + Math.min(titleLines.length, 2) * 64 + 20;
      ctx.font = "600 26px sans-serif";
      ctx.fillStyle = activeAccent;
      ctx.fillText(getSubtitle(), contentX, subY);

      drawPills(ctx, details, contentX, subY + 40, contentW, 2);

      await drawQr(ctx, contentX, height - 170, 120);
      ctx.textAlign = "left";
      ctx.font = "900 26px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Scan to Book", contentX + 145, height - 118);
      ctx.font = "600 18px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillText("decksalone.com", contentX + 145, height - 88);
    } else {
      // Generic wide layout
      const imgSize = 380;
      const imgX = padding;
      const imgY = 150;
      await drawRoundedImage(ctx, getImage(), imgX, imgY, imgSize, imgSize, 28, activeAccent, 5);

      const contentX = imgX + imgSize + 50;
      const contentW = width - contentX - padding;

      drawBadge(ctx, getCategoryTag(), contentX, imgY + 10);

      ctx.font = "900 48px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      const mainTitle = getMainTitle();
      const titleLines = wrapText(ctx, mainTitle, contentW);
      titleLines.slice(0, 2).forEach((line, i) => ctx.fillText(line, contentX, imgY + 80 + i * 58));

      const subY = imgY + 80 + Math.min(titleLines.length, 2) * 58 + 20;
      ctx.font = "600 26px sans-serif";
      ctx.fillStyle = activeAccent;
      ctx.fillText(getSubtitle(), contentX, subY);

      drawPills(ctx, details, contentX, subY + 40, contentW, 2);

      await drawQr(ctx, contentX, height - 170, 120);
      ctx.textAlign = "left";
      ctx.font = "900 26px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Scan to View", contentX + 145, height - 118);
    }
  };

  const getCanvasBlob = useCallback(async (): Promise<{ blob: Blob; dataUrl: string } | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const { width, height } = getCanvasDimensions(format);
    canvas.width = width;
    canvas.height = height;

    if (format === "story") await drawStory(ctx, width, height);
    else if (format === "square") await drawSquare(ctx, width, height);
    else await drawWide(ctx, width, height);

    let dataUrl = "";
    try {
      dataUrl = canvas.toDataURL("image/png");
    } catch {
      // In case of any browser security block
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png", 1.0);
    });

    if (!blob) return null;
    return { blob, dataUrl: dataUrl || URL.createObjectURL(blob) };
  }, [preview, title, url, format, activeAccent]);

  // Handle Download PNG
  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const result = await getCanvasBlob();
      if (!result) {
        toast.error("Failed to generate share card");
        return;
      }
      const { blob } = result;
      const filename = `DeckSalone_${format}_${getMainTitle().replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = filename;
      link.href = objectUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 8000);

      toast.success(`HD ${formatLabels[format].label} card downloaded! 📸`);
    } catch (err) {
      console.error("Download card error:", err);
      toast.error("Error downloading share card");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Instagram Stories & Native Share
  const handleInstagramShare = async () => {
    setIsGenerating(true);
    try {
      // First copy link so user can paste the link sticker on Instagram
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {}

      const result = await getCanvasBlob();
      if (!result) {
        toast.error("Failed to generate Instagram Story card");
        return;
      }

      const { blob } = result;
      const filename = `DeckSalone_Story_${getMainTitle().replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      // If Web Share API supports file sharing (iOS Safari, Android Chrome, Capacitor Native)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Check out ${getMainTitle()} on Deck Salone!`,
          text: `Listen on Deck Salone: ${url}`,
          url,
        });
        toast.success("Ready! Link copied to clipboard 📎");
      } else {
        // Desktop / Non-file share fallback: auto download image + copy link + open Instagram
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = filename;
        link.href = objectUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 8000);

        toast.success("📸 Story Card downloaded & Link copied! Upload to your Instagram Story 🚀", {
          duration: 6000,
        });

        // Open Instagram in new window/tab
        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      }
    } catch {
      // User cancelled share dialog
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Mobile Direct Native Share
  const handleNativeShare = async () => {
    setIsGenerating(true);
    try {
      const result = await getCanvasBlob();
      if (!result) return;
      const { blob } = result;
      const file = new File([blob], `DeckSalone_${format}_${getMainTitle().replace(/[^a-zA-Z0-9_-]/g, "_")}.png`, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Check out ${getMainTitle()} on Deck Salone!`,
          text: `Scan or visit: ${url}`,
          url,
        });
        toast.success("Shared successfully!");
      } else {
        await handleDownload();
      }
    } catch {
      // User cancelled share
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const details = getDetails();

  const formatLabels: Record<CardFormat, { label: string; icon: React.ReactNode; desc: string }> = {
    story: { label: "Story", icon: <RectangleHorizontal size={14} />, desc: "9:16 • Instagram / Snapchat" },
    square: { label: "Post", icon: <Square size={14} />, desc: "1:1 • Feed / Twitter" },
    wide: { label: "Wide", icon: <ImageIcon size={14} />, desc: "1200×630 • Facebook / X" },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto pb-28 sm:pb-6">
          {/* Hidden Canvas & SVG QR container used for high-res PNG rendering */}
          <div className="hidden">
            <canvas ref={canvasRef} />
            <div ref={qrContainerRef}>
              <QRCodeSVG value={url} size={256} level="H" includeMargin={false} />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="relative w-full max-w-sm sm:max-w-md sm:rounded-3xl rounded-t-3xl bg-[#121110] border border-gold/40 shadow-2xl p-4 sm:p-5 text-left max-h-[85vh] overflow-y-auto mb-safe"
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
                <Sparkles size={12} /> Create Share Card
              </span>
            </div>

            {/* Format Selector */}
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Format</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(formatLabels) as CardFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={cn(
                      "flex flex-col items-center gap-1 px-2 py-2 rounded-xl border text-[10px] font-semibold transition-all",
                      format === f
                        ? "bg-gold/15 border-gold text-gold"
                        : "bg-white/5 border-white/10 text-text-secondary hover:border-white/20"
                    )}
                  >
                    {formatLabels[f].icon}
                    <span>{formatLabels[f].label}</span>
                    <span className="text-[8px] font-normal opacity-70 leading-tight text-center">
                      {formatLabels[f].desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Theme Selector */}
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1">
                <Palette size={10} /> Accent Color
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                {PRESET_THEMES.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setTheme(t)}
                    title={t.name}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-transform",
                      theme.name === t.name ? "border-white scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: t.accent }}
                  />
                ))}
                <div className="flex items-center gap-2 ml-1">
                  <input
                    type="color"
                    value={customAccent}
                    onChange={(e) => {
                      setCustomAccent(e.target.value);
                      setTheme({ name: "Custom", accent: e.target.value, accentLight: e.target.value, accentDark: e.target.value });
                    }}
                    className="w-7 h-7 rounded-full overflow-hidden border-0 p-0 cursor-pointer"
                    title="Custom color"
                  />
                  <span className="text-[10px] text-text-muted">Custom</span>
                </div>
              </div>
            </div>

            {/* Live Visual Preview */}
            <div
              className={cn(
                "relative w-full rounded-2xl bg-gradient-to-b from-[#0b0c10] via-[#14151c] to-[#0a0a0d] border border-gold/30 overflow-hidden shadow-card mx-auto",
                format === "story"
                  ? "max-w-[220px] aspect-[9/16]"
                  : format === "square"
                  ? "max-w-[240px] aspect-square"
                  : "max-w-[320px] aspect-[120/63]"
              )}
            >
              {/* Gold Top Light Glow Overlay */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 blur-3xl pointer-events-none"
                style={{ backgroundColor: hexToRgba(activeAccent, 0.2) }}
              />

              {/* Branding Top */}
              <div className="relative z-10 flex items-center justify-between border-b border-gold/20 px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-display font-black text-[9px] uppercase tracking-wider"
                    style={{ color: activeAccent }}
                  >
                    DECK SALONE
                  </span>
                  <span className="text-[7px] text-text-muted">• OFFICIAL PLATFORM</span>
                </div>
              </div>

              {/* Center Content */}
              {format === "wide" ? (
                // Horizontal Layout for Wide Cards
                <div className="relative z-10 p-2.5 flex items-center gap-3 h-[calc(100%-34px)]">
                  <div
                    className={cn(
                      "relative overflow-hidden border-2 shadow-lg shrink-0 aspect-square w-20 h-20",
                      preview?.type === "dj" ? "rounded-full" : "rounded-xl"
                    )}
                    style={{ borderColor: activeAccent }}
                  >
                    <img
                      src={getImage()}
                      alt={getMainTitle()}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/default-avatar.jpg";
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                    <span
                      className="px-1.5 py-0.2 border rounded-full text-[7px] font-bold uppercase tracking-wider inline-block self-start"
                      style={{ backgroundColor: hexToRgba(activeAccent, 0.2), borderColor: hexToRgba(activeAccent, 0.5), color: activeAccent }}
                    >
                      {getCategoryTag()}
                    </span>
                    <h3 className="font-display text-xs font-black text-white uppercase tracking-tight truncate">
                      {getMainTitle()}
                    </h3>
                    <p className="text-[9px] font-medium truncate" style={{ color: activeAccent }}>
                      {getSubtitle()}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="p-0.5 bg-white rounded shrink-0 shadow">
                        <QRCodeSVG value={url} size={28} level="H" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-[8px] font-bold text-white leading-tight">Scan to Listen</p>
                        <p className="text-[7px] text-text-muted leading-tight truncate">decksalone.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Vertical Layout for Story & Square Cards
                <div className="relative z-10 p-3 flex flex-col items-center justify-center h-[calc(100%-38px)] gap-2">
                  <div
                    className={cn(
                      "relative overflow-hidden border-2 shadow-lg shrink-0",
                      format === "square" ? "w-20 h-20" : "w-24 h-24",
                      preview?.type === "dj" ? "rounded-full" : "rounded-2xl"
                    )}
                    style={{ borderColor: activeAccent }}
                  >
                    <img
                      src={getImage()}
                      alt={getMainTitle()}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/default-avatar.jpg";
                      }}
                    />
                  </div>

                  <span
                    className="px-2 py-0.5 border rounded-full text-[8px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: hexToRgba(activeAccent, 0.2), borderColor: hexToRgba(activeAccent, 0.5), color: activeAccent }}
                  >
                    {getCategoryTag()}
                  </span>

                  <div className="text-center min-w-0 w-full">
                    <h3 className="font-display text-xs font-black text-white uppercase tracking-tight truncate px-2">
                      {getMainTitle()}
                    </h3>
                    <p className="text-[9px] font-medium truncate px-2" style={{ color: activeAccent }}>
                      {getSubtitle()}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-1 w-full px-1">
                    {details.slice(0, 4).map((d, idx) => (
                      <div
                        key={idx}
                        className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded flex items-center gap-1 min-w-0"
                      >
                        <span className="text-[8px] shrink-0">{d.icon}</span>
                        <span className="text-[7px] font-medium text-text-secondary truncate">{d.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="p-1 bg-white rounded-lg shrink-0 shadow-md">
                      <QRCodeSVG value={url} size={format === "square" ? 36 : 42} level="H" />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-[9px] font-bold text-white leading-tight">Scan to {preview?.type === "mix" ? "Listen" : preview?.type === "dj" ? "Book" : "View"}</p>
                      <p className="text-[7px] text-text-muted leading-tight truncate">decksalone.com</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 space-y-2">
              {/* Instagram Stories Direct Share */}
              <button
                onClick={handleInstagramShare}
                disabled={isGenerating}
                className="w-full py-2.5 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-bold text-xs uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 shadow-lg shadow-pink-500/20 cursor-pointer"
              >
                {isGenerating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <InstagramIcon size={15} />
                )}
                Share to Instagram Story
              </button>

              {/* Download HD PNG */}
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full py-2.5 bg-gold-gradient text-black font-bold text-xs uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 shadow-lg shadow-gold/20 cursor-pointer"
              >
                {isGenerating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Download HD {formatLabels[format].label} Card (PNG)
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleNativeShare}
                  disabled={isGenerating}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 size={13} />
                  Share Image
                </button>

                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    toast.success("Link copied!");
                  }}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
