import { useEffect, useState } from "react";
import {
  Search,
  Workflow,
  LayoutGrid,
  Layers,
  Share2,
  Plus,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Nod8Dock, type DockSection } from "~/shared/components/Nod8Dock";
import { API_BASE_URL } from "~/shared/constants";
import { cn } from "~/lib/utils";

// ── Last-execution info ──────────────────────────────────────────────────────

interface LastRun {
  status: string;
  start_time: number;
}

function useLastRun(workflowId: string | null) {
  const [lastRun, setLastRun] = useState<LastRun | null>(null);

  useEffect(() => {
    if (!workflowId) {
      setLastRun(null);
      return;
    }
    fetch(`${API_BASE_URL}/workflows/${workflowId}/executions`)
      .then((r) => r.json())
      .then((res) => {
        const executions = res?.data;
        if (Array.isArray(executions) && executions.length > 0) {
          setLastRun({
            status: executions[0].status,
            start_time: executions[0].start_time,
          });
        } else {
          setLastRun(null);
        }
      })
      .catch(() => setLastRun(null));
  }, [workflowId]);

  return lastRun;
}

function getRelativeTime(ms: number) {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "Just now";
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  onImport: () => void;
  onCreate: () => void;
  onRefresh: () => void;
  moduleCount: number;
  isCreating: boolean;
  /** Currently selected workflow id — used to fetch last run info */
  selectedWorkflowId?: string | null;
  /** Custom Brand Badge (fully overrides the default static one) */
  brandBadgeOverride?: React.ReactNode;
}

// ── Component ────────────────────────────────────────────────────────────────

export const WorkflowDashboardDock = ({
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  onImport,
  onCreate,
  onRefresh,
  moduleCount,
  isCreating,
  selectedWorkflowId,
  brandBadgeOverride,
}: Props) => {
  const lastRun = useLastRun(selectedWorkflowId ?? null);

  const trailing = (
    <div className="flex items-center gap-2">
      {/* Last run badge */}
      {lastRun && (
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium",
            lastRun.status === "SUCCESS"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : lastRun.status === "RUNNING"
                ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                : "bg-red-500/10 border-red-500/20 text-red-500",
          )}
          title="Last execution result"
        >
          {lastRun.status === "SUCCESS" ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : lastRun.status === "RUNNING" ? (
            <Activity className="w-3 h-3 animate-pulse" />
          ) : (
            <XCircle className="w-3 h-3" />
          )}
          <Clock className="w-3 h-3 opacity-70" />
          {getRelativeTime(lastRun.start_time)}
        </div>
      )}

      <div className="h-4 w-px bg-border" />

      {/* Refresh */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        title="Refresh workflows"
        className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </Button>

      {/* Import */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onImport}
        title="Import workflow"
        className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Share2 className="w-3.5 h-3.5" />
      </Button>

      <div className="h-4 w-px bg-border" />

      {/* New Workflow CTA */}
      <Button
        onClick={onCreate}
        disabled={isCreating}
        size="sm"
        className="h-7 px-3 text-xs font-medium gap-1.5 rounded-md"
      >
        {isCreating ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Plus className="w-3 h-3" />
        )}
        New Workflow
      </Button>
    </div>
  );

  return (
    <Nod8Dock
      icon={Workflow}
      title="Workflows"
      subtitle={`${moduleCount} ${moduleCount === 1 ? "workflow" : "workflows"}`}
      accent="primary"
      variant="workflows"
      statusDot={{ color: "bg-nod8-dock-status-dot-primary", animate: false }}
      sections={[]}
      trailing={trailing}
      brandBadgeOverride={brandBadgeOverride}
    />
  );
};
