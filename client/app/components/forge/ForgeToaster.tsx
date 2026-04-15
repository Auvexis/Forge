import { Toaster } from "sonner";

/**
 * ForgeToaster
 *
 * Global notification layer for the Forge platform.
 * Colours are driven by `--forge-toast-*` tokens in `app.css`.
 */
export function ForgeToaster() {
  return (
    <Toaster
      position="top-right"
      gap={8}
      duration={5000}
      visibleToasts={5}
      expand={false}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: [
            "group flex items-center mt-10! gap-1.5 p-1.5 w-[380px]",
            "bg-forge-toast-bg",
            "border border-forge-toast-border",
            "rounded-sm shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)]",
            "relative transition-all duration-300 ease-out will-change-transform antialiased select-none",
          ].join(" "),

          icon: [
            "flex items-center justify-center w-10 h-10 rounded-xs shrink-0 border transition-colors",
            "group-data-[type=success]:bg-forge-toast-icon-success-bg group-data-[type=success]:border-forge-toast-icon-success-border group-data-[type=success]:text-forge-toast-icon-success-text",
            "group-data-[type=error]:bg-forge-toast-icon-error-bg group-data-[type=error]:border-forge-toast-icon-error-border group-data-[type=error]:text-forge-toast-icon-error-text",
            "group-data-[type=warning]:bg-forge-toast-icon-warning-bg group-data-[type=warning]:border-forge-toast-icon-warning-border group-data-[type=warning]:text-forge-toast-icon-warning-text",
            "group-data-[type=default]:bg-forge-toast-icon-default-bg group-data-[type=default]:border-forge-toast-icon-default-border group-data-[type=default]:text-forge-toast-icon-default-text",
          ].join(" "),

          content:
            "flex flex-col justify-center gap-0.5 pl-2 pr-4 py-1 flex-1 min-w-0 border-l border-forge-toast-content-divider ml-1.5",

          title: [
            "text-[11px] font-bold uppercase",
            "text-foreground leading-none",
            "group-data-[type=error]:text-forge-toast-title-error group-data-[type=success]:text-forge-toast-title-success group-data-[type=warning]:text-forge-toast-title-warning",
          ].join(" "),

          description: [
            "text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tight leading-none",
            "line-clamp-1 truncate",
          ].join(" "),

          closeButton: ["hidden"].join(" "),
        },
      }}
      closeButton
    />
  );
}
