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

interface ResourceItem {
  id: string;
  name: string;
  kind: string;
  capacity: number | null;
  isActive: boolean;
}

type AssignmentMode = "CUSTOMER_CHOICE" | "BUSINESS_ASSIGN" | "AUTO" | "SINGLE";

const ASSIGNMENT_META: { id: AssignmentMode; label: string; blurb: string }[] = [
  { id: "CUSTOMER_CHOICE", label: "Customer chooses", blurb: "Customer picks a specific provider" },
  { id: "BUSINESS_ASSIGN", label: "We assign", blurb: "You pick after booking" },
  { id: "AUTO", label: "Auto-assign", blurb: "Least-loaded provider, automatically" },
  { id: "SINGLE", label: "Just me", blurb: "One provider, no choosing needed" },
];

export function ServiceDrawer({
  open,
  onOpenChange,
  service,
  onSave,
}: ServiceDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [resourceList, setResourceList] = useState<ResourceItem[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", phone: "" });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration: "60",
    image: "",
    bookingMode: "ANY_STAFF" as "ANY_STAFF" | "SELECT_STAFF",
    locationMode: "AT_BUSINESS" as "AT_BUSINESS" | "AT_CUSTOMER" | "BOTH",
    assignmentMode: "BUSINESS_ASSIGN" as AssignmentMode,
    requiresPartySize: false,
    bufferMinutes: "0",
    minLeadMinutes: "0",
    maxAdvanceDays: "",
  });
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadStaff();
      loadResources();
      if (service) {
        const svc = service as Service & {
          assignmentMode?: AssignmentMode;
          requiresPartySize?: boolean;
          bufferMinutes?: number;
          minLeadMinutes?: number;
          maxAdvanceDays?: number | null;
          resourceLinks?: { resource: ResourceItem }[];
        };
        setFormData({
          name: service.name,
          description: service.description || "",
          price: service.price?.toString() || "",
          duration: service.duration.toString(),
          image: (service as any).image || "",
          bookingMode: service.bookingMode,
          locationMode: (service as any).locationMode ?? "AT_BUSINESS",
          assignmentMode: svc.assignmentMode ?? (service.bookingMode === "SELECT_STAFF" ? "CUSTOMER_CHOICE" : "BUSINESS_ASSIGN"),
          requiresPartySize: svc.requiresPartySize ?? false,
          bufferMinutes: String(svc.bufferMinutes ?? 0),
          minLeadMinutes: String(svc.minLeadMinutes ?? 0),
          maxAdvanceDays: svc.maxAdvanceDays != null ? String(svc.maxAdvanceDays) : "",
        });
        setSelectedStaffIds(service.staff?.map((s) => s.id) || []);
        setSelectedResourceIds((svc.resourceLinks ?? []).map((l) => l.resource.id));
      } else {
        setFormData({
          name: "",
          description: "",
          price: "",
          duration: "60",
          image: "",
          bookingMode: "ANY_STAFF",
          locationMode: "AT_BUSINESS",
          assignmentMode: "BUSINESS_ASSIGN",
          requiresPartySize: false,
          bufferMinutes: "0",
          minLeadMinutes: "0",
          maxAdvanceDays: "",
        });
        setSelectedStaffIds([]);
        setSelectedResourceIds([]);
      }
    }
  }, [open, service]);

  const loadStaff = async () => {
    try {
      const res = await api.get("/staff");
      setStaffList(res.data.data.staff || []);
    } catch {
      // ignore staff load failures
    }
  };

  const loadResources = async () => {
    try {
      const res = await api.get("/resources");
      setResourceList(res.data.data.resources || []);
    } catch {
      // ignore resource load failures
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
      const res = await api.post("/staff", newStaff);
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

  const toggleResource = (id: string) => {
    setSelectedResourceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
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
        bookingMode: formData.assignmentMode === "CUSTOMER_CHOICE" ? "SELECT_STAFF" : "ANY_STAFF",
        locationMode: formData.locationMode,
        assignmentMode: formData.assignmentMode,
        requiresPartySize: formData.requiresPartySize,
        bufferMinutes: parseInt(formData.bufferMinutes, 10) || 0,
        minLeadMinutes: parseInt(formData.minLeadMinutes, 10) || 0,
        maxAdvanceDays: formData.maxAdvanceDays ? parseInt(formData.maxAdvanceDays, 10) : null,
        staffIds: selectedStaffIds,
        resourceIds: selectedResourceIds,
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

          {/* Assignment Mode */}
          <div className="space-y-2">
            <Label>How are providers chosen?</Label>
            <Select
              value={formData.assignmentMode}
              onValueChange={(v) =>
                setFormData((p) => ({ ...p, assignmentMode: v as AssignmentMode }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_META.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {ASSIGNMENT_META.find((m) => m.id === formData.assignmentMode)?.blurb}
              {formData.assignmentMode === "SINGLE" &&
                " — perfect for solo providers; customers never pick."}
            </p>
          </div>

          {/* Party size (restaurants, group bookings) */}
          <div className="flex items-center justify-between py-2 border-y">
            <div>
              <Label>Ask for party size</Label>
              <p className="text-xs text-muted-foreground">
                Needed for table bookings and group sessions.
              </p>
            </div>
            <Switch
              checked={formData.requiresPartySize}
              onCheckedChange={(c) =>
                setFormData((prev) => ({ ...prev, requiresPartySize: c }))
              }
            />
          </div>

          {/* Timing rules */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="buffer">Buffer (min)</Label>
              <Input
                id="buffer"
                name="bufferMinutes"
                type="number"
                min="0"
                max="480"
                value={formData.bufferMinutes}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, bufferMinutes: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead">Lead time (min)</Label>
              <Input
                id="lead"
                name="minLeadMinutes"
                type="number"
                min="0"
                value={formData.minLeadMinutes}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, minLeadMinutes: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="advance">Book ahead (days)</Label>
              <Input
                id="advance"
                name="maxAdvanceDays"
                type="number"
                min="1"
                placeholder="∞"
                value={formData.maxAdvanceDays}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, maxAdvanceDays: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Service Location */}
          <div className="space-y-2">
            <Label>Where is this service performed?</Label>
            <Select
              value={formData.locationMode}
              onValueChange={(v) =>
                setFormData((p) => ({ ...p, locationMode: v as any }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AT_BUSINESS">At my business</SelectItem>
                <SelectItem value="AT_CUSTOMER">
                  At customer&apos;s home
                </SelectItem>
                <SelectItem value="BOTH">Both — customer chooses</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Home-visit services ask the customer for a visit address on
              WhatsApp; in-business services never do.
            </p>
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
                No staff members yet. Add one above — or leave empty for owner-fulfilled bookings.
              </p>
            )}
          </div>

          {/* Eligible spaces & equipment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Eligible spaces & equipment</Label>
              <span className="text-[11px] text-muted-foreground">
                Manage in Resources
              </span>
            </div>
            {resourceList.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto border rounded-lg p-2">
                {resourceList.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => toggleResource(r.id)}
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                      selectedResourceIds.includes(r.id)
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {r.kind}
                        {r.capacity != null ? ` · seats ${r.capacity}` : ""}
                      </p>
                    </div>
                    {selectedResourceIds.includes(r.id) && (
                      <Badge className="text-[9px] shrink-0">Selected</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2 border rounded-lg">
                No tables, rooms or equipment yet. Create them under Resources.
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
