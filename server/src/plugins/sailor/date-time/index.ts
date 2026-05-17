import type { SailorPlugin } from "@auvexis/sailor-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createMethods } from "./methods.ts";

const DateTimePlugin: SailorPlugin = {
  id: "sailor-date-time",
  manifest: manifest as any,
  auth: { type: "none" },
  methods: createMethods(),
};

export default DateTimePlugin;
