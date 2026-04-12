import { WorkflowsList } from "~/modules/forge/workflows/components/WorkflowsList";

export const WorkflowsView = () => {
  return (
    <div
      className={`
        w-full h-full relative
        flex flex-col justify-center items-center
        animate-in fade-in duration-500
      `}
    >
      <WorkflowsList />
    </div>
  );
};
