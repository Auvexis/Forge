const MAX_MS = 10 * 60 * 1000; // 10 minutes hard cap

function toMs(duration: number, unit: string): number {
  switch (unit) {
    case "minutes":
      return duration * 60_000;
    case "milliseconds":
      return duration;
    case "seconds":
    default:
      return duration * 1_000;
  }
}

export function createMethods() {
  return {
    async sleep(params: { duration: number; unit?: string }) {
      const unit = params.unit ?? "seconds";
      const ms = toMs(params.duration, unit);

      if (ms > MAX_MS) {
        throw new Error(
          `Wait duration ${ms}ms exceeds the maximum allowed (${MAX_MS}ms / 10 minutes). ` +
          `Use a scheduler-based approach for longer delays.`,
        );
      }

      if (ms < 0) throw new Error("Duration must be non-negative.");

      await new Promise((resolve) => setTimeout(resolve, ms));

      return { sleptMs: ms, unit, duration: params.duration };
    },
  };
}
