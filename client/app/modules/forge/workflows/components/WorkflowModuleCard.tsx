import { memo, type FC } from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Play,
  Trash2,
  Edit2,
  Loader2,
  Calendar,
  Activity,
  Download,
} from "lucide-react";
import type { WorkflowItem } from "../types/workflow-types";

interface Props {
  workflow: WorkflowItem;
  isExecuting: boolean;
  onEdit: () => void;
  onRun: () => void;
  onLogs: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export const WorkflowModuleCard: FC<Props> = memo(({
  workflow,
  isExecuting,
  onEdit,
  onRun,
  onLogs,
  onDelete,
}) => {
  return (
    <div
      onClick={onEdit}
      className="group relative flex flex-col bg-card/60 border border-border/90 rounded-[2rem] p-6 cursor-pointer hover:bg-card/80 transition-all duration-300 hover:border-primary/40"
    >
      {/* Header metadata */}
      <div className="flex items-center justify-between mb-6">
        <div
          className={`flex items-center gap-2 px-2.5 py-1 rounded-full border ${workflow.metadata.isActive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-muted/10 border-border/50 text-muted-foreground"}`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${workflow.metadata.isActive ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-muted-foreground/50"}`}
          />
          <span className="text-micro font-black uppercase tracking-widest leading-none">
            {workflow.metadata.isActive ? "Live" : "Draft"}
          </span>
        </div>
        <span className="text-tiny font-mono font-bold text-muted-foreground opacity-40 uppercase tracking-tighter">
          #{workflow.metadata.id.slice(-6)}
        </span>
      </div>

      <div className="flex items-start gap-4 mb-8">
        <div
          className={`w-12 h-12 rounded-2xl bg-accent/30 flex items-center justify-center shrink-0 border border-border/80 transition-colors ${isExecuting ? "animate-pulse border-amber-500/50" : ""}`}
        >
          <Activity
            className={`w-5 h-5 transition-colors ${
              isExecuting ? "text-amber-500" : "text-primary"
            }`}
          />
        </div>
        <div className="flex flex-col min-w-0">
          <h3 className="text-[15px] font-black text-foreground truncate mb-1">
            {workflow.metadata.name}
          </h3>
          <p className="text-tiny font-medium text-muted-foreground line-clamp-2 leading-relaxed opacity-70">
            {workflow.metadata.description || "No description provided."}
          </p>
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/20">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onLogs();
            }}
            className="h-8 px-3 rounded-xl bg-accent/30 text-micro font-black uppercase tracking-widest gap-2 hover:bg-primary/10 hover:text-primary transition-all"
          >
            <Calendar className="w-3 h-3" />
            Logs
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isExecuting}
            onClick={(e) => {
              e.stopPropagation();
              onRun();
            }}
            className={`h-8 px-3 rounded-xl text-micro font-black uppercase tracking-widest gap-2 transition-all ${
              isExecuting
                ? "bg-amber-500/10 text-amber-500"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
          >
            {isExecuting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            {isExecuting ? "Running" : "Run"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl hover:bg-accent text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass rounded-2xl border-border/50 min-w-[180px] p-1.5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                className="gap-3 py-2.5 px-3 focus:bg-accent rounded-xl mb-1 cursor-pointer"
                onClick={() => onEdit()}
              >
                <Edit2 className="w-4 h-4 text-primary" />
                <span className="text-tiny font-bold">Configure Logic</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-3 py-2.5 px-3 focus:bg-accent rounded-xl mb-1 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  const blob = new Blob(
                    [JSON.stringify(workflow, null, 2)],
                    { type: "application/json" },
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${workflow.metadata.name.replace(/\s+/g, "_").toLowerCase()}_v${workflow.metadata.version}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="w-4 h-4 text-primary" />
                <span className="text-tiny font-bold">Export Module</span>
              </DropdownMenuItem>
              <div className="h-px bg-border/40 my-1 mx-2" />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:bg-destructive/10 gap-3 py-2.5 px-3 rounded-xl cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-tiny font-bold">Purge Module</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
});
