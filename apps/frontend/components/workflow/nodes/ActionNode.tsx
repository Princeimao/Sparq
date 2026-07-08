"use client";

import React, { memo } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import {
  Mail,
  MessageSquare,
  CreditCard,
  GitBranch,
  Smartphone,
  Calendar,
} from "lucide-react";

const nodeConfig: Record<
  string,
  {
    icon: React.ReactNode;
    color: string;
    borderColor: string;
    bgColor: string;
  }
> = {
  email: {
    icon: <Mail className="size-5" />,
    color: "text-blue-600",
    borderColor: "border-blue-500/40",
    bgColor: "bg-blue-500/10",
  },
  send_message: {
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    color: "text-green-600",
    borderColor: "border-green-500/40",
    bgColor: "bg-green-500/10",
  },
  sms: {
    icon: <Smartphone className="size-5" />,
    color: "text-purple-600",
    borderColor: "border-purple-500/40",
    bgColor: "bg-purple-500/10",
  },
  whatsapp: {
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    color: "text-green-600",
    borderColor: "border-green-500/40",
    bgColor: "bg-green-500/10",
  },
  ifelse: {
    icon: <GitBranch className="size-5" />,
    color: "text-amber-600",
    borderColor: "border-amber-500/40",
    bgColor: "bg-amber-500/10",
  },
  condition: {
    icon: <GitBranch className="size-5" />,
    color: "text-amber-600",
    borderColor: "border-amber-500/40",
    bgColor: "bg-amber-500/10",
  },
  payment: {
    icon: <CreditCard className="size-5" />,
    color: "text-emerald-600",
    borderColor: "border-emerald-500/40",
    bgColor: "bg-emerald-500/10",
  },
  generate_payment_link: {
    icon: <CreditCard className="size-5" />,
    color: "text-emerald-600",
    borderColor: "border-emerald-500/40",
    bgColor: "bg-emerald-500/10",
  },
  stripe: {
    icon: <CreditCard className="size-5" />,
    color: "text-blue-500",
    borderColor: "border-blue-500/40",
    bgColor: "bg-blue-500/10",
  },
  razorpay: {
    icon: <CreditCard className="size-5" />,
    color: "text-blue-700",
    borderColor: "border-blue-700/40",
    bgColor: "bg-blue-700/10",
  },
  caldotcom: {
    icon: <Calendar className="size-5" />,
    color: "text-zinc-200",
    borderColor: "border-zinc-500/40",
    bgColor: "bg-zinc-500/10",
  },
  googlecalendar: {
    icon: <Calendar className="size-5" />,
    color: "text-blue-500",
    borderColor: "border-blue-500/40",
    bgColor: "bg-blue-500/10",
  },
};

const defaultConfig = {
  icon: <MessageSquare className="size-5" />,
  color: "text-zinc-400",
  borderColor: "border-zinc-600/40",
  bgColor: "bg-zinc-600/10",
};

function ActionNodeComponent({ id, data }: NodeProps) {
  const config = nodeConfig[data.nodeType as string] || defaultConfig;
  const { setNodes } = useReactFlow();

  const updateConfig = (key: string, value: string) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          const prevConfig = (n.data.config as Record<string, any>) || {};
          return {
            ...n,
            data: {
              ...n.data,
              config: { ...prevConfig, [key]: value },
            },
          };
        }
        return n;
      })
    );
  };

  const nodeDataConfig = (data.config as Record<string, any>) || {};

  return (
    <div className="relative group">
      {/* 3 Target Handles on Left */}
      <Handle
        type="target"
        id="target-1"
        position={Position.Left}
        className="!size-2.5 !bg-zinc-700 !border-[1.5px] !border-zinc-900"
        style={{ top: '25%' }}
      />
      <Handle
        type="target"
        id="target-2"
        position={Position.Left}
        className="!size-2.5 !bg-zinc-700 !border-[1.5px] !border-zinc-900"
        style={{ top: '50%' }}
      />
      <Handle
        type="target"
        id="target-3"
        position={Position.Left}
        className="!size-2.5 !bg-zinc-700 !border-[1.5px] !border-zinc-900"
        style={{ top: '75%' }}
      />

      <div
        className={`flex flex-col gap-2 p-3 rounded-xl bg-zinc-900 border ${config.borderColor} shadow-[0_0_15px_rgba(0,0,0,0.5)] min-w-[200px] transition-all duration-200 hover:shadow-lg hover:border-zinc-600`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center size-10 rounded-xl ${config.bgColor} ${config.color}`}
          >
            {config.icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">
              {data.label as string}
            </p>
          </div>
        </div>

        {/* WhatsApp specific options */}
        {data.nodeType === "whatsapp" && (
          <div className="mt-2 text-xs flex flex-col gap-2 text-zinc-300">
            <select
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-1"
              value={nodeDataConfig.actionType || "receipt"}
              onChange={(e) => updateConfig("actionType", e.target.value)}
            >
              <option value="receipt">Send Receipt</option>
              <option value="custom">Custom Message</option>
            </select>
            {nodeDataConfig.actionType === "custom" && (
              <textarea
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-1 resize-none"
                placeholder="Type your message..."
                rows={2}
                value={nodeDataConfig.message || ""}
                onChange={(e) => updateConfig("message", e.target.value)}
              />
            )}
          </div>
        )}

        {/* If/Else specific options */}
        {data.nodeType === "ifelse" && (
          <div className="mt-2 text-xs flex flex-col gap-2 text-zinc-300">
            <input
              type="text"
              className="w-full bg-zinc-800 border border-zinc-700 rounded p-1"
              placeholder="e.g. status == 'paid'"
              value={nodeDataConfig.condition || ""}
              onChange={(e) => updateConfig("condition", e.target.value)}
            />
          </div>
        )}
      </div>

      {/* 3 Source Handles on Right */}
      <Handle
        type="source"
        id="source-1"
        position={Position.Right}
        className="!size-2.5 !bg-zinc-700 !border-[1.5px] !border-zinc-900"
        style={{ top: '25%' }}
      />
      <Handle
        type="source"
        id="source-2"
        position={Position.Right}
        className="!size-2.5 !bg-zinc-700 !border-[1.5px] !border-zinc-900"
        style={{ top: '50%' }}
      />
      <Handle
        type="source"
        id="source-3"
        position={Position.Right}
        className="!size-2.5 !bg-zinc-700 !border-[1.5px] !border-zinc-900"
        style={{ top: '75%' }}
      />
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent);
