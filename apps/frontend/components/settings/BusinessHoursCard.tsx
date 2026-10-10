"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading business hours…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="size-4 text-primary" /> Business hours & timezone
        </CardTitle>
        <CardDescription>
          Your opening hours — the fallback schedule when providers have no
          hours of their own. All times are interpreted in this timezone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5 max-w-xs">
          <Label htmlFor="biz-tz">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="biz-tz" className="rounded-xl">
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

        <div className="rounded-2xl border divide-y overflow-hidden">
          {WEEK_DAYS.map((day) => {
            const v: OperatingDay = hours[day.id] ?? { open: "09:00", close: "18:00" };
            const closed = !!v.closed;
            return (
              <div
                key={day.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5",
                  !closed && "bg-muted/30",
                )}
              >
                <span className="text-sm font-medium w-24">{day.label}</span>
                <Switch
                  checked={!closed}
                  onCheckedChange={(open) => setDay(day.id, { ...v, closed: !open })}
                  aria-label={`${day.label} open`}
                />
                {closed ? (
                  <span className="text-xs text-muted-foreground ml-auto">Closed</span>
                ) : (
                  <div className="flex items-center gap-2 ml-auto">
                    <Input
                      type="time"
                      value={v.open}
                      onChange={(e) => setDay(day.id, { ...v, open: e.target.value })}
                      className="h-8 w-28 text-xs rounded-lg"
                      aria-label={`${day.label} opens`}
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input
                      type="time"
                      value={v.close}
                      onChange={(e) => setDay(day.id, { ...v, close: e.target.value })}
                      className="h-8 w-28 text-xs rounded-lg"
                      aria-label={`${day.label} closes`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="rounded-xl">
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save hours
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
