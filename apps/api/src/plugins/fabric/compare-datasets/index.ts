import type { FabricPlugin } from "@auvexis/fabric-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createMethods } from "./methods.ts";

const CompareDatasetsPlugin: FabricPlugin = {
  id: "fabric-compare-datasets",
  manifest: manifest as any,
  auth: { type: "none" },
  methods: createMethods(),
};

export default CompareDatasetsPlugin;
