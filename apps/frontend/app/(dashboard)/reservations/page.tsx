"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Hotel,
  UtensilsCrossed,
  Building2,
  CalendarRange,
  Users,
  DollarSign,
  Edit,
  Trash2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SlotDrawer } from "@/components/reservations/SlotDrawer";
import { BookingDrawer } from "@/components/reservations/BookingDrawer";

export type SlotType =
  | "HOTEL_ROOM"
  | "RESTAURANT_TABLE"
  | "MEETING_ROOM"
  | "EVENT_SPACE"
  | "OTHER";

export interface ReservationSlot {
  id: string;
  name: string;
  type: SlotType;
  description?: string;
  capacity?: number;
  pricePerUnit?: number;
  priceUnit?: string;
  image?: string;
  amenities?: string[];
  isActive: boolean;
  _count?: { bookings: number };
}

export interface ReservationBooking {
  id: string;
  slotId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  startDate: string;
  endDate: string;
  guestCount?: number;
  specialRequests?: string;
  totalAmount?: number;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED";
  slot?: { name: string; type: string };
}

const slotTypeConfig: Record<SlotType, { label: string; icon: any; gradient: string }> = {
  HOTEL_ROOM: {
    label: "Hotel Room",
    icon: Hotel,
    gradient: "from-blue-500/15 via-indigo-500/10 to-purple-500/15",
  },
  RESTAURANT_TABLE: {
    label: "Restaurant Table",
    icon: UtensilsCrossed,
    gradient: "from-orange-500/15 via-red-500/10 to-pink-500/15",
  },
  MEETING_ROOM: {
    label: "Meeting Room",
    icon: Building2,
    gradient: "from-teal-500/15 via-cyan-500/10 to-blue-500/15",
  },
  EVENT_SPACE: {
    label: "Event Space",
    icon: CalendarRange,
    gradient: "from-purple-500/15 via-pink-500/10 to-rose-500/15",
  },
  OTHER: {
    label: "Other",
    icon: BookOpen,
    gradient: "from-slate-500/15 via-gray-500/10 to-zinc-500/15",
  },
};

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  CONFIRMED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CHECKED_IN: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 20 } },
};

