"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { CogNodeCard } from "./node-card";

const nodeTypes: NodeTypes = { cog: CogNodeCard };

export function FlowCanvas({
  nodes,
  edges,
  interactive = true,
}: {
  nodes: Node[];
  edges: Edge[];
  interactive?: boolean;
}) {
  const types = useMemo(() => nodeTypes, []);
  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={types}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={interactive}
        nodesConnectable={false}
        elementsSelectable={interactive}
        panOnDrag={interactive}
        zoomOnScroll={interactive}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--line)" />
        {interactive && <Controls showInteractive={false} />}
      </ReactFlow>
    </div>
  );
}
