import { useOllamaConfig } from "~/hooks/ollama/useOllamaConfig";
import FirstSteps from "./FirstSteps";

export default function AppGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error } = useOllamaConfig();

  if (isLoading) return <div>Loading...</div>;

  if (!data || error) {
    return <FirstSteps />;
  }

  return <>{children}</>;
}
