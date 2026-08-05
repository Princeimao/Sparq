"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  MoreVertical,
  Trash2,
  Globe,
  FileText,
  Pencil,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateFlowDialog } from "@/components/flows/CreateFlowDialog";

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
    className: "bg-muted text-muted-foreground",
    icon: Circle,
  },
  PUBLISHED: {
    label: "Published",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle2,
  },
  ARCHIVED: {
    label: "Archived",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: FileText,
  },
};

export default function FlowsPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<FlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            WhatsApp Flows
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build data-collection flows sent to customers via WhatsApp
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="lg" className="py-5 rounded-2xl">
          <Plus className="size-4 mr-1.5" />
          New Flow
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : flows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 h-64 border border-dashed rounded-xl">
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary">
            <Globe className="size-6" />
          </div>
          <div className="text-center">
            <p className="font-medium">No flows yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first WhatsApp flow to collect customer information
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} variant="outline">
            <Plus className="size-4 mr-1.5" />
            Create Flow
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {flows.map((flow) => {
            const status = statusConfig[flow.status] ?? statusConfig.DRAFT;
            const StatusIcon = status.icon;

            return (
              <Card
                key={flow.id}
                className="group cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-primary/20 hover:shadow-md"
                onClick={() => router.push(`/flows/${flow.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center size-9 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                        <Globe className="size-4" />
                      </div>
                      <CardTitle className="text-sm font-medium truncate">
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
                      className={`text-[11px] flex items-center gap-1 ${status.className}`}
                    >
                      <StatusIcon className="size-3" />
                      {status.label}
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">
                      {flow.flowSchema?.blocks?.length ?? 0} fields
                    </Badge>
                  </div>
                </CardContent>

                <CardFooter className="pt-3">
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(flow.updatedAt).toLocaleDateString()}
                  </span>
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
