import { memo, type FC, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// ── Types ──

export interface DockSection {
  /** Unique key for React */
  id: string;
  /** The content to render inside this section */
  content: ReactNode;
  /** Whether to show a right border separator (default: true) */
  border?: boolean;
}

export interface ForgeDockProps {
  /** Lucide icon component for the brand badge */
  icon: LucideIcon;
  /** Page/module title (uppercase) */
  title: string;
  /** Small status line below the title */
  subtitle: string;
  /** Accent color name — maps to Tailwind's color palette (e.g. "blue", "rose", "violet") */
  accent: string;
  /** Status dot override — defaults to the accent color */
  statusDot?: {
    color: string;
    animate?: boolean;
  };
  /** Sections to render between the brand badge and the trailing content */
  sections: DockSection[];
  /** Trailing content (typically the primary CTA) — rendered after the last section */
  trailing?: ReactNode;
}

// ── Accent color resolver ──

const ACCENT_MAP: Record<string, { bg: string; border: string; hoverBorder: string; text: string; glow: string; dotGlow: string }> = {
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    hoverBorder: "group-hover/brand:border-blue-500/40",
    text: "text-blue-500",
    glow: "shadow-[0_0_15px_rgba(59,130,246,0.1)]",
    dotGlow: "shadow-[0_0_5px_#3b82f6]",
  },
  rose: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    hoverBorder: "group-hover/brand:border-rose-500/40",
    text: "text-rose-500",
    glow: "shadow-[0_0_15px_rgba(244,63,94,0.1)]",
    dotGlow: "shadow-[0_0_5px_#f43f5e]",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    hoverBorder: "group-hover/brand:border-violet-500/40",
    text: "text-violet-500",
    glow: "shadow-[0_0_15px_rgba(139,92,246,0.1)]",
    dotGlow: "shadow-[0_0_5px_#8b5cf6]",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    hoverBorder: "group-hover/brand:border-emerald-500/40",
    text: "text-emerald-500",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.1)]",
    dotGlow: "shadow-[0_0_5px_#10b981]",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    hoverBorder: "group-hover/brand:border-amber-500/40",
    text: "text-amber-500",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.1)]",
    dotGlow: "shadow-[0_0_5px_#f59e0b]",
  },
};

const DEFAULT_ACCENT = ACCENT_MAP.blue;

// ── Component ──

export const ForgeDock: FC<ForgeDockProps> = memo(
  ({ icon: Icon, title, subtitle, accent, statusDot, sections, trailing }) => {
    const colors = ACCENT_MAP[accent] ?? DEFAULT_ACCENT;
    const dotColor = statusDot?.color ?? `bg-${accent}-500`;
    const dotAnimate = statusDot?.animate ?? true;
    const dotGlow = colors.dotGlow;

    return (
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[50]">
        <div className="flex items-center gap-1.5 p-1.5 bg-sidebar/85 backdrop-blur-3xl border border-sidebar-accent/30 rounded-full shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-8 zoom-in-95 duration-1000 fill-mode-forwards antialiased">
          {/* ── Brand Badge ── */}
          <div className="flex items-center gap-3 pl-4 pr-3 border-r border-sidebar-accent/20 h-10 group/brand cursor-default">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-colors ${colors.bg} ${colors.border} ${colors.glow} ${colors.hoverBorder}`}
            >
              <Icon className={`w-4 h-4 ${colors.text}`} />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-[12px] font-black text-foreground tracking-wide leading-none mb-0.5 max-w-[150px] truncate uppercase">
                {title}
              </h1>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-1 h-1 rounded-full ${dotColor} ${dotAnimate ? "animate-pulse" : ""} ${dotGlow}`}
                />
                <span className="text-micro text-muted-foreground uppercase font-semibold tracking-wider leading-none opacity-40">
                  {subtitle}
                </span>
              </div>
            </div>
          </div>

          {/* ── Dynamic Sections ── */}
          {sections.map((section) => (
            <div
              key={section.id}
              className={`flex items-center gap-1 px-2 h-10 ${
                section.border !== false
                  ? "border-r border-sidebar-accent/20"
                  : ""
              }`}
            >
              {section.content}
            </div>
          ))}

          {/* ── Trailing CTA ── */}
          {trailing && (
            <div className="flex items-center gap-2 pl-2 pr-1">
              {trailing}
            </div>
          )}
        </div>
      </div>
    );
  },
);
