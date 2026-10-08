"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  MessageSquare,
  GitBranch,
  CreditCard,
  Sparkles,
  Zap,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import type { Node } from "@xyflow/react";

interface NodeInspectorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedNode: Node | null;
  onUpdateNodeData: (nodeId: string, updates: Record<string, any>) => void;
}

export function NodeInspectorDrawer({
  open,
  onOpenChange,
  selectedNode,
  onUpdateNodeData,
}: NodeInspectorDrawerProps) {
  const [label, setLabel] = useState("");
  const [config, setConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    if (selectedNode) {
      setLabel((selectedNode.data.label as string) || "");
      setConfig((selectedNode.data.config as Record<string, any>) || {});
    }
  }, [selectedNode]);

  if (!selectedNode) return null;

  const nodeType = (selectedNode.data.nodeType as string) || "action";

  const handleConfigChange = (key: string, value: any) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    onUpdateNodeData(selectedNode.id, {
      label,
      config: updated,
    });
  };

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    onUpdateNodeData(selectedNode.id, {
      label: newLabel,
      config,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto space-y-6">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Sliders className="size-5 text-primary" />
            <SheetTitle className="text-base">Configure Step Node</SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            Manage node parameters, template payloads, conditional expressions, and state rules.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 p-1">
          {/* Node ID & Type badge */}
          <div className="p-3 rounded-xl border bg-muted/20 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold">{nodeType.toUpperCase()} Node</p>
              <p className="text-muted-foreground font-mono text-[10px]">{selectedNode.id}</p>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Active Step
            </Badge>
          </div>

          {/* Node Label */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Node Display Name</Label>
            <Input
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Step Title..."
            />
          </div>

          {/* EMAIL Node Specific Settings */}
          {(nodeType === "email" || nodeType === "send_email") && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
                <Mail className="size-4" /> Email Template Configuration
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Select Email Template</Label>
                <Select
                  value={config.emailTemplate || "order_confirmation"}
                  onValueChange={(v) => handleConfigChange("emailTemplate", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order_confirmation">🛍️ Order Confirmation</SelectItem>
                    <SelectItem value="appointment_confirmation">📅 Appointment Confirmation</SelectItem>
                    <SelectItem value="reservation_booking">🏨 Hotel/Table Reservation</SelectItem>
                    <SelectItem value="custom_html">📧 Custom HTML Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Subject Line</Label>
                <Input
                  value={config.subject || "Order Confirmation - Sparq"}
                  onChange={(e) => handleConfigChange("subject", e.target.value)}
                  placeholder="Subject line..."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Recipient Email</Label>
                <Input
                  value={config.recipient || "{{customerEmail}}"}
                  onChange={(e) => handleConfigChange("recipient", e.target.value)}
                  placeholder="{{customerEmail}}"
                />
              </div>
            </div>
          )}

          {/* WHATSAPP Node Specific Settings */}
          {(nodeType === "whatsapp" || nodeType === "send_message") && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                <MessageSquare className="size-4" /> WhatsApp Template & Message
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Message Type</Label>
                <Select
                  value={config.actionType || "template"}
                  onValueChange={(v) => handleConfigChange("actionType", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template">Meta Approved Template</SelectItem>
                    <SelectItem value="interactive_buttons">Interactive Menu Buttons</SelectItem>
                    <SelectItem value="custom">Free-form Text Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.actionType === "template" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Meta Template</Label>
                  <Select
                    value={config.templateName || "greeting_welcome"}
                    onValueChange={(v) => handleConfigChange("templateName", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="greeting_welcome">greeting_welcome (Approved)</SelectItem>
                      <SelectItem value="order_status_update">order_status_update (Approved)</SelectItem>
                      <SelectItem value="appointment_reminder">appointment_reminder (Approved)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs">Message Content</Label>
                  <Textarea
                    rows={4}
                    value={config.message || ""}
                    onChange={(e) => handleConfigChange("message", e.target.value)}
                    placeholder="Hi {{customerName}}, thank you for your message! How can we assist you today?"
                  />
                </div>
              )}
            </div>
          )}

          {/* IF / ELSE Condition Node Specific Settings */}
          {(nodeType === "ifelse" || nodeType === "condition") && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600">
                <GitBranch className="size-4" /> Advanced If/Else Logic Rule
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Target Variable</Label>
                <Select
                  value={config.fieldVariable || "intent"}
                  onValueChange={(v) => handleConfigChange("fieldVariable", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intent">intent (Extracted Keyword/LLM)</SelectItem>
                    <SelectItem value="message">message (Raw Customer Input)</SelectItem>
                    <SelectItem value="orderTotal">orderTotal (Amount)</SelectItem>
                    <SelectItem value="guestCount">guestCount (Party Size)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Operator</Label>
                  <Select
                    value={config.operator || "EQUALS"}
                    onValueChange={(v) => handleConfigChange("operator", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EQUALS">Equals (==)</SelectItem>
                      <SelectItem value="CONTAINS">Contains</SelectItem>
                      <SelectItem value="GREATER_THAN">Greater Than (&gt;)</SelectItem>
                      <SelectItem value="LESS_THAN">Less Than (&lt;)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Compare Value</Label>
                  <Input
                    value={config.compareValue || "ORDER"}
                    onChange={(e) => handleConfigChange("compareValue", e.target.value)}
                    placeholder="e.g. ORDER"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Node Execution State Summary */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Zap className="size-3.5 text-amber-500" /> Node Execution Metrics
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg border bg-muted/10">
                <p className="text-muted-foreground text-[10px]">Total Executions</p>
                <p className="text-sm font-bold mt-0.5">148 runs</p>
              </div>
              <div className="p-2.5 rounded-lg border bg-muted/10">
                <p className="text-muted-foreground text-[10px]">Success Rate</p>
                <p className="text-sm font-bold text-emerald-600 mt-0.5">99.3%</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={() => onOpenChange(false)} className="w-full">
              <CheckCircle2 className="size-4 mr-1.5" /> Done Editing Step
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
