import { memo, type FC } from "react";
import { Loader2, Check, X } from "lucide-react";

type ExecutionStatus = "idle" | "running" | "success" | "failed";

interface StatusIndicatorProps {
  status: ExecutionStatus;
}

export const StatusIndicator: FC<StatusIndicatorProps> = memo(({ status }) => {
  if (status === "idle") return null;

  return (
    <div
      className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 ml-auto border-2 border-background shadow-sm ${
        status === "running"
          ? "bg-orange-500"
          : status === "success"
            ? "bg-emerald-500"
            : "bg-red-500"
      }`}
    >
      {status === "running" ? (
        <Loader2 className="w-3 h-3 text-white animate-spin" />
      ) : status === "success" ? (
        <Check className="w-3 h-3 text-white stroke-[3]" />
      ) : (
        <X className="w-3 h-3 text-white stroke-[3]" />
      )}
    </div>
  );
});
