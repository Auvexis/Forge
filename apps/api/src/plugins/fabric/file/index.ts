import type { FabricPlugin } from "@auvexis/fabric-sdk";
import manifest from "./manifest.json" with { type: "json" };
import { createMethods, cleanupSandbox } from "./methods.ts";

const FilePlugin: FabricPlugin = {
  id: "fabric-file",
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
