"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MapPin, Trash2 } from "lucide-react";
import {
  deleteBooking,
  getBooking,
  reassignBooking,
  setBookingStatus,
  type Booking,
} from "@/lib/bookings";
import { listStaff, listResources } from "@/lib/resources";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-600 border-red-500/20",
  NO_SHOW: "bg-red-500/10 text-red-600 border-red-500/20",
  CHECKED_IN: "bg-violet-500/10 text-violet-600 border-violet-500/20",
};

const NEXT_STATUS: Record<string, { label: string; to: string; variant: "default" | "outline" }[]> = {
  PENDING: [
    { label: "Confirm", to: "CONFIRMED", variant: "default" },
    { label: "Cancel", to: "CANCELLED", variant: "outline" },
  ],
  CONFIRMED: [
    { label: "Check in", to: "CHECKED_IN", variant: "default" },
    { label: "Complete", to: "COMPLETED", variant: "outline" },
    { label: "No-show", to: "NO_SHOW", variant: "outline" },
  ],
  CHECKED_IN: [{ label: "Complete", to: "COMPLETED", variant: "default" }],
};

export function BookingDrawer({
  bookingId,
  onClose,
  onChanged,
}: {
  bookingId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [staffOptions, setStaffOptions] = useState<{ id: string; name: string }[]>([]);
  const [resourceOptions, setResourceOptions] = useState<{ id: string; name: string }[]>([]);
  const [reassign, setReassign] = useState({ staffId: "", resourceId: "" });

  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      return;
    }
    setLoading(true);
    Promise.all([
      getBooking(bookingId),
      listStaff(true).catch(() => []),
      listResources().catch(() => []),
    ])
      .then(([b, staff, resources]) => {
        setBooking(b);
        setStaffOptions(staff.filter((s) => s.isActive));
        setResourceOptions(resources.filter((r) => r.isActive));
        const primary = b.allocations[0];
        setReassign({
          staffId: primary?.staff?.id ?? "",
          resourceId: primary?.resource?.id ?? "",
        });
      })
      .catch(() => toast.error("Could not load booking"))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const mutate = async (fn: () => Promise<Booking>, ok: string) => {
    if (!booking) return;
    setActing(true);
    try {
      const updated = await fn();
      setBooking(updated);
      toast.success(ok);
      onChanged();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Action failed";
      toast.error(msg);
    } finally {
      setActing(false);
    }
  };

  const remove = async () => {
    if (!booking || !confirm("Delete this pending booking? History is kept for confirmed ones.")) return;
    setActing(true);
    try {
      await deleteBooking(booking.id);
      toast.success("Booking deleted");
      onChanged();
      onClose();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Could not delete booking";
      toast.error(msg);
    } finally {
      setActing(false);
    }
  };

  const who = booking?.allocations
    .map((a) => a.staff?.name ?? a.resource?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <Sheet open={!!bookingId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Booking</SheetTitle>
          <SheetDescription>
            {booking ? new Date(booking.startTime).toLocaleString() : "Loading…"}
          </SheetDescription>
        </SheetHeader>

        {loading || !booking ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="p-6 pt-2 space-y-5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn(STATUS_STYLES[booking.status] ?? "")}>
                {booking.status.replace(/_/g, " ")}
              </Badge>
              <Badge variant="secondary">{booking.source}</Badge>
              {booking.partySize && <Badge variant="secondary">👥 {booking.partySize}</Badge>}
            </div>

            <div className="rounded-2xl border p-4 space-y-2 text-sm">
              <Row label="Offering" value={booking.service?.name ?? "—"} />
              <Row label="Customer" value={booking.customerName} link={booking.customerId ? `/customers/${booking.customerId}` : undefined} />
              {booking.customerPhone && <Row label="Phone" value={booking.customerPhone} />}
              <Row
                label="Time"
                value={`${new Date(booking.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(booking.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
              />
              <Row label="Allocated" value={who || "Owner (no specific provider)"} />
              {booking.locationMode === "AT_CUSTOMER" && booking.visitAddress && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
                  <MapPin className="size-3.5 mt-0.5 shrink-0" />
                  {[booking.visitAddress.line1, booking.visitAddress.city, booking.visitAddress.pincode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {booking.notes && <Row label="Notes" value={booking.notes} />}
            </div>

            {(NEXT_STATUS[booking.status] ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(NEXT_STATUS[booking.status] ?? []).map((s) => (
                  <Button
                    key={s.to}
                    size="sm"
                    variant={s.variant}
                    disabled={acting}
                    onClick={() => mutate(() => setBookingStatus(booking.id, s.to), `Booking ${s.label.toLowerCase()}ed`)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            )}

            {!["CANCELLED", "COMPLETED", "NO_SHOW"].includes(booking.status) && (
              <div className="rounded-2xl border p-4 space-y-3">
                <p className="text-sm font-medium">Reassign</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Provider</Label>
                    <Select
                      value={reassign.staffId || "none"}
                      onValueChange={(v) => setReassign({ ...reassign, staffId: v === "none" ? "" : v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Keep" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Keep current</SelectItem>
                        {staffOptions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Space</Label>
                    <Select
                      value={reassign.resourceId || "none"}
                      onValueChange={(v) => setReassign({ ...reassign, resourceId: v === "none" ? "" : v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Keep" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Keep current</SelectItem>
                        {resourceOptions.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={acting || (!reassign.staffId && !reassign.resourceId)}
                  onClick={() =>
                    mutate(
                      () =>
                        reassignBooking(booking.id, {
                          ...(reassign.staffId ? { staffId: reassign.staffId } : {}),
                          ...(reassign.resourceId ? { resourceId: reassign.resourceId } : {}),
                        }),
                      "Booking reassigned",
                    )
                  }
                >
                  Apply reassignment
                </Button>
              </div>
            )}

            {booking.status === "PENDING" && (
              <Button
                variant="ghost"
                size="sm"
                disabled={acting}
                onClick={remove}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5 mr-1.5" /> Delete pending booking
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground text-xs pt-0.5">{label}</span>
      {link ? (
        <Link href={link} className="text-sm font-medium text-right hover:underline underline-offset-2">
          {value}
        </Link>
      ) : (
        <span className="text-sm font-medium text-right">{value}</span>
      )}
    </div>
  );
}
