"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus,
  MoreVertical,
  Trash2,
  MessageSquareCode,
  Pencil,
  CheckCircle2,
  Circle,
  FileText,
  Globe,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FuseButton } from "@/components/bits/FuseButton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateFlowDialog, type FlowTemplateBlock } from "@/components/flows/CreateFlowDialog";
import { FlowsStatusBanner, WhatsAppRequiredGate } from "@/components/flows/FlowsGate";
import { SlidePills } from "@/components/bits/SlidePills";
import { useFlowsGate } from "@/hooks/integration";
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
    className: "bg-ink/10 text-ink/60",
    icon: Circle,
  },
  PUBLISHED: {
    label: "Published",
    className: "bg-brand/15 text-brand-deep",
    icon: CheckCircle2,
  },
  ARCHIVED: {
    label: "Archived",
    className: "bg-amber-500/15 text-amber-700",
    icon: FileText,
  },
};

type StatusFilter = "ALL" | "DRAFT" | "PUBLISHED" | "ARCHIVED";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function FlowsPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { gate, loading: gateLoading, refresh: refreshGate } = useFlowsGate();
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
    if (!gate.connected) return;
    let cancelled = false;
    fetchFlows()
      .then((f) => {
        if (!cancelled) setFlows(f);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load flows");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchFlows, gate.connected]);

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
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to publish flow",
      );
    }
  };

  const handleCreate = async (data: { name: string; blocks: FlowTemplateBlock[] }) => {
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

  // WhatsApp is required to build flows — gate the whole surface.
  if (!gateLoading && !gate.connected) {
    return <WhatsAppRequiredGate />;
  }

  const locked = !gateLoading && gate.connected && !gate.eligible;

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
            Collect in chat
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-ink mt-1">
            WhatsApp Flows
          </h1>
          <p className="text-[15px] text-ink/55 mt-2 max-w-lg leading-relaxed">
            One form customers fill inside WhatsApp — no more one-by-one
            questions.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-ink/40" />
            <Input
              placeholder="Search flows…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-10 w-44 rounded-full text-xs bg-ink/[0.05]! border-0"
              aria-label="Search flows"
            />
          </div>
          <FuseButton
            onClick={() => setDialogOpen(true)}
            ariaLabel="New flow"
            disabled={locked}
          >
            <Plus className="size-4" />
            New Flow
          </FuseButton>
        </div>
      </motion.div>

      {/* Availability banner */}
      <div className="relative">
        {gateLoading ? (
          <div className="flex items-center gap-2 px-5 py-4 rounded-[1.4rem] bg-ink/[0.045] text-sm text-ink/50">
            <Loader2 className="size-4 animate-spin" /> Checking Flows availability…
          </div>
        ) : (
          <FlowsStatusBanner gate={gate} onRetry={refreshGate} />
        )}
      </div>

      {/* Status pills */}
      <div className="relative">
        <SlidePills
          id="flows-status"
          size="sm"
          value={statusFilter}
          onChange={setStatusFilter}
          options={(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((s) => ({
            value: s,
            label: (
              <>
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}{" "}
                <span className="tabular-nums opacity-70">{counts[s]}</span>
              </>
            ),
          }))}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 rounded-[1.4rem] bg-ink/[0.045] animate-pulse" />
          ))}
        </div>
      ) : flows.length === 0 ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="relative flex flex-col items-center justify-center gap-4 py-20 rounded-[1.6rem] bg-ink/[0.035] text-center"
        >
          <motion.span
            initial={reduceMotion ? false : { scale: 0.7 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
            className="flex items-center justify-center size-14 rounded-[1.2rem] bg-ink text-white"
          >
            <MessageSquareCode className="size-7" />
          </motion.span>
          <div>
            <p className="font-semibold text-ink">No flows yet</p>
            <p className="text-sm text-ink/50 mt-1">
              Create your first flow — customers fill it in one go, inside WhatsApp.
            </p>
          </div>
          <FuseButton onClick={() => setDialogOpen(true)} disabled={locked}>
            <Plus className="size-4 mr-1" />
            Create Flow
          </FuseButton>
        </motion.div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
          <p className="font-medium text-sm text-ink">No flows match</p>
          <p className="text-xs text-ink/50">
            Try a different search or filter.
          </p>
        </div>
      ) : (
        <motion.div layout className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {visible.map((flow, i) => {
              const status = statusConfig[flow.status] ?? statusConfig.DRAFT;
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={flow.id}
                  layout
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                  transition={{
                    delay: Math.min(i * 0.05, 0.3),
                    duration: 0.35,
                    ease: EASE,
                  }}
                  onClick={() => router.push(`/flows/${flow.id}`)}
                  className={cn(
                    "rounded-[1.4rem] p-5 cursor-pointer transition-colors duration-200 group",
                    flow.status === "PUBLISHED"
                      ? "bg-ink text-white"
                      : "bg-ink/[0.045] hover:bg-ink/[0.07]",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <motion.span
                        whileHover={reduceMotion ? undefined : { rotate: -6, scale: 1.06 }}
                        className={cn(
                          "flex items-center justify-center size-10 rounded-2xl shrink-0",
                          flow.status === "PUBLISHED"
                            ? "bg-white/10 text-white"
                            : "bg-white text-ink",
                        )}
                      >
                        <MessageSquareCode className="size-5" />
                      </motion.span>
                      <p
                        className={cn(
                          "text-[15px] font-semibold tracking-tight truncate",
                          flow.status === "PUBLISHED" ? "text-white" : "text-ink",
                        )}
                      >
                        {flow.name}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className={cn(
                            "opacity-0 group-hover:opacity-100 transition-opacity rounded-full",
                            flow.status === "PUBLISHED"
                              ? "text-white/70 hover:text-white hover:bg-white/10"
                              : "",
                          )}
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

                  <div className="flex items-center gap-1.5 mt-4 flex-wrap">
                    <span
                      className={cn(
                        "text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-full",
                        status.className,
                        flow.status === "PUBLISHED" && "bg-white/10 text-white",
                      )}
                    >
                      <StatusIcon className="size-3" />
                      {status.label}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] px-2.5 py-1 rounded-full font-medium",
                        flow.status === "PUBLISHED"
                          ? "bg-white/10 text-white/70"
                          : "bg-ink/[0.06] text-ink/55",
                      )}
                    >
                      {flow.flowSchema?.blocks?.length ?? 0} fields
                    </span>
                  </div>

                  <div className="flex items-center mt-4">
                    <span
                      className={cn(
                        "text-xs",
                        flow.status === "PUBLISHED" ? "text-white/50" : "text-ink/45",
                      )}
                    >
                      Updated {new Date(flow.updatedAt).toLocaleDateString()}
                    </span>
                    {flow.status !== "PUBLISHED" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePublish(flow.id);
                        }}
                        className="ml-auto text-xs font-semibold text-brand hover:underline underline-offset-2"
                      >
                        Publish →
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <CreateFlowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={handleCreate}
      />
    </div>
  );
}
