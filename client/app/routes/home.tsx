import { usePlugins } from "~/hooks/plugins/usePlugins";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  const { data, isLoading } = usePlugins();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="flex w-screen h-screen">
      <aside className="w-16 h-full bg-white/15"></aside>

      <main className="w-full h-full flex justify-center items-center">
        {data?.map((plugin) => (
          <div key={plugin.id} className="flex items-center gap-2 bg-white/5 rounded-lg p-3 transition-all duration-200 hover:bg-white/10 cursor-pointer">
            <img src={plugin.icon} alt={plugin.name} className="w-13 h-13" />
          </div>
        ))}
      </main>
    </div>
  );
}
