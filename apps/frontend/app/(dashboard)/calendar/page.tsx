"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarPlus, Clock, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Appointment = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  source: "sparq" | "google-calendar" | "cal-com";
};

type IntegrationStatus = {
  googleCalendar: boolean;
  calCom: boolean;
};

const emptyForm = {
  title: "",
  description: "",
  startTime: "",
  endTime: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  status: "PENDING" as Appointment["status"],
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus>({
    googleCalendar: false,
    calCom: false,
  });
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAppointments = async () => {
    setLoading(true);
    const response = await api.get(`/appointments`, {
      params: { includeExternal: true },
    });
    setAppointments(response.data.appointments);
    setIntegrations(response.data.integrations);
    setLoading(false);
  };

  useEffect(() => {
    loadAppointments().catch(() => setLoading(false));
  }, []);

  const calendarDays = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "2-digit" }).format(date),
        events: appointments.filter((appointment) => appointment.startTime.slice(0, 10) === key),
      };
    });
    return days;
  }, [appointments]);

  const createAppointment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post(`/appointments`, {
        title: form.title,
        description: form.description || undefined,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        customerName: form.customerName || undefined,
        customerEmail: form.customerEmail || undefined,
        customerPhone: form.customerPhone || undefined,
        status: form.status,
      });
      toast.success("Appointment created");
      setForm(emptyForm);
      await loadAppointments();
    } catch {
      toast.error("Could not create appointment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarPlus className="size-4" />
              Create appointment
            </CardTitle>
            <CardDescription>Book Sparq appointments and view external calendar events together.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={createAppointment}>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  required
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Product demo"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start</Label>
                  <Input
                    id="startTime"
                    required
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End</Label>
                  <Input
                    id="endTime"
                    required
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm((current) => ({ ...current, status: value as Appointment["status"] }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer</Label>
                  <Input
                    id="customerName"
                    value={form.customerName}
                    onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={form.customerPhone}
                    onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={form.customerEmail}
                  onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Notes</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>
              <Button className="w-full" disabled={saving}>
                <CalendarPlus />
                {saving ? "Saving..." : "Book appointment"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Connected calendars</CardTitle>
            <CardDescription>Google Calendar and Cal.com events appear here when integrations are active.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ConnectionRow label="Google Calendar" connected={integrations.googleCalendar} />
            <ConnectionRow label="Cal.com" connected={integrations.calCom} />
            <Button asChild variant="outline" className="w-full">
              <Link href={`/integrations`}>Manage integrations</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Calendar</CardTitle>
                <CardDescription>Two-week schedule with Sparq, Google Calendar, and Cal.com events.</CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={loadAppointments}>
                <RefreshCw />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading calendar...</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {calendarDays.map((day) => (
                  <div key={day.key} className="min-h-36 rounded-lg border p-3">
                    <p className="text-sm font-medium">{day.label}</p>
                    <div className="mt-3 space-y-2">
                      {day.events.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Open</p>
                      ) : (
                        day.events.map((event) => (
                          <div key={event.id} className="rounded-md border bg-muted/30 p-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-2 text-sm font-medium">{event.title}</p>
                              <SourceBadge source={event.source} />
                            </div>
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="size-3" />
                              {formatTime(event.startTime)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>All appointments</CardTitle>
            <CardDescription>Upcoming records from every visible calendar source.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{appointment.title}</p>
                  <p className="text-sm text-muted-foreground">{formatTime(appointment.startTime)} to {formatTime(appointment.endTime)}</p>
                  {(appointment.customerName || appointment.customerPhone) && (
                    <p className="text-xs text-muted-foreground">{appointment.customerName || appointment.customerPhone}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <SourceBadge source={appointment.source} />
                  <Badge variant={appointment.status === "CANCELLED" ? "destructive" : "outline"}>{appointment.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ConnectionRow({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm font-medium">{label}</span>
      <Badge variant={connected ? "outline" : "destructive"}>{connected ? "CONNECTED" : "NOT CONNECTED"}</Badge>
    </div>
  );
}

function SourceBadge({ source }: { source: Appointment["source"] }) {
  const label = source === "google-calendar" ? "Google" : source === "cal-com" ? "Cal.com" : "Sparq";
  return <Badge variant="outline">{label}</Badge>;
}
