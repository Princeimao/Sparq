"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { FlowBuilder, type FlowBlock } from "../../../../components/flows/FlowBuilder";
import { FlowsStatusBanner, WhatsAppRequiredGate } from "@/components/flows/FlowsGate";
import { useFlowsGate } from "@/hooks/integration";

interface FlowData {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  flowSchema: {
    version: number;
    blocks: Array<{
      id: string;
      type: string;
      label?: string;
      required?: boolean;
      placeholder?: string;
      description?: string;
      options?: string[];
    }>;
  };
  endpointUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export default function FlowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [flow, setFlow] = useState<FlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const { gate, refresh: refreshGate } = useFlowsGate();

  const fetchFlow = useCallback(async () => {
    const res = await api.get(`/flows/${id}`);
    return res.data.data.flow;
  }, [id]);

  useEffect(() => {
    const loadFlow = async () => {
      setLoading(true);

      try {
        const flow = await fetchFlow();
        setFlow(flow);
      } catch {
        toast.error("Flow not found");
        router.push("/flows");
      } finally {
        setLoading(false);
      }
    };

    loadFlow();
  }, [fetchFlow, router]);

  const handleSave = async (blocks: FlowBlock[]) => {
    try {
      const res = await api.patch(`/flows/${id}`, {
        flowSchema: { version: 1, blocks },
      });
      setFlow(res.data.flow);
      toast.success("Flow saved!");
    } catch {
      toast.error("Failed to save flow");
      throw new Error("save failed");
    }
  };

  const handlePublish = async () => {
    try {
      await api.post(`/flows/${id}/publish`);
      setFlow((prev) => (prev ? { ...prev, status: "PUBLISHED" } : prev));
      toast.success("Flow published to WhatsApp!");
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to publish",
      );
    }
  };

  const handleRename = async (name: string) => {
    try {
      const res = await api.patch(`/flows/${id}`, { name });
      setFlow(res.data.flow);
      toast.success("Flow renamed");
    } catch {
      toast.error("Failed to rename");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="size-6 animate-spin text-ink/40" />
      </div>
    );
  }

  if (!gate.connected) return <WhatsAppRequiredGate />;

  if (!flow) return null;

  return (
    <div className="px-4 pt-4 max-w-[1400px] mx-auto">
      <div className="mb-3">
        <FlowsStatusBanner gate={gate} onRetry={refreshGate} />
      </div>
    <FlowBuilder
      // @ts-expect-error FlowData blocks allow optional label/required; builder normalizes on edit
      flow={flow}
        onSave={handleSave}
        onPublish={handlePublish}
        onRename={handleRename}
        onBack={() => router.push("/flows")}
        publishLocked={!gate.eligible}
      />
    </div>
  );
}
