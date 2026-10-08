"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Mail,
  MessageSquare,
  CreditCard,
  GitBranch,
  Smartphone,
  Calendar,
  Settings2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const nodeConfig: Record<
  string,
  {
    icon: React.ReactNode;
    color: string;
    borderColor: string;
    bgColor: string;
    badgeText: string;
  }
> = {
  email: {
    icon: <Mail className="size-4" />,
    color: "text-blue-500",
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/10",
    badgeText: "Email Action",
  },
  send_message: {
    icon: <MessageSquare className="size-4" />,
    color: "text-emerald-500",
    borderColor: "border-emerald-500/30",
    bgColor: "bg-emerald-500/10",
    badgeText: "WhatsApp",
  },
  sms: {
    icon: <Smartphone className="size-4" />,
    color: "text-purple-500",
    borderColor: "border-purple-500/30",
    bgColor: "bg-purple-500/10",
    badgeText: "SMS Action",
  },
  whatsapp: {
    icon: <MessageSquare className="size-4" />,
    color: "text-emerald-500",
    borderColor: "border-emerald-500/30",
    bgColor: "bg-emerald-500/10",
    badgeText: "WhatsApp",
  },
  ifelse: {
    icon: <GitBranch className="size-4" />,
    color: "text-amber-500",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/10",
    badgeText: "If / Else Rule",
  },
  condition: {
    icon: <GitBranch className="size-4" />,
    color: "text-amber-500",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/10",
    badgeText: "Condition",
  },
  payment: {
    icon: <CreditCard className="size-4" />,
    color: "text-emerald-500",
    borderColor: "border-emerald-500/30",
    bgColor: "bg-emerald-500/10",
    badgeText: "Payment Link",
  },
};

const defaultConfig = {
  icon: <MessageSquare className="size-4" />,
  color: "text-primary",
  borderColor: "border-border",
  bgColor: "bg-primary/10",
  badgeText: "Action Step",
};

function ActionNodeComponent({ id, data, selected }: NodeProps) {
  const nodeType = (data.nodeType as string) || "action";
  const config = nodeConfig[nodeType] || defaultConfig;
  const nodeDataConfig = (data.config as Record<string, any>) || {};

  const isIfElse = nodeType === "ifelse" || nodeType === "condition";

  return (
    <div
      className={`relative group rounded-2xl border bg-background/95 backdrop-blur-md p-3.5 min-w-[240px] shadow-sm transition-all duration-200 ${
        config.borderColor
      } ${selected ? "ring-2 ring-primary shadow-md" : "hover:border-primary/40 hover:shadow"}`}
    >
      {/* Target input handle (Left) */}
      <Handle
        type="target"
        id="input"
        position={Position.Left}
        className="!size-3.5 !bg-primary !border-2 !border-background shadow-xs hover:scale-125 transition-transform"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${config.bgColor} ${config.color} shrink-0`}>
            {config.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate text-foreground">{data.label as string}</p>
            <p className="text-[10px] text-muted-foreground">{config.badgeText}</p>
          </div>
        </div>
        <div className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0 mt-1" />
      </div>

      {/* Node Config Summary */}
      {isIfElse ? (
        <div className="mt-2.5 p-2 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] font-mono text-amber-700 dark:text-amber-300">
          Rule: {nodeDataConfig.fieldVariable || "intent"}{" "}
          {nodeDataConfig.operator === "CONTAINS" ? "contains" : "=="}{" "}
          <span className="font-bold">'{nodeDataConfig.compareValue || "ORDER"}'</span>
        </div>
      ) : nodeType === "email" ? (
        <div className="mt-2 text-[11px] text-muted-foreground truncate">
          Template: <span className="font-semibold text-foreground">{nodeDataConfig.emailTemplate || "Order Confirmation"}</span>
        </div>
      ) : (
        nodeDataConfig.message && (
          <div className="mt-2 text-[11px] text-muted-foreground line-clamp-1 bg-muted/30 p-1.5 rounded-lg border">
            "{nodeDataConfig.message}"
          </div>
        )
      )}

      {/* Handles on Right */}
      {isIfElse ? (
        <div className="mt-3 flex flex-col gap-2 pt-2 border-t text-[10px] font-medium">
          {/* True Branch Handle */}
          <div className="relative flex items-center justify-end gap-1 text-emerald-600 font-bold">
            <CheckCircle2 className="size-3" /> True Branch
            <Handle
              type="source"
              id="true"
              position={Position.Right}
              className="!size-3.5 !bg-emerald-500 !border-2 !border-background shadow-xs hover:scale-125 transition-transform"
              style={{ top: "64%" }}
            />
          </div>

          {/* False Branch Handle */}
          <div className="relative flex items-center justify-end gap-1 text-rose-500 font-bold mt-1">
            <XCircle className="size-3" /> False Branch
            <Handle
              type="source"
              id="false"
              position={Position.Right}
              className="!size-3.5 !bg-rose-500 !border-2 !border-background shadow-xs hover:scale-125 transition-transform"
              style={{ top: "86%" }}
            />
          </div>
        </div>
      ) : (
        /* Standard Single Output Source Handle */
        <Handle
          type="source"
          id="output"
          position={Position.Right}
          className="!size-3.5 !bg-primary !border-2 !border-background shadow-xs hover:scale-125 transition-transform"
        />
      )}
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent);
