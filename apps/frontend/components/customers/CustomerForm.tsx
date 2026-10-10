"use client";

import { useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FuseButton } from "@/components/bits/FuseButton";
import type { CustomerAddress, CustomerDetail } from "@/lib/customers";
import { cn } from "@/lib/utils";

export interface AddressDraft {
  id?: string;
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
  isDefault: boolean;
}

export interface CustomerFormValue {
  phone: string;
  name: string;
  email: string;
  notes: string;
  customFields: { key: string; value: string }[];
  addresses: AddressDraft[];
  removedAddressIds: string[];
}

const EMPTY_ADDRESS: AddressDraft = {
  label: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
  isDefault: false,
};

export function toFormValue(detail?: CustomerDetail | null): CustomerFormValue {
  return {
    phone: detail?.phone ?? "",
    name: detail?.name ?? "",
    email: detail?.email ?? "",
    notes: detail?.notes ?? "",
    customFields: Object.entries(detail?.customFields ?? {}).map(([key, value]) => ({
      key,
      value: typeof value === "string" ? value : JSON.stringify(value),
    })),
    addresses: (detail?.addresses ?? []).map((a: CustomerAddress) => ({
      id: a.id,
      label: a.label ?? "",
      line1: a.line1,
      line2: a.line2 ?? "",
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      landmark: a.landmark ?? "",
      isDefault: a.isDefault,
    })),
    removedAddressIds: [],
  };
}

