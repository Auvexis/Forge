import {
  LayoutDashboard,
  Workflow,
} from "lucide-react";
import { useRef, useState } from "react";
import { useForge, GlobalViews } from "~/providers/ForgeProvider";

const exampleItems = [
  {
    id: GlobalViews.EXPLORER,
    name: "Explorer",
    icon: <LayoutDashboard />,
  },
  {
    id: GlobalViews.WORKSPACES,
    name: "Workspaces",
    icon: <Workflow />,
  },
];

export const ForgeSidebar = () => {
  const { view, setView } = useForge();
  const [collapsed, setCollapsed] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return (
    <div
      className="h-full fixed top-0 left-0 flex items-center z-50"
      onMouseEnter={() => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        setCollapsed(false);
      }}
      onMouseLeave={() => {
        timeoutRef.current = setTimeout(() => {
          setCollapsed(true);
          setIsSidebarOpen(false);
        }, 5000);
      }}
    >
      <div className="bg-muted/20 w-3 h-full" />

      <div
        className={`
          max-h-[500px] overflow-hidden
          transition-[width,transform,opacity] duration-300 ease-in-out
          translate-x-5
          ${
            collapsed
              ? "w-0 opacity-0"
              : isSidebarOpen
                ? "w-56 opacity-100"
                : "w-16 opacity-100"
          }
          bg-sidebar/70 rounded-md border-2 border-sidebar-border
        `}
      >
        <div
          className={`w-full max-h-[500px] flex flex-col overflow-hidden ${isSidebarOpen ? "overflow-y-auto" : "overflow-y-hidden"}`}
          onMouseEnter={() => setIsSidebarOpen(true)}
          onMouseLeave={() => setIsSidebarOpen(false)}
        >
          {exampleItems.map((item) => (
            <div
              key={item.id}
              className={`
                flex items-center justify-start gap-3
                px-4 py-3
                hover:bg-sidebar-accent cursor-pointer
                transition-colors
                ${view === item.id ? "bg-sidebar-accent" : ""}
              `}
              onClick={() => {
                if (
                  Object.values(GlobalViews).includes(item.id as GlobalViews)
                ) {
                  setView(item.id as GlobalViews);
                }
              }}
            >
              <div
                className={`
                  flex items-center gap-3
                  transition-all duration-300 ease-in-out
                  translate-x-1
                `}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {item.icon}
                </div>

                <span
                  className={`
                    whitespace-nowrap text-sm
                    transition-all duration-200
                    ${isSidebarOpen ? "opacity-100 -translate-x-1" : "opacity-0 -translate-x-4"}
                  `}
                >
                  {item.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
