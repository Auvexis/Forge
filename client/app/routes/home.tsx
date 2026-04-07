import type { Route } from "./+types/home";
import { GlobalViewProvider } from "~/components/GlobalView";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <main className="w-screen h-screen">
      <GlobalViewProvider />
    </main>
  );
}
