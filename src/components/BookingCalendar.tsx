import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
  Sun,
  Sunset,
  Moon,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';

export interface TimeSlotOption {
  id: 'MORNING' | 'AFTERNOON' | 'EVENING_NIGHT';
  label: string;
  period: string;
  icon: typeof Sun;
  description: string;
}

export const STANDARD_TIME_SLOTS: TimeSlotOption[] = [
  {
    id: 'MORNING',
    label: 'Morning Slot',
    period: '08:00 – 13:00',
    icon: Sun,
    description: 'Daytime events, ceremonies & breakfast/brunch parties',
  },
  {
    id: 'AFTERNOON',
    label: 'Afternoon / Sunset Slot',
    period: '13:00 – 18:00',
    icon: Sunset,
    description: 'Pool parties, beach events, weddings & daytime receptions',
  },
  {
    id: 'EVENING_NIGHT',
    label: 'Night / Prime Event Slot',
    period: '18:00 – 02:00',
    icon: Moon,
    description: 'Club nights, concerts, festivals, dinner dances & afterparties',
  },
];

interface BookingCalendarProps {
  djId: string;
  selectedDate: string; // YYYY-MM-DD
  selectedSlot?: string; // 'MORNING' | 'AFTERNOON' | 'EVENING_NIGHT'
  onSelectDate: (dateStr: string) => void;
  onSelectSlot: (slotId: string) => void;
}

