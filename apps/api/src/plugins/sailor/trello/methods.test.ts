import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import plugin from "./index.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("trello plugin", () => {
  it("exports default Sailor plugin contract", () => {
    const auth = plugin.auth as any;
    const methodNames = [
      "listBoards",
      "listLists",
      "listCards",
      "createCard",
      "updateCard",
      "moveCard",
      "addCommentToCard",
      "createChecklistItem",
    ];

    assert.equal(plugin.id, "trello");
    assert.equal(plugin.manifest.metadata.id, "trello");
    assert.equal(auth.type, "api_key");
    assert.equal(auth.credentialSchema.api_key.inputType, "password");
    assert.equal(auth.credentialSchema.token.inputType, "password");

    for (const methodName of methodNames) {
      assert.equal(typeof plugin.methods[methodName], "function");
      assert.ok(plugin.manifest.methods[methodName], `${methodName} must be declared in manifest`);
    }
  });

  it("sends key and token authenticated requests to Trello", async () => {
    const calls: any[] = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify([{ id: "board-1" }]), { status: 200 });
    };

    const result = await plugin.methods.listBoards(
      {},
      { credentials: { api_key: "key-1", token: "token-1" } },
    );

    assert.equal(result[0].id, "board-1");
    assert.match(calls[0].url, /^https:\/\/api\.trello\.com\/1\/members\/me\/boards\?/);
    assert.match(calls[0].url, /key=key-1/);
    assert.match(calls[0].url, /token=token-1/);
    assert.equal(calls[0].init.method, "GET");
  });

  it("only sends defined fields when updating a card", async () => {
    let url = "";
    globalThis.fetch = async (requestUrl) => {
      url = String(requestUrl);
      return new Response(JSON.stringify({ id: "card-1" }), { status: 200 });
    };

    await plugin.methods.updateCard(
      { cardId: "card-1", name: "New name" },
      { credentials: { api_key: "key-1", token: "token-1" } },
    );

    assert.match(url, /name=New\+name/);
    assert.doesNotMatch(url, /desc=/);
  });

  it("throws clear Trello API errors", async () => {
    globalThis.fetch = async () => new Response("invalid token", { status: 401 });

    await assert.rejects(
      plugin.methods.listLists(
        { boardId: "board-1" },
        { credentials: { api_key: "key-1", token: "bad" } },
      ),
      /Trello API error on '\/boards\/board-1\/lists': 401 invalid token/,
    );
  });
});
