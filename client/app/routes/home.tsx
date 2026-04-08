import type { Route } from "./+types/home";
import { GlobalViewProvider } from "~/components/GlobalView";
import { ForgeProvider } from "~/providers/ForgeProvider";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Forge — Plugin Orchestration Platform" },
    { name: "description", content: "Orchestrate and manage plugins in a modular ecosystem." },
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
