"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Briefcase,
  Edit,
  Trash2,
  Clock,
  User,
  Users,
  DollarSign,
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
import { ServiceDrawer } from "@/components/services/ServiceDrawer";

export interface Service {
  id: string;
  name: string;
  description?: string;
  price?: number;
  duration: number;
  bookingMode: "ANY_STAFF" | "SELECT_STAFF";
  assignmentMode?: "CUSTOMER_CHOICE" | "BUSINESS_ASSIGN" | "AUTO" | "SINGLE";
  requiresPartySize?: boolean;
  staff?: { id: string; name: string; email?: string }[];
  resourceLinks?: { resource: { id: string; name: string; kind: string } }[];
  _count?: { bookings: number };
}

const ASSIGNMENT_LABELS: Record<string, string> = {
  CUSTOMER_CHOICE: "Customer picks",
  BUSINESS_ASSIGN: "We assign",
  AUTO: "Auto-assign",
  SINGLE: "Solo",
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 20 } },
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const fetchServices = useCallback(async () => {
    const res = await api.get(`/services`);
    return res.data.data.services;
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchServices();
        setServices(data);
      } catch {
        toast.error("Failed to load services");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchServices]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    try {
      await api.delete(`/services/${id}`);
      setServices((prev) => prev.filter((s) => s.id !== id));
      toast.success("Service deleted");
    } catch {
      toast.error("Failed to delete service");
    }
  };

  const handleSave = (saved: Service, isUpdate: boolean) => {
    if (isUpdate) {
      setServices((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
    } else {
      setServices((prev) => [saved, ...prev]);
    }
    setDrawerOpen(false);
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your service catalog with optional staff assignment.
          </p>
        </div>
        <Button
          onClick={() => { setSelectedService(null); setDrawerOpen(true); }}
          className="py-5 rounded-2xl"
        >
          <Plus className="size-4 mr-2" />
          Add Service
        </Button>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : services.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-muted/5"
        >
          <Briefcase className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No services yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add your first service to get started.
          </p>
          <Button onClick={() => { setSelectedService(null); setDrawerOpen(true); }} variant="outline">
            <Plus className="size-4 mr-2" />
            Add Service
          </Button>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence>
            {services.map((service) => (
              <motion.div key={service.id} variants={cardVariants} layout>
                <Card className="overflow-hidden flex flex-col hover:shadow-md transition-all duration-200 h-full">
                  <div className="relative h-36 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-teal-500/10 flex items-center justify-center">
                    <div className="p-4 rounded-2xl bg-primary/10">
                      <Briefcase className="size-8 text-primary" />
                    </div>
                    <Badge className="absolute top-3 right-3 text-[10px]" variant="secondary">
                      {service.assignmentMode
                        ? (ASSIGNMENT_LABELS[service.assignmentMode] ?? service.assignmentMode)
                        : service.bookingMode === "SELECT_STAFF" ? "By Staff" : "Any Staff"}
                    </Badge>
                    {service.requiresPartySize && (
                      <Badge className="absolute top-3 left-3 text-[10px]" variant="outline">
                        Party size
                      </Badge>
                    )}
                  </div>

                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base truncate">{service.name}</CardTitle>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 flex-1 space-y-2">
                    {service.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {service.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {formatDuration(service.duration)}
                      </span>
                      {service.price != null && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                          <DollarSign className="size-3" />
                          {service.price.toFixed(2)}
                        </span>
                      )}
                      {(service._count?.bookings ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="size-3" />
                          {service._count?.bookings} bookings
                        </span>
                      )}
                    </div>
                    {service.resourceLinks && service.resourceLinks.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        {service.resourceLinks.slice(0, 3).map((l) => (
                          <Badge key={l.resource.id} variant="outline" className="text-[10px] gap-1">
                            {l.resource.name}
                          </Badge>
                        ))}
                        {service.resourceLinks.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{service.resourceLinks.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    {service.staff && service.staff.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        {service.staff.slice(0, 3).map((s) => (
                          <Badge key={s.id} variant="outline" className="text-[10px] gap-1">
                            <User className="size-2.5" />
                            {s.name}
                          </Badge>
                        ))}
                        {service.staff.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{service.staff.length - 3}
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
                      onClick={() => { setSelectedService(service); setDrawerOpen(true); }}
                    >
                      <Edit className="size-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 py-6"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="size-4 mr-2" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <ServiceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        service={selectedService}
        onSave={handleSave}
      />
    </div>
  );
}
