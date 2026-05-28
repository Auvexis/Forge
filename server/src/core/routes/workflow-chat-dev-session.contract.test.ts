import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../../..");

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

test("dev session trigger execution route accepts chat triggers as editor input", () => {
  const source = read("src/core/routes/workflows.routes.ts");
  const manager = read("src/core/modules/workflows/dev-session/dev-workflow-session-manager.ts");
  const agentRunner = read("src/core/modules/agent-runtime/agent-runner.ts");

  assert.match(source, /triggerEntry\.trigger\.type !== "manual" && triggerEntry\.trigger\.type !== "chat"/);
  assert.match(source, /const source = triggerEntry\.trigger\.type === "chat" \? "chat" : "manual"/);
  assert.match(source, /source,/);
  assert.match(source, /emitSessionEvent\(\{/);
  assert.match(source, /type: "trigger:received"/);
  assert.match(source, /executionId: job\.executionId/);
  assert.match(source, /data: body\.payload \?\? \{\}/);
  assert.match(source, /message: source === "chat" \? "Chat trigger queued" : "Manual trigger queued"/);
  assert.match(manager, /type\.startsWith\("agent:"\)/);
  assert.match(agentRunner, /type: "agent:end", payload: \{ status: result\.status, output: result\.output \}/);
});
