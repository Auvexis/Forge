import type { SailorPlugin } from "@auvexis/sailor-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createMethods } from "./methods.ts";

const WaitPlugin: SailorPlugin = {
  id: "sailor-wait",
  manifest: manifest as any,
  auth: { type: "none" },
  methods: createMethods(),
};

export default WaitPlugin;
