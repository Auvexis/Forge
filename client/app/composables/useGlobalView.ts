import { useState } from "react";

export enum GlobalViews {
  EXPLORER = "explorer",
  WORKFLOWS = "workflows",
}

export const useGlobalView = () => {
  const [view, setView] = useState<GlobalViews>(GlobalViews.EXPLORER);

  return {
    view,
    setView,
  };
};
