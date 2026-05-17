import type { SailorPlugin } from "@auvexis/sailor-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createMethods, cleanupSandbox } from "./methods.ts";

const FilePlugin: SailorPlugin = {
  id: "sailor-file",
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
