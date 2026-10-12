"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { JellyRadioGroup } from "@/components/bits/JellyRadio";
import { WizardDialog, type WizardStepDef } from "./WizardDialog";
import type { Service } from "@/app/(dashboard)/services/page";
import { cn } from "@/lib/utils";

type AssignmentMode = "CUSTOMER_CHOICE" | "BUSINESS_ASSIGN" | "AUTO" | "SINGLE";
type LocationMode = "AT_BUSINESS" | "AT_CUSTOMER" | "BOTH";

interface Draft {
  name: string;
  description: string;
  price: string;
  duration: string;
  locationMode: LocationMode;
  assignmentMode: AssignmentMode;
  staffIds: string[];
  resourceIds: string[];
  requiresPartySize: boolean;
  bufferMinutes: string;
  minLeadMinutes: string;
  maxAdvanceDays: string;
}

const fresh = (): Draft => ({
  name: "",
  description: "",
  price: "",
  duration: "60",
  locationMode: "AT_BUSINESS",
  assignmentMode: "BUSINESS_ASSIGN",
  staffIds: [],
  resourceIds: [],
  requiresPartySize: false,
  bufferMinutes: "0",
  minLeadMinutes: "0",
  maxAdvanceDays: "",
});

const DURATIONS = [15, 30, 45, 60, 90, 120];

const ASSIGNMENT_OPTIONS: { value: AssignmentMode; title: string; blurb: string }[] = [
  { value: "CUSTOMER_CHOICE", title: "Customer chooses", blurb: "They pick a provider at booking time" },
  { value: "BUSINESS_ASSIGN", title: "We assign", blurb: "You pick who fulfils it later" },
  { value: "AUTO", title: "Auto-assign", blurb: "Least-loaded eligible provider wins" },
  { value: "SINGLE", title: "Just me", blurb: "Solo provider, no choosing needed" },
];

const LOCATION_OPTIONS: { value: LocationMode; title: string; blurb: string }[] = [
  { value: "AT_BUSINESS", title: "At my place", blurb: "Customer comes to you" },
  { value: "AT_CUSTOMER", title: "At theirs", blurb: "Home visits and on-site work" },
  { value: "BOTH", title: "Both", blurb: "Customer chooses per booking" },
];

interface Option {
  id: string;
  name: string;
}

function ChipRow({
  options,
  selected,
  onToggle,
  empty,
}: {
  options: Option[];
  selected: string[];
  onToggle: (id: string) => void;
  empty: string;
}) {
  if (options.length === 0) return <p className="text-xs text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            aria-pressed={on}
            className={cn(
              "text-xs px-2.5 py-1.5 rounded-full border transition-colors",
              on
                ? "border-ink bg-ink text-white"
                : "border-zinc-200 hover:border-zinc-500",
            )}
          >
            {o.name}
          </button>
        );
      })}
    </div>
  );
}

