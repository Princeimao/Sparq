"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getHours, setHours, type WeeklyHours } from "@/lib/resources";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Weekly recurring schedule editor. Empty (all inactive) means "no explicit
 * schedule" — the backend treats that as manual mode (open).
 */
export function HoursEditor({ scope }: { scope: { staffId?: string; resourceId?: string } }) {
  const [rows, setRows] = useState<(WeeklyHours & { key: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    getHours(scope)
      .then((saved) => {
        const byDay = new Map(saved.map((h) => [h.dayOfWeek, h]));
        setRows(
          DAYS.map((_, d) => {
            const s = byDay.get(d);
            return {
              key: `${scope.staffId ?? scope.resourceId}-${d}`,
              dayOfWeek: d,
              startTime: s?.startTime ?? "09:00",
              endTime: s?.endTime ?? "18:00",
              isActive: s?.isActive ?? false,
            };
          }),
        );
      })
      .catch(() => toast.error("Could not load hours"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.staffId, scope.resourceId]);

  const patch = (day: number, p: Partial<WeeklyHours>) =>
    setRows((rs) => rs.map((r) => (r.dayOfWeek === day ? { ...r, ...p } : r)));

  const save = async () => {
    setSaving(true);
    try {
      const saved = await setHours(
        scope,
        rows
          .filter((r) => r.isActive)
          .map(({ dayOfWeek, startTime, endTime, isActive }) => ({
            dayOfWeek,
            startTime,
            endTime,
            isActive,
          })),
      );
      const byDay = new Map(saved.map((h) => [h.dayOfWeek, h]));
      setRows((rs) =>
        rs.map((r) => {
          const s = byDay.get(r.dayOfWeek);
          return s ? { ...r, startTime: s.startTime, endTime: s.endTime, isActive: s.isActive } : { ...r, isActive: false };
        }),
      );
      toast.success("Hours saved");
    } catch {
      toast.error("Could not save hours");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading schedule…
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div
          key={r.key}
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors",
            r.isActive ? "bg-muted/40" : "opacity-70",
          )}
        >
          <span className="w-9 text-xs font-medium">{DAYS[r.dayOfWeek]}</span>
          <Switch
            checked={r.isActive}
            onCheckedChange={(v) => patch(r.dayOfWeek, { isActive: v })}
            aria-label={`${DAYS[r.dayOfWeek]} working`}
          />
          {r.isActive ? (
            <div className="flex items-center gap-1.5 ml-auto">
              <Input
                type="time"
                value={r.startTime}
                onChange={(e) => patch(r.dayOfWeek, { startTime: e.target.value })}
                className="h-8 w-24 text-xs"
                aria-label={`${DAYS[r.dayOfWeek]} opens`}
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="time"
                value={r.endTime}
                onChange={(e) => patch(r.dayOfWeek, { endTime: e.target.value })}
                className="h-8 w-24 text-xs"
                aria-label={`${DAYS[r.dayOfWeek]} closes`}
              />
            </div>
          ) : (
            <span className="ml-auto text-xs text-muted-foreground">Off</span>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between pt-2">
        <p className="text-[11px] text-muted-foreground">
          All days off = no fixed schedule (bookable anytime).
        </p>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
          Save hours
        </Button>
      </div>
    </div>
  );
}
