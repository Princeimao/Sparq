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
import { Switch } from "@/components/ui/switch";
import { Loader2, X, Plus } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import type {
  ReservationSlot,
  SlotType,
} from "@/app/(dashboard)/reservations/page";
import { Badge } from "@/components/ui/badge";

interface SlotDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: ReservationSlot | null;
  onSave: (slot: ReservationSlot, isUpdate: boolean) => void;
}

export function SlotDrawer({
  open,
  onOpenChange,
  slot,
  onSave,
}: SlotDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [amenityInput, setAmenityInput] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    type: "OTHER" as SlotType,
    description: "",
    capacity: "",
    pricePerUnit: "",
    priceUnit: "",
    image: "",
    amenities: [] as string[],
    isActive: true,
  });

  useEffect(() => {
    if (open) {
      if (slot) {
        setFormData({
          name: slot.name,
          type: slot.type,
          description: slot.description || "",
          capacity: slot.capacity?.toString() || "",
          pricePerUnit: slot.pricePerUnit?.toString() || "",
          priceUnit: slot.priceUnit || "",
          image: slot.image || "",
          amenities: slot.amenities || [],
          isActive: slot.isActive,
        });
      } else {
        setFormData({
          name: "",
          type: "OTHER",
          description: "",
          capacity: "",
          pricePerUnit: "",
          priceUnit: "",
          image: "",
          amenities: [],
          isActive: true,
        });
      }
      setAmenityInput("");
    }
  }, [open, slot]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addAmenity = () => {
    const val = amenityInput.trim();
    if (val && !formData.amenities.includes(val)) {
      setFormData((prev) => ({ ...prev, amenities: [...prev.amenities, val] }));
    }
    setAmenityInput("");
  };

  const removeAmenity = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Name is required");

    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        type: formData.type,
        description: formData.description || undefined,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        pricePerUnit: formData.pricePerUnit
          ? parseFloat(formData.pricePerUnit)
          : undefined,
        priceUnit: formData.priceUnit || undefined,
        image: formData.image || undefined,
        amenities: formData.amenities,
        isActive: formData.isActive,
      };

      let saved: ReservationSlot;
      if (slot) {
        const res = await api.patch(`/reservations/slots/${slot.id}`, payload);
        saved = res.data.data.slot;
        toast.success("Slot updated!");
      } else {
        const res = await api.post(`/reservations/slots`, payload);
        saved = res.data.data.slot;
        toast.success("Slot created!");
      }
      onSave(saved, !!slot);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save slot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{slot ? "Edit Slot" : "Add Reservation Slot"}</SheetTitle>
          <SheetDescription>
            {slot
              ? "Update slot details."
              : "Add a hotel room, restaurant table, meeting room, or any other reservable space."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              name="name"
              placeholder="e.g. Room 101 / Table 5"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(v) =>
                setFormData((p) => ({ ...p, type: v as SlotType }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HOTEL_ROOM">🏨 Hotel Room</SelectItem>
                <SelectItem value="RESTAURANT_TABLE">
                  🍽️ Restaurant Table
                </SelectItem>
                <SelectItem value="MEETING_ROOM">🏢 Meeting Room</SelectItem>
                <SelectItem value="EVENT_SPACE">🎉 Event Space</SelectItem>
                <SelectItem value="OTHER">📌 Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              name="description"
              placeholder="Describe the space..."
              value={formData.description}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Capacity (guests)</Label>
              <Input
                name="capacity"
                type="number"
                min="1"
                placeholder="e.g. 4"
                value={formData.capacity}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label>Price per unit</Label>
              <Input
                name="pricePerUnit"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.pricePerUnit}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Price Unit</Label>
            <Input
              name="priceUnit"
              placeholder="e.g. per night / per hour"
              value={formData.priceUnit}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label>Slot Image</Label>
            <ImageUpload
              value={formData.image}
              onChange={(url) =>
                setFormData((prev) => ({ ...prev, image: url }))
              }
              onRemove={() => setFormData((prev) => ({ ...prev, image: "" }))}
            />
          </div>

          {/* Amenities */}
          <div className="space-y-2">
            <Label>Amenities</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. WiFi, AC, TV"
                value={amenityInput}
                onChange={(e) => setAmenityInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addAmenity())
                }
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addAmenity}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {formData.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {formData.amenities.map((a, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="gap-1 text-xs pr-1"
                  >
                    {a}
                    <button type="button" onClick={() => removeAmenity(i)}>
                      <X className="size-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                Allow bookings for this slot
              </p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(v) =>
                setFormData((p) => ({ ...p, isActive: v }))
              }
            />
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {slot ? "Save Changes" : "Create Slot"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
