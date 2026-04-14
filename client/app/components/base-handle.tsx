import type { ComponentProps } from "react";
import { Handle, type HandleProps } from "@xyflow/react";
import { cn } from "~/lib/utils";

export type BaseHandleProps = HandleProps;

export function BaseHandle({
  className,
  ...props
}: ComponentProps<typeof Handle>) {
  return (
    <Handle
      {...props}
      className={cn(
        "!h-5 opacity-100! border-0! bg-muted! transition-colors duration-200 hover:!bg-primary/80",
        props.type === "target" 
          ? "!rounded-l-full !w-1 !left-[-2.5px]" 
          : "!rounded-r-full !w-1 !right-[-2px]",
        className,
      )}
    />
  );
}
