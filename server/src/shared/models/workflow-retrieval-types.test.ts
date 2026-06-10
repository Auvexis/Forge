import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

const workflowTypesPath = path.resolve("src/shared/models/workflow-types.ts");

describe("workflow retrieval node contracts", () => {
  const source = fs.readFileSync(workflowTypesPath, "utf8");

  it("defines a generic dataset output contract reusable outside AI workflows", () => {
    assert.match(source, /export type DatasetSourceType = "text" \| "file" \| "database"/);
    assert.match(source, /export interface DatasetItem/);
    assert.match(source, /id: string/);
    assert.match(source, /text: string/);
    assert.match(source, /metadata: Record<string, any>/);
    assert.match(source, /raw\?: any/);
    assert.match(source, /export interface DatasetOutput/);
    assert.match(source, /items: DatasetItem\[\]/);
    assert.match(source, /count: number/);
    assert.match(source, /sourceType: DatasetSourceType/);
  });

  it("defines shared vector retrieval contracts without provider-specific names", () => {
    assert.match(source, /export type VectorDistanceMetric = "cosine" \| "dot" \| "euclidean"/);
    assert.match(source, /export interface VectorDocument/);
    assert.match(source, /vector: number\[\]/);
    assert.match(source, /export interface VectorQuery/);
    assert.match(source, /topK: number/);
    assert.match(source, /export interface VectorSearchResult/);
    assert.match(source, /score: number/);
    assert.match(source, /export interface VectorCollectionInfo/);
    assert.doesNotMatch(source, /Pinecone[A-Za-z]*/);
    assert.doesNotMatch(source, /Qdrant[A-Za-z]*/);
  });

  it("adds retrieval node types to the workflow node type union", () => {
    assert.match(source, /"text-dataset"/);
    assert.match(source, /"file-dataset"/);
    assert.match(source, /"database-dataset"/);
    assert.match(source, /"embeddings"/);
    assert.match(source, /"vector-store"/);
    assert.match(source, /"retriever"/);
  });

  it("adds concrete retrieval node interfaces to the workflow node union", () => {
    assert.match(source, /export interface TextDatasetNode/);
    assert.match(source, /export interface FileDatasetNode/);
    assert.match(source, /export interface DatabaseDatasetNode/);
    assert.match(source, /export interface EmbeddingsNode/);
    assert.match(source, /export interface VectorStoreNode/);
    assert.match(source, /export interface RetrieverNode/);
    assert.match(source, /\| TextDatasetNode/);
    assert.match(source, /\| FileDatasetNode/);
    assert.match(source, /\| DatabaseDatasetNode/);
    assert.match(source, /\| EmbeddingsNode/);
    assert.match(source, /\| VectorStoreNode/);
    assert.match(source, /\| RetrieverNode/);
  });
});
