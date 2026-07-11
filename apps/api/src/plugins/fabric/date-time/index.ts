import type { FabricPlugin } from "@auvexis/fabric-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createMethods } from "./methods.ts";

const DateTimePlugin: FabricPlugin = {
  id: "fabric-date-time",
  manifest: manifest as any,
  auth: { type: "none" },
  methods: createMethods(),
};

export default DateTimePlugin;
