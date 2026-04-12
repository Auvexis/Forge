import { Toaster } from "sonner";

/**
 * ForgeToaster
 *
 * Global notification layer for the Forge platform.
 * Styled to match the dock/panel aesthetic:
 *   - Dark glass background with backdrop blur
 *   - Sidebar/border tokens for colours
 *   - Subtle coloured left-border per type (error=red, success=emerald, info=blue)
 *   - Geist font, tight tracking, uppercase labels
 *
 * Place once in root.tsx — toast() can be called from anywhere.
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
            // Container — exact mirror of dock glass shell
            "group flex items-center gap-1.5 p-1.5 w-[380px]",
            "bg-sidebar/85 backdrop-blur-3xl",
            "border border-sidebar-accent/30",
            "rounded-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)]",
            "relative transition-all duration-300 ease-out will-change-transform antialiased select-none",
          ].join(" "),

          // Section 1: Icon Capsule (Themed per state)
          icon: [
            "flex items-center justify-center w-10 h-10 rounded-full shrink-0 border transition-colors",
            // Success State
            "group-data-[type=success]:bg-emerald-500/10 group-data-[type=success]:border-emerald-500/20 group-data-[type=success]:text-emerald-500",
            // Error State
            "group-data-[type=error]:bg-red-500/10 group-data-[type=error]:border-red-500/20 group-data-[type=error]:text-red-500",
            // Warning State
            "group-data-[type=warning]:bg-amber-500/10 group-data-[type=warning]:border-amber-500/20 group-data-[type=warning]:text-amber-500",
            // Default State
            "group-data-[type=default]:bg-blue-500/10 group-data-[type=default]:border-blue-500/20 group-data-[type=default]:text-blue-500",
          ].join(" "),

          content: "flex flex-col justify-center gap-0.5 pl-2 pr-4 py-1 flex-1 min-w-0 border-l border-sidebar-accent/10 ml-1.5",

          title: [
            "text-[11px] font-black uppercase tracking-wider",
            "text-foreground leading-none",
            // Keep title color neutral by default, or themed if preferred
            "group-data-[type=error]:text-red-400 group-data-[type=success]:text-emerald-400 group-data-[type=warning]:text-amber-400",
          ].join(" "),

          description: [
            "text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tight leading-none",
            "line-clamp-1 truncate",
          ].join(" "),

          closeButton: [
            "absolute -right-1 -top-1 w-6 h-6 rounded-full",
            "flex items-center justify-center",
            "bg-sidebar border border-sidebar-accent/40 shadow-xl",
            "text-muted-foreground hover:text-foreground hover:scale-110",
            "transition-all opacity-0 group-hover:opacity-100",
            "text-[10px] z-10",
          ].join(" "),
        },
      }}
      closeButton
    />
  );
}
