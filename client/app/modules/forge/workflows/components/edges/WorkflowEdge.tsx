import { memo } from "react";
import { type EdgeProps, useReactFlow } from "@xyflow/react";
import { Trash2 } from "lucide-react";

import { ButtonEdge } from "~/components/button-edge";
import { Button } from "~/components/ui/button";

/**
 * WorkflowEdge — a bezier edge that shows a trash icon button when selected.
 * Built on top of the official ButtonEdge from ui.reactflow.dev.
 */
export const WorkflowEdge = memo((props: EdgeProps) => {
  const { setEdges } = useReactFlow();

  const onDelete = () => {
    setEdges((edges) => edges.filter((e) => e.id !== props.id));
  };

  return (
    <ButtonEdge
      {...props}
      style={{
        ...props.style,
        stroke: props.selected
          ? "var(--forge-rf-edge-stroke-selected)"
          : "var(--forge-rf-edge-stroke)",
        strokeWidth: 2,
      }}
    >
      {props.selected && (
        <Button
          variant="outline"
          size="icon"
          className="nodrag nopan h-7 w-7 rounded-lg border-destructive/40 bg-background hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all"
          onClick={onDelete}
          aria-label="Delete edge"
          title="Delete edge"
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </ButtonEdge>
  );
});

WorkflowEdge.displayName = "WorkflowEdge";
