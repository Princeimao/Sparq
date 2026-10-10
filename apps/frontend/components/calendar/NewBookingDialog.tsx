"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Check } from "lucide-react";
import { api } from "@/lib/api";
import {
  createBooking,
  getAvailability,
  type AvailabilitySlot,
} from "@/lib/bookings";
import { listCustomers, type Customer } from "@/lib/customers";
import { JellyRadioGroup } from "@/components/bits/JellyRadio";
import { FuseButton } from "@/components/bits/FuseButton";
import { cn } from "@/lib/utils";

interface ServiceOption {
  id: string;
  name: string;
  duration: number;
  requiresPartySize: boolean;
  assignmentMode: string;
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function NewBookingDialog({
  open,
  onOpenChange,
  defaultDate,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(() => toISODate(defaultDate ?? new Date()));
  const [partySize, setPartySize] = useState("2");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [ownerImplicit, setOwnerImplicit] = useState(false);
  const [slot, setSlot] = useState<AvailabilitySlot | null>(null);
  const [choiceId, setChoiceId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerHits, setCustomerHits] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [creating, setCreating] = useState(false);

  const service = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId],
  );

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setServiceId("");
    setSlot(null);
    setChoiceId("");
    setCustomerId("");
    setGuestName("");
    setGuestPhone("");
    setCustomerQuery("");
    api
      .get("/services")
      .then((res) => setServices(res.data.data.services ?? []))
      .catch(() => toast.error("Could not load services"));
  }, [open ]);

  useEffect(() => {
    if (!open || !serviceId) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    setSlot(null);
    getAvailability({
      serviceId,
      date,
      partySize: service?.requiresPartySize ? Number(partySize) || undefined : undefined,
    })
      .then((r) => {
        setSlots(r.slots);
        setOwnerImplicit(r.ownerImplicit);
      })
      .catch(() => toast.error("Could not load availability"))
      .finally(() => setSlotsLoading(false));
  }, [open, serviceId, date, partySize, service?.requiresPartySize]);

  useEffect(() => {
    if (customerQuery.trim().length < 2) {
      setCustomerHits([]);
      return;
    }
    const t = setTimeout(() => {
      listCustomers({ search: customerQuery.trim(), limit: 5 })
        .then((r) => setCustomerHits(r.customers))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [customerQuery]);

  const needsChoice =
    !!slot &&
    !ownerImplicit &&
    service?.assignmentMode === "CUSTOMER_CHOICE" &&
    slot.options.length > 1;

  const canConfirm =
    !!slot &&
    (ownerImplicit || service?.assignmentMode !== "CUSTOMER_CHOICE" || !!choiceId) &&
    (customerId !== "" || (guestName.trim() !== "" && guestPhone.trim() !== ""));

  const confirm = async () => {
    if (!slot || !service) return;
    setCreating(true);
    try {
      await createBooking({
        serviceId: service.id,
        ...(customerId
          ? { customerId }
          : { customerName: guestName.trim(), customerPhone: guestPhone.trim() }),
        startTime: slot.start,
        endTime: slot.end,
        ...(service.requiresPartySize ? { partySize: Number(partySize) } : {}),
        ...(choiceId
          ? slot.options.find((o) => o.id === choiceId)?.kind === "STAFF"
            ? { staffId: choiceId }
            : { resourceId: choiceId }
          : {}),
      });
      toast.success("Booking created 🎉");
      onOpenChange(false);
      onCreated();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Could not create booking";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
          <DialogDescription>
            {["Offering", "Time", "Customer"][step] ?? "Confirm"} — step {step + 1} of 3
          </DialogDescription>
        </DialogHeader>

        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Offering</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Pick a service…" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.duration} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nb-date">Date</Label>
                <Input
                  id="nb-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              {service?.requiresPartySize && (
                <div className="space-y-1.5">
                  <Label htmlFor="nb-party">Party size</Label>
                  <Input
                    id="nb-party"
                    type="number"
                    min="1"
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <FuseButton disabled={!serviceId || !date} onClick={() => setStep(1)}>
                Find times <Check className="size-4" />
              </FuseButton>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {slotsLoading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
                <Loader2 className="size-4 animate-spin" /> Checking availability…
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nothing free that day. Try another date.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                  {slots.map((s) => (
                    <button
                      key={s.start}
                      onClick={() => {
                        setSlot(s);
                        setChoiceId(s.options.length === 1 ? (s.options[0]?.id ?? "") : "");
                      }}
                      aria-pressed={slot?.start === s.start}
                      className={cn(
                        "rounded-xl border px-2 py-2 text-xs font-medium tabular-nums transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20",
                        slot?.start === s.start
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 hover:border-zinc-500",
                      )}
                    >
                      {new Date(s.start).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </button>
                  ))}
                </div>
                {needsChoice && slot && (
                  <div className="rounded-xl border border-zinc-200 px-3">
                    <p className="text-xs font-medium text-zinc-700 pt-2.5">
                      Who should take it?
                    </p>
                    <JellyRadioGroup
                      name="booking-choice"
                      options={slot.options.map((o) => ({
                        value: o.id,
                        title: o.name,
                        blurb: o.kind === "STAFF" ? "Provider" : "Space",
                      }))}
                      value={choiceId || null}
                      onChange={setChoiceId}
                    />
                  </div>
                )}
                {slot && !needsChoice && slot.options.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    → {slot.options.map((o) => o.name).join(", ")} will take this booking.
                  </p>
                )}
              </>
            )}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
                <ArrowLeft className="size-4 mr-1.5" /> Back
              </Button>
              <FuseButton disabled={!slot} onClick={() => setStep(2)}>
                Continue
              </FuseButton>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/50 px-3.5 py-3 text-sm">
              <p className="font-medium">{service?.name}</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {slot && new Date(slot.start).toLocaleString()}
                {choiceId && slot
                  ? ` · ${slot.options.find((o) => o.id === choiceId)?.name}`
                  : ""}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nb-cust">Find customer</Label>
              <Input
                id="nb-cust"
                placeholder="Search name or phone…"
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setCustomerId("");
                }}
                className="rounded-xl"
              />
              {customerHits.length > 0 && (
                <div className="rounded-xl border divide-y max-h-36 overflow-y-auto">
                  {customerHits.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCustomerId(c.id);
                        setCustomerQuery(c.name ?? c.phone);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-muted/50",
                        customerId === c.id && "bg-muted",
                      )}
                    >
                      <span className="font-medium">{c.name ?? "Unknown"}</span>
                      <span className="text-muted-foreground text-xs ml-2">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nb-name">Or new name</Label>
                <Input
                  id="nb-name"
                  value={guestName}
                  onChange={(e) => {
                    setGuestName(e.target.value);
                    setCustomerId("");
                  }}
                  placeholder="Full name"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nb-phone">Phone</Label>
                <Input
                  id="nb-phone"
                  value={guestPhone}
                  onChange={(e) => {
                    setGuestPhone(e.target.value);
                    setCustomerId("");
                  }}
                  placeholder="+91…"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="size-4 mr-1.5" /> Back
              </Button>
              <FuseButton disabled={!canConfirm || creating} onClick={confirm}>
                {creating && <Loader2 className="size-4 animate-spin" />}
                Confirm booking
              </FuseButton>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
