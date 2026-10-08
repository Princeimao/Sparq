"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function TriggerNodeComponent({ data, selected }: NodeProps) {
  return (
    <div
      className={`relative rounded-2xl border border-emerald-500/30 bg-background/95 backdrop-blur-md p-3.5 min-w-[220px] shadow-sm transition-all duration-200 ${
        selected ? "ring-2 ring-emerald-500 shadow-md" : "hover:border-emerald-500 hover:shadow"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
          <MessageSquare className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[9px] px-1.5 py-0">
              TRIGGER
            </Badge>
          </div>
          <p className="text-xs font-bold text-foreground mt-0.5 truncate">
            {(data.label as string) || "WhatsApp Inbound"}
          </p>
        </div>
      </div>

      <Handle
        type="source"
        id="output"
        position={Position.Right}
        className="!size-3.5 !bg-emerald-500 !border-2 !border-background shadow-xs hover:scale-125 transition-transform"
      />
    </div>
  );
}

export const TriggerNode = memo(TriggerNodeComponent);
