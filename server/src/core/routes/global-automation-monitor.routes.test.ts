import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const routesSource = readFileSync(
  fileURLToPath(new URL("./workflows.routes.ts", import.meta.url)),
  "utf8",
);

describe("global automation monitor workflow routes", () => {
  it("exposes global production status across profile scopes", () => {
    assert.match(routesSource, /\/workflows\/production-status\/global/);
    assert.match(routesSource, /profileScopeRunner\.listProfileIds\(\)/);
    assert.match(routesSource, /runWithProfile\(profileId/);
    assert.match(routesSource, /profileId/);
  });

  it("exposes profile-scoped workflow execution reads for the monitor detail view", () => {
    assert.match(routesSource, /\/p\/:profileId\/workflows\/:workflowId\/executions/);
    assert.match(routesSource, /WorkflowRepository\.getWorkflowExecutions\(workflowId\)/);
  });
});
