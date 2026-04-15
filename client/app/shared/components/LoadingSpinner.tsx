import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  label?: string;
  sublabel?: string;
}

export const LoadingSpinner = ({
  label = "Loading...",
  sublabel,
}: LoadingSpinnerProps = {}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        {sublabel && (
          <span className="text-xs text-muted-foreground/60">{sublabel}</span>
        )}
      </div>
    </div>
  );
};
