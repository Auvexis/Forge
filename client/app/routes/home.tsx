import type { Route } from "./+types/home";
import { GlobalViewProvider } from "~/components/forge/GlobalView";
import { ForgeProvider } from "~/providers/ForgeProvider";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Editor - nod8" },
    {
      name: "description",
      content:
        "Design and automate workflows with a flexible node-based system.",
    },
  ];
}

export default function Home() {
  return (
    <main className="w-screen h-screen">
      <ForgeProvider>
        <GlobalViewProvider />
      </ForgeProvider>
    </main>
  );
}
