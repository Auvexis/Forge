import type { FabricPlugin } from "@auvexis/fabric-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createMethods } from "./methods.ts";

const WaitPlugin: FabricPlugin = {
  id: "fabric-wait",
  manifest: manifest as any,
  auth: { type: "none" },
  methods: createMethods(),
};

export default WaitPlugin;
