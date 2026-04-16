import { memo } from "react";
import { Panel } from "@xyflow/react";
import { Play, Plus, Download, Save, Loader2, Square } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { ZoomSlider } from "~/components/zoom-slider";

interface WFEditorFloatingDockProps {
  /** Called when the user clicks Run */
  onRun: () => void;
  /** Called when the user clicks Stop (only shown while streaming) */
  onStop: () => void;
  /** Called when the user clicks Add Node */
  onAddNode: () => void;
  /** Called when the user clicks Import */
  onImport: () => void;
  /** Called when the user clicks Save */
  onSave: () => void;
  /** Whether a save is in progress */
  isSaving: boolean;
  /** Whether the workflow has unsaved changes — Save is disabled when false */
  isDirty: boolean;
  /** Whether execution is being requested (spinner on Run) */
  isExecuting: boolean;
  /** Whether the SSE stream is active (Stop replaces Run) */
  isStreaming: boolean;
}

/**
 * A compact floating action bar rendered inside the React Flow canvas,
 * positioned below the ZoomSlider (bottom-center).
 *
 * Provides quick access to the four most common editor actions:
 *   Run / Stop · Add Node · Import · Save
 */
export const WFEditorFloatingDock = memo(
  ({
    onRun,
    onStop,
    onAddNode,
    onImport,
    onSave,
    isSaving,
    isDirty,
    isExecuting,
    isStreaming,
  }: WFEditorFloatingDockProps) => {
    return (
      <Panel
        position="bottom-center"
        // mb-14 keeps us below the ReactFlow ZoomSlider (~h-8 + gap)
        className="mb-14"
      >
        <div className="flex items-center gap-3 bg-card border border-border rounded-full px-3 py-1.5 shadow-2xl">
          {/* ── Run / Stop ── */}
          {isStreaming ? (
            <Button
              size="sm"
              variant={"destructive"}
              onClick={onStop}
              className={cn(
                "h-7 px-3 gap-1.5 text-xs font-semibold rounded-md",
              )}
            >
              <Square className="w-3 h-3 fill-current" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onRun}
              variant={"ghost"}
              disabled={isExecuting}
              className={cn(
                "h-7 px-3 gap-1.5 text-xs font-semibold rounded-md",
                "text-foreground",
                isExecuting && "opacity-60 cursor-not-allowed",
              )}
            >
              {isExecuting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3 fill-current" />
              )}
              Run
            </Button>
          )}

          {/* ── Add Node ── */}
          <Button
            size="sm"
            variant={"ghost"}
            onClick={onAddNode}
            disabled={isStreaming}
            className={cn(
              "h-7 px-3 gap-1.5 text-xs font-semibold rounded-md",
              "text-foreground",
              isStreaming && "opacity-60 cursor-not-allowed",
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Node
          </Button>

          {/* ── Import ── */}
          <Button
            size="sm"
            variant={"ghost"}
            onClick={onImport}
            disabled={isStreaming}
            className={cn(
              "h-7 px-3 gap-1.5 text-xs font-semibold rounded-md",
              "text-foreground",
              isStreaming && "opacity-60 cursor-not-allowed",
            )}
          >
            <Download className="w-3.5 h-3.5" />
            Import
          </Button>

          {/* ── Save ── */}
          <Button
            size="sm"
            variant={"ghost"}
            onClick={onSave}
            disabled={isSaving || !isDirty || isStreaming}
            className={cn(
              "h-7 px-3 gap-1.5 text-xs font-semibold rounded-md",
              "text-foreground",
              (isSaving || !isDirty || isStreaming) &&
                "opacity-60 cursor-not-allowed",
            )}
          >
            {isSaving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isSaving ? "Saving…" : "Save"}
          </Button>

          <div className="h-6 w-px bg-border" />

          <ZoomSlider className="relative! m-0! p-0! bg-transparent!" />
        </div>
      </Panel>
    );
  },
);

WFEditorFloatingDock.displayName = "WFEditorFloatingDock";
