import type { Route } from "./+types/explorer";
import { ExplorerView } from "~/components/views/ExplorerView";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Explorer - nod8" },
    {
      name: "description",
      content:
        "Browse and manage your plugins and integrations in the nod8 explorer.",
    },
  ];
}

export default function ExplorerRoute() {
  return <ExplorerView />;
}
