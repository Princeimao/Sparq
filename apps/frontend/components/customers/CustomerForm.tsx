"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Plus, Trash2, UserRound } from "lucide-react";
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

const EASE = [0.22, 1, 0.36, 1] as const;

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

function Card({
  index,
  reduceMotion,
  icon,
  title,
  action,
  children,
}: {
  index: number;
  reduceMotion: boolean;
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.07, 0.28), duration: 0.4, ease: EASE }}
      className="rounded-[1.6rem] bg-ink/[0.045] p-5"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-white text-ink">
            {icon}
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

function FillInput(props: React.InputHTMLAttributes<HTMLInputElement> & { small?: boolean }) {
  const { small, className, ...rest } = props;
  return (
    <input
      {...rest}
      className={cn(
        "w-full rounded-2xl bg-white font-medium text-ink placeholder:text-ink/30 placeholder:font-normal",
        "focus:outline-none focus:ring-2 focus:ring-brand/40 transition-shadow",
        small ? "px-3.5 py-2 text-[13px]" : "px-4 py-3 text-sm",
        className,
      )}
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45 mb-1.5">
      {children}
    </span>
  );
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
  const [form, setForm] = useState<CustomerFormValue>(() => toFormValue(initial));

  useEffect(() => {
    setForm(toFormValue(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

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
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/55 hover:text-ink transition-colors mb-4"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <form onSubmit={submit} className="space-y-3 max-w-3xl">
        {/* Identity */}
        <Card index={0} reduceMotion={!!reduceMotion} icon={<UserRound className="size-4" />} title="Identity">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Phone / WhatsApp *</FieldLabel>
              <FillInput
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                placeholder="+919876543210"
                required
                disabled={!!initial}
                className="tabular-nums"
              />
              {!!initial && (
                <p className="text-[11px] text-ink/45 mt-1.5">
                  Phone is the customer identity and can&apos;t be changed.
                </p>
              )}
            </div>
            <div>
              <FieldLabel>Full name</FieldLabel>
              <FillInput
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="e.g. Priya Sharma"
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Email</FieldLabel>
              <FillInput
                type="email"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
                placeholder="priya@example.com"
              />
            </div>
          </div>
        </Card>

        {/* Addresses */}
        <Card
          index={1}
          reduceMotion={!!reduceMotion}
          icon={<MapPin className="size-4" />}
          title={`Addresses${form.addresses.length > 0 ? ` · ${form.addresses.length}` : ""}`}
          action={
            <button
              type="button"
              onClick={() => patch({ addresses: [...form.addresses, { ...EMPTY_ADDRESS }] })}
              className="h-9 inline-flex items-center gap-1 rounded-full bg-white px-3.5 text-xs font-semibold text-ink hover:bg-ink hover:text-white transition-colors"
            >
              <Plus className="size-3.5" /> Add
            </button>
          }
        >
          {form.addresses.length === 0 ? (
            <p className="text-xs text-ink/50 py-4 text-center rounded-2xl bg-white/60">
              No addresses yet — add home, work or delivery addresses.
            </p>
          ) : (
            <div className="space-y-2.5">
              {form.addresses.map((a, i) => (
                <motion.div
                  key={a.id ?? `new-${i}`}
                  layout
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-white p-3.5 space-y-2.5"
                >
                  <div className="flex items-center gap-2">
                    <FillInput
                      small
                      value={a.label}
                      onChange={(e) => patchAddress(i, { label: e.target.value })}
                      placeholder="Label — Home, Work…"
                      aria-label={`Address ${i + 1} label`}
                      className="bg-ink/[0.05]"
                    />
                    <button
                      type="button"
                      onClick={() => patchAddress(i, { isDefault: !a.isDefault })}
                      aria-pressed={a.isDefault}
                      title="Default address"
                      className={cn(
                        "text-[11px] font-semibold px-2.5 py-1.5 rounded-full shrink-0 transition-colors",
                        a.isDefault ? "bg-ink text-white" : "bg-ink/[0.07] text-ink/55 hover:text-ink",
                      )}
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAddress(i)}
                      aria-label={`Remove address ${i + 1}`}
                      className="p-2 rounded-full text-ink/45 hover:text-red-600 hover:bg-red-500/10 transition-colors shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <FillInput
                    small
                    value={a.line1}
                    onChange={(e) => patchAddress(i, { line1: e.target.value })}
                    placeholder="Street address *"
                    aria-label={`Address ${i + 1} street`}
                    className="bg-ink/[0.05]"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <FillInput
                      small
                      value={a.city}
                      onChange={(e) => patchAddress(i, { city: e.target.value })}
                      placeholder="City *"
                      aria-label={`Address ${i + 1} city`}
                      className="bg-ink/[0.05]"
                    />
                    <FillInput
                      small
                      value={a.state}
                      onChange={(e) => patchAddress(i, { state: e.target.value })}
                      placeholder="State"
                      aria-label={`Address ${i + 1} state`}
                      className="bg-ink/[0.05]"
                    />
                    <FillInput
                      small
                      value={a.pincode}
                      onChange={(e) => patchAddress(i, { pincode: e.target.value })}
                      placeholder="Pincode *"
                      inputMode="numeric"
                      aria-label={`Address ${i + 1} pincode`}
                      className="bg-ink/[0.05] tabular-nums"
                    />
                  </div>
                  <FillInput
                    small
                    value={a.landmark}
                    onChange={(e) => patchAddress(i, { landmark: e.target.value })}
                    placeholder="Landmark (optional)"
                    aria-label={`Address ${i + 1} landmark`}
                    className="bg-ink/[0.05]"
                  />
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* Preferences */}
        <Card index={2} reduceMotion={!!reduceMotion} icon={<Plus className="size-4" />} title="Preferences & notes">
          <div className="space-y-3">
            <div>
              <FieldLabel>Notes</FieldLabel>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder="Allergies, VIP flags, language preference…"
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none transition-shadow"
              />
            </div>
            <div>
              <FieldLabel>Custom fields</FieldLabel>
              {form.customFields.length === 0 ? (
                <p className="text-xs text-ink/50">
                  None yet — birthdays, skin type, table preference…
                </p>
              ) : (
                <div className="space-y-2">
                  {form.customFields.map((f, i) => (
                    <div key={i} className="flex gap-2">
                      <FillInput
                        small
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
                        className="bg-ink/[0.05]"
                      />
                      <FillInput
                        small
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
                        className="bg-ink/[0.05]"
                      />
                      <button
                        type="button"
                        aria-label={`Remove custom field ${i + 1}`}
                        onClick={() => patch({ customFields: form.customFields.filter((_, j) => j !== i) })}
                        className="p-2 rounded-full text-ink/45 hover:text-red-600 hover:bg-red-500/10 shrink-0 self-center transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => patch({ customFields: [...form.customFields, { key: "", value: "" }] })}
                className="mt-2 h-9 inline-flex items-center gap-1 rounded-full bg-white px-3.5 text-xs font-semibold text-ink hover:bg-ink hover:text-white transition-colors"
              >
                <Plus className="size-3.5" /> Add field
              </button>
            </div>
          </div>
        </Card>

        {/* Sticky footer */}
        <div className="sticky bottom-4 flex items-center justify-end gap-2 rounded-[1.4rem] bg-ink px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            className="h-11 px-5 rounded-full text-sm font-medium text-white/65 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <FuseButton type="submit" disabled={saving} ariaLabel={submitLabel}>
            {submitLabel}
          </FuseButton>
        </div>
      </form>
    </div>
  );
}