export function ServiceWizard({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (service: Service) => void;
}) {
  const createdRef = useRef<Service | null>(null);
  const [staff, setStaff] = useState<Option[]>([]);
  const [resources, setResources] = useState<Option[]>([]);

  useEffect(() => {
    if (!open) return;
    api.get("/staff").then(
      (r) => setStaff((r.data.data.staff ?? []).map((s: Option) => ({ id: s.id, name: s.name }))),
      () => {},
    );
    api.get("/resources").then(
      (r) =>
        setResources(
          (r.data.data.resources ?? []).map((x: Option & { kind: string }) => ({
            id: x.id,
            name: `${x.name} (${x.kind.toLowerCase()})`,
          })),
        ),
      () => {},
    );
  }, [open ]);

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const steps: WizardStepDef<Draft>[] = [
    {
      id: "basics",
      title: "Basics",
      hint: "What is it?",
      render: (d, onChange) => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sw-name">Service name *</Label>
            <Input
              id="sw-name"
              value={d.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Haircut, Dental checkup, Table for two"
              className="rounded-xl"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sw-desc">Description</Label>
            <Textarea
              id="sw-desc"
              value={d.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="What should customers expect?"
              rows={3}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sw-price">Price (₹)</Label>
            <Input
              id="sw-price"
              type="number"
              min="0"
              step="0.01"
              value={d.price}
              onChange={(e) => onChange({ price: e.target.value })}
              placeholder="Leave empty if it varies"
              className="rounded-xl"
            />
          </div>
        </div>
      ),
      validate: (d) => (d.name.trim() ? null : "Give your service a name to continue."),
    },
    {
      id: "timing",
      title: "Timing & place",
      hint: "How long, where?",
      render: (d, onChange) => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Duration</Label>
            <div className="flex flex-wrap gap-1.5">
              {DURATIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChange({ duration: String(m) })}
                  aria-pressed={d.duration === String(m)}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-xs font-medium tabular-nums transition-colors",
                    d.duration === String(m)
                      ? "border-ink bg-ink text-white"
                      : "border-zinc-200 hover:border-zinc-500",
                  )}
                >
                  {m}m
                </button>
              ))}
              <Input
                type="number"
                min="1"
                value={d.duration}
                onChange={(e) => onChange({ duration: e.target.value })}
                aria-label="Custom duration in minutes"
                className="rounded-full w-20 text-xs text-center"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Where does it happen?</Label>
            <div className="rounded-2xl border border-zinc-200/80 px-3">
              <JellyRadioGroup
                name="sw-location"
                options={LOCATION_OPTIONS}
                value={d.locationMode}
                onChange={(v) => onChange({ locationMode: v })}
              />
            </div>
          </div>
        </div>
      ),
      validate: (d) => {
        const m = parseInt(d.duration, 10);
        return Number.isInteger(m) && m > 0 ? null : "Pick a duration longer than 0 minutes.";
      },
    },
    {
      id: "assignment",
      title: "Who fulfils it?",
      hint: "Providers & spaces",
      render: (d, onChange) => (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200/80 px-3">
            <JellyRadioGroup
              name="sw-assignment"
              options={ASSIGNMENT_OPTIONS}
              value={d.assignmentMode}
              onChange={(v) => onChange({ assignmentMode: v })}
            />
          </div>
          {d.assignmentMode !== "SINGLE" && (
            <>
              <div className="space-y-1.5">
                <Label>Eligible providers</Label>
                <ChipRow
                  options={staff}
                  selected={d.staffIds}
                  onToggle={(id) => onChange({ staffIds: toggle(d.staffIds, id) })}
                  empty="No providers yet — add them under Resources."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Eligible spaces & equipment</Label>
                <ChipRow
                  options={resources}
                  selected={d.resourceIds}
                  onToggle={(id) => onChange({ resourceIds: toggle(d.resourceIds, id) })}
                  empty="No spaces yet — optional unless bookings need a table or room."
                />
              </div>
            </>
          )}
          <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 px-3.5 py-3">
            <div>
              <p className="text-sm font-medium">Ask for party size</p>
              <p className="text-xs text-muted-foreground">Restaurant tables, group sessions</p>
            </div>
            <Switch
              checked={d.requiresPartySize}
              onCheckedChange={(v) => onChange({ requiresPartySize: v })}
              aria-label="Require party size"
            />
          </div>
        </div>
      ),
    },
    {
      id: "rules",
      title: "Booking rules",
      hint: "Buffers & lead times",
      render: (d, onChange) => (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="sw-buffer">Buffer (min)</Label>
            <Input
              id="sw-buffer"
              type="number"
              min="0"
              max="480"
              value={d.bufferMinutes}
              onChange={(e) => onChange({ bufferMinutes: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sw-lead">Lead time (min)</Label>
            <Input
              id="sw-lead"
              type="number"
              min="0"
              value={d.minLeadMinutes}
              onChange={(e) => onChange({ minLeadMinutes: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sw-advance">Book ahead (days)</Label>
            <Input
              id="sw-advance"
              type="number"
              min="1"
              placeholder="∞"
              value={d.maxAdvanceDays}
              onChange={(e) => onChange({ maxAdvanceDays: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <p className="col-span-3 text-[11px] text-muted-foreground">
            Buffer blocks cleanup time after each booking. Lead time is the minimum notice. Leave any field at 0 or empty for no limit.
          </p>
        </div>
      ),
    },
    {
      id: "review",
      title: "Review",
      hint: "Ready to offer it?",
      render: (d) => (
        <div className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-2">
          <ReviewRow label="Name" value={d.name.trim()} />
          <ReviewRow
            label="Price"
            value={d.price.trim() ? `₹${parseFloat(d.price).toFixed(2)}` : "Varies"}
          />
          <ReviewRow label="Duration" value={`${d.duration} min`} />
          <ReviewRow
            label="Fulfiller"
            value={
              d.assignmentMode === "SINGLE"
                ? "Just me"
                : d.assignmentMode === "CUSTOMER_CHOICE"
                  ? `Customer picks (${d.staffIds.length || "any"})`
                  : d.assignmentMode === "AUTO"
                    ? "Auto-assign"
                    : "We assign"
            }
          />
          {d.requiresPartySize && <ReviewRow label="Party size" value="Required" />}
        </div>
      ),
    },
  ];

  return (
    <WizardDialog<Draft>
      open={open}
      onOpenChange={onOpenChange}
      title="New service"
      subtitle="Offerings customers can book over WhatsApp."
      steps={steps}
      initialData={fresh()}
      freshData={fresh}
      submitLabel="Create service"
      onSubmit={async (d) => {
        const res = await api.post(`/services`, {
          name: d.name.trim(),
          description: d.description.trim() || undefined,
          price: d.price.trim() ? parseFloat(d.price) : undefined,
          duration: parseInt(d.duration, 10),
          locationMode: d.locationMode,
          assignmentMode: d.assignmentMode,
          bookingMode: d.assignmentMode === "CUSTOMER_CHOICE" ? "SELECT_STAFF" : "ANY_STAFF",
          requiresPartySize: d.requiresPartySize,
          bufferMinutes: parseInt(d.bufferMinutes, 10) || 0,
          minLeadMinutes: parseInt(d.minLeadMinutes, 10) || 0,
          maxAdvanceDays: d.maxAdvanceDays.trim() ? parseInt(d.maxAdvanceDays, 10) : null,
          staffIds: d.staffIds,
          resourceIds: d.resourceIds,
        });
        const service = res.data.data.service as Service;
        createdRef.current = service;
        return {
          title: `${service.name} is bookable!`,
          message: "Set provider hours next, or start taking bookings right away.",
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