import { Handle, Position } from "@xyflow/react";
import { type NodeProps, type Node } from "@xyflow/react";
import { Card, CardContent } from "~/components/ui/card";
import type { WorkflowTrigger } from "../../types/workflow-types";
import { Play, Webhook, Clock, Zap, Target } from "lucide-react";

export type TriggerNodeData = WorkflowTrigger & Record<string, unknown>;
export type TriggerNodeType = Node<TriggerNodeData, "trigger">;

export const TriggerNodeRenderer = ({ id, data }: NodeProps<TriggerNodeType>) => {
  const getTriggerDetails = () => {
    switch (data.type) {
      case "manual":
        return { 
          icon: Play, 
          title: "Manual Trigger", 
          color: "text-blue-500",
          bg: "bg-blue-500/10"
        };
      case "webhook":
        return { 
          icon: Webhook, 
          title: "Webhook", 
          color: "text-emerald-500",
          bg: "bg-emerald-500/10"
        };
      case "cron":
        return { 
          icon: Clock, 
          title: "Schedule / Cron", 
          color: "text-amber-500",
          bg: "bg-amber-500/10"
        };
      case "event":
        return { 
          icon: Zap, 
          title: "Event", 
          color: "text-purple-500", 
          bg: "bg-purple-500/10"
        };
      default:
        return { 
          icon: Target, 
          title: "Trigger", 
          color: "text-foreground",
          bg: "bg-accent"
        };
    }
  };

  const { icon: Icon, title, color, bg } = getTriggerDetails();

  return (
    <div className="group relative">
      {/* ID Badge */}
      <div className="absolute -top-3 left-4 z-20">
        <div className="bg-background/80 border border-border/50 text-muted-foreground text-[14px] font-black font-mono px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider">
          {id}
        </div>
      </div>

      <Card className="w-[300px] shadow-sm border-border bg-card transition-all hover:shadow-md hover:border-primary/30">
        <CardContent className="flex flex-col p-0 overflow-hidden rounded-lg">
          {/* Header */}
          <div className="flex items-center gap-3 p-3 bg-accent/30 border-b border-border/50">
            <div className={`flex items-center justify-center w-10 h-10 p-2 rounded-lg border border-border shrink-0 ${bg}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-bold truncate text-foreground">
                {title}
              </span>
              <span className="text-[10px] uppercase font-medium tracking-tight text-muted-foreground">
                Workflow Entry point
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-col p-3 bg-background/50">
            {data.type === "manual" && data.schema && Object.keys(data.schema).length > 0 ? (
              <div className="flex flex-col gap-1">
                 <span className="text-[10px] text-muted-foreground font-medium mb-1">EXPECTED INPUTS:</span>
                 <div className="flex flex-wrap gap-1">
                    {Object.keys(data.schema).map(key => (
                      <span key={key} className="text-[9px] px-1.5 py-0.5 bg-muted rounded border border-border/50">
                        {key}
                      </span>
                    ))}
                 </div>
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground leading-relaxed italic">
                {data.type === "manual" 
                  ? "Standard manual execution." 
                  : `Waiting for ${data.type} signal...`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Triggers only have source handles (outputs), no target handles (inputs) */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-primary border-2 border-background z-10"
      />
    </div>
  );
};
