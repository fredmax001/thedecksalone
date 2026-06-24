import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Search,
  MapPin,
  Calendar,
  Shield,
  Star,
  Clock,
  Headphones,
  CheckCircle,
  Send,
  Music,
  X,
  ChevronDown,
  ChevronRight,
  Disc,
  Briefcase,
  Mic,
  Lock,
  Tag,
  MessageCircleWarning,
  Check,
  Diamond,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { pricingGuide, trustPoints, faqData } from "@/lib/mockData";
import { useDJs, useDJCities, useDJGenres } from "@/hooks/useDJs";
import { useEventTypes } from "@/hooks/useEvents";
import { useCreateBooking, type BookingData } from "@/hooks/useBookings";
import { useAuthStore } from "@/stores/authStore";

/* ───── Types ───── */
interface FilterState {
  search: string;
  location: string;
  date: string;
  eventType: string[];
  genres: string[];
  budgetMin: number;
  budgetMax: number;
}

/* ───── Animation helpers ───── */
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

/* ───── Icon map for pricing guide ───── */
const pricingIcons: Record<string, React.ReactNode> = {
  ring: <Diamond size={32} className="text-gold" />,
  disc: <Disc size={32} className="text-gold" />,
  briefcase: <Briefcase size={32} className="text-gold" />,
  mic: <Mic size={32} className="text-gold" />,
};

/* ───── Trust icon map ───── */
const trustIcons: Record<string, React.ReactNode> = {
  "shield-check": <Shield size={48} className="text-gold" />,
  lock: <Lock size={48} className="text-gold" />,
  tag: <Tag size={48} className="text-gold" />,
  "message-circle-warning": <MessageCircleWarning size={48} className="text-gold" />,
};

interface BookingDJ {
  id: string;
  stageName: string;
  avatar?: string;
}

function parseDuration(value: string): number {
  const numeric = parseInt(value, 10);
  if (!isNaN(numeric)) return numeric;
  if (value.includes('1-2')) return 2;
  if (value.includes('2-3')) return 3;
  if (value.includes('3-4')) return 4;
  if (value.includes('4-5')) return 5;
  if (value.includes('5+')) return 6;
  return 3;
}

function parseBudget(value: string): number {
  const numeric = parseFloat(value);
  if (!isNaN(numeric)) return numeric;
  return 0;
}

