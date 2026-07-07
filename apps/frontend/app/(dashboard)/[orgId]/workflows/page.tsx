"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, RefreshCw, Save, Trash2, Workflow as WorkflowIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type WorkflowStep = {
  id: string;
  type: string;
  label: string;
  config: {
    message?: string;
    durationMinutes?: number;
    timeoutMinutes?: number;
  };
};

type Workflow = {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  steps: WorkflowStep[];
  isActive: boolean;
  updatedAt: string;
};

const stepTypes = [
  "send_message",
  "wait_reply",
  "request_address",
  "generate_payment_link",
  "offer_slots",
  "create_appointment",
  "delay",
  "condition",
];

const emptyWorkflow = {
  name: "",
  description: "",
  triggerType: "WHATSAPP_MESSAGE",
  isActive: true,
};

const starterStep = (): WorkflowStep => ({
  id: crypto.randomUUID(),
  type: "send_message",
  label: "Send message",
  config: { message: "" },
});

export default function WorkflowsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [form, setForm] = useState(emptyWorkflow);
  const [steps, setSteps] = useState<WorkflowStep[]>([starterStep()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeCount = useMemo(() => workflows.filter((workflow) => workflow.isActive).length, [workflows]);

  const loadWorkflows = async () => {
    setLoading(true);
    const response = await api.get(`/organizations/${orgId}/workflows`);
    setWorkflows(response.data.workflows);
    setLoading(false);
  };

  useEffect(() => {
    loadWorkflows().catch(() => setLoading(false));
  }, [orgId]);

  const createWorkflow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post(`/organizations/${orgId}/workflows`, {
        ...form,
        description: form.description || undefined,
        steps: steps.map((step, index) => ({
          ...step,
          id: `step_${index + 1}`,
          label: step.label || step.type.replaceAll("_", " "),
          config: {
            ...step.config,
            message: step.config.message || undefined,
          },
        })),
      });
      toast.success("Workflow created");
      setForm(emptyWorkflow);
      setSteps([starterStep()]);
      await loadWorkflows();
    } catch {
      toast.error("Could not save workflow");
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkflow = async (workflow: Workflow) => {
    await api.patch(`/organizations/${orgId}/workflows/${workflow.id}`, {
      isActive: !workflow.isActive,
    });
    await loadWorkflows();
  };

  const updateStep = (id: string, updates: Partial<WorkflowStep>) => {
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, ...updates } : step)));
  };

  const updateStepMessage = (id: string, message: string) => {
    setSteps((current) =>
      current.map((step) =>
        step.id === id ? { ...step, config: { ...step.config, message } } : step,
      ),
    );
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WorkflowIcon className="size-4" />
            Create workflow
          </CardTitle>
          <CardDescription>Build task flows for WhatsApp purchase, appointment booking, reminders, and custom operations.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={createWorkflow}>
            <div className="space-y-2">
              <Label htmlFor="workflowName">Name</Label>
              <Input
                id="workflowName"
                required
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="WhatsApp lead qualification"
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select
                value={form.triggerType}
                onValueChange={(value) => setForm((current) => ({ ...current, triggerType: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP_MESSAGE">WhatsApp message</SelectItem>
                  <SelectItem value="PRODUCT_PURCHASE">Product purchase</SelectItem>
                  <SelectItem value="APPOINTMENT_BOOKING">Appointment booking</SelectItem>
                  <SelectItem value="CUSTOM_EVENT">Custom event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflowDescription">Description</Label>
              <Textarea
                id="workflowDescription"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked === true }))}
              />
              Activate immediately
            </label>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Steps</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setSteps((current) => [...current, starterStep()])}>
                  <Plus />
                  Add step
                </Button>
              </div>
              {steps.map((step, index) => (
                <div key={step.id} className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">Step {index + 1}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={steps.length === 1}
                      onClick={() => setSteps((current) => current.filter((item) => item.id !== step.id))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <Input
                    value={step.label}
                    onChange={(event) => updateStep(step.id, { label: event.target.value })}
                    placeholder="Step label"
                  />
                  <Select value={step.type} onValueChange={(value) => updateStep(step.id, { type: value })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stepTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replaceAll("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={step.config.message || ""}
                    onChange={(event) => updateStepMessage(step.id, event.target.value)}
                    placeholder="Message, condition, or action notes"
                  />
                </div>
              ))}
            </div>

            <Button className="w-full" disabled={saving}>
              <Save />
              {saving ? "Saving..." : "Save workflow"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="rounded-lg">
            <CardContent>
              <p className="text-sm text-muted-foreground">Workflows</p>
              <p className="mt-1 text-2xl font-semibold">{workflows.length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardContent>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="mt-1 text-2xl font-semibold">{activeCount}</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardContent>
              <p className="text-sm text-muted-foreground">Pre-created flows</p>
              <p className="mt-1 text-2xl font-semibold">3</p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Workflow library</CardTitle>
                <CardDescription>Includes WhatsApp to product purchase, appointment booking, and abandoned cart reminders.</CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={loadWorkflows}>
                <RefreshCw />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading workflows...</p>
            ) : (
              workflows.map((workflow) => (
                <div key={workflow.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{workflow.name}</p>
                        <Badge variant={workflow.isActive ? "outline" : "destructive"}>
                          {workflow.isActive ? "ACTIVE" : "OFF"}
                        </Badge>
                        <Badge variant="outline">{workflow.triggerType.replaceAll("_", " ")}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{workflow.description || "No description"}</p>
                    </div>
                    <Button variant="outline" onClick={() => toggleWorkflow(workflow)}>
                      {workflow.isActive ? "Pause" : "Activate"}
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {workflow.steps.map((step, index) => (
                      <div key={`${workflow.id}-${step.id}-${index}`} className="rounded-md border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">Step {index + 1}</p>
                        <p className="font-medium">{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.type.replaceAll("_", " ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
