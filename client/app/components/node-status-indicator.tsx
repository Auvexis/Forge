import { type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "~/lib/utils";

export type NodeStatus = "loading" | "success" | "error" | "initial";
export type NodeStatusVariant = "overlay" | "border";

export type NodeStatusIndicatorProps = {
  status?: NodeStatus;
  variant?: NodeStatusVariant;
  children: ReactNode;
};

const StatusBorder = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <>
    <div
      className={cn(
        "absolute -top-px -left-px h-[calc(100%+2px)] w-[calc(100%+2px)] rounded-[9px] border-2",
        className,
      )}
    />
    {children}
  </>
);

export const SpinnerLoadingIndicator = ({
  children,
}: {
  children: ReactNode;
}) => (
  <div className="relative">
    <StatusBorder className="border-amber-500/40">{children}</StatusBorder>
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/30 rounded-[9px]">
      <LoaderCircle className="w-5 h-5 animate-spin text-amber-500" />
    </div>
  </div>
);

export const BorderLoadingIndicator = ({
  children,
}: {
  children: ReactNode;
}) => (
  <>
    <div className="absolute -top-px -left-px h-[calc(100%+2px)] w-[calc(100%+2px)] rounded-[9px] border-2 border-amber-500/60 animate-pulse" />
    {children}
  </>
);

export const NodeStatusIndicator = ({
  status,
  variant = "border",
  children,
}: NodeStatusIndicatorProps) => {
  switch (status) {
    case "loading":
      if (variant === "overlay") return <SpinnerLoadingIndicator>{children}</SpinnerLoadingIndicator>;
      return <BorderLoadingIndicator>{children}</BorderLoadingIndicator>;
    case "success":
      return <StatusBorder className="border-emerald-500">{children}</StatusBorder>;
    case "error":
      return <StatusBorder className="border-red-400">{children}</StatusBorder>;
    default:
      return <>{children}</>;
  }
};
