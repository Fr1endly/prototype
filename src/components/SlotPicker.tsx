import { useEffect, useState } from 'react';

interface Props {
  eventTypeId: number;
  selected: string | null;
  onSelect: (iso: string) => void;
}

interface SlotsResponse {
  slots?: Record<string, { start: string }[]>;
  error?: string;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function SlotPicker({ eventTypeId, selected, onSelect }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [slots, setSlots] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    const start = weekStart.toISOString();
    const end = addDays(weekStart, 7).toISOString();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      eventTypeId: String(eventTypeId),
      start,
      end,
      timeZone,
    });

    fetch(`/api/slots?${params}`)
      .then((r) => r.json() as Promise<SlotsResponse>)
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setSlots({});
        } else {
          console.log('Fetched slots data:', data);
          // ts ignore
          setSlots(data.slots?.data ?? {});
        }
      })
      .catch(() => setError('Failed to load available times'))
      .finally(() => setLoading(false));
  }, [eventTypeId, weekStart, timeZone]);

  useEffect(() => {
    console.log('slots:', slots);
    
  }, [slots]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const key = d.toISOString().slice(0, 10);
    console.log(`Processing day ${key} with slots:`, slots[key]);
    return { date: d, key, daySlots: slots[key] ?? [] };
  });
  console.log('Days with slots:', days);

  const canGoPrev = weekStart > startOfWeek(new Date());

  return (
    <div className="flex flex-col gap-4">
      {/* Week nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          disabled={!canGoPrev}
          className="text-xs tracking-widest uppercase text-[#3B2A1A]/60 hover:text-[#C9897A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-1"
        >
          ← Prev
        </button>
        <span className="text-sm font-medium text-[#3B2A1A]">
          {formatDate(weekStart)} – {formatDate(addDays(weekStart, 6))}
        </span>
        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="text-xs tracking-widest uppercase text-[#3B2A1A]/60 hover:text-[#C9897A] transition-colors px-3 py-1"
        >
          Next →
        </button>
      </div>

      {loading && (
        <p className="text-center text-sm text-[#8A9E85] py-8">Loading available times…</p>
      )}

      {error && (
        <p className="text-center text-sm text-red-500 py-8">{error}</p>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {days.map(({ date, daySlots }) => (
            <div key={date.toISOString()} className="flex flex-col gap-1.5">
              <p className="text-xs text-center font-medium text-[#3B2A1A]/70 tracking-wider uppercase pb-1 border-b border-[#EDE5D8]">
                {date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
              </p>
              {daySlots.length === 0 ? (
                <p className="text-[10px] text-center text-[#3B2A1A]/30 py-2">—</p>
              ) : (
                daySlots.map((slot: any) => (
                  <button
                    key={slot.start}
                    onClick={() => onSelect(slot.start)}
                    className={`text-xs py-1.5 px-1 text-center transition-all duration-150 ${
                      selected === slot.start
                        ? 'bg-[#C9897A] text-white'
                        : 'bg-[#EDE5D8]/60 text-[#3B2A1A]/70 hover:bg-[#C9897A]/20'
                    }`}
                  >
                    {formatTime(slot.start)}
                  </button>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
