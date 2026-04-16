import { Search, Compass, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Nod8Dock } from "~/shared/components/Nod8Dock";

interface Props {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  nodeCount: number;
}

export const ExplorerDashboardDock = ({
  searchQuery,
  setSearchQuery,
  onZoomIn,
  onZoomOut,
  onFitView,
  nodeCount,
}: Props) => {
  // Centered search bar
  const centerContent = (
    <div className="relative w-[220px]">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
      <input
        placeholder="Search plugins..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-8 h-7 w-full bg-accent border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring transition-colors"
      />
    </div>
  );

  // Navigation controls on the right
  const trailing = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomIn}
        title="Zoom in"
        className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomOut}
        title="Zoom out"
        className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onFitView}
        title="Fit view"
        className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );

  return (
    <Nod8Dock
      icon={Compass}
      title="Explorer"
      subtitle={`${nodeCount} ${nodeCount === 1 ? "Plugin" : "Plugins"}`}
      accent="primary"
      variant="explorer"
      statusDot={{ color: "bg-nod8-dock-status-dot-primary", animate: false }}
      sections={[]}
      centerContent={centerContent}
      trailing={trailing}
    />
  );
};
