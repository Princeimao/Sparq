"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getOnboarding,
  saveOnboardingDraft,
  type OperatingDay,
} from "@/lib/onboarding";
import { cn } from "@/lib/utils";

const WEEK_DAYS = [
  { id: "sun", label: "Sunday" },
  { id: "mon", label: "Monday" },
  { id: "tue", label: "Tuesday" },
  { id: "wed", label: "Wednesday" },
  { id: "thu", label: "Thursday" },
  { id: "fri", label: "Friday" },
  { id: "sat", label: "Saturday" },
];

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Africa/Cairo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Pacific/Auckland",
  "UTC",
];

/**
 * Business-level opening hours + timezone. Used as the fallback schedule
 * for availability and as the default for owner-implicit bookings.
 */
export function BusinessHoursCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [hours, setHours] = useState<Record<string, OperatingDay>>({});

  useEffect(() => {
    getOnboarding()
      .then((p) => {
        setHours((p.operatingHours ?? {}) as Record<string, OperatingDay>);
        if (p.timezone) setTimezone(p.timezone);
      })
      .catch(() => toast.error("Could not load business hours"))
      .finally(() => setLoading(false));
  }, []);

  const setDay = (day: string, v: OperatingDay) =>
    setHours((h) => ({ ...h, [day]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await saveOnboardingDraft({ operatingHours: hours, timezone });
      toast.success("Business hours saved");
    } catch {
      toast.error("Could not save business hours");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-ink/50" aria-label="Loading business hours">
        <Loader2 className="size-4 animate-spin" /> Loading business hours…
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Business hours</h2>
        <p className="text-[13px] text-ink/50 mt-1">
          Your opening hours — the fallback schedule when providers have no
          hours of their own. All times use this timezone.
        </p>
      </div>
      <div className="space-y-5">
        <div className="max-w-2xs">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45 mb-2">
            Timezone
          </span>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="biz-tz" className="rounded-2xl bg-ink/[0.05]! border-0 py-3 text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          {WEEK_DAYS.map((day, i) => {
            const v: OperatingDay = hours[day.id] ?? { open: "09:00", close: "18:00" };
            const closed = !!v.closed;
            return (
              <motion.div
                key={day.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.28) }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-2.5 transition-colors",
                  closed ? "bg-ink/[0.025]" : "bg-ink/[0.05]",
                )}
              >
                <span className={cn("text-[13px] font-semibold w-24", closed ? "text-ink/35" : "text-ink")}>
                  {day.label}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!closed}
                  aria-label={`${day.label} open`}
                  onClick={() => setDay(day.id, { ...v, closed: !closed })}
                  className={cn(
                    "relative h-6 w-10.5 rounded-full transition-colors duration-300 shrink-0",
                    closed ? "bg-ink/15" : "bg-brand",
                  )}
                >
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 550, damping: 30 }}
                    className={cn(
                      "absolute top-0.5 size-5 rounded-full bg-white",
                      closed ? "left-0.5" : "right-0.5",
                    )}
                  />
                </button>
                {closed ? (
                  <span className="text-xs text-ink/35 ml-auto font-medium">Closed</span>
                ) : (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <input
                      type="time"
                      value={v.open}
                      onChange={(e) => setDay(day.id, { ...v, open: e.target.value })}
                      className="text-xs font-medium rounded-xl bg-white/70 px-2 py-1.5 text-ink focus:outline-none focus:bg-white tabular-nums"
                      aria-label={`${day.label} opens`}
                    />
                    <span className="text-xs text-ink/30">–</span>
                    <input
                      type="time"
                      value={v.close}
                      onChange={(e) => setDay(day.id, { ...v, close: e.target.value })}
                      className="text-xs font-medium rounded-xl bg-white/70 px-2 py-1.5 text-ink focus:outline-none focus:bg-white tabular-nums"
                      aria-label={`${day.label} closes`}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={save}
            disabled={saving}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-brand disabled:opacity-50"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save hours
          </motion.button>
        </div>
      </div>
    </div>
  );
}
