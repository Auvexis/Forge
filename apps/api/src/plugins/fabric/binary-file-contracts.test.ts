import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import drive from "./google-drive/manifest.ts";
import gmail from "./google-gmail/manifest.ts";
import youtube from "./google-youtube/manifest.ts";
import slack from "./slack/manifest.ts";
import supabase from "./supabase/manifest.ts";
import telegram from "./telegram/manifest.ts";
import file from "./file/manifest.ts";

const manifests = { "google-drive": drive, "google-gmail": gmail, "google-youtube": youtube, slack, supabase, telegram, file };

describe("default plugin binary contracts", () => {
  it("keeps runtime and UI binary contracts identical", () => {
    for (const [directory, manifest] of Object.entries(manifests)) {
      const json = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, directory, "manifest.json"), "utf8"));
      assert.deepEqual(collectFileContracts(manifest), collectFileContracts(json), `${directory} binary contracts differ`);
    }
  });

  it("declares every file UI input with a canonical binary contract", () => {
    const defaultManifests = fs.readdirSync(import.meta.dirname, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(import.meta.dirname, entry.name, "manifest.json"))
      .filter((manifestPath) => fs.existsSync(manifestPath))
      .map((manifestPath) => JSON.parse(fs.readFileSync(manifestPath, "utf8")));
    for (const manifest of defaultManifests) {
      visit(manifest, (schema) => {
        if (schema["x-input-type"] === "file") assertCanonicalFile(schema);
        if (schema["x-input-type"] === "files") assertCanonicalFile(schema.items);
      });
    }
  });
});

function assertCanonicalFile(schema: Record<string, any>): void {
  assert.equal(schema["x-fabric-value-type"], "file");
  assert.ok(["buffer", "base64"].includes(schema["x-fabric-binary-encoding"]));
  assert.deepEqual(schema.required, ["name", "mimeType", "content"]);
}

function visit(value: unknown, callback: (record: Record<string, any>) => void): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) return value.forEach((item) => visit(item, callback));
  const record = value as Record<string, any>;
  callback(record);
  Object.values(record).forEach((child) => visit(child, callback));
}

function collectFileContracts(value: unknown): unknown[] {
  const contracts: unknown[] = [];
  visit(value, (schema) => {
    if (schema["x-fabric-value-type"] === "file") {
      contracts.push({
        type: schema.type,
        valueType: schema["x-fabric-value-type"],
        encoding: schema["x-fabric-binary-encoding"],
        properties: schema.properties,
        required: schema.required,
        additionalProperties: schema.additionalProperties,
      });
    }
  });
  return contracts;
}
