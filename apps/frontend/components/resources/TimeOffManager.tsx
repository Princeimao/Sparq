"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarOff, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addTimeOff,
  listTimeOff,
  removeTimeOff,
  type TimeOff,
} from "@/lib/resources";

/** Leave / holiday blocks that close a provider or resource for a period. */
export function TimeOffManager({ scope }: { scope: { staffId?: string; resourceId?: string } }) {
  const [items, setItems] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ start: "", end: "", reason: "" });

  const load = () => {
    setLoading(true);
    listTimeOff(scope)
      .then(setItems)
      .catch(() => toast.error("Could not load time off"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [scope.staffId, scope.resourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.start || !form.end) return toast.error("Pick a start and end");
    setAdding(true);
    try {
      const created = await addTimeOff({
        ...scope,
        startDate: new Date(form.start).toISOString(),
        endDate: new Date(form.end).toISOString(),
        reason: form.reason || undefined,
      });
      setItems((prev) => [...prev, created].sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate)));
      setForm({ start: "", end: "", reason: "" });
      toast.success("Time off added");
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Could not add time off";
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await removeTimeOff(id);
      setItems((prev) => prev.filter((t) => t.id !== id));
    } catch {
      toast.error("Could not remove entry");
    }
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 flex items-center gap-1.5">
          <CalendarOff className="size-3.5" /> No leave scheduled. Bookings stay open.
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-xs"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {new Date(t.startDate).toLocaleString()} → {new Date(t.endDate).toLocaleString()}
                </p>
                {t.reason && <p className="text-muted-foreground truncate">{t.reason}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 hover:bg-destructive/10 hover:text-destructive shrink-0"
                aria-label="Remove time off"
                onClick={() => remove(t.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="rounded-xl border p-3 space-y-2.5 bg-card">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="to-start" className="text-xs">From</Label>
            <Input
              id="to-start"
              type="datetime-local"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
              className="h-8 text-xs"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to-end" className="text-xs">To</Label>
            <Input
              id="to-end"
              type="datetime-local"
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
              className="h-8 text-xs"
              required
            />
          </div>
        </div>
        <Input
          placeholder="Reason (optional)"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          className="h-8 text-xs"
          aria-label="Reason"
        />
        <Button type="submit" size="sm" disabled={adding} className="w-full">
          {adding ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Plus className="size-3.5 mr-1.5" />}
          Add leave
        </Button>
      </form>
    </div>
  );
}
