import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { appSettingsCommandProvider } from "./app-settings.commands.ts";
import { navigationCommandProvider } from "./navigation.commands.ts";
import { CommandRegistry } from "../command-registry.ts";
import type { CommandExecutionContext } from "../command-types.ts";

async function listAppCommands(context: CommandExecutionContext = {}) {
  const registry = new CommandRegistry();
  registry.registerProvider(navigationCommandProvider);
  registry.registerProvider(appSettingsCommandProvider);
  return registry.list(context);
}

describe("app command providers", () => {
  it("registers navigation commands for stable top-level routes", async () => {
    const commands = await listAppCommands();

    assert.deepEqual(
      commands
        .filter((command) => command.group === "navigation")
        .map((command) => command.id),
      ["nav.home", "agents.open", "guide-book.open", "nav.settings", "nav.universe", "nav.workflows"],
    );
  });

  it("returns a UI intent for opening the agent chat modal", async () => {
    const registry = new CommandRegistry();
    registry.registerProvider(navigationCommandProvider);

    const entry = await registry.find("agents.open", {});

    assert.deepEqual(await entry?.handler.execute({}, {}), {
      ok: true,
      message: "Agents opened",
      uiIntent: { type: "agents.open" },
    });
  });

  it("returns a UI intent for opening the guide book", async () => {
    const registry = new CommandRegistry();
    registry.registerProvider(navigationCommandProvider);

    const entry = await registry.find("guide-book.open", {});

    assert.deepEqual(await entry?.handler.execute({}, {}), {
      ok: true,
      message: "Guide Book opened",
      uiIntent: { type: "guide-book.open" },
    });
  });

  it("returns typed UI intents for production panel commands", async () => {
    const registry = new CommandRegistry();
    registry.registerProvider(appSettingsCommandProvider);

    const openEntry = await registry.find("production.panel.open", {});
    const closeEntry = await registry.find("production.panel.close", {});

    assert.deepEqual(await openEntry?.handler.execute({}, {}), {
      ok: true,
      message: "Production panel opened",
      uiIntent: { type: "production-panel.open" },
    });
    assert.deepEqual(await closeEntry?.handler.execute({}, {}), {
      ok: true,
      message: "Production panel closed",
      uiIntent: { type: "production-panel.close" },
    });
  });

  it("enables Exit Universe only when the context is in Universe mode", async () => {
    const outsideUniverse = await listAppCommands({ isUniverseMode: false });
    const insideUniverse = await listAppCommands({ isUniverseMode: true });

    assert.equal(
      outsideUniverse.find((command) => command.id === "universe.exit")?.availability.enabled,
      false,
    );
    assert.equal(
      insideUniverse.find((command) => command.id === "universe.exit")?.availability.enabled,
      true,
    );
  });
});
