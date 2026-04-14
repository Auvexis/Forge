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
  Zap,
  Clock,
  Layers,
  Variable,
  Hash,
  Globe,
  Lock,
} from "lucide-react";
import type { WorkflowItem } from "../types/workflow-types";

function getRelativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

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
  const nodeCount = Object.keys(workflow.nodes || {}).length;
  const variableCount = workflow.variables?.length || 0;
  const edgeCount = workflow.edges?.length || 0;

  // Trigger metadata
  const TriggerIcon = {
    manual: Play,
    webhook: Zap,
    cron: Clock,
    event: Activity,
  }[workflow.trigger?.type] || Zap;

  const triggerLabel = {
    manual: "Manual Execute",
    webhook: "HTTP Webhook",
    cron: "Scheduled (Cron)",
    event: "Event Driven",
  }[workflow.trigger?.type] || "Custom Trigger";

  return (
    <div
      onClick={onEdit}
      className="group relative flex flex-col bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-7 cursor-pointer hover:bg-card/70 transition-all duration-500 hover:border-primary/40 shadow-sm hover:shadow-2xl hover:shadow-primary/2 group/card transform-gpu hover:-translate-y-0.5"
    >
      {/* ── Top Meta ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${
              workflow.metadata.isActive 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                : "bg-amber-500/10 border-amber-500/20 text-amber-500"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                workflow.metadata.isActive 
                  ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" 
                  : "bg-amber-500"
              }`}
            />
            <span className="text-nano font-black uppercase tracking-widest leading-none">
              {workflow.metadata.isActive ? "Live" : "Draft"}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/40 bg-muted/5 text-muted-foreground/60">
            {workflow.metadata.public ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
            <span className="text-nano font-black uppercase tracking-widest leading-none">
              {workflow.metadata.public ? "Public" : "Private"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-nano font-mono font-bold text-muted-foreground/30 uppercase tracking-tighter group-hover/card:text-muted-foreground/60 transition-colors">
            v{workflow.metadata.version}
          </span>
          <span className="text-nano font-mono font-bold text-primary/40 uppercase tracking-tighter">
            #{workflow.metadata.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex items-start gap-5 mb-8">
        <div
          className={`w-14 h-14 rounded-3xl bg-primary/5 flex items-center justify-center shrink-0 border border-border/50 transition-all duration-500 group-hover/card:border-primary/30 group-hover/card:bg-primary/10 ${
            isExecuting ? "animate-pulse border-amber-500/50 bg-amber-500/5" : ""
          }`}
        >
          <TriggerIcon
            className={`w-6 h-6 transition-all duration-500 ${
              isExecuting ? "text-amber-500 scale-110" : "text-primary opacity-80 group-hover/card:opacity-100 group-hover/card:scale-110"
            }`}
          />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-black text-foreground truncate group-hover/card:text-primary transition-colors">
              {workflow.metadata.name}
            </h3>
          </div>
          <p className="text-tiny font-medium text-muted-foreground/60 line-clamp-2 leading-relaxed group-hover/card:text-muted-foreground/80 transition-colors">
            {workflow.metadata.description || "Synthesizing automated intelligence with modular logic blocks."}
          </p>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-3 gap-2 mb-8">
        <div className="flex flex-col gap-1 p-3 rounded-2xl bg-muted/5 border border-border/20 group-hover/card:bg-muted/10 transition-colors">
          <div className="flex items-center gap-1.5 text-muted-foreground/40 mb-1">
            <Layers className="w-3 h-3" />
            <span className="text-nano font-black uppercase tracking-tighter">Nodes</span>
          </div>
          <span className="text-mini font-black text-foreground">{nodeCount}</span>
        </div>
        <div className="flex flex-col gap-1 p-3 rounded-2xl bg-muted/5 border border-border/20 group-hover/card:bg-muted/10 transition-colors">
          <div className="flex items-center gap-1.5 text-muted-foreground/40 mb-1">
            <Variable className="w-3 h-3" />
            <span className="text-nano font-black uppercase tracking-tighter">Vars</span>
          </div>
          <span className="text-mini font-black text-foreground">{variableCount}</span>
        </div>
        <div className="flex flex-col gap-1 p-3 rounded-2xl bg-muted/5 border border-border/20 group-hover/card:bg-muted/10 transition-colors">
          <div className="flex items-center gap-1.5 text-muted-foreground/40 mb-1">
            <Hash className="w-3 h-3" />
            <span className="text-nano font-black uppercase tracking-tighter">Edges</span>
          </div>
          <span className="text-mini font-black text-foreground">{edgeCount}</span>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-auto pt-6 border-t border-border/20 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-nano font-black uppercase tracking-widest text-muted-foreground/30">Last Modified</span>
          <span className="text-nano font-bold text-muted-foreground/60">
            {workflow.metadata.updatedAt 
              ? getRelativeTime(new Date(workflow.metadata.updatedAt))
              : getRelativeTime(new Date(workflow.metadata.createdAt))}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onLogs();
            }}
            className="h-8 px-4 rounded-full bg-primary/5 text-micro font-black uppercase tracking-widest gap-2 hover:bg-primary/20 hover:text-primary transition-all border border-transparent hover:border-primary/20"
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
            className={`h-8 px-4 rounded-full text-micro! font-black uppercase tracking-widest gap-2 transition-all border ${
              isExecuting
                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                : "bg-primary/10 text-primary border-primary/10 hover:bg-primary/20 hover:border-primary/30"
            }`}
          >
            {isExecuting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            {isExecuting ? "Executing" : "Run"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-accent text-muted-foreground/60 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass rounded-2xl border-border/50 min-w-[200px] p-2 shadow-2xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 mb-1 border-b border-border/20">
                <span className="text-nano font-black uppercase tracking-widest text-muted-foreground/40">General Actions</span>
              </div>
              <DropdownMenuItem
                className="gap-3 py-2.5 px-3 focus:bg-accent rounded-xl mb-1 cursor-pointer transition-colors"
                onClick={() => onEdit()}
              >
                <Edit2 className="w-4 h-4 text-primary" />
                <span className="text-tiny font-bold">Configure Engine</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-3 py-2.5 px-3 focus:bg-accent rounded-xl mb-1 cursor-pointer transition-colors"
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
                <span className="text-tiny font-bold">Export Blueprint</span>
              </DropdownMenuItem>
              <div className="h-px bg-border/20 my-1 mx-2" />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:bg-destructive/10 gap-3 py-2.5 px-3 rounded-xl cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-tiny font-bold">Purge Identity</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
});
