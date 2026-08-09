import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const monitorPath = fileURLToPath(
  new URL("../AppGlobalAutomationMonitor.vue", import.meta.url),
);
const oldMonitorPath = fileURLToPath(
  new URL("../AppProductionMonitor.vue", import.meta.url),
);
const appSource = readFileSync(
  fileURLToPath(new URL("../../../../app/App.vue", import.meta.url)),
  "utf8",
);
const paletteSource = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../features/command-palette/components/CommandPaletteHost.vue",
      import.meta.url,
    ),
  ),
  "utf8",
);
const apiSource = readFileSync(
  fileURLToPath(
    new URL("../../../../core/api/workflows.api.ts", import.meta.url),
  ),
  "utf8",
);
const baseModalSource = readFileSync(
  fileURLToPath(new URL("../../base/BaseModal.vue", import.meta.url)),
  "utf8",
);
const runsViewSource = readFileSync(
  fileURLToPath(
    new URL("../../execution/ExecutionRunsView.vue", import.meta.url),
  ),
  "utf8",
);
const lightThemeSource = readFileSync(
  fileURLToPath(new URL("../../../../themes/json/light.json", import.meta.url)),
  "utf8",
);
const darkThemeSource = readFileSync(
  fileURLToPath(new URL("../../../../themes/json/dark.json", import.meta.url)),
  "utf8",
);

describe("global automation monitor shell", () => {
  it("replaces the old production monitor component with a BaseModal global monitor", () => {
    assert.equal(existsSync(monitorPath), true);
    assert.equal(existsSync(oldMonitorPath), false);

    const source = readFileSync(monitorPath, "utf8");
    assert.match(source, /<BaseModal/);
    assert.match(source, /isAutomationMonitorOpen/);
    assert.match(source, /toggleAutomationMonitor/);
  });

  it("offers only real profiles and defaults to the active profile", () => {
    const source = readFileSync(monitorPath, "utf8");
    const optionsBlock = source.slice(
      source.indexOf("const profileOptions"),
      source.indexOf("const profileSelectOptions"),
    );

    assert.match(source, /useProfileStore/);
    assert.match(source, /selectedProfileId/);
    assert.match(source, /profileOptions/);
    assert.match(source, /profileStore\.currentProfile\?\.id/);
    assert.doesNotMatch(optionsBlock, /label: 'Global'/);
    assert.doesNotMatch(optionsBlock, /id: null/);
  });

  it("confirms protected profile filters without switching the active profile", () => {
    const source = readFileSync(monitorPath, "utf8");

    assert.match(source, /ProfilePasswordConfirmationDialog/);
    assert.match(source, /pendingProfile/);
    assert.match(source, /profile\?\.passwordProtected/);
    assert.match(source, /confirmProtectedProfile/);
    assert.match(source, /cancelProtectedProfile/);
    assert.match(source, /applyProfileSelection/);
    assert.match(source, /profileId === selectedProfileId\.value/);
    assert.doesNotMatch(source, /profileStore\.switchProfile/);
  });

  it("uses a task-manager style sidebar and a workflow execution view with trigger tabs", () => {
    const source = readFileSync(monitorPath, "utf8");

    assert.match(source, /gam-sidebar/);
    assert.match(source, /gam-main-meta/);
    assert.match(source, /gam-main/);
    assert.match(source, /triggerTabs/);
    assert.match(source, /activeTriggerRuns/);
  });

  it("refreshes production status and executions only on open or explicit refresh", () => {
    const source = readFileSync(monitorPath, "utf8");

    assert.match(source, /getGlobalProductionStatus/);
    assert.match(source, /getExecutions\([^)]*profileId/);
    assert.match(source, /@click="refreshLiveData"/);
    assert.match(source, /watch\(isAutomationMonitorOpen/);
    assert.doesNotMatch(source, /setInterval\(/);
  });

  it("opens filtered runs in the shared tree detail explorer", () => {
    const source = readFileSync(monitorPath, "utf8");

    assert.match(source, /ExecutionRunExplorer/);
    assert.match(source, /:runs="activeTriggerRuns"/);
    assert.match(source, /:workflow="selectedWorkflow\.workflow"/);
    assert.match(source, /executionTriggerId/);
    assert.doesNotMatch(source, /gam-run-result-panel/);
    assert.doesNotMatch(runsViewSource, /execution-runs-view__header/);
  });

  it("surfaces final result summaries for finished runs and keeps full JSON in run detail", () => {
    const source = readFileSync(monitorPath, "utf8");

    assert.match(source, /workflowResultSummary/);
    assert.match(source, /workflowResultLabel/);
    assert.match(source, /resultSource\?\.type === 'return'/);
    assert.match(source, /Returned result/);
    assert.match(source, /Executed steps result/);
    assert.match(source, /gam-run-result/);
    assert.match(source, /ExecutionRunExplorer/);
  });

  it("uses JSON theme tokens for the professional monitor shell and runs list", () => {
    const source = readFileSync(monitorPath, "utf8");

    assert.match(source, /--fabric-automation-monitor-bg/);
    assert.match(source, /--fabric-automation-monitor-tab-active-indicator/);
    assert.match(runsViewSource, /--fabric-execution-runs-bg/);
    assert.match(runsViewSource, /--fabric-execution-runs-status-success-bg/);
    assert.match(lightThemeSource, /"automationMonitor\.bg"/);
    assert.match(lightThemeSource, /"executionRuns\.bg"/);
    assert.match(darkThemeSource, /"automationMonitor\.bg"/);
    assert.match(darkThemeSource, /"executionRuns\.bg"/);
    assert.doesNotMatch(source, /color-mix/);
  });
});

describe("global automation monitor wiring", () => {
  it("mounts and toggles the new global monitor from app chrome", () => {
    assert.match(appSource, /AppGlobalAutomationMonitor/);
    assert.match(appSource, /isAutomationMonitorOpen/);
    assert.match(appSource, /toggleAutomationMonitor/);
    assert.doesNotMatch(appSource, /AppProductionMonitor/);
  });

  it("keeps global BaseModal overlays above immersive Pages and Universe layers", () => {
    assert.match(appSource, /<template #overlay>/);
    assert.doesNotMatch(
      appSource,
      /<template v-if="!appUiStore\.isUniverseMode" #overlay>/,
    );
    assert.match(baseModalSource, /<RenderPortal>/);
    assert.match(baseModalSource, /z-index:\s*2147483000/);
  });

  it("lets transparent BaseModal backdrops receive outside clicks", () => {
    const clearBackdropRule =
      baseModalSource.match(/\.base-modal-backdrop--clear\s*{[\s\S]*?}/)?.[0] ??
      "";

    assert.match(clearBackdropRule, /background:\s*transparent/);
    assert.doesNotMatch(clearBackdropRule, /pointer-events:\s*none/);
  });

  it("maps command palette production panel intents to the new monitor", () => {
    assert.match(paletteSource, /AppGlobalAutomationMonitor\.vue/);
    assert.match(paletteSource, /production-panel\.open/);
    assert.match(paletteSource, /toggleAutomationMonitor/);
    assert.doesNotMatch(paletteSource, /AppProductionMonitor/);
  });

  it("adds API methods for global status and profile-scoped execution reads", () => {
    assert.match(apiSource, /getGlobalProductionStatus/);
    assert.match(apiSource, /profileId\?: string/);
    assert.match(apiSource, /PROFILE_WORKFLOW_EXECUTIONS/);
  });
});
