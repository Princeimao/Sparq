"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Armchair,
  BedDouble,
  Boxes,
  Pencil,
  Plus,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteResource,
  deleteStaff,
  listResources,
  listStaff,
  type SpaceResource,
  type StaffMember,
} from "@/lib/resources";
import { StaffDrawer } from "@/components/resources/StaffDrawer";
import { ResourceDrawer } from "@/components/resources/ResourceDrawer";
import { StaffWizard } from "@/components/wizards/StaffWizard";
import { ResourceWizard } from "@/components/wizards/ResourceWizard";
import { SlidePills } from "@/components/bits/SlidePills";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<string, typeof Armchair> = {
  TABLE: Armchair,
  ROOM: BedDouble,
  EQUIPMENT: Wrench,
  OTHER: Boxes,
};

const EASE = [0.22, 1, 0.36, 1] as const;

export default function ResourcesPage() {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const confirmAction = useConfirm();
  const [tab, setTab] = useState("people");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [resources, setResources] = useState<SpaceResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffOpen, setStaffOpen] = useState(false);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [staffWizardOpen, setStaffWizardOpen] = useState(false);
  const [resourceWizardOpen, setResourceWizardOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedResource, setSelectedResource] = useState<SpaceResource | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([listStaff(), listResources()]);
      setStaff(s);
      setResources(r);
    } catch {
      toast.error("Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [s, r] = await Promise.all([listStaff(), listResources()]);
        if (!cancelled) {
          setStaff(s);
          setResources(r);
        }
      } catch {
        if (!cancelled) toast.error("Failed to load resources");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const removeStaff = async (id: string, name: string) => {
    const ok = await confirmAction({
      title: `Remove ${name}?`,
      body: "Upcoming bookings will deactivate them instead of deleting.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await deleteStaff(id);
      if (res.archived) {
        toast.success(`${name} has upcoming bookings — deactivated instead`);
        load();
      } else {
        setStaff((prev) => prev.filter((s) => s.id !== id));
        toast.success("Provider removed");
      }
    } catch {
      toast.error("Could not remove provider");
    }
  };

  const removeResource = async (id: string, name: string) => {
    const ok = await confirmAction({
      title: `Remove ${name}?`,
      body: "Upcoming bookings will deactivate it instead of deleting.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await deleteResource(id);
      if (res.archived) {
        toast.success(`${name} has upcoming bookings — deactivated instead`);
        load();
      } else {
        setResources((prev) => prev.filter((r) => r.id !== id));
        toast.success("Resource removed");
      }
    } catch {
      toast.error("Could not remove resource");
    }
  };

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
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            Fulfilment · {staff.length + resources.length} total
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-ink mt-1">Resources</h1>
          <p className="text-[15px] text-ink/55 mt-1.5">
            The people, tables and rooms your bookings allocate.
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setSelectedResource(null);
              setResourceWizardOpen(true);
            }}
            className="h-10 inline-flex items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-ink/70 hover:text-ink hover:bg-ink/[0.06] transition-colors"
          >
            <Plus className="size-4" /> Add space
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setSelectedStaff(null);
              setStaffWizardOpen(true);
            }}
            className="h-10 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-white hover:bg-brand transition-colors"
          >
            <Plus className="size-4" /> Add provider
          </motion.button>
        </div>
      </motion.div>

      <div className="relative">
        <SlidePills
          id="resources-tabs"
          size="sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: "people", label: <>People <span className="tabular-nums opacity-70">{staff.length}</span></>, icon: <Users className="size-3.5" /> },
            { value: "spaces", label: <>Spaces <span className="tabular-nums opacity-70">{resources.length}</span></>, icon: <Armchair className="size-3.5" /> },
          ]}
        />
      </div>

      <div className="relative">
        {tab === "people" && (
          <div className="pt-1">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-[1.4rem] bg-ink/[0.06]" />
              ))}
            </div>
          ) : staff.length === 0 ? (
            <EmptyBlock
              icon={<Users className="size-8" />}
              title="No providers yet"
              blurb="Solo? Skip this — bookings work without any providers. Add stylists, doctors or therapists as you grow."
              actionLabel="Add provider"
              onAction={() => {
                setSelectedStaff(null);
                setStaffWizardOpen(true);
              }}
            />
          ) : (
            <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {staff.map((s, i) => (
                <motion.article
                  key={s.id}
                  layout
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.35, ease: EASE }}
                  className="group rounded-[1.4rem] bg-ink/[0.045] hover:bg-ink/[0.065] transition-colors p-4"
                >
                  <div className="flex items-start gap-3">
                    <motion.span
                      whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                      className="size-11 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                      style={{ backgroundColor: s.color ?? "#178a4c" }}
                    >
                      {s.name.charAt(0).toUpperCase()}
                    </motion.span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate text-ink">{s.name}</p>
                      <p className="text-xs text-ink/50 truncate">
                        {[s.role, s.specialty].filter(Boolean).join(" · ") || "Provider"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0",
                        s.isActive ? "bg-brand/15 text-brand-deep" : "bg-ink/10 text-ink/45",
                      )}
                    >
                      {s.isActive ? "Active" : "Off"}
                    </span>
                  </div>
                  {(s.services?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {s.services!.slice(0, 3).map((svc) => (
                        <span key={svc.id} className="text-[10px] font-medium px-2 py-1 rounded-full bg-white text-ink/60">
                          {svc.name}
                        </span>
                      ))}
                      {s.services!.length > 3 && (
                        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-white text-ink/60">
                          +{s.services!.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex gap-1.5 mt-3">
                    <button
                      onClick={() => router.push(`/resources/staff/${s.id}`)}
                      className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-medium text-ink hover:bg-ink hover:text-white transition-colors"
                    >
                      <Pencil className="size-3.5" /> Open workspace
                    </button>
                    <button
                      onClick={() => removeStaff(s.id, s.name)}
                      aria-label={`Remove ${s.name}`}
                      className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-white text-ink/55 hover:bg-red-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}
          </div>
        )}

        {tab === "spaces" && (
          <div className="pt-1">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-[1.4rem] bg-ink/[0.06]" />
              ))}
            </div>
          ) : resources.length === 0 ? (
            <EmptyBlock
              icon={<Armchair className="size-8" />}
              title="No spaces yet"
              blurb="Stylist? You don't need this. Restaurants, clinics and spas: add tables, rooms or equipment here."
              actionLabel="Add space"
              onAction={() => {
                setSelectedResource(null);
                setResourceWizardOpen(true);
              }}
            />
          ) : (
            <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {resources.map((r, i) => {
                const Icon = KIND_ICON[r.kind] ?? Boxes;
                return (
                  <motion.article
                    key={r.id}
                    layout
                    initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.35, ease: EASE }}
                    className="group rounded-[1.4rem] bg-ink/[0.045] hover:bg-ink/[0.065] transition-colors p-4"
                  >
                    <div className="flex items-start gap-3">
                      <motion.span
                        whileHover={reduceMotion ? undefined : { rotate: -6, scale: 1.06 }}
                        className="p-2.5 rounded-2xl bg-white text-ink shrink-0"
                      >
                        <Icon className="size-5" />
                      </motion.span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate text-ink">{r.name}</p>
                        <p className="text-xs text-ink/50">
                          {r.kind}
                          {r.capacity != null ? ` · seats ${r.capacity}` : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0",
                          r.isActive ? "bg-brand/15 text-brand-deep" : "bg-ink/10 text-ink/45",
                        )}
                      >
                        {r.isActive ? "Active" : "Off"}
                      </span>
                    </div>
                    {(r.serviceLinks?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {r.serviceLinks!.slice(0, 3).map((l) => (
                          <span key={l.service.id} className="text-[10px] font-medium px-2 py-1 rounded-full bg-white text-ink/60">
                            {l.service.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-3">
                      <button
                        onClick={() => {
                          setSelectedResource(r);
                          setResourceOpen(true);
                        }}
                        className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-medium text-ink hover:bg-ink hover:text-white transition-colors"
                      >
                        <Pencil className="size-3.5" /> Manage
                      </button>
                      <button
                        onClick={() => removeResource(r.id, r.name)}
                        aria-label={`Remove ${r.name}`}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-white text-ink/55 hover:bg-red-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          )}
          </div>
        )}
      </div>

      <StaffDrawer
        open={staffOpen}
        onOpenChange={setStaffOpen}
        staff={selectedStaff}
        onSave={() => {
          setStaffOpen(false);
          load();
        }}
      />
      <ResourceDrawer
        open={resourceOpen}
        onOpenChange={setResourceOpen}
        resource={selectedResource}
        onSave={() => {
          setResourceOpen(false);
          load();
        }}
      />
      <StaffWizard
        open={staffWizardOpen}
        onOpenChange={setStaffWizardOpen}
        onCreated={() => load()}
      />
      <ResourceWizard
        open={resourceWizardOpen}
        onOpenChange={setResourceWizardOpen}
        onCreated={() => load()}
      />
    </div>
  );
}

function EmptyBlock({
  icon,
  title,
  blurb,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center rounded-[1.6rem] bg-ink/[0.035]">
      <span className="flex size-14 items-center justify-center rounded-[1.2rem] bg-ink text-white mb-3">
        {icon}
      </span>
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="text-sm text-ink/50 mt-1 mb-5 max-w-sm">{blurb}</p>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onAction}
        className="h-11 inline-flex items-center gap-1.5 rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-brand transition-colors"
      >
        <Plus className="size-4" />
        {actionLabel}
      </motion.button>
    </div>
  );
}