export function CustomerForm({
  initial,
  saving,
  submitLabel,
  onBack,
  onSubmit,
}: {
  initial?: CustomerDetail | null;
  saving: boolean;
  submitLabel: string;
  onBack: () => void;
  onSubmit: (value: CustomerFormValue) => void;
}) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<CustomerFormValue>(() => toFormValue(initial));

  useEffect(() => {
    setForm(toFormValue(initial));
  }, [initial?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reduceMotion) return;
    const root = rootRef.current;
    if (!root) return;
    const cards = root.querySelectorAll("[data-cf-card]");
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
  }, [reduceMotion]);

  const patch = (p: Partial<CustomerFormValue>) =>
    setForm((f) => ({ ...f, ...p }));

  const patchAddress = (idx: number, p: Partial<AddressDraft>) =>
    setForm((f) => ({
      ...f,
      addresses: f.addresses.map((a, i) => (i === idx ? { ...a, ...p } : a)),
    }));

  const removeAddress = (idx: number) =>
    setForm((f) => {
      const target = f.addresses[idx];
      return {
        ...f,
        addresses: f.addresses.filter((_, i) => i !== idx),
        removedAddressIds:
          target?.id && !f.removedAddressIds.includes(target.id)
            ? [...f.removedAddressIds, target.id]
            : f.removedAddressIds,
      };
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone.trim()) return toast.error("Phone number is required.");
    for (const [i, a] of form.addresses.entries()) {
      if (!a.line1.trim() || !a.city.trim() || !a.pincode.trim()) {
        return toast.error(`Address ${i + 1} needs street, city and pincode.`);
      }
      if (!/^[1-9][0-9]{5}$/.test(a.pincode.trim())) {
        return toast.error(`Address ${i + 1} needs a valid 6-digit pincode.`);
      }
    }
    onSubmit(form);
  };

  return (
    <div ref={rootRef}>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <form onSubmit={submit} className="space-y-4 max-w-3xl">
        {/* Identity */}
        <Card data-cf-card className="rounded-3xl border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <UserRound className="size-4" />
              </span>
              Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cf-phone">Phone / WhatsApp *</Label>
              <Input
                id="cf-phone"
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                placeholder="+919876543210"
                required
                disabled={!!initial}
                className="rounded-xl"
              />
              {!!initial && (
                <p className="text-[11px] text-muted-foreground">
                  Phone is the customer identity and can&apos;t be changed.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-name">Full name</Label>
              <Input
                id="cf-name"
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="e.g. Priya Sharma"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cf-email">Email</Label>
              <Input
                id="cf-email"
                type="email"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
                placeholder="priya@example.com"
                className="rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        {/* Addresses */}
        <Card data-cf-card className="rounded-3xl border shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <MapPin className="size-4" />
              </span>
              Addresses
              {form.addresses.length > 0 && (
                <Badge variant="secondary" className="ml-1 tabular-nums">
                  {form.addresses.length}
                </Badge>
              )}
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => patch({ addresses: [...form.addresses, { ...EMPTY_ADDRESS }] })}
            >
              <Plus className="size-3.5 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.addresses.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded-2xl">
                No addresses yet — add home, work or delivery addresses. Saved
                addresses are only ever used when explicitly chosen.
              </p>
            ) : (
              form.addresses.map((a, i) => (
                <div key={a.id ?? `new-${i}`} className="rounded-2xl border p-3.5 space-y-3 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Input
                      value={a.label}
                      onChange={(e) => patchAddress(i, { label: e.target.value })}
                      placeholder="Label — Home, Work…"
                      aria-label={`Address ${i + 1} label`}
                      className="h-8 text-xs rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        patchAddress(i, { isDefault: !a.isDefault })
                      }
                      aria-pressed={a.isDefault}
                      title="Default address"
                      className={cn(
                        "text-[11px] font-medium px-2.5 py-1 rounded-full border shrink-0 transition-colors",
                        a.isDefault
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 text-muted-foreground hover:border-zinc-400",
                      )}
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAddress(i)}
                      aria-label={`Remove address ${i + 1}`}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <Input
                    value={a.line1}
                    onChange={(e) => patchAddress(i, { line1: e.target.value })}
                    placeholder="Street address *"
                    aria-label={`Address ${i + 1} street`}
                    className="rounded-xl"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      value={a.city}
                      onChange={(e) => patchAddress(i, { city: e.target.value })}
                      placeholder="City *"
                      aria-label={`Address ${i + 1} city`}
                      className="rounded-xl"
                    />
                    <Input
                      value={a.state}
                      onChange={(e) => patchAddress(i, { state: e.target.value })}
                      placeholder="State"
                      aria-label={`Address ${i + 1} state`}
                      className="rounded-xl"
                    />
                    <Input
                      value={a.pincode}
                      onChange={(e) => patchAddress(i, { pincode: e.target.value })}
                      placeholder="Pincode *"
                      inputMode="numeric"
                      aria-label={`Address ${i + 1} pincode`}
                      className="rounded-xl"
                    />
                  </div>
                  <Input
                    value={a.landmark}
                    onChange={(e) => patchAddress(i, { landmark: e.target.value })}
                    placeholder="Landmark (optional)"
                    aria-label={`Address ${i + 1} landmark`}
                    className="rounded-xl"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card data-cf-card className="rounded-3xl border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Preferences & notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cf-notes">Notes</Label>
              <Textarea
                id="cf-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder="Allergies, VIP flags, language preference…"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Custom fields</Label>
              {form.customFields.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No custom fields — add things like birthday, skin type, table preference.
                </p>
              ) : (
                form.customFields.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={f.key}
                      onChange={(e) =>
                        patch({
                          customFields: form.customFields.map((c, j) =>
                            j === i ? { ...c, key: e.target.value } : c,
                          ),
                        })
                      }
                      placeholder="Field"
                      aria-label={`Custom field ${i + 1} name`}
                      className="rounded-xl"
                    />
                    <Input
                      value={f.value}
                      onChange={(e) =>
                        patch({
                          customFields: form.customFields.map((c, j) =>
                            j === i ? { ...c, value: e.target.value } : c,
                          ),
                        })
                      }
                      placeholder="Value"
                      aria-label={`Custom field ${i + 1} value`}
                      className="rounded-xl"
                    />
                    <button
                      type="button"
                      aria-label={`Remove custom field ${i + 1}`}
                      onClick={() =>
                        patch({ customFields: form.customFields.filter((_, j) => j !== i) })
                      }
                      className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() =>
                  patch({ customFields: [...form.customFields, { key: "", value: "" }] })
                }
              >
                <Plus className="size-3.5 mr-1" /> Add field
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sticky footer */}
        <div className="sticky bottom-4 flex items-center justify-end gap-2 rounded-2xl border bg-card/95 backdrop-blur px-4 py-3 shadow-lg">
          <Button type="button" variant="ghost" onClick={onBack} disabled={saving}>
            Cancel
          </Button>
          <FuseButton type="submit" disabled={saving} ariaLabel={submitLabel}>
            {submitLabel}
          </FuseButton>
        </div>
      </form>
    </div>
  );
}

