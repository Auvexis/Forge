import {
  DevWorkflowSessionManager,
  type DevWorkflowSessionManagerOptions,
} from "./dev-workflow-session-manager.ts";
import { devSessionEventBus, SessionEventBus } from "./session-event-bus.ts";
import { activeProfileRuntime } from "../../../profiles/active-profile-runtime.ts";

export interface DevWorkflowSessionRuntime {
  manager: DevWorkflowSessionManager;
  eventBus: SessionEventBus;
}

export function createDevWorkflowSessionRuntime(
  options: DevWorkflowSessionManagerOptions = {},
): DevWorkflowSessionRuntime {
  const eventBus = new SessionEventBus();
  const manager = new DevWorkflowSessionManager({
    ...options,
    onEvent: (event) => {
      eventBus.emitSessionEvent(event);
      options.onEvent?.(event);
    },
  });

  return { manager, eventBus };
}

export const devWorkflowSessionRuntime: DevWorkflowSessionRuntime = (() => {
  const manager = new DevWorkflowSessionManager({
    runWithProfile: (profileId, callback) =>
      activeProfileRuntime.profileScopeRunner.runWithProfile(profileId, callback),
    onEvent: (event) => devSessionEventBus.emitSessionEvent(event),
  });

  return {
    manager,
    eventBus: devSessionEventBus,
  };
})();
