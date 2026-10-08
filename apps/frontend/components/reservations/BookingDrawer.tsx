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
import { Loader2 } from "lucide-react";
import type {
  ReservationSlot,
  ReservationBooking,
} from "@/app/(dashboard)/reservations/page";

interface BookingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slots: ReservationSlot[];
  onSave: (booking: ReservationBooking) => void;
}

export function BookingDrawer({
  open,
  onOpenChange,
  slots,
  onSave,
}: BookingDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    slotId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    startDate: "",
    endDate: "",
    guestCount: "",
    specialRequests: "",
    totalAmount: "",
  });

  useEffect(() => {
    if (open) {
      setFormData({
        slotId: slots[0]?.id || "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        startDate: "",
        endDate: "",
        guestCount: "",
        specialRequests: "",
        totalAmount: "",
      });
    }
  }, [open, slots]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.slotId ||
      !formData.customerName ||
      !formData.startDate ||
      !formData.endDate
    ) {
      return toast.error("Slot, customer name, and dates are required");
    }
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      return toast.error("End date must be after start date");
    }

    try {
      setLoading(true);
      const payload = {
        slotId: formData.slotId,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone || undefined,
        customerEmail: formData.customerEmail || undefined,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        guestCount: formData.guestCount
          ? parseInt(formData.guestCount)
          : undefined,
        specialRequests: formData.specialRequests || undefined,
        totalAmount: formData.totalAmount
          ? parseFloat(formData.totalAmount)
          : undefined,
      };

      const res = await api.post(`/reservations/bookings`, payload);
      toast.success("Booking created!");
      onSave(res.data.data.booking);
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to create booking";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const activeSlots = slots.filter((s) => s.isActive);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New Reservation Booking</SheetTitle>
          <SheetDescription>
            Manually create a reservation booking for a customer.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Slot selection */}
          <div className="space-y-2">
            <Label>Select Slot *</Label>
            {activeSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground border rounded-md p-3">
                No active slots available. Create a slot first.
              </p>
            ) : (
              <Select
                value={formData.slotId}
                onValueChange={(v) => setFormData((p) => ({ ...p, slotId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a slot..." />
                </SelectTrigger>
                <SelectContent>
                  {activeSlots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.type.replace(/_/g, " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Customer info */}
          <div className="space-y-2">
            <Label>Customer Name *</Label>
            <Input
              name="customerName"
              placeholder="Full name"
              value={formData.customerName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                name="customerPhone"
                placeholder="+91..."
                value={formData.customerPhone}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                name="customerEmail"
                type="email"
                placeholder="email@..."
                value={formData.customerEmail}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check-in / Start *</Label>
              <Input
                name="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Check-out / End *</Label>
              <Input
                name="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Guest count & amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Guest Count</Label>
              <Input
                name="guestCount"
                type="number"
                min="1"
                placeholder="1"
                value={formData.guestCount}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Amount ($)</Label>
              <Input
                name="totalAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.totalAmount}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Special requests */}
          <div className="space-y-2">
            <Label>Special Requests</Label>
            <Textarea
              name="specialRequests"
              placeholder="Any special requests or notes..."
              value={formData.specialRequests}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || activeSlots.length === 0}
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Booking
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
