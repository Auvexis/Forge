import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentArtifactStorage } from "./agent-artifact-storage.ts";

describe("AgentArtifactStorage", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true })
    ));
  });

  it("writes and reads content inside a profile-scoped directory", async () => {
    const root = await temporaryRoot();
    const storage = new AgentArtifactStorage(root);
    const written = await storage.write({
      profileId: "profile_1",
      artifactId: "artifact_12345678",
      content: Buffer.from("video"),
    });

    expect(written).toMatchObject({ size: 5 });
    expect(written.storageKey).not.toContain("profile_1");
    await expect(storage.read("profile_1", written.storageKey))
      .resolves.toEqual(Buffer.from("video"));
    await expect(storage.read("profile_2", written.storageKey))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects traversal storage keys", async () => {
    const storage = new AgentArtifactStorage(await temporaryRoot());
    await expect(storage.read("profile_1", "../outside"))
      .rejects.toMatchObject({ code: "AGENT_ARTIFACT_STORAGE_INVALID" });
  });

  async function temporaryRoot(): Promise<string> {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "fabric-agent-artifacts-"));
    directories.push(directory);
    return directory;
  }
});
