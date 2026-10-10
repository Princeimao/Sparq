"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Coffee, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getBreaks,
  setBreaks,
  type Break,
} from "@/lib/resources";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Draft extends Omit<Break, "id" | "staffId" | "resourceId"> {
  key: string;
}

/** Recurring intraday breaks (lunch, cleaning) that block booking. */
export function BreaksEditor({
  scope,
}: {
  scope: { staffId?: string; resourceId?: string };
}) {
  const [items, setItems] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ dayOfWeek: 1, startTime: "13:00", endTime: "14:00", label: "" });

  useEffect(() => {
    setLoading(true);
    getBreaks(scope)
      .then((saved) =>
        setItems(
          saved.map((b) => ({
            key: b.id,
            dayOfWeek: b.dayOfWeek,
            startTime: b.startTime,
            endTime: b.endTime,
            label: b.label ?? "",
          })),
        ),
      )
      .catch(() => toast.error("Could not load breaks"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.staffId, scope.resourceId]);

  const add = () => {
    if (form.endTime <= form.startTime) return toast.error("Break must end after it starts");
    setItems((prev) => [
      ...prev,
      { key: `new-${Date.now()}`, ...form },
    ]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await setBreaks(
        scope,
        items.map(({ dayOfWeek, startTime, endTime, label }) => ({
          dayOfWeek,
          startTime,
          endTime,
          label: label || undefined,
        })),
      );
      setItems(
        saved.map((b) => ({
          key: b.id,
          dayOfWeek: b.dayOfWeek,
          startTime: b.startTime,
          endTime: b.endTime,
          label: b.label ?? "",
        })),
      );
      toast.success("Breaks saved");
    } catch {
      toast.error("Could not save breaks");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading breaks…
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 flex items-center gap-1.5">
          <Coffee className="size-3.5" /> No recurring breaks — add lunch or cleaning windows.
        </p>
      ) : (
        items.map((b) => (
          <div
            key={b.key}
            className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-xs"
          >
            <span className="font-medium w-9">{DAYS[b.dayOfWeek]}</span>
            <span className="tabular-nums">
              {b.startTime} – {b.endTime}
            </span>
            {b.label && <span className="text-muted-foreground truncate">{b.label}</span>}
            <button
              type="button"
              aria-label="Remove break"
              onClick={() => setItems((prev) => prev.filter((x) => x.key !== b.key))}
              className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))
      )}

      <div className="rounded-xl border p-3 space-y-2.5 bg-card">
        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Day</Label>
            <select
              value={form.dayOfWeek}
              onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
              className="h-8 w-full text-xs rounded-lg border border-input bg-background px-2"
            >
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="h-8 w-full text-xs rounded-lg border border-input bg-background px-1.5"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className="h-8 w-full text-xs rounded-lg border border-input bg-background px-1.5"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Lunch"
              className="h-8 text-xs"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={add} className="flex-1">
            <Plus className="size-3.5 mr-1.5" /> Add break
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
            Save all
          </Button>
        </div>
      </div>
    </div>
  );
}
