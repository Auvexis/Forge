import assert from "node:assert/strict";
import { describe, it } from "node:test";

import plugin from "./index.ts";

describe("ollama plugin", () => {
  it("declares a generic chat model capability for local Ollama", () => {
    const capability = plugin.manifest.metadata.agentCapabilities?.chatModel;

    assert.equal(plugin.id, "sailor-ollama");
    assert.equal(plugin.manifest.metadata.id, "sailor-ollama");
    assert.equal(capability?.enabled, true);
    assert.equal(capability?.adapter, "generic");
    assert.equal(capability?.defaultModel, "llama3.2");
    assert.equal(capability?.defaultBaseUrl, "http://localhost:11434/v1");
    assert.equal(capability?.credentialPluginId, "sailor-ollama");
  });

  it("accepts optional API key credentials for cloud or protected Ollama hosts", () => {
    const schema = plugin.auth.credentialSchema ?? {};

    assert.equal(schema.host.required, true);
    assert.equal(schema.host.placeholder, "http://localhost:11434");
    assert.equal(schema.model.required, true);
    assert.equal(schema.api_key.required, false);
    assert.equal(schema.api_key.inputType, "password");
  });
});
