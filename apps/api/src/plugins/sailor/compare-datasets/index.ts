import type { SailorPlugin } from "@auvexis/sailor-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createMethods } from "./methods.ts";

const CompareDatasetsPlugin: SailorPlugin = {
  id: "sailor-compare-datasets",
  manifest: manifest as any,
  auth: { type: "none" },
  methods: createMethods(),
};

export default CompareDatasetsPlugin;
