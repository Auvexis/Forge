import type { Nod8Plugin } from "../../../shared/models/plugin-types.ts";
import manifest from "./manifest.json" with { type: "json" };
import { createMethods } from "./methods.ts";

const CryptoPlugin: Nod8Plugin = {
  id: "nod8-crypto",
  manifest: manifest as any,
  auth: { type: "none" },
  methods: createMethods(),
};

export default CryptoPlugin;
