"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { animate, stagger } from "animejs";
import { useReducedMotion } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  MoreVertical,
  Trash2,
  MessageSquareCode,
  Pencil,
  CheckCircle2,
  Circle,
  FileText,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FuseButton } from "@/components/bits/FuseButton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateFlowDialog } from "@/components/flows/CreateFlowDialog";
import { cn } from "@/lib/utils";

interface FlowItem {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  flowSchema: {
    version: number;
    blocks: Array<{ id: string; type: string; label?: string }>;
  };
  createdAt: string;
  updatedAt: string;
}

const statusConfig = {
  DRAFT: {
    label: "Draft",
    className: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    icon: Circle,
  },
  PUBLISHED: {
    label: "Published",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-transparent",
    icon: CheckCircle2,
  },
  ARCHIVED: {
    label: "Archived",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-transparent",
    icon: FileText,
  },
};

type StatusFilter = "ALL" | "DRAFT" | "PUBLISHED" | "ARCHIVED";

export default function FlowsPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  const [flows, setFlows] = useState<FlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const fetchFlows = useCallback(async () => {
    const res = await api.get("/flows");
    return res.data.data.flows ?? [];
  }, []);

  useEffect(() => {
    const loadFlows = async () => {
      setLoading(true);

      try {
        const flows = await fetchFlows();
        setFlows(flows);
      } catch {
        toast.error("Failed to load flows");
      } finally {
        setLoading(false);
      }
    };

    loadFlows();
  }, [fetchFlows]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/flows/${id}`);
      setFlows((prev) => prev.filter((f) => f.id !== id));
      toast.success("Flow deleted");
    } catch {
      toast.error("Failed to delete flow");
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await api.post(`/flows/${id}/publish`);
      setFlows((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "PUBLISHED" } : f)),
      );
      toast.success("Flow published to WhatsApp!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to publish flow");
    }
  };

  const handleCreate = async (data: { name: string; blocks: any[] }) => {
    try {
      const res = await api.post("/flows", {
        name: data.name,
        flowSchema: { version: 1, blocks: data.blocks },
        status: "DRAFT",
      });
      setFlows((prev) => [res.data.flow, ...prev]);
      setDialogOpen(false);
      toast.success("Flow created!");
      // Navigate to edit
      router.push(`/flows/${res.data.flow.id}`);
    } catch {
      toast.error("Failed to create flow");
    }
  };

  const visible = flows.filter((f) => {
    if (statusFilter !== "ALL" && f.status !== statusFilter) return false;
    if (query.trim() && !f.name.toLowerCase().includes(query.trim().toLowerCase()))
      return false;
    return true;
  });

  const counts = {
    ALL: flows.length,
    DRAFT: flows.filter((f) => f.status === "DRAFT").length,
    PUBLISHED: flows.filter((f) => f.status === "PUBLISHED").length,
    ARCHIVED: flows.filter((f) => f.status === "ARCHIVED").length,
  };

  // Anime.js stagger on the visible cards.
  useEffect(() => {
    if (loading || reduceMotion) return;
    const root = gridRef.current;
    if (!root) return;
    const cards = root.querySelectorAll("[data-flow-card]");
    if (cards.length === 0) return;
    const anim = animate(cards, {
      opacity: [0, 1],
      translateY: [16, 0],
      scale: [0.97, 1],
      duration: 450,
      delay: stagger(55),
      ease: "outCubic",
    });
    return () => {
      anim.revert();
    };
  }, [loading, reduceMotion, statusFilter, query, flows.length]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            WhatsApp Flows
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build data-collection flows sent to customers via WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search flows…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9 w-44 rounded-full text-xs"
              aria-label="Search flows"
            />
          </div>
          <FuseButton onClick={() => setDialogOpen(true)} ariaLabel="New flow">
            <Plus className="size-4" />
            New Flow
          </FuseButton>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex p-1 rounded-full border bg-card w-fit">
        {(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            aria-pressed={statusFilter === s}
            className={cn(
              "text-xs font-medium px-3 py-1.5 rounded-full transition-colors capitalize",
              statusFilter === s
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}{" "}
            <span className="tabular-nums opacity-70">{counts[s]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 rounded-3xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : flows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 border-2 border-dashed rounded-3xl bg-muted/5 text-center">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <MessageSquareCode className="size-7" />
          </div>
          <div>
            <p className="font-medium">No flows yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first WhatsApp flow to collect customer information
            </p>
          </div>
          <FuseButton onClick={() => setDialogOpen(true)}>
            <Plus className="size-4 mr-1" />
            Create Flow
          </FuseButton>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
          <p className="font-medium text-sm">No flows match</p>
          <p className="text-xs text-muted-foreground">
            Try a different search or filter.
          </p>
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((flow) => {
            const status = statusConfig[flow.status] ?? statusConfig.DRAFT;
            const StatusIcon = status.icon;

            return (
              <Card
                key={flow.id}
                data-flow-card
                className="rounded-3xl border shadow-sm group cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                onClick={() => router.push(`/flows/${flow.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex items-center justify-center size-10 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
                        <MessageSquareCode className="size-5" />
                      </div>
                      <CardTitle className="text-[15px] font-semibold truncate">
                        {flow.name}
                      </CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/flows/${flow.id}`);
                          }}
                        >
                          <Pencil className="size-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {flow.status !== "PUBLISHED" && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePublish(flow.id);
                            }}
                          >
                            <Globe className="size-3.5 mr-2" />
                            Publish to WhatsApp
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(flow.id);
                          }}
                        >
                          <Trash2 className="size-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[11px] flex items-center gap-1 ${status.className}`}
                    >
                      <StatusIcon className="size-3" />
                      {status.label}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px] rounded-full">
                      {flow.flowSchema?.blocks?.length ?? 0} fields
                    </Badge>
                  </div>
                </CardContent>

                <CardFooter className="pt-2">
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(flow.updatedAt).toLocaleDateString()}
                  </span>
                  {flow.status !== "PUBLISHED" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePublish(flow.id);
                      }}
                      className="ml-auto text-xs font-medium text-emerald-600 hover:underline underline-offset-2"
                    >
                      Publish →
                    </button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <CreateFlowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={handleCreate}
      />
    </div>
  );
}
