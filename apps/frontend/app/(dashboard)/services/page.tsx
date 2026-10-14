"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus,
  Briefcase,
  Pencil,
  Trash2,
  Clock,
  Search,
} from "lucide-react";
import { ServiceDrawer } from "@/components/services/ServiceDrawer";
import { ServiceWizard } from "@/components/wizards/ServiceWizard";
import { SlidePills } from "@/components/bits/SlidePills";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";

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

const EASE = [0.22, 1, 0.36, 1] as const;

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);

type ModeFilter = "all" | "CUSTOMER_CHOICE" | "BUSINESS_ASSIGN" | "AUTO" | "SINGLE";

export default function ServicesPage() {
  const reduceMotion = useReducedMotion();
  const confirmAction = useConfirm();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ModeFilter>("all");

  const fetchServices = useCallback(async () => {
    const res = await api.get(`/services`);
    return res.data.data.services;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchServices();
        if (!cancelled) setServices(data);
      } catch {
        if (!cancelled) toast.error("Failed to load services");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchServices]);

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirmAction({
      title: `Delete ${name}?`,
      body: "Upcoming bookings for it stay intact, but no new ones can be made.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
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
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h} hr` : `${h}h ${m}m`;
  };

  const modeOf = (s: Service) =>
    s.assignmentMode ?? (s.bookingMode === "SELECT_STAFF" ? "CUSTOMER_CHOICE" : "BUSINESS_ASSIGN");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      const mode = modeOf(s);
      if (filter !== "all" && mode !== filter) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [services, query, filter]);

  return (
    <div className="relative p-6 max-w-7xl mx-auto space-y-5">
      {!reduceMotion && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-brand/10 blur-[110px]"
          animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Header */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative flex flex-col sm:flex-row sm:items-end gap-4"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            Bookable · {services.length} service{services.length === 1 ? "" : "s"}
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-ink mt-1">
            Services
          </h1>
          <p className="text-[15px] text-ink/55 mt-1.5">
            What customers book — and who fulfils it.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-ink/40" />
            <input
              placeholder="Search services…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search services"
              className="pl-8 h-10 w-44 rounded-full text-xs font-medium bg-ink/[0.05] text-ink placeholder:text-ink/35 focus:outline-none focus:bg-ink/[0.08] transition-colors"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { setSelectedService(null); setWizardOpen(true); }}
            className="h-10 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-white hover:bg-brand transition-colors"
          >
            <Plus className="size-4" /> Add service
          </motion.button>
        </div>
      </motion.div>

      {/* Mode filter */}
      <div className="relative">
        <SlidePills
          id="services-mode"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "CUSTOMER_CHOICE", label: "Customer picks" },
            { value: "BUSINESS_ASSIGN", label: "We assign" },
            { value: "AUTO", label: "Auto" },
            { value: "SINGLE", label: "Solo" },
          ]}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 rounded-[1.4rem] bg-ink/[0.045] animate-pulse" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex flex-col items-center justify-center py-20 text-center rounded-[1.6rem] bg-ink/[0.035]"
        >
          <span className="flex size-14 items-center justify-center rounded-[1.2rem] bg-ink text-white">
            <Briefcase className="size-7" />
          </span>
          <h3 className="text-lg font-semibold text-ink mt-4">No services yet</h3>
          <p className="text-sm text-ink/50 mt-1 mb-5">
            Offer something bookable — haircuts, consultations, tables.
          </p>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { setSelectedService(null); setWizardOpen(true); }}
            className="h-11 inline-flex items-center gap-1.5 rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-brand transition-colors"
          >
            <Plus className="size-4" /> Add service
          </motion.button>
        </motion.div>
      ) : visible.length === 0 ? (
        <div className="relative py-16 text-center">
          <p className="font-medium text-sm text-ink">Nothing matches</p>
          <p className="text-xs text-ink/50 mt-1">Try a different search or filter.</p>
        </div>
      ) : (
        <motion.div layout className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {visible.map((service, i) => {
              const mode = modeOf(service);
              const bookings = service._count?.bookings ?? 0;
              return (
                <motion.article
                  key={service.id}
                  layout
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.35, ease: EASE }}
                  className="group rounded-[1.4rem] bg-ink/[0.045] hover:bg-ink/[0.065] transition-colors p-5 flex flex-col gap-3"
                >
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    <motion.span
                      whileHover={reduceMotion ? undefined : { rotate: -6, scale: 1.06 }}
                      className="flex size-11 items-center justify-center rounded-2xl bg-white text-ink shrink-0"
                    >
                      <Briefcase className="size-5" />
                    </motion.span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[15px] tracking-tight text-ink leading-snug line-clamp-1">
                        {service.name}
                      </h3>
                      <p className="text-xs text-ink/50 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Clock className="size-3" /> {formatDuration(service.duration)}
                        </span>
                        {service.price != null && (
                          <span className="font-bold text-ink tabular-nums">{inr(service.price)}</span>
                        )}
                      </p>
                    </div>
                    <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-semibold text-white shrink-0">
                      {ASSIGNMENT_LABELS[mode] ?? mode}
                    </span>
                  </div>

                  {service.description && (
                    <p className="text-[13px] text-ink/55 leading-relaxed line-clamp-2">
                      {service.description}
                    </p>
                  )}

                  {/* Fulfillers */}
                  {(service.staff?.length ?? 0) > 0 || (service.resourceLinks?.length ?? 0) > 0 ? (
                    <div className="flex items-center flex-wrap">
                      {(service.staff ?? []).slice(0, 4).map((s) => (
                        <span
                          key={s.id}
                          title={s.name}
                          className="-ml-1.5 first:ml-0 flex size-7 items-center justify-center rounded-full bg-ink text-white text-[11px] font-bold ring-2 ring-paper"
                        >
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                      ))}
                      {(service.resourceLinks ?? []).slice(0, 3).map((l) => (
                        <span
                          key={l.resource.id}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white text-ink/65"
                        >
                          {l.resource.name}
                        </span>
                      ))}
                      {bookings > 0 && (
                        <span className="ml-auto text-[11px] font-semibold text-brand tabular-nums">
                          {bookings} booking{bookings === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  ) : (
                    bookings > 0 ? (
                      <p className="text-[11px] font-semibold text-brand tabular-nums">
                        {bookings} booking{bookings === 1 ? "" : "s"}
                      </p>
                    ) : (
                      <p className="text-[11px] text-ink/40">
                        No providers linked yet{service.requiresPartySize ? " · asks party size" : ""}
                      </p>
                    )
                  )}

                  {/* Actions */}
                  <div className="flex gap-1.5 mt-auto pt-1">
                    <button
                      onClick={() => { setSelectedService(service); setDrawerOpen(true); }}
                      className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-medium text-ink hover:bg-ink hover:text-white transition-colors"
                    >
                      <Pencil className="size-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(service.id, service.name)}
                      aria-label={`Delete ${service.name}`}
                      className={cn(
                        "h-9 w-9 inline-flex items-center justify-center rounded-full transition-colors",
                        "bg-white text-ink/55 hover:bg-red-600 hover:text-white",
                        "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                      )}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <ServiceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        service={selectedService}
        onSave={handleSave}
      />
      <ServiceWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={(s) => setServices((prev) => [s, ...prev])}
      />
    </div>
  );
}
