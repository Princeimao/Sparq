"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Customer } from "@/app/(dashboard)/customers/page";

interface CustomerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSave: (customer: Customer, isUpdate: boolean) => void;
}

export function CustomerDrawer({
  open,
  onOpenChange,
  customer,
  onSave,
}: CustomerDrawerProps) {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    externalId: "",
    address: "",
    optedIn: true,
  });

  useEffect(() => {
    if (open) {
      if (customer) {
        setFormData({
          name: customer.name || "",
          phone: customer.phone,
          externalId: customer.externalId || "",
          address: customer.address || "",
          optedIn: customer.optedIn,
        });
      } else {
        setFormData({
          name: "",
          phone: "",
          externalId: "",
          address: "",
          optedIn: true,
        });
      }
    }
  }, [open, customer]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone) {
      toast.error("Phone number is required.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        phone: formData.phone,
        externalId: formData.externalId,
        address: formData.address,
        optedIn: formData.optedIn,
      };

      if (customer) {
        // Update (Note: phone might not be updatable depending on API schema, but we'll send it or exclude it if needed. Actually the API update schema doesn't allow phone update. Let's check.)
        // updateCustomerSchema: name, address, optedIn, externalId. phone is NOT there.
        const updatePayload = {
          name: formData.name,
          externalId: formData.externalId,
          address: formData.address,
          optedIn: formData.optedIn,
        };
        const res = await api.patch(
          `/customers/${customer.id}`,
          updatePayload
        );
        toast.success("Customer updated successfully!");
        onSave(res.data.customer, true);
      } else {
        // Create
        const res = await api.post(`/customers`, payload);
        toast.success("Customer added successfully!");
        onSave(res.data.customer, false);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || "Failed to save customer";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{customer ? "Edit Customer" : "Add Customer"}</SheetTitle>
          <SheetDescription>
            {customer
              ? "Update customer details below."
              : "Enter details to add a new customer."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="+1234567890"
              value={formData.phone}
              onChange={handleChange}
              required
              disabled={!!customer} // Cannot edit phone after creation
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="externalId">External ID</Label>
            <Input
              id="externalId"
              name="externalId"
              placeholder="e.g. CUST-001"
              value={formData.externalId}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              name="address"
              placeholder="Full address..."
              value={formData.address}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-y mt-2">
            <div>
              <Label>Opted In</Label>
              <p className="text-xs text-muted-foreground">
                Customer consents to receive messages.
              </p>
            </div>
            <Switch
              checked={formData.optedIn}
              onCheckedChange={(c) =>
                setFormData((prev) => ({ ...prev, optedIn: c }))
              }
            />
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {customer ? "Save Changes" : "Add Customer"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
