import type { Nod8Plugin } from "../../../shared/models/plugin-types.ts";
import manifest from "./manifest.json" with { type: "json" };
import { createMethods, cleanupSandbox } from "./methods.ts";

const FilePlugin: Nod8Plugin = {
  id: "nod8-file",
  manifest: manifest as any,
  auth: { type: "none" },
  methods: createMethods(),
  executionLifecycle: {
    async onExecutionEnd(executionId) {
      cleanupSandbox(executionId);
    },
  },
};

export default FilePlugin;
