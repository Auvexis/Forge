import { Layout } from "lucide-react";

export const WorkspacesView = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground animate-in fade-in duration-500">
      <Layout size={64} strokeWidth={1} />
      <h2 className="text-2xl font-light tracking-wider">Workspaces</h2>
      <p className="text-sm opacity-50 italic">Project management and organization coming soon...</p>
    </div>
  );
};
