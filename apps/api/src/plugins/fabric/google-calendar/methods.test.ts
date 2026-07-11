import assert from "node:assert/strict";
import { describe, it } from "node:test";
import plugin from "./index.ts";

describe("google-calendar plugin", () => {
  it("exports default Fabric plugin contract", () => {
    const auth = plugin.auth as any;
    const methodNames = [
      "listCalendars",
      "listEvents",
      "getEvent",
      "createEvent",
      "updateEvent",
      "deleteEvent",
      "freeBusy",
      "quickAddEvent",
    ];

    assert.equal(plugin.id, "google-calendar");
    assert.equal(plugin.manifest.metadata.id, "google-calendar");
    assert.equal(auth.type, "oauth2");
    assert.ok(auth.scopes.includes("https://www.googleapis.com/auth/calendar"));

    for (const methodName of methodNames) {
      assert.equal(typeof plugin.methods[methodName], "function");
      assert.ok(plugin.manifest.methods[methodName], `${methodName} must be declared in manifest`);
    }
  });

  it("requires explicit confirmation before deleting an event", async () => {
    await assert.rejects(
      plugin.methods.deleteEvent(
        { calendarId: "primary", eventId: "event-1", confirm: false },
        { credentials: { client_id: "client", client_secret: "secret" }, tokens: { access_token: "access" } },
      ),
      /confirm/,
    );
  });
});
