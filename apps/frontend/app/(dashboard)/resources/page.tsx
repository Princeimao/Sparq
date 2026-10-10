"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { animate, stagger } from "animejs";
import { useReducedMotion } from "framer-motion";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";

const KIND_ICON: Record<string, typeof Armchair> = {
  TABLE: Armchair,
  ROOM: BedDouble,
  EQUIPMENT: Wrench,
  OTHER: Boxes,
};

export default function ResourcesPage() {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const gridRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState("people");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [resources, setResources] = useState<SpaceResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffOpen, setStaffOpen] = useState(false);
  const [resourceOpen, setResourceOpen] = useState(false);
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
    load();
  }, [load]);

  // Anime.js stagger on cards whenever the visible set changes.
  useEffect(() => {
    if (loading || reduceMotion) return;
    const root = gridRef.current;
    if (!root) return;
    const cards = root.querySelectorAll("[data-rs-card]");
    if (cards.length === 0) return;
    const anim = animate(cards, {
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 450,
      delay: stagger(55),
      ease: "outCubic",
    });
    return () => {
      anim.revert();
    };
  }, [loading, tab, staff.length, resources.length, reduceMotion]);

  const removeStaff = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}? Upcoming bookings will deactivate them instead.`)) return;
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
    if (!confirm(`Remove ${name}? Upcoming bookings will deactivate it instead.`)) return;
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The people, tables, rooms and equipment your bookings allocate.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              setSelectedResource(null);
              setResourceOpen(true);
            }}
          >
            <Plus className="size-4 mr-2" /> Add space
          </Button>
          <Button
            className="rounded-xl"
            onClick={() => {
              setSelectedStaff(null);
              setStaffOpen(true);
            }}
          >
            <Plus className="size-4 mr-2" /> Add provider
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="people" className="gap-1.5">
            <Users className="size-4" /> People ({staff.length})
          </TabsTrigger>
          <TabsTrigger value="spaces" className="gap-1.5">
            <Armchair className="size-4" /> Spaces & tables ({resources.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="pt-4">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
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
                setStaffOpen(true);
              }}
            />
          ) : (
            <div ref={gridRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {staff.map((s) => (
                <Card key={s.id} data-rs-card className="rounded-2xl overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span
                        className="size-11 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                        style={{ backgroundColor: s.color ?? "#7c3aed" }}
                      >
                        {s.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[s.role, s.specialty].filter(Boolean).join(" · ") || "Provider"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] shrink-0",
                          s.isActive
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-500",
                        )}
                      >
                        {s.isActive ? "Active" : "Off"}
                      </Badge>
                    </div>
                    {(s.services?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {s.services!.slice(0, 3).map((svc) => (
                          <Badge key={svc.id} variant="secondary" className="text-[10px]">
                            {svc.name}
                          </Badge>
                        ))}
                        {s.services!.length > 3 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{s.services!.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-3 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push(`/resources/staff/${s.id}`)}
                      >
                        <Pencil className="size-3.5 mr-1.5" /> Open workspace
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeStaff(s.id, s.name)}
                        aria-label={`Remove ${s.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="spaces" className="pt-4">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
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
                setResourceOpen(true);
              }}
            />
          ) : (
            <div ref={gridRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((r) => {
                const Icon = KIND_ICON[r.kind] ?? Boxes;
                return (
                  <Card key={r.id} data-rs-card className="rounded-2xl overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                          <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.kind}
                            {r.capacity != null ? ` · seats ${r.capacity}` : ""}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] shrink-0",
                            r.isActive
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-zinc-500/10 text-zinc-500",
                          )}
                        >
                          {r.isActive ? "Active" : "Off"}
                        </Badge>
                      </div>
                      {(r.serviceLinks?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {r.serviceLinks!.slice(0, 3).map((l) => (
                            <Badge key={l.service.id} variant="secondary" className="text-[10px]">
                              {l.service.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-1.5 mt-3 pt-3 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedResource(r);
                            setResourceOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5 mr-1.5" /> Manage
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeResource(r.id, r.name)}
                          aria-label={`Remove ${r.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-2xl bg-muted/5">
      <div className="text-muted-foreground mb-3">{icon}</div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm">{blurb}</p>
      <Button variant="outline" onClick={onAction} className="rounded-xl">
        <Plus className="size-4 mr-2" />
        {actionLabel}
      </Button>
    </div>
  );
}
