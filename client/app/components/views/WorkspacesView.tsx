import { useForge } from "~/providers/ForgeProvider";
import { useGetWorkflows } from "~/modules/forge/workflows/hooks/useGetWorkflows";
import { WorkflowEditor } from "~/modules/forge/workflows/components/WorkflowEditor";
import { useEffect } from "react";
import { Layers } from "lucide-react";

export const WorkflowsView = () => {
  const { selectedWorkflowId, setSelectedWorkflowId } = useForge();
  const { workflows, getWorkflows } = useGetWorkflows();

  useEffect(() => {
    getWorkflows();
  }, []);

  const workflowToEdit = workflows.find((w) => w.metadata.id === selectedWorkflowId);

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in duration-500 overflow-hidden">
      {workflowToEdit ? (
        <WorkflowEditor
          workflow={workflowToEdit}
          onClose={() => setSelectedWorkflowId(null)}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 opacity-20">
          <div className="w-24 h-24 rounded-[3rem] bg-foreground/5 border border-foreground/10 flex items-center justify-center shadow-inner">
             <Layers className="w-10 h-10 text-foreground" />
          </div>
          <div className="flex flex-col items-center gap-1">
             <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-foreground">Orchestrator Idle</h2>
             <p className="text-micro font-bold uppercase tracking-widest text-foreground/50">Select a deployment from the sidebar to begin</p>
          </div>
        </div>
      )}
    </div>
  );
};
