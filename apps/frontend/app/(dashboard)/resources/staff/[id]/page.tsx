"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { NumberTicker } from "@/components/bits/NumberTicker";
import { FuseButton } from "@/components/bits/FuseButton";
import { SlidePills } from "@/components/bits/SlidePills";
import { useConfirm } from "@/components/ui/confirm";
import {
  deleteStaff,
  getStaff,
  updateStaff,
  type StaffDetail,
} from "@/lib/resources";
import { setBookingStatus, type Booking } from "@/lib/bookings";
import { HoursEditor } from "@/components/resources/HoursEditor";
import { BreaksEditor } from "@/components/resources/BreaksEditor";
import { TimeOffManager } from "@/components/resources/TimeOffManager";
import { BookingDrawer } from "@/components/calendar/BookingDrawer";
import {
  BookingCalendar,
  toCalBlocks,
  type CalBlock,
  type CalBooking,
} from "@/components/calendar/BookingCalendar";
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
  const confirmAction = useConfirm();
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [pastCount, setPastCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StaffFormState>(EMPTY_STAFF_FORM);
  const services = useServiceOptions();
  const [staffTab, setStaffTab] = useState<"bookings" | "schedule" | "leave" | "profile">("bookings");
  const [calMonth, setCalMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [inspectBookingId, setInspectBookingId] = useState<string | null>(null);

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
    if (!staff) return;
    const ok = await confirmAction({
      title: `Remove ${staff.name}?`,
      body: "Upcoming bookings will deactivate them instead of deleting.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await deleteStaff(id);
      toast.success(res.archived ? "Deactivated — upcoming bookings kept" : "Provider removed");
      router.push("/resources");
    } catch {
      toast.error("Could not remove provider");
    }
  };

  const staffCalBookings = useMemo<CalBooking[]>(
    () =>
      upcoming
        .filter((b) => !["CANCELLED", "NO_SHOW"].includes(b.status))
        .map((b) => ({
          id: b.id,
          title: b.service?.name ?? "Booking",
          sub: b.customer?.name ?? b.customerName,
          start: b.startTime,
          end: b.endTime,
          staffId: id,
          staffName: staff?.name ?? null,
        })),
    [upcoming, staff, id],
  );

  const staffCalBlocks = useMemo<CalBlock[]>(
    () =>
      toCalBlocks(staff?.timeOffs ?? []).map((t) => ({
        ...t,
        staffName: t.staffName ?? staff?.name ?? null,
      })),
    [staff],
  );

  const changeBooking = async (bookingId: string, status: string, label: string) => {    try {
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

      <div className="space-y-4">
        <SlidePills
          id="staff-tabs"
          size="sm"
          value={staffTab}
          onChange={setStaffTab}
          options={[
            { value: "bookings", label: "Bookings", icon: <CalendarCheck className="size-3.5" /> },
            { value: "schedule", label: "Schedule", icon: <Clock className="size-3.5" /> },
            { value: "leave", label: "Leave", icon: <History className="size-3.5" /> },
            { value: "profile", label: "Profile", icon: <UserRound className="size-3.5" /> },
          ]}
        />

        {/* Bookings */}
        {staffTab === "bookings" && (
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
        )}

        {/* Schedule */}
        {staffTab === "schedule" && (
        <div className="space-y-4">
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

          <Card data-st-card className="rounded-3xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">One-off blocks</CardTitle>
              <p className="text-xs text-muted-foreground">
                Walk-ins, holidays, sick days — block them on the Leave
                calendar so online bookings can&apos;t collide.
              </p>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setStaffTab("leave")}
              >
                <Ban className="size-3.5 mr-1.5" /> Open leave calendar
              </Button>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Leave */}
        {staffTab === "leave" && (
        <div className="space-y-4">
          <Card data-st-card className="rounded-3xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Leave calendar</CardTitle>
              <p className="text-xs text-muted-foreground">
                {staff.name}&apos;s bookings and blocks. Tap a date, then
                another date, to block the range.
              </p>
            </CardHeader>
            <CardContent>
              <BookingCalendar
                month={calMonth}
                onMonthChange={setCalMonth}
                bookings={staffCalBookings}
                blocks={staffCalBlocks}
                onBookingClick={setInspectBookingId}
                onChanged={load}
                scope={{ staffId: id }}
                staffOptions={[{ id, name: staff.name }]}
                reduceMotion={!!reduceMotion}
              />
            </CardContent>
          </Card>
          <Card data-st-card className="rounded-3xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Leave & holidays</CardTitle>
              <p className="text-xs text-muted-foreground">
                Quick presets and the full list of blocked periods.
              </p>
            </CardHeader>
            <CardContent>
              <TimeOffManager scope={{ staffId: id }} />
            </CardContent>
          </Card>
        </div>
        )}

        {/* Profile */}
        {staffTab === "profile" && (
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
        )}
      </div>

      <BookingDrawer
        bookingId={inspectBookingId}
        onClose={() => setInspectBookingId(null)}
        onChanged={load}
      />
    </div>
  );
}

