import type { Route } from "./+types/workflows";
import { WorkflowsView } from "~/components/views/WorkflowsView";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Workflows - nod8" },
    {
      name: "description",
      content:
        "Design and automate workflows with the nod8 visual node-based editor.",
    },
  ];
}

export default function WorkflowsRoute() {
  return <WorkflowsView />;
}
