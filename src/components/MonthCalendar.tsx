import { useEffect, useMemo, useState } from "react";

type Props = {
  events: any[];
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
  compact?: boolean;
};

export default function MonthCalendar({ events, selectedDate = null, onSelectDate, compact = false }: Props) {
  const [cursor, setCursor] = useState<Date>(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [selectedDate]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, any[]>();
    events.forEach((ev) => {
      if (!ev?.datetime) return;
      const key = new Date(ev.datetime).toDateString();
      const list = m.get(key) ?? [];
      list.push(ev);
      m.set(key, list);
    });
    return m;
  }, [events]);

  // dates specifically marked as a "mention date" (shown with a red ring)
  const mentionDates = useMemo(() => {
    const s = new Set<string>();
    events.forEach((ev) => {
      if (!ev?.mention_date) return;
      const key = new Date(ev.mention_date).toDateString();
      s.add(key);
    });
    return s;
  }, [events]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // always return a boolean so `aria-pressed` receives a valid value
  const isSelected = (d: Date) => !!selectedDate && new Date(selectedDate).toDateString() === d.toDateString();

  return (
    <div className="w-full">
      <div className={`flex items-center justify-between mb-3 ${compact ? 'px-1' : ''}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost px-2 py-1"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label="Previous month"
          >
            ◀
          </button>

          <div className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>
            {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </div>

          <button
            type="button"
            className="btn-ghost px-2 py-1"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label="Next month"
          >
            ▶
          </button>
        </div>

        {!compact && <div className="text-xs text-white/60">Total events: {events.length}</div>}
      </div>

      <div className={`grid grid-cols-7 ${compact ? 'gap-0.5 text-[11px] text-white/60' : 'gap-1 text-xs text-white/60'}`}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center font-medium">
            {compact ? d[0] : d}
          </div>
        ))}
      </div>

      <div className={`mt-2 grid grid-cols-7 ${compact ? 'gap-0.5' : 'gap-1'}`}>
        {weeks.map((week, wi) => (
          <div key={wi} className="contents">
            {week.map((cell, ci) => {
              if (!cell) return <div key={ci} className={compact ? 'h-8 p-1 bg-transparent' : 'h-20 p-2 bg-white/2 rounded-sm'} />;
              const key = cell.toDateString();
              const evs = eventsByDate.get(key) ?? [];
              const selected = isSelected(cell);
              const hasMention = mentionDates.has(key);
              const hasEvents = evs.length > 0;

              if (compact) {
                return (
                  <button
                    key={ci}
                    type="button"
                    className={`h-8 p-1 flex flex-col items-center justify-center rounded-sm ${selected ? 'ring-2 ring-violet-500 bg-violet-600/20' : ''}`}
                    onClick={() => (onSelectDate ? onSelectDate(cell.toISOString()) : undefined)}
                    aria-pressed={selected}
                    title={`${cell.toDateString()} — ${evs.length} event(s)`}
                  >
                    <div className={`w-5 h-5 flex items-center justify-center text-[11px] ${selected ? 'bg-violet-600 text-white rounded-full font-semibold' : ''} ${hasMention ? 'ring-2 ring-red-500 rounded-full' : ''} ${hasEvents && !selected ? 'text-red-400 font-semibold' : ''}`}>
                      {cell.getDate()}
                    </div>

                    <div className="mt-1 flex gap-0.5">
                      {evs.slice(0, 3).map((_, idx) => (
                        <span key={idx} className={`w-1.5 h-1.5 rounded-full inline-block ${hasEvents ? 'bg-red-400' : 'bg-violet-500'}`} />
                      ))}
                    </div>
                  </button>
                );
              }

              return (
                <button
                  key={ci}
                  type="button"
                  className={`h-20 p-2 text-left rounded-sm hover:bg-white/5 ${selected ? 'ring-2 ring-violet-500 bg-violet-600/20' : 'bg-white/2'}`}
                  onClick={() => (onSelectDate ? onSelectDate(cell.toISOString()) : undefined)}
                  aria-pressed={selected}
                  title={`${cell.toDateString()} — ${evs.length} event(s)`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-6 h-6 flex items-center justify-center text-xs ${selected ? 'bg-violet-600 text-white rounded-full font-semibold' : ''} ${hasMention ? 'ring-2 ring-red-500 rounded-full' : ''} ${hasEvents && !selected ? 'text-red-400 font-semibold' : ''}`}>
                      {cell.getDate()}
                    </div>

                    {evs.length > 0 && <div className={`text-xs ${hasEvents ? 'text-red-400' : 'text-white/70'}`}>{evs.length}</div>}
                  </div>

                  <div className="mt-1 text-xs text-white/60 overflow-hidden">
                    {evs.slice(0, 2).map((e, idx) => (
                      <div key={idx} className="truncate leading-4 text-[11px]">
                        {e.title}
                      </div>
                    ))}
                    {evs.length > 2 && <div className="text-xs text-white/40">+{evs.length - 2} more</div>}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
