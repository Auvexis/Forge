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
        "!h-5 opacity-100! border-0! !bg-forge-rf-handle-bg transition-colors duration-200 hover:!bg-forge-rf-handle-bg-hover",
        props.type === "target"
          ? "!rounded-full !w-1.5 -left-[5.5px]!"
          : "!rounded-full !w-1.5 -right-[7px]! -z-10",
        className,
      )}
    />
  );
}
