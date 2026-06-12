import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createUtilityNodeRegistry } from "../nodes/registry.ts";
import { sailorCoreUtilityNodePack } from "./sailor-core/manifest.ts";
import { sailorCoreUtilityNodes } from "./sailor-core/index.ts";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

function read(relativePath: string): string {
  return fs.readFileSync(path.join(currentDir, relativePath), "utf8");
}

describe("Utility node pack contract", () => {
  it("defines typed utility node pack metadata and catalog contracts", () => {
    const types = read("utility-node-pack.types.ts");
    const helper = read("define-utility-node-pack.ts");

    assert.match(types, /export interface UtilityNodeStyle/);
    assert.match(types, /icon: string/);
    assert.match(types, /iconColor: string/);
    assert.match(types, /bgColor: string/);
    assert.match(types, /borderColor: string/);
    assert.match(types, /export interface UtilityNodeManifestEntry/);
    assert.match(types, /export interface UtilityNodePack/);
    assert.match(types, /nodes: Partial<Record<UtilityNodeType, UtilityNodeManifestEntry>>/);
    assert.match(types, /export interface UtilityNodeCatalogItem/);
    assert.match(types, /export interface UtilityNodeHandleDefinition/);
    assert.match(types, /export interface NodeCapabilitySelector/);
    assert.match(types, /role: NodeRole/);
    assert.match(types, /capabilities: string\[\]/);
    assert.match(types, /handles: UtilityNodeHandleDefinition\[\]/);
    assert.match(types, /presentation: UtilityNodePresentation/);
    assert.match(types, /UtilityNodeType/);
    assert.match(helper, /export function defineUtilityNodePack/);
  });

  it("defines metadata and style for every Sailor Core utility node", () => {
    assert.equal(sailorCoreUtilityNodePack.id, "sailor-core");

    for (const type of [
      "trigger",
      "code",
      "http",
      "if",
      "switch",
      "loop",
      "merge",
      "split-in-batches",
      "set",
      "event",
      "event-listener",
      "subworkflow",
      "respond-webhook",
      "wait-form",
      "ai-agent",
      "ai-model",
      "ai-memory",
      "ai-tool",
      "text-dataset",
      "file-dataset",
      "database-dataset",
      "embeddings",
      "vector-store",
      "retriever",
    ] as const) {
      const node = sailorCoreUtilityNodePack.nodes[type];
      assert.ok(node, `${type} manifest`);
      assert.equal(node.type, type);
      assert.ok(node.label.length > 0, `${type} label`);
      assert.ok(node.description.length > 0, `${type} description`);
      assert.ok(node.category.length > 0, `${type} category`);
      assert.ok(node.style.icon.length > 0, `${type} icon`);
      assert.ok(node.style.iconColor.length > 0, `${type} iconColor`);
      assert.ok(node.style.bgColor.length > 0, `${type} bgColor`);
      assert.ok(node.style.borderColor.length > 0, `${type} borderColor`);
      assert.ok(node.role === "flow" || node.role === "configuration", `${type} role`);
      assert.ok(Array.isArray(node.capabilities), `${type} capabilities`);
      assert.ok(Array.isArray(node.handles), `${type} handles`);
      assert.ok(node.presentation.base === "standard" || node.presentation.base === "advanced", `${type} presentation`);
    }
  });

  it("declares reusable capability handles for AI Agent and Vector Store", () => {
    assert.deepEqual(sailorCoreUtilityNodePack.nodes["ai-agent"]?.handles, [
      {
        id: "chatModel", label: "Chat Model", type: "target", position: "bottom", style: "diamond",
        required: true, accepts: [{ capability: "chat-model" }], cardinality: "one",
        connectionPolicy: "replace", quickAdd: "capability", quickAddAfterConnected: false,
      },
      {
        id: "memory", label: "Memory", type: "target", position: "bottom", style: "diamond",
        required: false, accepts: [{ capability: "memory-store" }], cardinality: "one",
        connectionPolicy: "replace", quickAdd: "capability", quickAddAfterConnected: false,
      },
      {
        id: "tool", label: "Tool", type: "target", position: "bottom", style: "diamond",
        required: false, accepts: [{ capability: "agent-tool" }], cardinality: "many",
        connectionPolicy: "append", quickAdd: "capability", quickAddAfterConnected: true,
      },
    ]);
    assert.deepEqual(sailorCoreUtilityNodePack.nodes["vector-store"]?.capabilities, ["vector-store"]);
    assert.deepEqual(sailorCoreUtilityNodePack.nodes.embeddings?.capabilities, ["embedding-model"]);
  });

  it("keeps Sailor Core manifest entries aligned with executable handlers", () => {
    const manifestTypes = Object.keys(sailorCoreUtilityNodePack.nodes).sort();
    const handlerTypes = sailorCoreUtilityNodes.map((node) => node.handler.type).sort();

    assert.deepEqual(handlerTypes, manifestTypes);

    const registry = createUtilityNodeRegistry();
    for (const utilityNode of sailorCoreUtilityNodes) {
      const handler = registry.get(utilityNode.handler.type);
      assert.equal(handler.execute, utilityNode.handler.execute);
      assert.equal(handler.metadata.description, utilityNode.manifest.description);
    }
  });
});
