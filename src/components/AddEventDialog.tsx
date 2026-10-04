import { useEffect, useState } from "react";
import { useAuth } from "../contexts/auth-context";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./ui/dialog";
import { supabaseClient } from "../integrations/supabase/client";
import { subjects } from "../lib/subjects";

type EventKind = "assignment" | "quiz" | "other";

interface EventRow {
  id: string;
  title: string;
  datetime: string; // ISO
  mention_date?: string | null;
  module: string;
  kind: EventKind;
}

interface Props {
  onAdd?: (ev: EventRow) => void;
  onUpdate?: (ev: EventRow) => void;
  triggerClassName?: string;
  triggerChildren?: React.ReactNode;
  initialEvent?: EventRow | null; // when provided, dialog becomes edit mode
}

export default function AddEventDialog({ onAdd, onUpdate, triggerClassName, triggerChildren, initialEvent = null }: Props) {
  const isEdit = Boolean(initialEvent);
  const [title, setTitle] = useState("");
  const [datetime, setDatetime] = useState("");
  const [module, setModule] = useState("");
  const [kind, setKind] = useState<EventKind>("assignment");
  const { user } = useAuth();

  // produce `datetime-local` value using local timezone and guarantee YYYY (4-digit year)
  const formatForDatetimeLocal = (d: Date) => {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  // validate that parsed year is four digits (1000..9999)
  const validateDatetimeYear = (dtStr: string) => {
    const d = new Date(dtStr);
    if (Number.isNaN(d.getTime())) return false;
    const y = d.getFullYear();
    return y >= 1000 && y <= 9999;
  };

  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title);
      // convert ISO to datetime-local value
      const d = new Date(initialEvent.datetime);
      setDatetime(formatForDatetimeLocal(d));
      setModule(initialEvent.module ?? "");
      setKind((initialEvent.kind as EventKind) || "assignment");
    }
  }, [initialEvent]);

  const resetForm = () => {
    setTitle("");
    const now = new Date();
    now.setMinutes(0, 0, 0);
    setDatetime(formatForDatetimeLocal(now));
    setModule("");
    setKind("assignment");
  };

  const create = async () => {
    if (!title.trim() || !datetime) return;
    const dtObj = new Date(datetime);
    if (Number.isNaN(dtObj.getTime())) { alert('Invalid date/time'); return; }
    const year = dtObj.getFullYear();
    if (year < 1000 || year > 9999) { alert('Year must be 4 digits (YYYY)'); return; }
    const payload = {
      title: title.trim(),
      datetime: dtObj.toISOString(),
      module: module.trim(),
      kind,
    };

    try {
      const { data, error } = await supabaseClient.from('events').insert(payload).select().single();
      if (error) {
        console.error(error);
        alert('Failed to add event');
        return;
      }
      onAdd?.(data as EventRow);
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Failed to add event');
    }
  }; 

  const update = async () => {
    if (!initialEvent) return;
    const dtObj = new Date(datetime);
    if (Number.isNaN(dtObj.getTime())) { alert('Invalid date/time'); return; }
    const year = dtObj.getFullYear();
    if (year < 1000 || year > 9999) { alert('Year must be 4 digits (YYYY)'); return; }
    const payload = {
      title: title.trim(),
      datetime: dtObj.toISOString(),
      module: module.trim(),
      kind,
    };

    try {
      const { data, error } = await supabaseClient.from('events').update(payload).eq('id', initialEvent.id).select().single();
      if (error) {
        console.error(error);
        alert('Failed to update event');
        return;
      }
      onUpdate?.(data as EventRow);
    } catch (err) {
      console.error(err);
      alert('Failed to update event');
    }
  }; 

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={triggerClassName ?? "btn-secondary px-2 py-1 text-xs"}>
          {triggerChildren ?? (isEdit ? "Edit" : "Add event")}
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit event" : "Add event"}</DialogTitle>
          <DialogDescription>Only admins and super admins can add or edit events.</DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <div className="text-sm">Title</div>
            <input className="w-full glass-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" />
          </div>

          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <div className="text-sm">Date & time</div>
            <input
              type="datetime-local"
              className="w-full glass-input"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              min="1000-01-01T00:00"
              max="9999-12-31T23:59"
            />
          </div>



          <div className="grid grid-cols-[140px_1fr] items-start gap-3">
            <div className="text-sm pt-1">Module (optional)</div>
            <div>
              <select className="w-full glass-input" value={module} onChange={(e) => setModule(e.target.value)}>
                <option value="">— None —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.code}>
                    {s.code} — {s.name}
                  </option>
                ))}
                {module && !subjects.find((s) => s.code === module) && (
                  <option value={module}>(custom) {module}</option>
                )}
              </select>
              <p className="text-xs text-white/60 mt-1">Choose a module from the dashboard</p>
            </div>
          </div>

          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <div className="text-sm">Kind</div>
            <select className="w-full glass-input" value={kind} onChange={(e) => setKind(e.target.value as EventKind)}>
              <option value="assignment">Assignment</option>
              <option value="quiz">Quiz</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <DialogClose className="btn-ghost px-3 py-1 text-sm">Cancel</DialogClose>
          {isEdit ? (
            <button
              className="btn-secondary px-3 py-1 text-sm"
              onClick={async () => {
                await update();
              }}
            >
              Update
            </button>
          ) : (
            <button
              className="btn-secondary px-3 py-1 text-sm"
              onClick={async () => {
                await create();
              }}
            >
              Add
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
