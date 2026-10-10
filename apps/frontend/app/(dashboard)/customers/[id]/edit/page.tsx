"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerForm, type CustomerFormValue } from "@/components/customers/CustomerForm";
import {
  addCustomerAddress,
  deleteCustomerAddress,
  getCustomer,
  updateCustomer,
  type CustomerDetail,
} from "@/lib/customers";

export default function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCustomer(await getCustomer(id));
    } catch {
      toast.error("Could not load customer");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (form: CustomerFormValue) => {
    setSaving(true);
    try {
      const customFields = Object.fromEntries(
        form.customFields
          .filter((f) => f.key.trim() !== "")
          .map((f) => [f.key.trim(), f.value]),
      );
      await updateCustomer(id, {
        name: form.name.trim() || undefined,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
        customFields,
      });

      // Remove deleted addresses first (backend refuses referenced ones).
      for (const addressId of form.removedAddressIds) {
        try {
          await deleteCustomerAddress(id, addressId);
        } catch (error: unknown) {
          const msg =
            (error as { response?: { data?: { error?: string } } })?.response?.data
              ?.error ?? "Could not delete an address";
          toast.warning(msg);
        }
      }

      // Add brand-new addresses (existing ones are untouched in place).
      const existingIds = new Set((customer?.addresses ?? []).map((a) => a.id));
      let failed = 0;
      for (const a of form.addresses) {
        if (a.id && existingIds.has(a.id)) continue;
        try {
          await addCustomerAddress(id, {
            label: a.label.trim() || undefined,
            line1: a.line1.trim(),
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
      if (failed > 0) toast.warning(`${failed} address${failed > 1 ? "es" : ""} could not be saved.`);
      else toast.success("Customer updated");
      router.push(`/customers/${id}`);
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Could not update customer";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-8 w-56 rounded-xl" />
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 max-w-7xl mx-auto py-24 text-center">
        <p className="font-medium">Customer not found</p>
        <p className="text-sm text-muted-foreground mt-1">
          It may have been deleted or belongs to another business.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit {customer.name ?? customer.phone}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update identity, addresses and preferences.
        </p>
      </div>
      <CustomerForm
        initial={customer}
        saving={saving}
        submitLabel={saving ? "Saving…" : "Save changes"}
        onBack={() => router.push(`/customers/${id}`)}
        onSubmit={submit}
      />
    </div>
  );
}
