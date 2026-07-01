import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

const workflowTypesPath = path.resolve("src/shared/models/workflow-types.ts");

describe("vector store provider shared contract", () => {
  const source = fs.readFileSync(workflowTypesPath, "utf8");

  it("defines generic vector store method ids used by core and plugins", () => {
    assert.match(source, /export type VectorStoreMethodId =/);
    assert.match(source, /"ensureCollection"/);
    assert.match(source, /"upsertDocuments"/);
    assert.match(source, /"querySimilar"/);
    assert.match(source, /"deleteDocuments"/);
    assert.match(source, /"describeCollection"/);
  });

  it("defines generic provider input contracts without provider-specific branches", () => {
    assert.match(source, /export interface VectorStoreProviderConfig/);
    assert.match(source, /collectionName: string/);
    assert.match(source, /dimension: number/);
    assert.match(source, /metric: VectorDistanceMetric/);
    assert.match(source, /export interface VectorStoreEnsureCollectionInput/);
    assert.match(source, /export interface VectorStoreUpsertDocumentsInput/);
    assert.match(source, /documents: VectorDocument\[\]/);
    assert.match(source, /export interface VectorStoreQuerySimilarInput/);
    assert.match(source, /query: VectorQuery/);
    assert.match(source, /export interface VectorStoreDeleteDocumentsInput/);
    assert.match(source, /ids: string\[\]/);
    assert.match(source, /export interface VectorStoreDescribeCollectionInput/);
    assert.doesNotMatch(source, /Pinecone[A-Za-z]*/);
    assert.doesNotMatch(source, /Qdrant[A-Za-z]*/);
  });
});
