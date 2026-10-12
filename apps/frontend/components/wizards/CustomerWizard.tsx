"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { createCustomer, addCustomerAddress, type Customer } from "@/lib/customers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WizardDialog, type WizardStepDef } from "./WizardDialog";
import { cn } from "@/lib/utils";

interface Draft {
  phone: string;
  name: string;
  email: string;
  notes: string;
  tags: string[];
  line1: string;
  city: string;
  pincode: string;
}

const fresh = (): Draft => ({
  phone: "",
  name: "",
  email: "",
  notes: "",
  tags: [],
  line1: "",
  city: "",
  pincode: "",
});

const TAG_PRESETS = ["VIP", "Regular", "New", "Corporate", "Family"];

export function CustomerWizard({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (customer: Customer) => void;
}) {
  const router = useRouter();
  const createdRef = useRef<Customer | null>(null);

  const steps: WizardStepDef<Draft>[] = [
    {
      id: "contact",
      title: "Who are they?",
      hint: "Contact details",
      render: (d, onChange) => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cw-phone">Phone number *</Label>
            <Input
              id="cw-phone"
              type="tel"
              value={d.phone}
              onChange={(e) => onChange({ phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              placeholder="10-digit mobile number"
              inputMode="numeric"
              className="rounded-xl tabular-nums"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              This is how WhatsApp threads link to this customer.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cw-name">Name</Label>
            <Input
              id="cw-name"
              value={d.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Rahul Verma"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cw-email">Email</Label>
            <Input
              id="cw-email"
              type="email"
              value={d.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="Optional"
              className="rounded-xl"
            />
          </div>
        </div>
      ),
      validate: (d) => {
        if (!/^\d{10}$/.test(d.phone.trim()))
          return "Enter a valid 10-digit phone number.";
        return null;
      },
    },
    {
      id: "profile",
      title: "Know them better",
      hint: "Tags & notes",
      render: (d, onChange) => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_PRESETS.map((t) => {
                const on = d.tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      onChange({
                        tags: on ? d.tags.filter((x) => x !== t) : [...d.tags, t],
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
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cw-notes">Notes</Label>
            <Textarea
              id="cw-notes"
              value={d.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Preferences, allergies, occasions…"
              rows={3}
              className="rounded-xl"
            />
          </div>
        </div>
      ),
    },
    {
      id: "address",
      title: "Where are they?",
      hint: "Address — optional",
      render: (d, onChange) => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cw-line1">Street address</Label>
            <Input
              id="cw-line1"
              value={d.line1}
              onChange={(e) => onChange({ line1: e.target.value })}
              placeholder="Flat, street, landmark"
              className="rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cw-city">City</Label>
              <Input
                id="cw-city"
                value={d.city}
                onChange={(e) => onChange({ city: e.target.value })}
                placeholder="City"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cw-pin">Pincode</Label>
              <Input
                id="cw-pin"
                value={d.pincode}
                onChange={(e) => onChange({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                placeholder="6 digits"
                inputMode="numeric"
                className="rounded-xl tabular-nums"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Skip this step if you don&apos;t need it — addresses can be added later.
          </p>
        </div>
      ),
      validate: (d) => {
        const anyAddress = d.line1.trim() || d.city.trim() || d.pincode.trim();
        if (!anyAddress) return null;
        if (!d.line1.trim() || !d.city.trim()) return "Address needs at least a street and city.";
        if (!/^\d{6}$/.test(d.pincode.trim())) return "Pincode must be 6 digits.";
        return null;
      },
    },
    {
      id: "review",
      title: "Review",
      hint: "Ready to add them?",
      render: (d) => (
        <div className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-2">
          <ReviewRow label="Phone" value={`+91 ${d.phone.trim()}`} />
          {d.name.trim() && <ReviewRow label="Name" value={d.name.trim()} />}
          {d.tags.length > 0 && <ReviewRow label="Tags" value={d.tags.join(", ")} />}
          {(d.line1.trim() || d.city.trim()) && (
            <ReviewRow
              label="Address"
              value={[d.line1.trim(), d.city.trim(), d.pincode.trim()].filter(Boolean).join(", ")}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <WizardDialog<Draft>
      open={open}
      onOpenChange={onOpenChange}
      title="Add a customer"
      subtitle="They'll be recognised the next time they message you."
      steps={steps}
      initialData={fresh()}
      freshData={fresh}
      submitLabel="Add customer"
      onSubmit={async (d) => {
        const customer = await createCustomer({
          phone: d.phone.trim(),
          name: d.name.trim() || undefined,
          email: d.email.trim() || undefined,
          notes: d.notes.trim() || undefined,
          customFields: d.tags.length ? { tags: d.tags } : undefined,
        });
        if (d.line1.trim() || d.city.trim()) {
          try {
            await addCustomerAddress(customer.id, {
              line1: d.line1.trim() || "—",
              city: d.city.trim() || "—",
              pincode: d.pincode.trim() || "000000",
              isDefault: true,
            });
          } catch {
            // customer exists; address can be added later
          }
        }
        createdRef.current = customer;
        return {
          title: `${d.name.trim() || "Customer"} added!`,
          message: "Their orders and bookings will now link to this profile.",
        };
      }}
      onDone={() => {
        const c = createdRef.current;
        if (!c) return;
        if (onCreated) onCreated(c);
        else router.push(`/customers/${c.id}`);
      }}
    />
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-zinc-200/60 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right break-words max-w-55">{value}</span>
    </div>
  );
}
