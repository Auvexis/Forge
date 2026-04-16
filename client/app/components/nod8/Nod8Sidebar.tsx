import { Workflow, Compass, Settings } from "lucide-react";
import { useNod8, GlobalViews } from "~/providers/Nod8Provider";
import { Button } from "~/components/ui/button";
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

export const Nod8Sidebar = () => {
  const { view, setView, activeSubSidebar, setActiveSubSidebar } = useNod8();

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
    <div className="flex-none w-12 h-full flex flex-col bg-nod8-sidebar-rail-bg border-r border-nod8-sidebar-rail-border">
      {/* Branding */}
      <div className="h-12 flex items-center justify-center border-b border-nod8-sidebar-rail-header-border shrink-0">
        <img
          src="logo_icon_transparent.svg"
          alt="nod8 Logo"
          className="w-7 h-7 object-contain"
        />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col items-center py-2 gap-0.5 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.view === view ||
            (item.subSidebar && activeSubSidebar === item.subSidebar);

          return (
            <Button
              key={item.id}
              variant="ghost"
              size="icon"
              title={item.label}
              onClick={() => handleNavClick(item)}
              className={cn(
                "relative w-10 h-9 rounded-md transition-colors",
                isActive
                  ? "bg-nod8-sidebar-rail-item-active-bg text-nod8-sidebar-rail-item-active-text"
                  : "text-nod8-sidebar-rail-item-inactive-text hover:bg-nod8-sidebar-rail-item-hover-bg hover:text-nod8-sidebar-rail-item-hover-text",
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-nod8-sidebar-rail-active-indicator rounded-r-full" />
              )}
              <Icon className="w-4 h-4" />
            </Button>
          );
        })}
      </nav>

      {/* Settings pinned to bottom */}
      <div className="flex flex-col items-center py-2 border-t border-nod8-sidebar-rail-footer-border shrink-0">
        <Button
          variant="ghost"
          size="icon"
          title="Settings"
          className="w-10 h-9 rounded-md text-nod8-sidebar-rail-item-inactive-text hover:bg-nod8-sidebar-rail-item-hover-bg hover:text-nod8-sidebar-rail-item-hover-text transition-colors"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
