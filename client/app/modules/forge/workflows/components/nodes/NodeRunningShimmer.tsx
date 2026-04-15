/**
 * Sweeping highlight while a workflow node is executing.
 * Uses global `@keyframes shimmer` in app.css (Tailwind arbitrary name must match).
 */
export function NodeRunningShimmer() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]">
      <div className="absolute inset-y-0 w-[55%] -translate-x-full bg-gradient-to-r from-transparent via-amber-500/18 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
    </div>
  );
}
