"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import {
  createStaff,
  updateStaff,
  type StaffMember,
} from "@/lib/resources";
import { HoursEditor } from "./HoursEditor";
import { TimeOffManager } from "./TimeOffManager";
import {
  EMPTY_STAFF_FORM,
  useServiceOptions,
  StaffProfileFields,
  type StaffFormState,
} from "./StaffProfileFields";

export function StaffDrawer({
  open,
  onOpenChange,
  staff,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember | null;
  onSave: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const services = useServiceOptions();
  const [form, setForm] = useState<StaffFormState>(EMPTY_STAFF_FORM);

  useEffect(() => {
    if (!open) return;
    if (staff) {
      setForm({
        name: staff.name,
        email: staff.email ?? "",
        phone: staff.phone ?? "",
        role: staff.role ?? "",
        specialty: staff.specialty ?? "",
        color: staff.color ?? EMPTY_STAFF_FORM.color,
        isActive: staff.isActive,
        serviceIds: (staff.services ?? []).map((s) => s.id),
      });
    } else {
      setForm(EMPTY_STAFF_FORM);
    }
  }, [open, staff]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        role: form.role.trim() || null,
        specialty: form.specialty.trim() || null,
        color: form.color,
        isActive: form.isActive,
        serviceIds: form.serviceIds,
      };
      if (staff) {
        await updateStaff(staff.id, payload);
        toast.success("Provider updated");
      } else {
        await createStaff(payload);
        toast.success("Provider added");
      }
      onSave();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Could not save provider";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{staff ? "Edit provider" : "Add provider"}</SheetTitle>
          <SheetDescription>
            A provider profile, not a login — manage their services, hours and leave here.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="profile" className="p-6 pt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="hours" disabled={!staff}>Hours</TabsTrigger>
            <TabsTrigger value="leave" disabled={!staff}>Leave</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <form onSubmit={submit} className="space-y-4 pt-2">
              <StaffProfileFields
                form={form}
                onChange={setForm}
                services={services}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                {staff ? "Save changes" : "Add provider"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="hours">
            {staff && <HoursEditor scope={{ staffId: staff.id }} />}
          </TabsContent>
          <TabsContent value="leave">
            {staff && <TimeOffManager scope={{ staffId: staff.id }} />}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