/* ───── Booking Request Modal ───── */
function BookingRequestModal({
  isOpen,
  onClose,
  dj,
}: {
  isOpen: boolean;
  onClose: () => void;
  dj: BookingDJ | null;
}) {
  const { data: eventTypesData = [] } = useEventTypes();
  const createBooking = useCreateBooking();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [form, setForm] = useState({
    eventType: "",
    eventDate: "",
    venue: "",
    duration: "",
    requirements: "",
    budget: "",
  });

  const durations = ["1-2 hours", "2-3 hours", "3-4 hours", "4-5 hours", "5+ hours"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (createBooking.isPending || !dj) return;

    if (!isAuthenticated) {
      toast.info("Please log in to request a booking");
      window.location.href = "/login";
      return;
    }

    const data: BookingData = {
      djId: dj.id,
      eventType: form.eventType,
      eventDate: form.eventDate,
      eventLocation: form.venue,
      duration: parseDuration(form.duration),
      budget: parseBudget(form.budget),
      requirements: form.requirements,
    };

    createBooking.mutate(data, {
      onSuccess: () => {
        toast.success("Booking request sent successfully!");
        onClose();
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error || "Failed to send booking request.");
      },
    });
  };

  if (!isOpen || !dj) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />

        {/* Panel */}
        <motion.div
          className="relative z-10 w-full max-w-[560px] bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#1E1E1E] transition-colors"
          >
            <X size={20} className="text-text-muted" />
          </button>

          <h2 className="font-display text-xl sm:text-2xl font-semibold text-text-primary uppercase tracking-tight">
            Request Booking
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Book <span className="text-gold font-medium">{dj.stageName}</span> for your event
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {/* Event Type */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                Event Type
              </label>
              <select
                required
                className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              >
                <option value="">Select event type</option>
                {eventTypesData.map((t: any) => (
                  <option key={t.id || t.name || t} value={t.name || t}>
                    {t.name || t}
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Venue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Event Date
                </label>
                <input
                  required
                  type="date"
                  className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  Venue
                </label>
                <input
                  required
                  type="text"
                  placeholder="City or Venue"
                  className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                Duration
              </label>
              <select
                required
                className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              >
                <option value="">Select duration</option>
                {durations.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Special Requirements */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                Special Requirements
              </label>
              <textarea
                rows={3}
                placeholder="Any specific music preferences, equipment needs, etc."
                className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all resize-none"
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              />
            </div>

            {/* Budget */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                Budget (SLE)
              </label>
              <input
                required
                type="number"
                min={0}
                placeholder="Enter your budget"
                className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              />
            </div>

            {createBooking.isError && (
              <div className="rounded-lg bg-red-500/15 text-red-400 px-4 py-3 text-sm">
                {createBooking.error instanceof Error
                  ? createBooking.error.message
                  : "Failed to send booking request. Please try again."}
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={createBooking.isPending}
                className="w-full py-3.5 rounded-full bg-gold-gradient text-black text-sm font-semibold uppercase hover:scale-[1.02] transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {createBooking.isPending && <Loader2 size={16} className="animate-spin" />}
                {createBooking.isPending ? "Sending..." : "Submit Booking Request"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ───── Main Booking Page ───── */
export default function Booking() {
  const navigate = useNavigate();
  const [selectedDJ, setSelectedDJ] = useState<BookingDJ | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("recommended");
  const stepsRef = useRef(null);
  const stepsInView = useInView(stepsRef, { once: true, margin: "-100px" });

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    location: "",
    date: "",
    eventType: [],
    genres: [],
    budgetMin: 0,
    budgetMax: 100000,
  });

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data: djData, isLoading: djsLoading } = useDJs({
    search: filters.search || undefined,
    city: filters.location || undefined,
    genre: filters.genres[0] || undefined,
    minFee: filters.budgetMin > 0 ? filters.budgetMin : undefined,
    maxFee: filters.budgetMax < 100000 ? filters.budgetMax : undefined,
    page: 1,
    limit: 50,
  });
  const { data: citiesData = [] } = useDJCities();
  const { data: genresData = [] } = useDJGenres();
  const { data: eventTypesData = [] } = useEventTypes();

  const bookingDJs = useMemo(() => {
    const djs = djData?.data || [];
    return djs.map((dj: any) => ({
      id: dj.id,
      name: dj.stageName,
      avatar: dj.avatar || "",
      location: dj.city || "Sierra Leone",
      genres: dj.genres || [],
      verified: dj.verified,
      rating: dj.averageRating || 0,
      priceMin: dj.bookingFeeMin || 0,
      priceMax: dj.bookingFeeMax || dj.bookingFeeMin || 0,
      experience: dj.yearsActive || 0,
      responseTime: "24h",
    }));
  }, [djData]);

  // Filter DJs
  const filteredDJs = bookingDJs.filter((dj) => {
    if (filters.search && !dj.name.toLowerCase().includes(filters.search.toLowerCase()))
      return false;
    if (filters.location && !dj.location.includes(filters.location)) return false;
    if (filters.eventType.length > 0) {
      // Event type filtering - simplified
      const hasEventType = filters.eventType.some(() => true);
      if (!hasEventType) return false;
    }
    if (filters.genres.length > 0) {
      const hasGenre = dj.genres.some((g) => filters.genres.includes(g));
      if (!hasGenre) return false;
    }
    if (dj.priceMax < filters.budgetMin || dj.priceMin > filters.budgetMax) return false;
    return true;
  });

  const openBookingModal = (dj: BookingDJ) => {
    if (!isAuthenticated) {
      toast.info("Please log in to request a booking");
      window.location.href = "/login";
      return;
    }
    setSelectedDJ(dj);
    setIsModalOpen(true);
  };

  const toggleGenre = (genre: string) => {
    setFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const toggleEventType = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      eventType: prev.eventType.includes(type)
        ? prev.eventType.filter((t) => t !== type)
        : [...prev.eventType, type],
    }));
  };

  const steps = [
    {
      number: "01",
      icon: <Search size={28} className="text-gold" />,
      title: "Search",
      description:
        "Browse DJs by genre, location, budget, and availability. Filter until you find your match.",
    },
    {
      number: "02",
      icon: <Send size={28} className="text-gold" />,
      title: "Request",
      description:
        "Send a booking request with your event details. The DJ reviews and responds within 24 hours.",
    },
    {
      number: "03",
      icon: <CheckCircle size={28} className="text-gold" />,
      title: "Confirm",
      description:
        "Once accepted, pay a deposit to secure the booking. Full payment after the event.",
    },
    {
      number: "04",
      icon: <Music size={28} className="text-gold" />,
      title: "Enjoy",
      description:
        "Your DJ arrives, sets up, and delivers an unforgettable performance. Leave a review after!",
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-black">
      {/* ══════ Section 1: Page Hero ══════ */}
      <section className="pt-16 sm:pt-20 pb-12 sm:pb-14">
        <div className="container-main text-center">
          {/* Eyebrow */}
          <motion.span
            className="section-label"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Book a DJ
          </motion.span>

          {/* Title */}
          <motion.h1
            className="mt-4 font-display text-3xl sm:text-5xl font-semibold uppercase tracking-tight text-text-primary"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Find the Perfect DJ
            <br className="hidden sm:block" /> for Your Event
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="mt-4 text-base sm:text-lg text-text-secondary max-w-xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            From intimate weddings to stadium festivals — browse verified DJs,
            compare prices, and book securely in minutes.
          </motion.p>

          {/* Trust Badges */}
          <motion.div
            className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-8"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {[
              { icon: <Shield size={24} className="text-gold" />, label: "Secure Payments" },
              { icon: <Star size={24} className="text-gold" />, label: "Verified DJs" },
              { icon: <Clock size={24} className="text-gold" />, label: "Instant Confirmation" },
              { icon: <Headphones size={24} className="text-gold" />, label: "Direct Communication" },
            ].map((badge) => (
              <motion.div
                key={badge.label}
                className="flex items-center gap-2 text-text-muted"
                variants={staggerItem}
              >
                {badge.icon}
                <span className="text-xs font-medium uppercase tracking-wider">
                  {badge.label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════ Section 2: Search & Filters ══════ */}
      <section className="pb-8">
        <div className="container-main">
          <motion.div
            className="bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl p-4 sm:p-6 lg:p-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {/* Search Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative lg:col-span-1">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="text"
                  placeholder="What type of DJ?"
                  className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg pl-11 pr-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <div className="relative">
                <MapPin
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <select
                  className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg pl-11 pr-4 py-3 text-sm text-text-primary focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all appearance-none"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                >
                  <option value="">City or Venue</option>
                  {citiesData.map((loc: string) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Calendar
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="date"
                  className="w-full bg-[#181818] border border-[#1E1E1E] rounded-lg pl-11 pr-4 py-3 text-sm text-text-primary focus:border-gold focus:outline-none focus:ring-[3px] focus:ring-gold-glow transition-all"
                  value={filters.date}
                  onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                />
              </div>
              <button className="w-full py-3 rounded-full bg-gold-gradient text-black text-sm font-semibold uppercase hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                <Search size={16} />
                Search DJs
              </button>
            </div>

            {/* Filter Toggle (mobile) */}
            <button
              className="mt-4 lg:hidden flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={16} />
              Filters
              <ChevronDown
                size={14}
                className={cn(
                  "transition-transform",
                  showFilters && "rotate-180"
                )}
              />
            </button>

            {/* Expandable Filters */}
            <AnimatePresence>
              {(showFilters || typeof window !== "undefined") && (
                <motion.div
                  className={cn(
                    "overflow-hidden",
                    !showFilters && "hidden lg:block"
                  )}
                  initial={false}
                  animate={{
                    height: showFilters ? "auto" : "auto",
                    opacity: 1,
                  }}
                >
                  <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)] space-y-5">
                    {/* Event Type */}
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
                        Event Type
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {eventTypesData.map((t: any) => {
                          const type = t.name || t;
                          return (
                            <button
                              key={type}
                              onClick={() => toggleEventType(type)}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                filters.eventType.includes(type)
                                  ? "border border-gold text-gold bg-[rgba(212,162,74,0.1)]"
                                  : "border border-[#1E1E1E] text-text-muted hover:text-text-primary hover:border-[#2A2A2A]"
                              )}
                            >
                              {type}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Genre */}
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
                        Genre
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {genresData.map((genre: string) => (
                          <button
                            key={genre}
                            onClick={() => toggleGenre(genre)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                              filters.genres.includes(genre)
                                ? "border border-gold text-gold bg-[rgba(212,162,74,0.1)]"
                                : "border border-[#1E1E1E] text-text-muted hover:text-text-primary hover:border-[#2A2A2A]"
                            )}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Budget Range */}
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
                        Budget Range (SLE)
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min={0}
                          max={100000}
                          step={1000}
                          value={filters.budgetMax}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              budgetMax: parseInt(e.target.value),
                            })
                          }
                          className="flex-1 accent-gold"
                        />
                        <span className="font-mono-data text-sm text-gold whitespace-nowrap">
                          SLE {filters.budgetMin.toLocaleString()} –{" "}
                          {filters.budgetMax.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        {["Under 5K", "5K-15K", "15K-30K", "30K+"].map(
                          (preset) => (
                            <button
                              key={preset}
                              onClick={() => {
                                const ranges: Record<string, [number, number]> = {
                                  "Under 5K": [0, 5000],
                                  "5K-15K": [5000, 15000],
                                  "15K-30K": [15000, 30000],
                                  "30K+": [30000, 100000],
                                };
                                const [min, max] = ranges[preset];
                                setFilters({ ...filters, budgetMin: min, budgetMax: max });
                              }}
                              className="px-3 py-1 rounded-full border border-[rgba(255,255,255,0.15)] text-[10px] text-text-muted hover:text-gold hover:border-gold/30 transition-colors"
                            >
                              SLE {preset}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Clear filters */}
                    {(filters.genres.length > 0 ||
                      filters.eventType.length > 0 ||
                      filters.search ||
                      filters.location) && (
                      <button
                        onClick={() =>
                          setFilters({
                            search: "",
                            location: "",
                            date: "",
                            eventType: [],
                            genres: [],
                            budgetMin: 0,
                            budgetMax: 100000,
                          })
                        }
                        className="text-xs text-text-muted hover:text-gold transition-colors flex items-center gap-1"
                      >
                        <X size={12} />
                        Clear all filters
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ══════ Section 3: DJ Results ══════ */}
      <section className="pb-16">
        <div className="container-main">
          {/* Results header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold text-text-primary">
              <span className="font-mono-data text-gold">{filteredDJs.length}</span>{" "}
              <span className="text-text-muted font-normal">DJs found</span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Sort by:</span>
              <select
                className="bg-[#181818] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-text-primary focus:border-gold focus:outline-none"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="recommended">Recommended</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="experience">Most Experienced</option>
              </select>
            </div>
          </div>

          {/* DJ Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredDJs.map((dj, i) => (
                <motion.div
                  key={dj.id}
                  className="group bg-[#111111] border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden hover:border-[rgba(212,162,74,0.3)] hover:-translate-y-1 hover:shadow-card transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  layout
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Image */}
                    <div className="sm:w-[200px] shrink-0">
                      <div className="aspect-[4/3] sm:h-full sm:aspect-auto relative overflow-hidden">
                        <img
                          src={dj.avatar}
                          alt={dj.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/50 sm:bg-gradient-to-t sm:from-black/60 sm:to-transparent" />
                        {/* Price tag */}
                        <div className="absolute top-3 left-3 sm:bottom-3 sm:top-auto sm:left-3 sm:right-auto px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm">
                          <p className="font-mono-data text-sm text-gold font-semibold">
                            SLE {dj.priceMin.toLocaleString()}
                          </p>
                          <p className="text-[9px] text-text-muted">per event</p>
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-4 sm:p-5 flex flex-col">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display text-base font-semibold uppercase text-text-primary">
                            {dj.name}
                          </h4>
                          {dj.verified && (
                            <div className="w-4 h-4 rounded-full bg-green flex items-center justify-center shrink-0">
                              <Check size={10} className="text-white" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star size={13} className="fill-gold text-gold" />
                          <span className="font-mono-data text-xs text-gold">
                            {dj.rating}
                          </span>
                        </div>
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                        <MapPin size={11} />
                        {dj.location}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {dj.genres.map((genre) => (
                          <span
                            key={genre}
                            className="px-2 py-0.5 rounded-full border border-[rgba(255,255,255,0.1)] text-[10px] text-text-muted"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>

                      <p className="mt-2 text-xs text-text-muted">
                        {dj.experience}+ years active
                      </p>

                      {/* Availability */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green" />
                        </span>
                        <span className="text-xs text-text-secondary">
                          Available on your date
                        </span>
                        <span className="text-xs text-text-muted">
                          · {dj.responseTime} response
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="mt-auto pt-3 flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/dj/${dj.username || dj.id}`)}
                          className="flex-1 py-2 rounded-full border border-[rgba(255,255,255,0.15)] text-xs font-medium text-text-primary hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => openBookingModal(dj)}
                          className="flex-1 py-2 rounded-full bg-gold-gradient text-black text-xs font-semibold uppercase hover:scale-[1.02] transition-transform"
                        >
                          Request Booking
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {djsLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={40} className="text-gold animate-spin" />
            </div>
          )}
          {!djsLoading && filteredDJs.length === 0 && (
            <div className="text-center py-16 text-text-muted">
              <Search size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No DJs found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </section>

      {/* ══════ Section 4: How Booking Works ══════ */}
      <section ref={stepsRef} className="py-16 sm:py-24 bg-[#111111]">
        <div className="container-main">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="section-label">Simple Process</span>
            <h2 className="mt-3 font-display text-2xl sm:text-4xl font-semibold uppercase text-text-primary">
              How Booking Works
            </h2>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 relative">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                className="relative text-center"
                initial={{ opacity: 0, y: 30 }}
                animate={stepsInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.5,
                  delay: i * 0.4,
                  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                }}
              >
                {/* Number */}
                <span className="font-mono-data text-sm text-text-muted">
                  {step.number}
                </span>

                {/* Icon Circle */}
                <motion.div
                  className="mx-auto mt-3 w-14 h-14 rounded-full border-2 border-gold/40 flex items-center justify-center"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={stepsInView ? { scale: 1, opacity: 1 } : {}}
                  transition={{ duration: 0.4, delay: i * 0.4 + 0.1 }}
                >
                  {step.icon}
                </motion.div>

                <h3 className="mt-4 font-display text-lg font-semibold uppercase text-text-primary">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed max-w-[260px] mx-auto">
                  {step.description}
                </p>

                {/* Connector line (desktop only) */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-7 left-[calc(50%+28px)] w-[calc(100%-56px)] h-0.5">
                    <motion.div
                      className="h-full bg-[#1E1E1E] relative overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={stepsInView ? { opacity: 1 } : {}}
                    >
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-gold-gradient"
                        initial={{ width: "0%" }}
                        animate={stepsInView ? { width: "100%" } : {}}
                        transition={{
                          duration: 0.5,
                          delay: i * 0.4 + 0.4,
                          ease: "easeOut",
                        }}
                      />
                    </motion.div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ Section 5: Pricing Guide ══════ */}
      <section className="py-16 sm:py-24">
        <div className="container-main">
          {/* Header */}
          <div className="mb-10">
            <span className="section-label">Pricing</span>
            <h2 className="mt-3 font-display text-2xl sm:text-4xl font-semibold uppercase text-text-primary">
              Typical Price Ranges
            </h2>
            <p className="mt-3 text-base text-text-secondary max-w-lg">
              Prices vary by DJ experience, event type, and duration. These are
              average ranges.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingGuide.map((pricing, i) => (
              <motion.div
                key={pricing.eventType}
                className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 hover:border-[rgba(212,162,74,0.3)] hover:-translate-y-1 hover:shadow-card transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: i * 0.12,
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                }}
              >
                {pricingIcons[pricing.icon]}
                <h4 className="mt-4 font-display text-lg font-semibold uppercase text-text-primary">
                  {pricing.eventType}
                </h4>
                <p className="mt-2 font-mono-data text-xl text-gold font-semibold">
                  {pricing.priceRange}
                </p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">
                  per event
                </p>

                <div className="my-4 h-px bg-[#1E1E1E]" />

                <ul className="space-y-2">
                  {pricing.includes.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-text-secondary"
                    >
                      <Check size={14} className="text-gold mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button className="mt-5 text-sm text-gold hover:text-gold-light transition-colors flex items-center gap-1 font-medium">
                  Browse DJs
                  <ChevronRight size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ Section 6: Trust & Safety ══════ */}
      <section className="py-16 sm:py-24 bg-[#111111]">
        <div className="container-main">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="section-label">Trust & Safety</span>
            <h2 className="mt-3 font-display text-2xl sm:text-4xl font-semibold uppercase text-text-primary">
              Why Book Through Sound It?
            </h2>
          </div>

          {/* Trust Points Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
            {trustPoints.map((point, i) => (
              <motion.div
                key={point.title}
                className="flex gap-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: i * 0.1,
                  duration: 0.5,
                }}
              >
                <motion.div
                  className="shrink-0"
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 + 0.1, duration: 0.3 }}
                >
                  {trustIcons[point.icon]}
                </motion.div>
                <div>
                  <h4 className="font-display text-lg font-semibold text-text-primary">
                    {point.title}
                  </h4>
                  <p className="mt-1 text-sm text-text-secondary leading-relaxed">
                    {point.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="mt-16">
            <h3 className="font-display text-xl font-semibold uppercase text-text-primary mb-6">
              Frequently Asked Questions
            </h3>
            <div className="space-y-3">
              {faqData.map((faq, i) => (
                <motion.div
                  key={i}
                  className="bg-black border border-[rgba(255,255,255,0.05)] rounded-xl overflow-hidden"
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  <details className="group">
                    <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer list-none">
                      <span className="text-sm font-medium text-text-primary pr-4">
                        {faq.question}
                      </span>
                      <ChevronDown
                        size={18}
                        className="text-text-muted shrink-0 group-open:rotate-180 transition-transform"
                      />
                    </summary>
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </details>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <motion.div
            className="mt-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 className="font-display text-xl font-semibold text-text-primary">
              Ready to book?
            </h3>
            <button className="mt-4 px-8 py-3.5 rounded-full bg-gold-gradient text-black text-sm font-semibold uppercase hover:scale-[1.02] transition-transform inline-flex items-center gap-2">
              <Search size={16} />
              Browse {bookingDJs.length} Verified DJs
            </button>
          </motion.div>
        </div>
      </section>

      {/* ══════ Booking Request Modal ══════ */}
      <BookingRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dj={selectedDJ}
      />
    </div>
  );
}
