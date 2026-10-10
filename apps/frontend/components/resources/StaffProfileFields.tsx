"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const STAFF_SWATCHES = [
  "#7c3aed",
  "#2563eb",
  "#059669",
  "#d97706",
  "#dc2626",
  "#db2777",
  "#0891b2",
  "#4d7c0f",
];

export interface StaffFormState {
  name: string;
  email: string;
  phone: string;
  role: string;
  specialty: string;
  color: string;
  isActive: boolean;
  serviceIds: string[];
}

export const EMPTY_STAFF_FORM: StaffFormState = {
  name: "",
  email: "",
  phone: "",
  role: "",
  specialty: "",
  color: STAFF_SWATCHES[0]!,
  isActive: true,
  serviceIds: [],
};

interface ServiceOption {
  id: string;
  name: string;
}

export function useServiceOptions() {
  const [services, setServices] = useState<ServiceOption[]>([]);
  useEffect(() => {
    api
      .get("/services")
      .then((res) =>
        setServices(
          (res.data.data.services ?? []).map((s: { id: string; name: string }) => ({
            id: s.id,
            name: s.name,
          })),
        ),
      )
      .catch(() => {});
  }, []);
  return services;
}

/** Shared profile fields used by the staff drawer and the full staff page. */
export function StaffProfileFields({
  form,
  onChange,
  services,
  idPrefix = "st",
}: {
  form: StaffFormState;
  onChange: (form: StaffFormState) => void;
  services: ServiceOption[];
  idPrefix?: string;
}) {
  const set = (p: Partial<StaffFormState>) => onChange({ ...form, ...p });
  const toggleService = (id: string) =>
    set({
      serviceIds: form.serviceIds.includes(id)
        ? form.serviceIds.filter((s) => s !== id)
        : [...form.serviceIds, id],
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className="size-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
          style={{ backgroundColor: form.color }}
          aria-hidden
        >
          {(form.name || "?").charAt(0).toUpperCase()}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {STAFF_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set({ color: c })}
              aria-label={`Color ${c}`}
              aria-pressed={form.color === c}
              style={{ backgroundColor: c }}
              className={cn(
                "size-6 rounded-full transition-transform",
                form.color === c && "ring-2 ring-offset-2 ring-zinc-900 scale-110",
              )}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label htmlFor={`${idPrefix}-name`}>Name *</Label>
          <Input
            id={`${idPrefix}-name`}
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Priya Nair"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-role`}>Role</Label>
          <Input
            id={`${idPrefix}-role`}
            value={form.role}
            onChange={(e) => set({ role: e.target.value })}
            placeholder="Senior stylist"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-specialty`}>Specialty</Label>
          <Input
            id={`${idPrefix}-specialty`}
            value={form.specialty}
            onChange={(e) => set({ specialty: e.target.value })}
            placeholder="Balayage, bridal"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-email`}>Email</Label>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-phone`}>Phone</Label>
          <Input
            id={`${idPrefix}-phone`}
            value={form.phone}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between py-1">
        <Label>Active — can take bookings</Label>
        <Switch
          checked={form.isActive}
          onCheckedChange={(v) => set({ isActive: v })}
        />
      </div>

      <div className="space-y-2">
        <Label>Can perform</Label>
        {services.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No services yet — create services first, then link them here.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleService(s.id)}
                aria-pressed={form.serviceIds.includes(s.id)}
                className={cn(
                  "text-xs px-2.5 py-1.5 rounded-full border transition-colors",
                  form.serviceIds.includes(s.id)
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 hover:border-zinc-400",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
