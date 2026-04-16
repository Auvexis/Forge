import { memo } from "react";
import { Panel } from "@xyflow/react";
import { Play, Plus, Download, Save, Loader2, Square } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

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
        <div className="flex items-center gap-1.5 bg-card/90 backdrop-blur-md border border-border rounded-lg px-3 py-2 shadow-2xl">
          {/* ── Run / Stop ── */}
          {isStreaming ? (
            <Button
              size="sm"
              onClick={onStop}
              className={cn(
                "h-7 px-3 gap-1.5 text-xs font-semibold rounded-md",
                "bg-red-600 hover:bg-red-500 text-white border-0",
              )}
            >
              <Square className="w-3 h-3 fill-current" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onRun}
              disabled={isExecuting}
              className={cn(
                "h-7 px-3 gap-1.5 text-xs font-semibold rounded-md",
                "bg-emerald-600 hover:bg-emerald-500 text-white border-0",
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

          <div className="h-4 w-px bg-border" />

          {/* ── Add Node ── */}
          <Button
            size="sm"
            onClick={onAddNode}
            disabled={isStreaming}
            className={cn(
              "h-7 px-3 gap-1.5 text-xs font-semibold rounded-md",
              "bg-blue-600 hover:bg-blue-500 text-white border-0",
              isStreaming && "opacity-60 cursor-not-allowed",
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Node
          </Button>

          {/* ── Import ── */}
          <Button
            size="sm"
            onClick={onImport}
            disabled={isStreaming}
            className={cn(
              "h-7 px-3 gap-1.5 text-xs font-semibold rounded-md",
              "bg-amber-600 hover:bg-amber-500 text-white border-0",
              isStreaming && "opacity-60 cursor-not-allowed",
            )}
          >
            <Download className="w-3.5 h-3.5" />
            Import
          </Button>

          <div className="h-4 w-px bg-border" />

          {/* ── Save ── */}
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving || !isDirty || isStreaming}
            className={cn(
              "h-7 px-3 gap-1.5 text-xs font-semibold rounded-md",
              "bg-violet-600 hover:bg-violet-500 text-white border-0",
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
        </div>
      </Panel>
    );
  },
);

WFEditorFloatingDock.displayName = "WFEditorFloatingDock";
