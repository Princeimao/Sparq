"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { animate, stagger } from "animejs";
import { useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Ban,
  CalendarCheck,
  Check,
  Clock,
  History,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberTicker } from "@/components/bits/NumberTicker";
import { FuseButton } from "@/components/bits/FuseButton";
import {
  addTimeOff,
  deleteStaff,
  getStaff,
  updateStaff,
  type StaffDetail,
} from "@/lib/resources";
import { setBookingStatus, type Booking } from "@/lib/bookings";
import { HoursEditor } from "@/components/resources/HoursEditor";
import { BreaksEditor } from "@/components/resources/BreaksEditor";
import { TimeOffManager } from "@/components/resources/TimeOffManager";
import {
  EMPTY_STAFF_FORM,
  useServiceOptions,
  StaffProfileFields,
  type StaffFormState,
} from "@/components/resources/StaffProfileFields";
import { cn } from "@/lib/utils";

type Upcoming = {
  id: string;
  customerName: string;
  startTime: string;
  endTime: string;
  status: string;
  service: { id: string; name: string; duration: number } | null;
  customer: { id: string; name: string | null; phone: string } | null;
};

export default function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [pastCount, setPastCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StaffFormState>(EMPTY_STAFF_FORM);
  const services = useServiceOptions();
  const [blockForm, setBlockForm] = useState({ date: "", start: "", end: "", reason: "Walk-in" });
  const [blocking, setBlocking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStaff(id);
      setStaff(res.staff);
      setUpcoming(res.upcomingBookings);
      setPastCount(res.pastBookings);
      setForm({
        name: res.staff.name,
        email: res.staff.email ?? "",
        phone: res.staff.phone ?? "",
        role: res.staff.role ?? "",
        specialty: res.staff.specialty ?? "",
        color: res.staff.color ?? EMPTY_STAFF_FORM.color,
        isActive: res.staff.isActive,
        serviceIds: (res.staff.services ?? []).map((s) => s.id),
      });
    } catch {
      toast.error("Could not load provider");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading || reduceMotion || !staff) return;
    const root = rootRef.current;
    if (!root) return;
    const cards = root.querySelectorAll("[data-st-card]");
    if (cards.length === 0) return;
    const anim = animate(cards, {
      opacity: [0, 1],
      translateY: [18, 0],
      duration: 500,
      delay: stagger(80),
      ease: "outCubic",
    });
    return () => {
      anim.revert();
    };
  }, [loading, reduceMotion, !!staff]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const updated = await updateStaff(id, {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        role: form.role.trim() || null,
        specialty: form.specialty.trim() || null,
        color: form.color,
        isActive: form.isActive,
        serviceIds: form.serviceIds,
      });
      setStaff((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success("Provider updated");
    } catch {
      toast.error("Could not save provider");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!staff || !confirm(`Remove ${staff.name}? Upcoming bookings will deactivate them instead.`)) return;
    try {
      const res = await deleteStaff(id);
      toast.success(res.archived ? "Deactivated — upcoming bookings kept" : "Provider removed");
      router.push("/resources");
    } catch {
      toast.error("Could not remove provider");
    }
  };

  const changeBooking = async (bookingId: string, status: string, label: string) => {
    try {
      const updated: Booking = await setBookingStatus(bookingId, status);
      setUpcoming((prev) =>
        status === "CANCELLED"
          ? prev.filter((b) => b.id !== bookingId)
          : prev.map((b) => (b.id === bookingId ? { ...b, status: updated.status } : b)),
      );
      toast.success(`Booking ${label}`);
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Action failed";
      toast.error(msg);
    }
  };

  const blockTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockForm.date || !blockForm.start || !blockForm.end) {
      return toast.error("Pick a date, start and end");
    }
    setBlocking(true);
    try {
      await addTimeOff({
        staffId: id,
        startDate: new Date(`${blockForm.date}T${blockForm.start}`).toISOString(),
        endDate: new Date(`${blockForm.date}T${blockForm.end}`).toISOString(),
        reason: blockForm.reason || "Blocked",
      });
      setBlockForm({ date: "", start: "", end: "", reason: "Walk-in" });
      toast.success("Time blocked — no online bookings can land here");
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Could not block time";
      toast.error(msg);
    } finally {
      setBlocking(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64 rounded-xl" />
        <div className="grid sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="p-6 max-w-6xl mx-auto py-24 text-center">
        <p className="font-medium">Provider not found</p>
        <p className="text-sm text-muted-foreground mt-1">
          They may have been removed.
        </p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button asChild variant="ghost" size="icon" aria-label="Back to resources">
          <Link href="/resources">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <span
          className="size-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0"
          style={{ backgroundColor: staff.color ?? "#7c3aed" }}
        >
          {staff.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight truncate">
            {staff.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[staff.role, staff.specialty].filter(Boolean).join(" · ") || "Provider"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              staff.isActive
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "bg-zinc-500/10 text-zinc-500",
            )}
          >
            {staff.isActive ? "Active" : "Off"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-destructive/10 hover:text-destructive rounded-full"
            onClick={remove}
          >
            <Trash2 className="size-4 mr-1" /> Remove
          </Button>
        </div>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Upcoming", value: upcoming.length },
          { label: "Past bookings", value: pastCount },
          { label: "Services", value: staff.services?.length ?? 0 },
        ].map((s) => (
          <Card key={s.label} data-st-card className="rounded-3xl border shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <p className="text-2xl font-bold tabular-nums tracking-tight">
                <NumberTicker value={s.value} />
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList className="rounded-full">
          <TabsTrigger value="bookings" className="rounded-full text-xs gap-1.5">
            <CalendarCheck className="size-3.5" /> Bookings
          </TabsTrigger>
          <TabsTrigger value="schedule" className="rounded-full text-xs gap-1.5">
            <Clock className="size-3.5" /> Schedule
          </TabsTrigger>
          <TabsTrigger value="leave" className="rounded-full text-xs gap-1.5">
            <History className="size-3.5" /> Leave
          </TabsTrigger>
          <TabsTrigger value="profile" className="rounded-full text-xs gap-1.5">
            <UserRound className="size-3.5" /> Profile
          </TabsTrigger>
        </TabsList>

        {/* Bookings */}
        <TabsContent value="bookings">
          <Card data-st-card className="rounded-3xl border shadow-sm">
            <CardContent className="p-4">
              {upcoming.length === 0 ? (
                <div className="text-center py-10">
                  <CalendarCheck className="size-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">No upcoming bookings</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    New WhatsApp and dashboard bookings for {staff.name} land here.
                  </p>
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link href="/calendar">
                      <Plus className="size-3.5 mr-1" /> Book from calendar
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {upcoming.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {b.service?.name ?? "Booking"} ·{" "}
                          {b.customer?.name ?? b.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {new Date(b.startTime).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {b.status}
                      </Badge>
                      {b.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full shrink-0"
                          onClick={() => changeBooking(b.id, "CONFIRMED", "confirmed")}
                        >
                          <Check className="size-3.5 mr-1" /> Confirm
                        </Button>
                      )}
                      {b.status === "CONFIRMED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full shrink-0"
                          onClick={() => changeBooking(b.id, "COMPLETED", "completed")}
                        >
                          <Check className="size-3.5 mr-1" /> Done
                        </Button>
                      )}
                      {!["CANCELLED", "COMPLETED", "NO_SHOW"].includes(b.status) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="rounded-full shrink-0 hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Cancel booking"
                          onClick={() => changeBooking(b.id, "CANCELLED", "cancelled")}
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule */}
        <TabsContent value="schedule" className="space-y-4">
          <Card data-st-card className="rounded-3xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Weekly hours</CardTitle>
              <p className="text-xs text-muted-foreground">
                Part-time? Switch days off and set exact windows — bookings
                outside these hours are blocked automatically.
              </p>
            </CardHeader>
            <CardContent>
              <HoursEditor scope={{ staffId: id }} />
            </CardContent>
          </Card>

          <Card data-st-card className="rounded-3xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Daily breaks</CardTitle>
              <p className="text-xs text-muted-foreground">
                Lunch, cleaning, prayer — recurring gaps nobody can book.
              </p>
            </CardHeader>
            <CardContent>
              <BreaksEditor scope={{ staffId: id }} />
            </CardContent>
          </Card>

          <Card data-st-card className="rounded-3xl border shadow-sm border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Ban className="size-4 text-amber-500" /> Block time
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Walk-in customer occupying the chair? Block the time so online
                bookings can&apos;t collide with it.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={blockTime} className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <div className="space-y-1">
                  <Label htmlFor="blk-date" className="text-xs">Date</Label>
                  <Input
                    id="blk-date"
                    type="date"
                    value={blockForm.date}
                    onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="blk-start" className="text-xs">From</Label>
                  <Input
                    id="blk-start"
                    type="time"
                    value={blockForm.start}
                    onChange={(e) => setBlockForm({ ...blockForm, start: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="blk-end" className="text-xs">To</Label>
                  <Input
                    id="blk-end"
                    type="time"
                    value={blockForm.end}
                    onChange={(e) => setBlockForm({ ...blockForm, end: e.target.value })}
                    className="h-9 text-xs rounded-xl"
                    required
                  />
                </div>
                <Button type="submit" disabled={blocking} className="rounded-xl">
                  {blocking ? "Blocking…" : "Block"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave */}
        <TabsContent value="leave">
          <Card data-st-card className="rounded-3xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Leave & holidays</CardTitle>
              <p className="text-xs text-muted-foreground">
                Multi-day leave closes every day in the range.
              </p>
            </CardHeader>
            <CardContent>
              <TimeOffManager scope={{ staffId: id }} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile */}
        <TabsContent value="profile">
          <Card data-st-card className="rounded-3xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Profile & services</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="space-y-4">
                <StaffProfileFields form={form} onChange={setForm} services={services} idPrefix="sp" />
                <FuseButton type="submit" disabled={saving} ariaLabel="Save provider">
                  {saving ? "Saving…" : "Save changes"}
                </FuseButton>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

