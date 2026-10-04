import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { supabaseClient } from "../integrations/supabase/client";
import { useAuth } from "../contexts/auth-context";
import AddEventDialog from "../components/AddEventDialog";
import MonthCalendar from "../components/MonthCalendar";

const Calendar = () => {
  const navigate = useNavigate();

  const { user } = useAuth();
  const [events, setEvents] = useState<Array<any>>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [cleanupStatus, setCleanupStatus] = useState<{ lastRun?: string | null; lastRemoved?: number | null } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoaded(false);
      try {
        const { data, error } = await supabaseClient
          .from('events')
          .select('*');
        if (error) throw error;
        const sorted = (data || []).slice().sort((a: any, b: any) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
        setEvents(sorted);
      } catch (err) {
        console.error('Failed to load events (Supabase)', err);        // Try a Supabase fallback with generic select('*') and client-side sort
        try {
          const { data, error } = await supabaseClient.from('events').select('*');
          if (!error && data) {
            const sorted = data.slice().sort((a: any, b: any) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
            setEvents(sorted);
          } else if (error) {
            console.debug('Supabase fallback error:', error);
          }
        } catch (sbErr) {
          console.debug('Supabase fallback failed:', sbErr);
        }
      } finally {
        setLoaded(true);
      }
    };

    load();

    // poll cleanup-status so developer can see the auto-delete runs
    const loadCleanupStatus = async () => {
      try {
        const res = await fetch('/api/internal/cleanup-status');
        if (!res.ok) return;
        const body = await res.json();
        setCleanupStatus(body);
      } catch (e) {
        // ignore — status is optional
      }
    };
    loadCleanupStatus();
    const pollId = setInterval(loadCleanupStatus, 60_000);

    return () => {
      clearInterval(pollId);
    };
  }, []);

  // Realtime subscription: auto-refresh when `events` change in Supabase (INSERT / UPDATE / DELETE)
  useEffect(() => {
    const channel = supabaseClient
      .channel('public:events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload: any) => {
        try {
          const type = payload.eventType ?? payload.type ?? payload.event;
          const newRow = payload.new ?? payload.record ?? null;
          const oldRow = payload.old ?? null;
          if (!newRow && !oldRow) return;

          setEvents((prev) => {
            const list = (prev || []).slice();

            if (type === 'INSERT') {
              // avoid duplicate when this client already added the event
              if (!list.some((x) => x.id === newRow.id)) list.push(newRow);
            } else if (type === 'UPDATE') {
              const idx = list.findIndex((x) => x.id === newRow.id);
              if (idx !== -1) list[idx] = newRow; else list.push(newRow);
            } else if (type === 'DELETE') {
              return list.filter((x) => x.id !== (oldRow?.id ?? newRow?.id));
            }

            return list.sort((a: any, b: any) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
          });
        } catch (err) {
          console.debug('Realtime handler error', err);
        }
      })
      .subscribe();

    return () => {
      try {
        supabaseClient.removeChannel(channel);
      } catch (e) {
        // best-effort cleanup
        console.debug('Failed to remove realtime channel', e);
      }
    };
  }, []);

  const formatEventTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (isToday) return `Today, ${time}`;
    return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) + ` · ${time}`;
  };

  // sort events by time; display everything fetched from the database (cleanup job will remove old rows)

  const sortByDatetimeAsc = (arr: Array<any>) =>
    arr.slice().sort((a: any, b: any) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  const allSorted = sortByDatetimeAsc(events);

  const visibleEvents = selectedDate
    ? sortByDatetimeAsc(
        allSorted.filter((ev) => new Date(ev.datetime).toDateString() === new Date(selectedDate).toDateString())
      )
    : allSorted;

  return (
    <div className="min-h-[calc(100vh-6rem)] py-6 px-4 lg:px-8">
      <div className="flex justify-center lg:justify-end">
        <div className="w-full lg:w-[320px]">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">Upcoming events</div>
                <div className="text-xs text-white/60 mt-1">{selectedDate ? `Events for ${new Date(selectedDate).toLocaleDateString()}` : 'Events & deadlines'}</div>
                <div className="text-2xs text-white/40 mt-1">Last cleanup: {cleanupStatus?.lastRun ? new Date(cleanupStatus.lastRun).toLocaleString() : 'n/a'}{cleanupStatus?.lastRemoved != null ? ` — removed ${cleanupStatus.lastRemoved}` : ''}</div>
              </div> 

              <div className="flex items-center gap-2">
                {user && (user.role === "admin" || user.role === "super_admin") && (
                  <AddEventDialog
                    onAdd={(ev) =>
                      setEvents((p) => {
                        const next = (p || []).concat(ev);
                        return next.slice().sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
                      })
                    }
                  />
                )}

                {/* Run cleanup now (admin only) */}
                {user && (user.role === "admin" || user.role === "super_admin") && (
                  <button
                    className="text-2xs text-white/60 hover:underline ml-2"
                    onClick={async () => {
                      try {
                        const r = await fetch('/api/internal/run-cleanup', { method: 'POST' });
                        if (!r.ok) throw new Error('cleanup failed');
                        const body = await r.json();
                        setCleanupStatus(body.status ?? null);
                        // refresh events immediately
                        const { data, error } = await supabaseClient.from('events').select('*');
                        if (!error && data) {
                          const sorted = data.slice().sort((a: any, b: any) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
                          setEvents(sorted);
                        }
                        alert('Cleanup executed — check status line');
                      } catch (err) {
                        console.error(err);
                        alert('Failed to run cleanup');
                      }
                    }}
                    title="Run cleanup now"
                  >
                    Run cleanup
                  </button>
                )}

                <Link to="/" className="text-xs text-white/60 hover:underline">
                  Back to dashboard
                </Link>
                {selectedDate && (
                  <button className="text-xs text-white/60 hover:underline ml-2" onClick={() => setSelectedDate(null)}>
                    Clear filter
                  </button>
                )}

                <button
                  className="p-2 rounded-md hover:bg-white/5"
                  aria-label="Close calendar"
                  onClick={() => navigate(-1)}
                  title="Close"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/80">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-2 overflow-auto">
              {!loaded ? (
                <div className="text-sm text-white/60">Loading events…</div>
              ) : visibleEvents.length === 0 ? (
                <div className="text-sm text-white/60">No upcoming events.</div>
              ) : null}

              {visibleEvents.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 py-3 border-b border-white/6 last:border-b-0">
                  <div className="w-28 text-xs text-white/60">{formatEventTime(ev.datetime)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm">{ev.title}</div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/70 capitalize">{ev.kind ?? "other"}</span>
                    </div>
                    <div className="text-xs text-white/60 mt-1 flex items-center gap-3">
                      <span>{ev.module}</span>
                      {ev.mention_date && (
                        <span className="text-xs text-red-400">Mention: {new Date(ev.mention_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  {user && (user.role === "admin" || user.role === "super_admin") && (
                    <div className="flex flex-col gap-2 items-end">
                      <AddEventDialog
                        initialEvent={{ id: ev.id, title: ev.title, datetime: ev.datetime, module: ev.module ?? "", kind: (ev.kind === 'assignment' || ev.kind === 'quiz') ? ev.kind : 'other' }}
                        onUpdate={(updated) => setEvents((prev) => {
                        const next = (prev || []).map((x) => (x.id === updated.id ? updated : x));
                        return next.slice().sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
                      })}
                        triggerClassName="btn-ghost px-2 py-1 text-xs"
                        triggerChildren={<span>Edit</span>}
                      />

                      <button
                        className="btn-ghost px-2 py-1 text-xs"
                        onClick={async () => {
                          if (!confirm("Delete this event?")) return;
                          try {
                            const { error } = await supabaseClient.from('events').delete().eq('id', ev.id);
                            if (error) throw error;
                            setEvents((prev) => prev.filter((e) => e.id !== ev.id));
                          } catch (err) {
                            alert('Failed to delete event');
                            console.error(err);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {loaded && (
                <div className="mt-4 border-t border-white/6 pt-4">
                  <div className="text-xs text-white/60 mb-2">Month</div>
                  <MonthCalendar compact events={allSorted} selectedDate={selectedDate} onSelectDate={(d: string | null) => setSelectedDate(d)} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6 flex justify-center lg:justify-end">
        <div className="w-full lg:w-[640px]">
          <Card>
            <CardHeader>
              <div>
                <div className="text-sm font-semibold">Month calendar</div>
                <div className="text-xs text-white/60 mt-1">Click a date to filter events below</div>
              </div>
            </CardHeader>

            <CardContent>
              <MonthCalendar
                events={allSorted}
                selectedDate={selectedDate}
                onSelectDate={(d: string | null) => setSelectedDate(d)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
