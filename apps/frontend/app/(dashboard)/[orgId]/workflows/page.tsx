"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Plus,
  Workflow,
  MoreVertical,
  Trash2,
  Loader2,
  Zap,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateWorkflowDrawer } from "@/components/workflow/CreateWorkflowDrawer";

interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  steps: any[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function WorkflowsPage() {
  const { orgId } = useParams();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/organizations/${orgId}/workflows`);
      setWorkflows(res.data.workflows);
    } catch {
      toast.error("Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleToggleActive = async (workflow: WorkflowItem) => {
    try {
      await api.patch(`/organizations/${orgId}/workflows/${workflow.id}`, {
        isActive: !workflow.isActive,
      });
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === workflow.id ? { ...w, isActive: !w.isActive } : w,
        ),
      );
      toast.success(
        `Workflow ${!workflow.isActive ? "activated" : "deactivated"}`,
      );
    } catch {
      toast.error("Failed to update workflow");
    }
  };

  const handleDelete = async (workflowId: string) => {
    try {
      await api.delete(`/organizations/${orgId}/workflows/${workflowId}`);
      setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
      toast.success("Workflow deleted");
    } catch {
      toast.error("Failed to delete workflow");
    }
  };

  const handleCreate = async (data: {
    name: string;
    description: string;
    triggerType: string;
  }) => {
    try {
      const res = await api.post(`/organizations/${orgId}/workflows`, {
        ...data,
        steps: [],
        isActive: true,
      });
      setWorkflows((prev) => [res.data.workflow, ...prev]);
      setDrawerOpen(false);
      toast.success("Workflow created!");
    } catch {
      toast.error("Failed to create workflow");
    }
  };

  const triggerLabel = (type: string) => {
    switch (type) {
      case "WHATSAPP_MESSAGE":
        return "WhatsApp";
      case "PRODUCT_PURCHASE":
        return "Purchase";
      case "APPOINTMENT_BOOKING":
        return "Booking";
      default:
        return type;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage your automation flows
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)} size="lg">
          <Plus className="size-4 mr-1.5" />
          Create Flow
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 px-18 py-24 border border-dashed rounded-xl">
          <p className="text-muted-foreground text-sm">
            No workflows yet. Create your first flow!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {workflows.map((workflow) => (
            <Card
              key={workflow.id}
              className="group cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-primary/20 hover:shadow-md"
              onClick={() => router.push(`/${orgId}/workflows/${workflow.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary">
                      <Zap className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-medium truncate">
                        {workflow.name}
                      </CardTitle>
                    </div>
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
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(workflow.id);
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
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {workflow.description || "No description"}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[11px]">
                    <MessageSquare className="size-3 mr-1" />
                    {triggerLabel(workflow.triggerType)}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    {workflow.steps?.length || 0} steps
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="pt-3">
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-muted-foreground">
                    {new Date(workflow.createdAt).toLocaleDateString()}
                  </span>
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-xs text-muted-foreground">
                      {workflow.isActive ? "Active" : "Inactive"}
                    </span>
                    <Switch
                      checked={workflow.isActive}
                      onCheckedChange={() => handleToggleActive(workflow)}
                    />
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Workflow Drawer */}
      <CreateWorkflowDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onCreate={handleCreate}
      />
    </div>
  );
}
