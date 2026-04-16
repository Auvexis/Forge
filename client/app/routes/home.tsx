import type { Route } from "./+types/home";
import { GlobalViewProvider } from "~/components/nod8/GlobalView";
import { Nod8Provider } from "~/providers/Nod8Provider";

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
      <Nod8Provider>
        <GlobalViewProvider />
      </Nod8Provider>
    </main>
  );
}
