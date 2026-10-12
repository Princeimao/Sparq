"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { createResource, type SpaceResource } from "@/lib/resources";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JellyRadioGroup } from "@/components/bits/JellyRadio";
import { WizardDialog, type WizardStepDef } from "./WizardDialog";
import { cn } from "@/lib/utils";

type Kind = "TABLE" | "ROOM" | "EQUIPMENT" | "OTHER";

interface Draft {
  kind: Kind;
  name: string;
  description: string;
  capacity: string;
  serviceIds: string[];
}

const fresh = (): Draft => ({
  kind: "TABLE",
  name: "",
  description: "",
  capacity: "",
  serviceIds: [],
});

const KIND_OPTIONS: { value: Kind; title: string; blurb: string }[] = [
  { value: "TABLE", title: "Table", blurb: "Restaurant seating with guest capacity" },
  { value: "ROOM", title: "Room", blurb: "Private rooms, cabins, party halls" },
  { value: "EQUIPMENT", title: "Equipment", blurb: "Chairs, machines, vehicles — anything bookable" },
  { value: "OTHER", title: "Something else", blurb: "Anything else customers reserve" },
];

interface ServiceOption {
  id: string;
  name: string;
}

export function ResourceWizard({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (resource: SpaceResource) => void;
}) {
  const createdRef = useRef<SpaceResource | null>(null);
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
      id: "kind",
      title: "What is it?",
      hint: "Pickup a type",
      render: (d, onChange) => (
        <div className="rounded-2xl border border-zinc-200/80 px-3">
          <JellyRadioGroup
            name="rw-kind"
            options={KIND_OPTIONS}
            value={d.kind}
            onChange={(v) => onChange({ kind: v })}
          />
        </div>
      ),
    },
    {
      id: "details",
      title: "Name it",
      hint: "Details & capacity",
      render: (d, onChange) => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rw-name">Name *</Label>
            <Input
              id="rw-name"
              value={d.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={d.kind === "TABLE" ? "e.g. Table 4, Window seat" : "e.g. Party hall, Projector 1"}
              className="rounded-xl"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rw-capacity">
              Capacity{d.kind === "TABLE" ? " (guests) *" : " (optional)"}
            </Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Decrease capacity"
                onClick={() =>
                  onChange({ capacity: String(Math.max(0, (parseInt(d.capacity, 10) || 0) - 1)) })
                }
                className="size-9 rounded-xl border border-zinc-200 text-lg leading-none hover:border-zinc-900 transition-colors"
              >
                −
              </button>
              <Input
                id="rw-capacity"
                type="number"
                min="0"
                value={d.capacity}
                onChange={(e) => onChange({ capacity: e.target.value })}
                placeholder={d.kind === "TABLE" ? "e.g. 4" : "e.g. 20"}
                className="rounded-xl text-center tabular-nums"
              />
              <button
                type="button"
                aria-label="Increase capacity"
                onClick={() => onChange({ capacity: String((parseInt(d.capacity, 10) || 0) + 1) })}
                className="size-9 rounded-xl border border-zinc-200 text-lg leading-none hover:border-zinc-900 transition-colors"
              >
                +
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rw-desc">Notes</Label>
            <Textarea
              id="rw-desc"
              value={d.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Location hints, setup notes…"
              rows={2}
              className="rounded-xl"
            />
          </div>
        </div>
      ),
      validate: (d) => {
        if (!d.name.trim()) return "Give it a name to continue.";
        if (d.kind === "TABLE") {
          const c = parseInt(d.capacity, 10);
          if (Number.isNaN(c) || c <= 0) return "Tables need a guest capacity of at least 1.";
        }
        return null;
      },
    },
    {
      id: "services",
      title: "Used by?",
      hint: "Link services",
      render: (d, onChange) => (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Which services consume this {d.kind.toLowerCase()}? Bookings for them will reserve it
            automatically.
          </p>
          {services.length === 0 ? (
            <p className="text-xs text-muted-foreground rounded-2xl border border-dashed border-zinc-300 p-4 text-center">
              No services yet — you can link them later.
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
        </div>
      ),
    },
    {
      id: "review",
      title: "Review",
      hint: "Ready to add it?",
      render: (d) => (
        <div className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-2">
          <ReviewRow
            label="Type"
            value={KIND_OPTIONS.find((k) => k.value === d.kind)?.title ?? d.kind}
          />
          <ReviewRow label="Name" value={d.name.trim()} />
          {d.capacity.trim() && <ReviewRow label="Capacity" value={d.capacity.trim()} />}
          <ReviewRow
            label="Services"
            value={d.serviceIds.length ? `${d.serviceIds.length} linked` : "None yet"}
          />
        </div>
      ),
    },
  ];

  return (
    <WizardDialog<Draft>
      open={open}
      onOpenChange={onOpenChange}
      title="Add a space"
      subtitle="Tables, rooms and equipment customers can reserve."
      steps={steps}
      initialData={fresh()}
      freshData={fresh}
      submitLabel="Add space"
      onSubmit={async (d) => {
        const resource = await createResource({
          kind: d.kind,
          name: d.name.trim(),
          description: d.description.trim() || null,
          capacity: d.capacity.trim() ? parseInt(d.capacity, 10) : null,
          serviceIds: d.serviceIds,
        });
        createdRef.current = resource;
        return {
          title: `${resource.name} is ready!`,
          message: "Bookings for linked services will now reserve it.",
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
