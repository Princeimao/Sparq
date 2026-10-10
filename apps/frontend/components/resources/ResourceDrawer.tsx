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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import {
  createResource,
  updateResource,
  type SpaceResource,
} from "@/lib/resources";
import { HoursEditor } from "./HoursEditor";
import { TimeOffManager } from "./TimeOffManager";
import { JellyRadioGroup } from "@/components/bits/JellyRadio";
import { cn } from "@/lib/utils";

type Kind = "TABLE" | "ROOM" | "EQUIPMENT" | "OTHER";

const KIND_OPTIONS: { value: Kind; title: string; blurb: string }[] = [
  { value: "TABLE", title: "Table", blurb: "Restaurant seating with guest capacity" },
  { value: "ROOM", title: "Room", blurb: "Treatment, consultation or meeting rooms" },
  { value: "EQUIPMENT", title: "Equipment", blurb: "Chairs, devices or gear that books out" },
  { value: "OTHER", title: "Other space", blurb: "Anything else reservable" },
];

interface ServiceOption {
  id: string;
  name: string;
}

export function ResourceDrawer({
  open,
  onOpenChange,
  resource,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: SpaceResource | null;
  onSave: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [form, setForm] = useState({
    name: "",
    kind: "TABLE" as Kind,
    description: "",
    capacity: "",
    color: "#7c3aed",
    isActive: true,
    serviceIds: [] as string[],
  });

  useEffect(() => {
    if (!open) return;
    api
      .get("/services")
      .then((res) =>
        setServices(
          (res.data.data.services ?? []).map((s: { id: string; name: string }) => ({
            id: s.id,
            name: s.name,
          })),
        ),
      )
      .catch(() => {});
    if (resource) {
      setForm({
        name: resource.name,
        kind: resource.kind,
        description: resource.description ?? "",
        capacity: resource.capacity != null ? String(resource.capacity) : "",
        color: "#7c3aed",
        isActive: resource.isActive,
        serviceIds: (resource.serviceLinks ?? []).map((l) => l.service.id),
      });
    } else {
      setForm({
        name: "",
        kind: "TABLE",
        description: "",
        capacity: "",
        color: "#7c3aed",
        isActive: true,
        serviceIds: [],
      });
    }
  }, [open, resource]);

  const toggleService = (id: string) =>
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id)
        ? f.serviceIds.filter((s) => s !== id)
        : [...f.serviceIds, id],
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        kind: form.kind,
        description: form.description.trim() || null,
        capacity: form.capacity ? parseInt(form.capacity, 10) : null,
        isActive: form.isActive,
        serviceIds: form.serviceIds,
      };
      if (resource) {
        await updateResource(resource.id, payload);
        toast.success("Resource updated");
      } else {
        await createResource(payload);
        toast.success("Resource added");
      }
      onSave();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Could not save resource";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{resource ? "Edit resource" : "Add resource"}</SheetTitle>
          <SheetDescription>
            Tables, rooms and equipment customers can book — no login needed.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="details" className="p-6 pt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="hours" disabled={!resource}>Hours</TabsTrigger>
            <TabsTrigger value="leave" disabled={!resource}>Closed</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <form onSubmit={submit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="rs-name">Name *</Label>
                <Input
                  id="rs-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Table T4, Room A"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>What kind of resource is this?</Label>
                <div className="rounded-xl border border-zinc-200 px-3">
                  <JellyRadioGroup
                    name="resource-kind"
                    options={KIND_OPTIONS.map((k) => ({
                      value: k.value,
                      title: k.title,
                      blurb: k.blurb,
                    }))}
                    value={form.kind}
                    onChange={(v) => setForm({ ...form, kind: v })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rs-capacity">
                    Seats {form.kind === "TABLE" ? "*" : "(optional)"}
                  </Label>
                  <Input
                    id="rs-capacity"
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    placeholder="4"
                    required={form.kind === "TABLE"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Visible for booking</Label>
                  <div className="h-10 flex items-center">
                    <Switch
                      checked={form.isActive}
                      onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rs-desc">Notes</Label>
                <Textarea
                  id="rs-desc"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Window seat, near kitchen…"
                />
              </div>

              <div className="space-y-2">
                <Label>Bookable for</Label>
                {services.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No services yet — tables stay bookable for any party-size offering.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {services.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleService(s.id)}
                        aria-pressed={form.serviceIds.includes(s.id)}
                        className={cn(
                          "text-xs px-2.5 py-1.5 rounded-full border transition-colors",
                          form.serviceIds.includes(s.id)
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 hover:border-zinc-400",
                        )}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin mr-2" />}
                {resource ? "Save changes" : "Add resource"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="hours">
            {resource && <HoursEditor scope={{ resourceId: resource.id }} />}
          </TabsContent>
          <TabsContent value="leave">
            {resource && <TimeOffManager scope={{ resourceId: resource.id }} />}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
