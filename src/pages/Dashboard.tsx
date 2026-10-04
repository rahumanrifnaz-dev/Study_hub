import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import AddEventDialog from "../components/AddEventDialog";
import MonthCalendar from "../components/MonthCalendar";
import { useAuth } from "../contexts/auth-context";
import { supabaseClient } from "../integrations/supabase/client";
import { subjects } from "../lib/subjects";

const Dashboard = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [latestByModule, setLatestByModule] = useState<Record<string, string | null>>({});

  const moduleSources: Record<string, { tableName: string }> = {
    cs2833: { tableName: "msd_uploads" },
    ee2024: { tableName: "ee2024_uploads" },
    ee2044: { tableName: "ee2044_uploads" },
    ee2054: { tableName: "ee2054_uploads" },
    ee3074: { tableName: "ee3074_uploads" },
    ma3014: { tableName: "ma3014_uploads" },
    ma3024: { tableName: "ma3024_uploads" },
    cs2023: { tableName: "cs2023_uploads" },
    ma2034: { tableName: "ma2034_uploads" },
  };

  useEffect(() => {
    let isMounted = true;
    const loadLatest = async () => {
      const entries = await Promise.all(
        Object.entries(moduleSources).map(async ([moduleId, { tableName }]) => {
          const { data, error } = await supabaseClient
            .from(tableName)
            .select("uploaded_at")
            .order("uploaded_at", { ascending: false })
            .limit(1);
          if (error || !data || data.length === 0) {
            return [moduleId, null] as const;
          }
          return [moduleId, data[0].uploaded_at as string] as const;
        })
      );
      if (isMounted) {
        setLatestByModule(Object.fromEntries(entries));
      }
    };

    // load events from Supabase
    const loadEvents = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('events')
          .select('*');
        if (error) {
          console.debug('Supabase /events select failed', error);
          if (isMounted) setEvents([]);
          return;
        }
        const sorted = (data || []).slice().sort((a: any, b: any) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
        if (isMounted) setEvents(sorted);
      } catch (err) {
        // network / fetch failure — keep this at error level for diagnostics
        console.error('Failed to load events (Supabase)', err);
        if (isMounted) setEvents([]);
      }
    }; 

    loadLatest();
    loadEvents();

    return () => {
      isMounted = false;
    };
  }, [user?.token]);

  const orderedSubjects = useMemo(() => {
    return subjects
      .map((subject, index) => ({ ...subject, _index: index }))
      .sort((a, b) => {
        const aTime = latestByModule[a.id];
        const bTime = latestByModule[b.id];
        if (aTime && bTime) {
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        }
        if (aTime && !bTime) return -1;
        if (!aTime && bTime) return 1;
        return a._index - b._index;
      });
  }, [latestByModule]);

  const filteredSubjects = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return orderedSubjects;
    return orderedSubjects.filter(
      (subject) =>
        subject.name.toLowerCase().includes(term) ||
        subject.code.toLowerCase().includes(term) ||
        subject.tag.toLowerCase().includes(term)
    );
  }, [orderedSubjects, query]);

  // Events are loaded from the database (no local/static entries)
  const [events, setEvents] = useState<Array<any>>( [] );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Sidebar open/close state (Dashboard-only)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const visibleEvents = selectedDate
    ? events.filter((ev) => new Date(ev.datetime).toDateString() === new Date(selectedDate).toDateString())
    : events; 

  const formatEventTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (isToday) return `Today, ${time}`;
    return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) + ` · ${time}`;
  };

  return (
    <div className="space-y-8">
      <div className={`grid grid-cols-1 ${isSidebarOpen ? 'lg:grid-cols-[1fr,320px]' : 'lg:grid-cols-1'} gap-6 items-start lg:items-stretch`}>
        {/* Main content */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              className="btn-secondary text-left w-full py-3 px-4 text-base rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-blue"
              placeholder="Search modules by code, name, or tag"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredSubjects.map((subject) => (
              <Link key={subject.id} to={`/subjects/${subject.id}`}>
                <Card className="h-full subject-card transition-transform duration-150 active:scale-95 focus-within:scale-95">
                  <div className={`subject-cover ${subject.cover}`}>
                    <span className="subject-tag">{subject.tag}</span>
                  </div>
                  <CardContent>
                    <p className="text-xs text-white/60">{subject.code}</p>
                    <h3 className="font-semibold text-base mt-1">{subject.name}</h3>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {filteredSubjects.length === 0 && (
              <div className="glass-card p-4 text-sm text-white/60 col-span-full">
                No modules found.
              </div>
            )}
          </div>
        </section>

        {/* Right sidebar: Upcoming events (Dashboard-only)
            - Large screens: inline sticky sidebar (part of the grid)
            - Small screens: fixed overlay that overlaps the dashboard */}
        <aside className="self-start">
          {/* Large-screen (inline) sidebar — visible only on lg when open */}
          {isSidebarOpen && (
            <div className="hidden lg:block">
              <div className="sticky top-24 h-[calc(100vh-6rem)] overflow-auto">
                <Card className="h-full flex flex-col">
                  <CardHeader className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold">Upcoming events</div>
                      <div className="text-xs text-white/60 mt-1">Events & deadlines</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {user && (user.role === "admin" || user.role === "super_admin") && (
                        <AddEventDialog onAdd={(ev) => setEvents((p) => [ev, ...p])} />
                      )}

                      {selectedDate && (
                        <button className="text-xs text-white/60 hover:underline" onClick={() => setSelectedDate(null)}>
                          Clear filter
                        </button>
                      )}

                      <button
                        className="p-2 rounded-md hover:bg-white/5"
                        title="Close block drawer"
                        aria-label="Close events"
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/80">
                          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2 overflow-auto">
                    {visibleEvents.length === 0 && (
                      <div className="text-sm text-white/60">{selectedDate ? 'No events for selected date.' : 'No upcoming events.'}</div>
                    )}

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

                        {/* admin actions */}
                        {user && (user.role === "admin" || user.role === "super_admin") && (
                          <div className="flex flex-col gap-2 items-end">
                            <AddEventDialog
                              initialEvent={{ id: ev.id, title: ev.title, datetime: ev.datetime, module: ev.module ?? "", kind: (ev.kind === 'assignment' || ev.kind === 'quiz') ? ev.kind : 'other' }}
                              onUpdate={(updated) => setEvents((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
                              triggerClassName="btn-ghost px-2 py-1 text-xs"
                              triggerChildren={<span>Edit</span>}
                            />

                            <button
                              className="btn-ghost px-2 py-1 text-xs"
                              onClick={async () => {
                                if (!confirm("Delete this event?")) return;
                                try {
                                  const { error } = await supabaseClient.from('events').delete().eq('id', ev.id);
                                  if (error) { alert('Failed to delete event'); console.error(error); return; }
                                  setEvents((prev) => prev.filter((e) => e.id !== ev.id));
                                } catch (error) {
                                  alert('Failed to delete event');
                                  console.error(error);
                                  return;
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="mt-4 border-t border-white/6 pt-4">
                      <div className="text-xs text-white/60 mb-2">Month</div>
                      <MonthCalendar compact events={events} selectedDate={selectedDate} onSelectDate={(d: string | null) => setSelectedDate(d)} />
                    </div>
                  </CardContent> 
                </Card>
              </div>
            </div>
          )}

          {/* Small-screen overlay: overlaps dashboard when open */}
          {isSidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-40">
              {/* backdrop */}
              <div className="absolute inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)} />

              {/* sliding panel on the right (320px) */}
              <div className="absolute right-0 top-0 h-full w-full sm:w-80 p-4">
                <Card className="h-full flex flex-col">
                  <CardHeader className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold">Upcoming events</div>
                      <div className="text-xs text-white/60 mt-1">Events & deadlines</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {user && (user.role === "admin" || user.role === "super_admin") && (
                        <AddEventDialog onAdd={(ev) => setEvents((p) => [ev, ...p])} />
                      )}

                      {selectedDate && (
                        <button className="text-xs text-white/60 hover:underline" onClick={() => setSelectedDate(null)}>
                          Clear filter
                        </button>
                      )}

                      <button
                        className="p-2 rounded-md hover:bg-white/5"
                        title="Close block drawer"
                        aria-label="Close events"
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/80">
                          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2 overflow-auto">
                    {visibleEvents.length === 0 && (
                      <div className="text-sm text-white/60">{selectedDate ? 'No events for selected date.' : 'No upcoming events.'}</div>
                    )}

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
                              onUpdate={(updated) => setEvents((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
                              triggerClassName="btn-ghost px-2 py-1 text-xs"
                              triggerChildren={<span>Edit</span>}
                            />

                            <button
                              className="btn-ghost px-2 py-1 text-xs"
                              onClick={async () => {
                                if (!confirm("Delete this event?")) return;
                                try {
                                  const { error } = await supabaseClient.from('events').delete().eq('id', ev.id);
                                  if (error) { alert('Failed to delete event'); console.error(error); return; }
                                  setEvents((prev) => prev.filter((e) => e.id !== ev.id));
                                } catch (error) {
                                  alert('Failed to delete event');
                                  console.error(error);
                                  return;
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="mt-4 border-t border-white/6 pt-4">
                      <div className="text-xs text-white/60 mb-2">Month</div>
                      <MonthCalendar compact events={events} selectedDate={selectedDate} onSelectDate={(d: string | null) => setSelectedDate(d)} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </aside>

        {/* Single right-edge tab (visible on all screen sizes) */}
        {!isSidebarOpen && (
          <button
            className="fixed right-4 top-[15%] z-50 flex items-center justify-center bg-violet-600 text-white p-3 rounded-l-full shadow-lg hover:bg-violet-500"
            onClick={() => setIsSidebarOpen(true)}
            title="Open block drawer"
            aria-label="Open block drawer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
