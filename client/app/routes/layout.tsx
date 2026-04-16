import { Outlet } from "react-router";
import { Nod8Provider } from "~/providers/Nod8Provider";
import { Nod8Sidebar } from "~/components/nod8/Nod8Sidebar";
import { Nod8ColorsHeader } from "~/components/nod8/Nod8ColorsHeader";

/**
 * Shared layout for all nod8 routes.
 * Renders the sidebar rail + color-theme header + the matched child route.
 */
export default function Nod8Layout() {
  return (
    <main className="w-screen h-screen">
      <Nod8Provider>
        <div className="w-full h-full flex flex-col">
          <Nod8ColorsHeader />
          <div className="w-full flex-1 flex overflow-hidden">
            <Nod8Sidebar />
            <div className="flex-1 h-full overflow-hidden">
              <Outlet />
            </div>
          </div>
        </div>
      </Nod8Provider>
    </main>
  );
}
