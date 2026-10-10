"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CustomerForm, type CustomerFormValue } from "@/components/customers/CustomerForm";
import {
  addCustomerAddress,
  createCustomer,
} from "@/lib/customers";

export default function NewCustomerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const submit = async (form: CustomerFormValue) => {
    setSaving(true);
    try {
      const customFields = Object.fromEntries(
        form.customFields
          .filter((f) => f.key.trim() !== "")
          .map((f) => [f.key.trim(), f.value]),
      );
      const customer = await createCustomer({
        phone: form.phone.trim(),
        name: form.name.trim() || undefined,
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
        ...(Object.keys(customFields).length > 0 ? { customFields } : {}),
      });

      // Persist each address explicitly (backend stores one per call).
      let failed = 0;
      for (const a of form.addresses) {
        try {
          await addCustomerAddress(customer.id, {
            label: a.label.trim() || undefined,
            line1: a.line1.trim(),
            line2: undefined,
            city: a.city.trim(),
            state: a.state.trim() || undefined,
            pincode: a.pincode.trim(),
            landmark: a.landmark.trim() || undefined,
            isDefault: a.isDefault,
          });
        } catch {
          failed += 1;
        }
      }
      if (failed > 0) {
        toast.warning(
          `Customer created, but ${failed} address${failed > 1 ? "es" : ""} could not be saved.`,
        );
      } else {
        toast.success("Customer created 🎉");
      }
      router.push(`/customers/${customer.id}`);
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Could not create customer";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">New customer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything the WhatsApp flow collects — identity, addresses,
          preferences — in one place.
        </p>
      </div>
      <CustomerForm
        saving={saving}
        submitLabel={saving ? "Creating…" : "Create customer"}
        onBack={() => router.push("/customers")}
        onSubmit={submit}
      />
    </div>
  );
}
