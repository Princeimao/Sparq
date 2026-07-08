"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
  Position,
} from "@xyflow/react";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TriggerNode } from "./nodes/TriggerNode";
import { ActionNode } from "./nodes/ActionNode";
import { AddNodeDrawer, type NodeType } from "./AddNodeDrawer";

interface WorkflowFlowEditorProps {
  workflow: {
    id: string;
    name: string;
    description?: string;
    steps: any[];
  };
  onBack: () => void;
  onSave: (steps: any[]) => Promise<void>;
}

const nodeTypes = {
  triggerNode: TriggerNode,
  actionNode: ActionNode,
};

function buildNodesAndEdges(steps: any[]) {
  // If the saved steps are in the new layout format:
  if (steps && steps.length > 0 && steps[0]._type === "react_flow_state") {
    const state = steps[0];
    if (state.nodes && state.nodes.length > 0) {
      return { nodes: state.nodes, edges: state.edges || [] };
    }
  }

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Always start with WhatsApp trigger node
  nodes.push({
    id: "trigger",
    type: "triggerNode",
    position: { x: 50, y: 250 },
    data: { label: "WhatsApp Trigger", nodeType: "whatsapp" },
    draggable: true,
  });

  let prevId = "trigger";
  let xPos = 400;

  if (steps && steps.length > 0) {
    steps.forEach((step, index) => {
      if (step._type === "react_flow_state") return;
      const nodeId = step.id || `step_${index}`;
      nodes.push({
        id: nodeId,
        type: "actionNode",
        position: { x: xPos, y: 250 },
        data: {
          label: step.label || step.type,
          nodeType: step.type,
          config: step.config,
        },
        draggable: true,
      });

      edges.push({
        id: `e-${prevId}-${nodeId}`,
        source: prevId,
        target: nodeId,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#94a3b8", strokeWidth: 2 },
      });

      prevId = nodeId;
      xPos += 300;
    });
  }

  return { nodes, edges };
}

export function WorkflowFlowEditor({
  workflow,
  onBack,
  onSave,
}: WorkflowFlowEditorProps) {
  const initial = useMemo(
    () => buildNodesAndEdges(workflow.steps || []),
    [workflow.steps],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#94a3b8", strokeWidth: 2 },
          },
          eds,
        ),
      ),
    [setEdges],
  );

  const handleAddNode = useCallback(
    (nodeType: NodeType) => {
      const nodeLabels: Record<string, string> = {
        email: "Send Email",
        sms: "Send SMS",
        whatsapp: "Send WhatsApp",
        ifelse: "If / Else",
        payment: "Payment",
      };

      const newNodeId = `step_${Date.now()}`;

      // Calculate a good position for the new node (center of view)
      // Since we don't have access to react flow instance here easily without useReactFlow,
      // we'll just place it at a default offset from the last node or center
      const lastNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;
      const newX = lastNode ? lastNode.position.x + 300 : 400;
      const newY = lastNode ? lastNode.position.y : 250;

      setNodes((nds) => {
        return [
          ...nds,
          {
            id: newNodeId,
            type: "actionNode",
            position: { x: newX, y: newY },
            data: {
              label: nodeLabels[nodeType] || nodeType,
              nodeType: nodeType,
            },
            draggable: true,
          },
        ];
      });

      setDrawerOpen(false);
    },
    [nodes, setNodes],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      // Wrap state in an object matching the z.array(z.record()) schema
      const steps = [
        {
          _type: "react_flow_state",
          nodes: nodes,
          edges: edges,
        },
      ];
      await onSave(steps);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-sm font-semibold">{workflow.name}</h2>
            <p className="text-xs text-muted-foreground">
              {workflow.description || "Edit your workflow"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setDrawerOpen(true)}>
            Add Node
          </Button>
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <span className="size-4 mr-1.5 animate-spin border-2 border-current border-t-transparent rounded-full inline-block" />
            ) : (
              <Save className="size-4 mr-1.5" />
            )}
            Save Flow
          </Button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          className="bg-muted/30"
        >
          <Background color="#e2e8f0" gap={20} size={1} />
          <Controls className="[&>button]:bg-background [&>button]:border-border [&>button]:text-foreground" />
        </ReactFlow>
      </div>

      {/* Add Node Drawer */}
      <AddNodeDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSelect={handleAddNode}
      />
    </div>
  );
}
