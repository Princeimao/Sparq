"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, User, X } from "lucide-react";
import type { Service } from "@/app/(dashboard)/services/page";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/image-upload";

interface ServiceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  onSave: (service: Service, isUpdate: boolean) => void;
}

interface StaffMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  isActive: boolean;
}

export function ServiceDrawer({
  open,
  onOpenChange,
  service,
  onSave,
}: ServiceDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", phone: "" });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration: "60",
    image: "",
    bookingMode: "ANY_STAFF" as "ANY_STAFF" | "SELECT_STAFF",
  });
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadStaff();
      if (service) {
        setFormData({
          name: service.name,
          description: service.description || "",
          price: service.price?.toString() || "",
          duration: service.duration.toString(),
          image: (service as any).image || "",
          bookingMode: service.bookingMode,
        });
        setSelectedStaffIds(service.staff?.map((s) => s.id) || []);
      } else {
        setFormData({
          name: "",
          description: "",
          price: "",
          duration: "60",
          image: "",
          bookingMode: "ANY_STAFF",
        });
        setSelectedStaffIds([]);
      }
    }
  }, [open, service]);

  const loadStaff = async () => {
    try {
      const res = await api.get("/services/staff-list/all");
      setStaffList(res.data.data.staffList || []);
    } catch {
      // ignore staff load failures
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateStaff = async () => {
    if (!newStaff.name.trim()) return toast.error("Staff name is required");
    try {
      const res = await api.post("/services/staff/create", newStaff);
      const created = res.data.data.staff;
      setStaffList((prev) => [...prev, created]);
      setSelectedStaffIds((prev) => [...prev, created.id]);
      setNewStaff({ name: "", email: "", phone: "" });
      setShowAddStaff(false);
      toast.success("Staff member added");
    } catch {
      toast.error("Failed to create staff");
    }
  };

  const toggleStaff = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.duration) {
      toast.error("Name and duration are required.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        duration: parseInt(formData.duration, 10),
        bookingMode: formData.bookingMode,
      };

      let savedService: Service;
      if (service) {
        const res = await api.patch(`/services/${service.id}`, payload);
        savedService = res.data.data.service;
        toast.success("Service updated!");
      } else {
        const res = await api.post(`/services`, payload);
        savedService = res.data.data.service;
        toast.success("Service created!");
      }

      onSave(savedService, !!service);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{service ? "Edit Service" : "Add Service"}</SheetTitle>
          <SheetDescription>
            {service
              ? "Update your service details."
              : "Fill out the details to add a new service. You can optionally assign staff."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Service Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Deep Tissue Massage"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Brief description of the service..."
              value={formData.description}
              onChange={handleChange}
              rows={3}
            />
          </div>

          {/* Price & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.price}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (mins) *</Label>
              <Input
                id="duration"
                name="duration"
                type="number"
                min="1"
                placeholder="60"
                value={formData.duration}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Service Image */}
          <div className="space-y-2">
            <Label>Service Image</Label>
            <ImageUpload
              value={formData.image}
              onChange={(url) =>
                setFormData((prev) => ({ ...prev, image: url }))
              }
              onRemove={() => setFormData((prev) => ({ ...prev, image: "" }))}
            />
          </div>

          {/* Booking Mode */}
          <div className="space-y-2">
            <Label>Staff Assignment</Label>
            <Select
              value={formData.bookingMode}
              onValueChange={(v) =>
                setFormData((p) => ({ ...p, bookingMode: v as any }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY_STAFF">Any Available Staff</SelectItem>
                <SelectItem value="SELECT_STAFF">
                  Customer Selects Staff
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Staff List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Assign Staff (optional)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setShowAddStaff(!showAddStaff)}
              >
                <Plus className="size-3 mr-1" />
                New Staff
              </Button>
            </div>

            {showAddStaff && (
              <div className="p-3 border rounded-lg space-y-2 bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground">
                  Add New Staff Member
                </p>
                <Input
                  placeholder="Name *"
                  value={newStaff.name}
                  onChange={(e) =>
                    setNewStaff((p) => ({ ...p, name: e.target.value }))
                  }
                />
                <Input
                  placeholder="Email (optional)"
                  value={newStaff.email}
                  onChange={(e) =>
                    setNewStaff((p) => ({ ...p, email: e.target.value }))
                  }
                />
                <Input
                  placeholder="Phone (optional)"
                  value={newStaff.phone}
                  onChange={(e) =>
                    setNewStaff((p) => ({ ...p, phone: e.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateStaff}
                    className="flex-1"
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddStaff(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {staffList.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto border rounded-lg p-2">
                {staffList.map((staff) => (
                  <div
                    key={staff.id}
                    onClick={() => toggleStaff(staff.id)}
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                      selectedStaffIds.includes(staff.id)
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <User className="size-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {staff.name}
                      </p>
                      {staff.email && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {staff.email}
                        </p>
                      )}
                    </div>
                    {selectedStaffIds.includes(staff.id) && (
                      <Badge className="text-[9px] shrink-0">Selected</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2 border rounded-lg">
                No staff members yet. Add one above.
              </p>
            )}
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {service ? "Save Changes" : "Create Service"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
