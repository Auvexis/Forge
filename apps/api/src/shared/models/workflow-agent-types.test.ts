import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

const workflowTypesPath = path.resolve("src/shared/models/workflow-types.ts");

describe("workflow AI node contracts", () => {
  const source = fs.readFileSync(workflowTypesPath, "utf8");

  it("adds AI node types to the workflow node type union", () => {
    assert.match(source, /"ai-agent"/);
    assert.match(source, /"ai-model"/);
    assert.match(source, /"ai-memory"/);
    assert.match(source, /"ai-tool"/);
  });

  it("adds chat to workflow trigger types", () => {
    assert.match(source, /"chat"/);
    assert.match(source, /chatSlug\?: string/);
    assert.match(source, /chatAuthMode\?: "public" \| "signed" \| "profile"/);
    assert.match(source, /chatSessionMode\?: "new-session-per-user" \| "resume-by-session-id"/);
  });

  it("adds concrete AI node interfaces to the workflow node union", () => {
    assert.match(source, /export interface AiAgentNode/);
    assert.match(source, /export interface AiModelNode/);
    assert.match(source, /export interface AiMemoryNode/);
    assert.match(source, /export interface AiToolNode/);
    assert.match(source, /\| AiAgentNode/);
    assert.match(source, /\| AiModelNode/);
    assert.match(source, /\| AiMemoryNode/);
    assert.match(source, /\| AiToolNode/);
  });

  it("defines AI model nodes with plugin capability identity", () => {
    assert.match(source, /export type AgentModelAdapter = "openai-compatible" \| "openrouter" \| "generic" \| "ollama"/);
    assert.match(source, /export interface AiModelNode[\s\S]*pluginId: string/);
    assert.match(source, /export interface AiModelNode[\s\S]*adapter: AgentModelAdapter/);
    assert.doesNotMatch(source, /provider: "openai" \| "openrouter"/);
  });

  it("defines reusable chain, parser, and vector tool node contracts", () => {
    for (const nodeType of ["basic-llm-chain", "structured-json-parser", "question-answer-chain", "vector-store-tool"]) {
      assert.match(source, new RegExp(`"${nodeType}"`));
    }
    for (const typeName of ["BasicLlmChainNode", "StructuredJsonParserNode", "QuestionAnswerChainNode", "VectorStoreToolNode"]) {
      assert.match(source, new RegExp(`export interface ${typeName}`));
      assert.match(source, new RegExp(`\\| ${typeName}`));
    }
    assert.match(source, /failurePolicy: "error"/);
  });
});
