import type { Nod8Plugin } from "../../../shared/models/plugin-types.ts";
import manifest from "./manifest.json" with { type: "json" };
import { createMethods } from "./methods.ts";

const DateTimePlugin: Nod8Plugin = {
  id: "nod8-date-time",
  manifest: manifest as any,
  auth: { type: "none" },
  methods: createMethods(),
};

export default DateTimePlugin;