export function BookingCalendar({
  djId,
  selectedDate,
  selectedSlot,
  onSelectDate,
  onSelectSlot,
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!Number.isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [loading, setLoading] = useState(false);
  const [availabilityData, setAvailabilityData] = useState<{
    blockedDates: string[];
    dailyAvailability: Record<string, { count: number; bookedSlots: string[]; isFullyBooked: boolean }>;
  }>({
    blockedDates: [],
    dailyAvailability: {},
  });

  const monthKey = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [currentMonth]);

  useEffect(() => {
    if (!djId) return;
    let isMounted = true;
    setLoading(true);

    api
      .get(`/bookings/dj/${djId}/availability?month=${monthKey}`)
      .then((res) => {
        if (isMounted && res.data.success) {
          setAvailabilityData({
            blockedDates: res.data.data.blockedDates || [],
            dailyAvailability: res.data.data.dailyAvailability || {},
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load DJ availability calendar', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [djId, monthKey]);

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    const today = new Date();
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    // Don't allow navigating further than previous month
    if (prev.getFullYear() < today.getFullYear() || (prev.getFullYear() === today.getFullYear() && prev.getMonth() < today.getMonth())) {
      return;
    }
    setCurrentMonth(prev);
  };

  // Build calendar matrix
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: ({ dateStr: string; dayNum: number; isCurrentMonth: boolean; isPast: boolean } | null)[] = [];

    // Empty lead cells
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    for (let d = 1; d <= totalDays; d++) {
      const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = dayDateStr < todayStr;
      days.push({
        dateStr: dayDateStr,
        dayNum: d,
        isCurrentMonth: true,
        isPast,
      });
    }

    return days;
  }, [currentMonth]);

  // Selected date info
  const selectedDayInfo = useMemo(() => {
    if (!selectedDate) return null;
    const isBlocked = availabilityData.blockedDates.includes(selectedDate);
    const dayStats = availabilityData.dailyAvailability[selectedDate] || { count: 0, bookedSlots: [], isFullyBooked: false };
    const remainingSlots = Math.max(0, 3 - dayStats.count);
    return {
      dateStr: selectedDate,
      isBlocked,
      bookedCount: dayStats.count,
      bookedSlots: dayStats.bookedSlots || [],
      isFullyBooked: dayStats.isFullyBooked || dayStats.count >= 3,
      remainingSlots,
    };
  }, [selectedDate, availabilityData]);

  return (
    <div className="bg-[#121212] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-display uppercase tracking-wide">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <p className="text-xs text-text-muted">Max 3 events per day • Select date & time slot</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-text-muted uppercase">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="relative min-h-[220px]">
        {loading && (
          <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
            <Loader2 className="w-6 h-6 text-gold animate-spin" />
          </div>
        )}

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarDays.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }

            const { dateStr, dayNum, isPast } = day;
            const isSelected = selectedDate === dateStr;
            const isBlocked = availabilityData.blockedDates.includes(dateStr);
            const dayStats = availabilityData.dailyAvailability[dateStr] || { count: 0, bookedSlots: [], isFullyBooked: false };
            const isFullyBooked = dayStats.isFullyBooked || dayStats.count >= 3;
            const isDisabled = isPast || isBlocked || isFullyBooked;

            // Slot badge indicator
            let badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            let statusText = '3 open';

            if (isPast) {
              statusText = 'Past';
            } else if (isBlocked) {
              badgeColor = 'bg-red-500/10 text-red-400 border-red-500/20';
              statusText = 'Blocked';
            } else if (isFullyBooked) {
              badgeColor = 'bg-red-500/20 text-red-400 border-red-500/40';
              statusText = 'Full';
            } else if (dayStats.count === 2) {
              badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
              statusText = '1 left';
            } else if (dayStats.count === 1) {
              badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
              statusText = '2 left';
            }

            return (
              <button
                type="button"
                key={dateStr}
                disabled={isDisabled}
                onClick={() => {
                  onSelectDate(dateStr);
                  const booked = dayStats.bookedSlots || [];
                  if (selectedSlot && booked.includes(selectedSlot)) {
                    const openSlot = STANDARD_TIME_SLOTS.find((s) => !booked.includes(s.id));
                    if (openSlot) {
                      onSelectSlot(openSlot.id);
                    }
                  }
                }}
                className={`group relative flex flex-col items-center justify-between p-1 sm:p-1.5 rounded-xl border transition-all aspect-square text-left ${
                  isSelected
                    ? 'bg-gold text-black font-bold border-gold shadow-[0_0_15px_rgba(244,224,89,0.3)] scale-[1.03] z-10'
                    : isDisabled
                    ? 'bg-white/[0.02] border-white/5 opacity-40 cursor-not-allowed'
                    : 'bg-white/[0.04] border-white/10 hover:border-gold/50 hover:bg-white/[0.08] text-white'
                }`}
              >
                <span className={`text-xs sm:text-sm font-semibold ${isSelected ? 'text-black' : 'text-white'}`}>
                  {dayNum}
                </span>

                {!isPast && (
                  <span
                    className={`text-[8px] sm:text-[9px] px-1 py-0.2 rounded font-mono leading-tight border truncate max-w-full ${
                      isSelected ? 'bg-black/20 text-black border-black/30' : badgeColor
                    }`}
                  >
                    {statusText}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Time Slot Selection */}
      <AnimatePresence mode="wait">
        {selectedDate && selectedDayInfo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="pt-4 border-t border-white/10 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gold" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Available Slots for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </h4>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                {selectedDayInfo.remainingSlots}/3 Slots Open
              </span>
            </div>

            {selectedDayInfo.isBlocked ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>The DJ is unavailable on this date. Please pick another date on the calendar.</span>
              </div>
            ) : selectedDayInfo.isFullyBooked ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>All 3 booking slots for this date are fully booked. Please select another date.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {STANDARD_TIME_SLOTS.map((slot) => {
                  const Icon = slot.icon;
                  const isBooked = selectedDayInfo.bookedSlots.includes(slot.id);
                  const isSlotSelected = selectedSlot === slot.id;

                  return (
                    <button
                      type="button"
                      key={slot.id}
                      disabled={isBooked}
                      onClick={() => onSelectSlot(slot.id)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all relative overflow-hidden ${
                        isBooked
                          ? 'bg-white/[0.02] border-white/5 opacity-40 cursor-not-allowed text-text-muted'
                          : isSlotSelected
                          ? 'bg-gold-gradient text-black font-semibold border-gold shadow-[0_0_12px_rgba(244,224,89,0.3)] scale-[1.02]'
                          : 'bg-white/[0.03] border-white/10 hover:border-gold/40 hover:bg-white/[0.06] text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isSlotSelected ? 'text-black' : isBooked ? 'text-text-muted' : 'text-gold'}`} />
                          <span className="text-xs font-bold">{slot.label}</span>
                        </div>
                        {isSlotSelected && <CheckCircle2 className="w-4 h-4 text-black shrink-0" />}
                      </div>

                      <div className="text-[11px] font-mono tracking-tight opacity-90">
                        {slot.period}
                      </div>

                      <p className={`text-[10px] leading-tight line-clamp-2 ${isSlotSelected ? 'text-black/80' : 'text-text-muted'}`}>
                        {isBooked ? '⛔ Already Booked' : slot.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
