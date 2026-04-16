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

export type Nod8DockVariant = "default" | "workflows" | "explorer" | "editor";

export interface Nod8DockProps {
  /** Lucide icon component for the brand badge */
  icon: LucideIcon;
  /** Page/module title */
  title: string;
  /** Small status line */
  subtitle: string;
  /**
   * Icon tint inside the badge — maps to `app.css` `.nod8-dock[data-accent=…]`
   * presets (`blue`, `rose`, …) or keeps `primary` (default dock token).
   */
  accent: string;
  /** Which dock preset to use — colors live in `app.css` under `--nod8-dock-{variant}-*` */
  variant?: Nod8DockVariant;
  /** Optional status dot override */
  statusDot?: {
    color: string;
    animate?: boolean;
  };
  /** Sections to render between the brand badge and the trailing content */
  sections: DockSection[];
  /**
   * Optional content to render centred in the dock (e.g. a search bar).
   * When provided it takes the remaining flex space after sections and before trailing.
   */
  centerContent?: ReactNode;
  /** Trailing content (typically the primary CTA) */
  trailing?: ReactNode;
  /** Custom Brand Badge (fully overrides the default static one) */
  brandBadgeOverride?: ReactNode;
}

// ── Component ──

export const Nod8Dock: FC<Nod8DockProps> = memo(
  ({
    icon: Icon,
    title,
    subtitle,
    accent,
    variant = "default",
    statusDot,
    sections,
    centerContent,
    trailing,
    brandBadgeOverride,
  }) => {
    const dotColor = statusDot?.color ?? "bg-nod8-dock-status-dot";
    const dotAnimate = statusDot?.animate ?? false;

    return (
      <div
        data-accent={accent}
        className={cn(
          "nod8-dock h-12 w-full flex items-center shrink-0 px-3 gap-2",
          "bg-nod8-dock-bg border-b border-nod8-dock-border",
          variant !== "default" && `nod8-dock--${variant}`,
        )}
      >
        {/* Brand Badge */}
        {brandBadgeOverride ? (
          brandBadgeOverride
        ) : (
          <div className="flex items-center gap-2.5 pr-3 border-r border-nod8-dock-section-border h-full">
            <div className="w-7 h-7 flex items-center justify-center rounded-md bg-nod8-dock-badge-bg shrink-0">
              <Icon className="w-3.5 h-3.5 text-nod8-dock-badge-icon" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-sm font-semibold text-nod8-dock-title-text leading-none">
                {title}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${dotColor} ${dotAnimate ? "animate-pulse" : ""}`}
                />
                <span className="text-xs text-nod8-dock-subtitle-text leading-none">
                  {subtitle}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Sections */}
        {sections.map((section) => (
          <div
            key={section.id}
            className={cn(
              "flex items-center gap-1 h-full px-2",
              section.border !== false && "border-r border-nod8-dock-section-border",
            )}
          >
            {section.content}
          </div>
        ))}

        {/* Center Content (e.g. search bar) — takes remaining space */}
        {centerContent ? (
          <div className="flex-1 flex items-center justify-center px-4">
            {centerContent}
          </div>
        ) : (
          <div className="flex-1" />
        )}

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

Nod8Dock.displayName = "Nod8Dock";
