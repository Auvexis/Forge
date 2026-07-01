import type { SailorPlugin } from "@auvexis/sailor-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createMethods } from "./methods.ts";

const CryptoPlugin: SailorPlugin = {
  id: "sailor-crypto",
  manifest: manifest as any,
  auth: { type: "none" },
  methods: createMethods(),
};

export default CryptoPlugin;
