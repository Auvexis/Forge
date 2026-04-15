import { memo, type FC, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";

// ── Types ──

export interface DockSection {
  /** Unique key for React */
  id: string;
  /** The content to render inside this section */
  content: ReactNode;
  /** Whether to show a right border separator (default: true) */
  border?: boolean;
}

export type ForgeDockVariant = "default" | "workflows" | "explorer" | "editor";

export interface ForgeDockProps {
  /** Lucide icon component for the brand badge */
  icon: LucideIcon;
  /** Page/module title */
  title: string;
  /** Small status line */
  subtitle: string;
  /**
   * Icon tint inside the badge — maps to `app.css` `.forge-dock[data-accent=…]`
   * presets (`blue`, `rose`, …) or keeps `primary` (default dock token).
   */
  accent: string;
  /** Which dock preset to use — colors live in `app.css` under `--forge-dock-{variant}-*` */
  variant?: ForgeDockVariant;
  /** Optional status dot override */
  statusDot?: {
    color: string;
    animate?: boolean;
  };
  /** Sections to render between the brand badge and the trailing content */
  sections: DockSection[];
  /** Trailing content (typically the primary CTA) */
  trailing?: ReactNode;
}

// ── Component ──

export const ForgeDock: FC<ForgeDockProps> = memo(
  ({
    icon: Icon,
    title,
    subtitle,
    accent,
    variant = "default",
    statusDot,
    sections,
    trailing,
  }) => {
    const dotColor = statusDot?.color ?? "bg-forge-dock-status-dot";
    const dotAnimate = statusDot?.animate ?? false;

    return (
      <div
        data-accent={accent}
        className={cn(
          "forge-dock h-12 w-full flex items-center shrink-0 px-3 gap-2",
          "bg-forge-dock-bg border-b border-forge-dock-border",
          variant !== "default" && `forge-dock--${variant}`,
        )}
      >
        {/* Brand Badge */}
        <div className="flex items-center gap-2.5 pr-3 border-r border-forge-dock-section-border h-full">
          <div className="w-7 h-7 flex items-center justify-center rounded-md bg-forge-dock-badge-bg shrink-0">
            <Icon className="w-3.5 h-3.5 text-forge-dock-badge-icon" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-sm font-semibold text-forge-dock-title-text leading-none">
              {title}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${dotColor} ${dotAnimate ? "animate-pulse" : ""}`}
              />
              <span className="text-xs text-forge-dock-subtitle-text leading-none">
                {subtitle}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Sections */}
        {sections.map((section) => (
          <div
            key={section.id}
            className={cn(
              "flex items-center gap-1 h-full px-2",
              section.border !== false && "border-r border-forge-dock-section-border",
            )}
          >
            {section.content}
          </div>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Trailing CTA */}
        {trailing && (
          <div className="flex items-center gap-2">
            {trailing}
          </div>
        )}
      </div>
    );
  },
);

ForgeDock.displayName = "ForgeDock";
