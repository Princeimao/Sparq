"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { WorkflowFlowEditor } from "@/components/workflow/WorkflowFlowEditor";

export default function WorkflowEditorPage() {
  const { workflowId } = useParams();
  const router = useRouter();
  const [workflow, setWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkflow = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/workflows/${workflowId}`);
      setWorkflow(res.data.workflow);
    } catch {
      toast.error("Failed to load workflow");
      router.push(`/workflows`);
    } finally {
      setLoading(false);
    }
  }, [workflowId, router]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  const handleSaveFlow = async (steps: any[]) => {
    try {
      await api.patch(`/workflows/${workflowId}`, {
        steps,
      });
      setWorkflow((prev: any) => ({ ...prev, steps }));
      toast.success("Flow saved successfully!");
    } catch {
      toast.error("Failed to save flow");
    }
  };

  const handleBack = () => {
    router.push(`/workflows`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">Workflow not found.</p>
      </div>
    );
  }

  return (
    <WorkflowFlowEditor
      workflow={workflow}
      onBack={handleBack}
      onSave={handleSaveFlow}
    />
  );
}
