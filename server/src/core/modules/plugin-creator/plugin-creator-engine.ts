import type { PluginBlueprint } from "./plugin-blueprint-types.ts";
import type { PluginBlueprintRepository } from "./plugin-blueprint-repository.ts";
import type {
  CreatePluginBlueprintInput,
  PluginScaffoldService,
} from "./plugin-scaffold-service.ts";

export interface PluginCreatorEngineDependencies {
  repository: PluginBlueprintRepository;
  scaffold: PluginScaffoldService;
}

export class PluginCreatorEngine {
  private readonly repository: PluginBlueprintRepository;
  private readonly scaffold: PluginScaffoldService;

  constructor(dependencies: PluginCreatorEngineDependencies) {
    this.repository = dependencies.repository;
    this.scaffold = dependencies.scaffold;
  }

  listBlueprints(): PluginBlueprint[] {
    return this.repository.list();
  }

  createBlueprint(input: CreatePluginBlueprintInput): PluginBlueprint {
    const blueprint = this.scaffold.createBlueprint(input);
    this.repository.create(blueprint);
    return blueprint;
  }

  getBlueprint(id: string): PluginBlueprint | null {
    return this.repository.get(id);
  }

  updateBlueprint(id: string, blueprint: PluginBlueprint): PluginBlueprint {
    this.repository.update(id, blueprint);
    const updated = this.repository.get(id);
    if (!updated) {
      throw new Error("Blueprint update failed");
    }
    return updated;
  }
}
