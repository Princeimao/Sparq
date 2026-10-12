"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { createStaff, setHours, type StaffMember, type WeeklyHours } from "@/lib/resources";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WizardDialog, type WizardStepDef } from "./WizardDialog";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ROLE_PRESETS = ["Staff", "Manager", "Owner", "Receptionist"];

const COLORS = ["#178a4c", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#0d9488"];

interface DayHours {
  on: boolean;
  start: string;
  end: string;
}

interface Draft {
  name: string;
  role: string;
  specialty: string;
  email: string;
  phone: string;
  color: string;
  serviceIds: string[];
  hours: DayHours[];
}

const defaultHours = (): DayHours[] =>
  DAYS.map((_, i) => ({
    on: i >= 1 && i <= 6,
    start: "09:00",
    end: "18:00",
  }));

const fresh = (): Draft => ({
  name: "",
  role: "Staff",
  specialty: "",
  email: "",
  phone: "",
  color: COLORS[0],
  serviceIds: [],
  hours: defaultHours(),
});

interface ServiceOption {
  id: string;
  name: string;
}

export function StaffWizard({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (staff: StaffMember) => void;
}) {
  const createdRef = useRef<StaffMember | null>(null);
  const hoursNoteRef = useRef("");
  const [services, setServices] = useState<ServiceOption[]>([]);

  useEffect(() => {
    if (!open) return;
    api.get("/services").then(
      (r) =>
        setServices(
          (r.data.data.services ?? []).map((s: ServiceOption) => ({ id: s.id, name: s.name })),
        ),
      () => {},
    );
  }, [open ]);

  const steps: WizardStepDef<Draft>[] = [
    {
      id: "identity",
      title: "Who's joining?",
      hint: "Identity & contact",
      render: (d, onChange) => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tw-name">Full name *</Label>
            <Input
              id="tw-name"
              value={d.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Priya Sharma"
              className="rounded-xl"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_PRESETS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onChange({ role: r })}
                  aria-pressed={d.role === r}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                    d.role === r
                      ? "border-ink bg-ink text-white"
                      : "border-zinc-200 hover:border-zinc-500",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tw-specialty">Specialty</Label>
              <Input
                id="tw-specialty"
                value={d.specialty}
                onChange={(e) => onChange({ specialty: e.target.value })}
                placeholder="e.g. Hair colour"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <div className="flex gap-1.5 pt-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Colour ${c}`}
                    aria-pressed={d.color === c}
                    onClick={() => onChange({ color: c })}
                    style={{ backgroundColor: c }}
                    className={cn(
                      "size-6 rounded-full transition-transform",
                      d.color === c && "ring-2 ring-offset-2 ring-zinc-900 scale-110",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tw-email">Email</Label>
              <Input
                id="tw-email"
                type="email"
                value={d.email}
                onChange={(e) => onChange({ email: e.target.value })}
                placeholder="Optional"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tw-phone">Phone</Label>
              <Input
                id="tw-phone"
                type="tel"
                value={d.phone}
                onChange={(e) => onChange({ phone: e.target.value })}
                placeholder="Optional"
                className="rounded-xl"
              />
            </div>
          </div>
        </div>
      ),
      validate: (d) => (d.name.trim() ? null : "Enter the provider's name to continue."),
    },
    {
      id: "services",
      title: "What do they do?",
      hint: "Link services",
      render: (d, onChange) => (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Pickup which services {d.name.trim() || "they"} can fulfil. Bookings will route to them
            automatically.
          </p>
          {services.length === 0 ? (
            <p className="text-xs text-muted-foreground rounded-2xl border border-dashed border-zinc-300 p-4 text-center">
              No services yet — finish this step and create services next.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
              {services.map((s) => {
                const on = d.serviceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      onChange({
                        serviceIds: on
                          ? d.serviceIds.filter((x) => x !== s.id)
                          : [...d.serviceIds, s.id],
                      })
                    }
                    aria-pressed={on}
                    className={cn(
                      "text-xs px-2.5 py-1.5 rounded-full border transition-colors",
                      on
                        ? "border-ink bg-ink text-white"
                        : "border-zinc-200 hover:border-zinc-500",
                    )}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}
          {d.serviceIds.length > 0 && (
            <p className="text-xs font-medium text-brand">
              {d.serviceIds.length} service{d.serviceIds.length === 1 ? "" : "s"} linked
            </p>
          )}
        </div>
      ),
    },
    {
      id: "hours",
      title: "When are they in?",
      hint: "Weekly hours",
      render: (d, onChange) => (
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {DAYS.map((day, i) => {
            const h = d.hours[i];
            return (
              <div
                key={day}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-colors",
                  h.on ? "border-zinc-200 bg-white" : "border-transparent bg-zinc-100/60",
                )}
              >
                <span className="w-9 text-xs font-medium">{day}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={h.on}
                  aria-label={`${day} working`}
                  onClick={() => {
                    const next = [...d.hours];
                    next[i] = { ...h, on: !h.on };
                    onChange({ hours: next });
                  }}
                  className={cn(
                    "relative h-5 w-9 rounded-full transition-colors shrink-0",
                    h.on ? "bg-brand" : "bg-zinc-300",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 size-4 rounded-full bg-white shadow transition-all",
                      h.on ? "left-4.5" : "left-0.5",
                    )}
                  />
                </button>
                {h.on ? (
                  <div className="flex items-center gap-1 ml-auto">
                    <Input
                      type="time"
                      aria-label={`${day} start`}
                      value={h.start}
                      onChange={(e) => {
                        const next = [...d.hours];
                        next[i] = { ...h, start: e.target.value };
                        onChange({ hours: next });
                      }}
                      className="rounded-lg h-7 text-[11px] px-1.5 w-21"
                    />
                    <span className="text-[11px] text-muted-foreground">–</span>
                    <Input
                      type="time"
                      aria-label={`${day} end`}
                      value={h.end}
                      onChange={(e) => {
                        const next = [...d.hours];
                        next[i] = { ...h, end: e.target.value };
                        onChange({ hours: next });
                      }}
                      className="rounded-lg h-7 text-[11px] px-1.5 w-21"
                    />
                  </div>
                ) : (
                  <span className="ml-auto text-[11px] text-muted-foreground">Off</span>
                )}
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground pt-1">
            Breaks and holidays can be added later from their profile.
          </p>
        </div>
      ),
    },
    {
      id: "review",
      title: "Review",
      hint: "Ready to add them?",
      render: (d) => {
        const onDays = d.hours.filter((h) => h.on).length;
        return (
          <div className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-2">
            <ReviewRow label="Name" value={d.name.trim()} />
            <ReviewRow label="Role" value={d.role || "Staff"} />
            {d.specialty.trim() && <ReviewRow label="Specialty" value={d.specialty.trim()} />}
            <ReviewRow
              label="Services"
              value={d.serviceIds.length ? `${d.serviceIds.length} linked` : "None yet"}
            />
            <ReviewRow
              label="Hours"
              value={onDays ? `${onDays} day${onDays === 1 ? "" : "s"}/week` : "No hours set"}
            />
          </div>
        );
      },
    },
  ];

  return (
    <WizardDialog<Draft>
      open={open}
      onOpenChange={onOpenChange}
      title="Add a provider"
      subtitle="They'll start receiving bookings over WhatsApp."
      steps={steps}
      initialData={fresh()}
      freshData={fresh}
      submitLabel="Add provider"
      onSubmit={async (d) => {
        const staff = await createStaff({
          name: d.name.trim(),
          role: d.role.trim() || null,
          specialty: d.specialty.trim() || null,
          email: d.email.trim() || null,
          phone: d.phone.trim() || null,
          color: d.color,
          serviceIds: d.serviceIds,
        });
        createdRef.current = staff;
        const payload: WeeklyHours[] = d.hours.map((h, i) => ({
          dayOfWeek: i,
          startTime: h.start || "09:00",
          endTime: h.end || "18:00",
          isActive: h.on,
        }));
        try {
          await setHours({ staffId: staff.id }, payload);
          hoursNoteRef.current = "";
        } catch {
          hoursNoteRef.current = " Hours couldn't be saved — set them from their profile.";
        }
        return {
          title: `${staff.name} joined the team!`,
          message: `Linked to ${d.serviceIds.length} service${d.serviceIds.length === 1 ? "" : "s"}.${hoursNoteRef.current}`,
        };
      }}
      onDone={() => {
        if (createdRef.current) onCreated(createdRef.current);
      }}
    />
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-zinc-200/60 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}
