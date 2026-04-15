import { Workflow, Anvil, Compass, Settings, Frame } from "lucide-react";
import { useForge, GlobalViews } from "~/providers/ForgeProvider";
import { cn } from "~/lib/utils";

interface NavItem {
  id: GlobalViews | string;
  icon: React.ElementType;
  label: string;
  view?: GlobalViews;
  subSidebar?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: GlobalViews.EXPLORER,
    icon: Compass,
    label: "Explorer",
    view: GlobalViews.EXPLORER,
  },
  {
    id: GlobalViews.WORKFLOWS,
    icon: Workflow,
    label: "Workflows",
    view: GlobalViews.WORKFLOWS,
    subSidebar: "workflows",
  },
];

export const ForgeSidebar = () => {
  const { view, setView, activeSubSidebar, setActiveSubSidebar } = useForge();

  const handleNavClick = (item: NavItem) => {
    if (item.view) setView(item.view);

    if (item.subSidebar) {
      // Toggle sub-sidebar on click
      if (activeSubSidebar === item.subSidebar) {
        setActiveSubSidebar(null);
      } else {
        setActiveSubSidebar(item.subSidebar);
      }
    } else {
      setActiveSubSidebar(null);
    }
  };

  return (
    <div className="flex-none w-12 h-full flex flex-col bg-forge-sidebar-rail-bg border-r border-forge-sidebar-rail-border">
      {/* Branding */}
      <div className="h-12 flex items-center justify-center border-b border-forge-sidebar-rail-header-border shrink-0">
        <Frame className="w-4 h-4 text-forge-sidebar-rail-brand-icon" />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col items-center py-2 gap-0.5 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.view === view ||
            (item.subSidebar && activeSubSidebar === item.subSidebar);

          return (
            <button
              key={item.id}
              title={item.label}
              onClick={() => handleNavClick(item)}
              className={cn(
                "relative w-10 h-9 flex items-center justify-center rounded-md transition-colors",
                isActive
                  ? "bg-forge-sidebar-rail-item-active-bg text-forge-sidebar-rail-item-active-text"
                  : "text-forge-sidebar-rail-item-inactive-text hover:bg-forge-sidebar-rail-item-hover-bg hover:text-forge-sidebar-rail-item-hover-text",
              )}
            >
              {/* Active left border */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-forge-sidebar-rail-active-indicator rounded-r-full" />
              )}
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </nav>

      {/* Settings pinned to bottom */}
      <div className="flex flex-col items-center py-2 border-t border-forge-sidebar-rail-footer-border shrink-0">
        <button
          title="Settings"
          className="w-10 h-9 flex items-center justify-center rounded-md text-forge-sidebar-rail-item-inactive-text hover:bg-forge-sidebar-rail-item-hover-bg hover:text-forge-sidebar-rail-item-hover-text transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