export default function ReservationsPage() {
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [bookings, setBookings] = useState<ReservationBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotDrawerOpen, setSlotDrawerOpen] = useState(false);
  const [bookingDrawerOpen, setBookingDrawerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<ReservationSlot | null>(null);
  const [activeTab, setActiveTab] = useState("slots");

  const fetchSlots = useCallback(async () => {
    const res = await api.get("/reservations/slots");
    return res.data.data.slots;
  }, []);

  const fetchBookings = useCallback(async () => {
    const res = await api.get("/reservations/bookings");
    return res.data.data.bookings;
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [slotsData, bookingsData] = await Promise.all([
          fetchSlots(),
          fetchBookings(),
        ]);
        setSlots(slotsData);
        setBookings(bookingsData);
      } catch {
        toast.error("Failed to load reservation data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchSlots, fetchBookings]);

  const handleDeleteSlot = async (id: string) => {
    if (!confirm("Delete this slot? All bookings will also be removed.")) return;
    try {
      await api.delete(`/reservations/slots/${id}`);
      setSlots((prev) => prev.filter((s) => s.id !== id));
      toast.success("Slot deleted");
    } catch {
      toast.error("Failed to delete slot");
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm("Delete this booking?")) return;
    try {
      await api.delete(`/reservations/bookings/${id}`);
      setBookings((prev) => prev.filter((b) => b.id !== id));
      toast.success("Booking deleted");
    } catch {
      toast.error("Failed to delete booking");
    }
  };

  const handleUpdateBookingStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/reservations/bookings/${id}/status`, { status });
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: status as any } : b))
      );
      toast.success("Booking status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleSaveSlot = (saved: ReservationSlot, isUpdate: boolean) => {
    if (isUpdate) {
      setSlots((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
    } else {
      setSlots((prev) => [saved, ...prev]);
    }
    setSlotDrawerOpen(false);
  };

  const handleSaveBooking = (saved: ReservationBooking) => {
    setBookings((prev) => [saved, ...prev]);
    setBookingDrawerOpen(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reservations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage hotel rooms, restaurant tables, meeting rooms, and more.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { setActiveTab("bookings"); setBookingDrawerOpen(true); }}
            className="py-5 rounded-2xl"
          >
            <BookOpen className="size-4 mr-2" />
            New Booking
          </Button>
          <Button
            onClick={() => { setSelectedSlot(null); setSlotDrawerOpen(true); }}
            className="py-5 rounded-2xl"
          >
            <Plus className="size-4 mr-2" />
            Add Slot
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="slots">
              Slots
              <Badge variant="secondary" className="ml-2 text-[10px]">{slots.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="bookings">
              Bookings
              <Badge variant="secondary" className="ml-2 text-[10px]">{bookings.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="slots">
            {slots.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-muted/5"
              >
                <Hotel className="size-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No slots yet</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Add your first reservable slot (room, table, etc.)
                </p>
                <Button onClick={() => { setSelectedSlot(null); setSlotDrawerOpen(true); }} variant="outline">
                  <Plus className="size-4 mr-2" />
                  Add Slot
                </Button>
              </motion.div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {slots.map((slot) => {
                  const config = slotTypeConfig[slot.type] ?? slotTypeConfig.OTHER;
                  const Icon = config.icon;
                  return (
                    <motion.div key={slot.id} variants={cardVariants} layout>
                      <Card className="overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col h-full">
                        <div className={`relative h-32 bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
                          <div className="p-4 rounded-2xl bg-white/20 dark:bg-black/20">
                            <Icon className="size-8 text-primary" />
                          </div>
                          <Badge className="absolute top-3 left-3 text-[10px]" variant="secondary">
                            {config.label}
                          </Badge>
                          {!slot.isActive && (
                            <Badge className="absolute top-3 right-3 text-[10px] bg-red-100 text-red-700">
                              Inactive
                            </Badge>
                          )}
                        </div>

                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-base truncate">{slot.name}</CardTitle>
                        </CardHeader>

                        <CardContent className="p-4 pt-0 flex-1 space-y-2">
                          {slot.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {slot.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 flex-wrap">
                            {slot.capacity && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="size-3" />
                                {slot.capacity} guests
                              </span>
                            )}
                            {slot.pricePerUnit != null && (
                              <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                                <DollarSign className="size-3" />
                                {slot.pricePerUnit}
                                {slot.priceUnit && (
                                  <span className="font-normal text-muted-foreground">/{slot.priceUnit}</span>
                                )}
                              </span>
                            )}
                            {(slot._count?.bookings ?? 0) > 0 && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <BookOpen className="size-3" />
                                {slot._count?.bookings} bookings
                              </span>
                            )}
                          </div>
                          {slot.amenities && slot.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {slot.amenities.slice(0, 3).map((a, i) => (
                                <Badge key={i} variant="outline" className="text-[10px]">
                                  {a}
                                </Badge>
                              ))}
                              {slot.amenities.length > 3 && (
                                <Badge variant="outline" className="text-[10px]">
                                  +{slot.amenities.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardContent>

                        <CardFooter className="p-4 pt-4 border-t flex items-center gap-2 mt-auto bg-muted/20">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 py-6"
                            onClick={() => { setSelectedSlot(slot); setSlotDrawerOpen(true); }}
                          >
                            <Edit className="size-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 py-6"
                            onClick={() => handleDeleteSlot(slot.id)}
                          >
                            <Trash2 className="size-4 mr-2" />
                            Delete
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="bookings">
            {bookings.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-muted/5"
              >
                <BookOpen className="size-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No bookings yet</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Create your first reservation booking.
                </p>
                <Button onClick={() => setBookingDrawerOpen(true)} variant="outline">
                  <Plus className="size-4 mr-2" />
                  New Booking
                </Button>
              </motion.div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {bookings.map((booking) => (
                  <motion.div key={booking.id} variants={cardVariants}>
                    <Card className="hover:shadow-sm transition-all duration-200">
                      <div className="flex items-center gap-4 p-4">
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                          <BookOpen className="size-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{booking.customerName}</p>
                            <Badge className={`text-[10px] ${statusColors[booking.status]}`}>
                              {booking.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {booking.slot?.name} •{" "}
                            {new Date(booking.startDate).toLocaleDateString()} →{" "}
                            {new Date(booking.endDate).toLocaleDateString()}
                          </p>
                          {booking.specialRequests && (
                            <p className="text-xs text-muted-foreground italic mt-1 line-clamp-1">
                              "{booking.specialRequests}"
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {booking.totalAmount != null && (
                            <span className="text-sm font-semibold">
                              ${booking.totalAmount.toFixed(2)}
                            </span>
                          )}
                          {/* Quick status update */}
                          {booking.status === "PENDING" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => handleUpdateBookingStatus(booking.id, "CONFIRMED")}
                            >
                              Confirm
                            </Button>
                          )}
                          {booking.status === "CONFIRMED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => handleUpdateBookingStatus(booking.id, "CHECKED_IN")}
                            >
                              Check In
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteBooking(booking.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <SlotDrawer
        open={slotDrawerOpen}
        onOpenChange={setSlotDrawerOpen}
        slot={selectedSlot}
        onSave={handleSaveSlot}
      />

      <BookingDrawer
        open={bookingDrawerOpen}
        onOpenChange={setBookingDrawerOpen}
        slots={slots}
        onSave={handleSaveBooking}
      />
    </div>
  );
}
