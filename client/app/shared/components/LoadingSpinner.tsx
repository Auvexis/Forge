import type { FC } from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  label?: string;
  sublabel?: string;
}

/**
 * Centralised loading spinner with optional labels.
 * Replaces the copy-pasted Loader2 + blur pattern used across the codebase.
 */
export const LoadingSpinner: FC<LoadingSpinnerProps> = ({
  label = "Loading...",
  sublabel,
}) => (
  <div className="flex flex-col items-center justify-center gap-6 text-muted-foreground">
    <div className="relative">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
    </div>
    <div className="flex flex-col items-center">
      <span className="text-mini font-black uppercase tracking-[0.2em] text-primary/60">
        {label}
      </span>
      {sublabel && (
        <span className="text-micro text-muted-foreground/40 font-bold uppercase tracking-widest mt-1">
          {sublabel}
        </span>
      )}
    </div>
  </div>
);
