"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Plus } from "lucide-react";

function AddNodeButtonComponent(_: NodeProps) {
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !bg-slate-400 !border-2 !border-background"
      />
      <div className="flex items-center justify-center size-10 rounded-full border-2 border-dashed border-muted-foreground/30 bg-background cursor-pointer transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:scale-110 hover:shadow-md active:scale-95">
        <Plus className="size-5 text-muted-foreground" />
      </div>
    </div>
  );
}

export const AddNodeButton = memo(AddNodeButtonComponent);
