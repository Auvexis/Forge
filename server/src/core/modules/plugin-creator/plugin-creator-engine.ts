import type { PluginBlueprint } from "./plugin-blueprint-types.ts";
import type { PluginBlueprintRepository } from "./plugin-blueprint-repository.ts";
import type { PluginTestRunner } from "./plugin-test-runner.ts";
import type { ProfilePaths } from "../../profiles/profile-paths.ts";
import { generateCompletePlugin } from "./plugin-code-generator.ts";
import type {
  CreatePluginBlueprintInput,
  PluginScaffoldService,
} from "./plugin-scaffold-service.ts";

export interface PluginCreatorEngineDependencies {
  repository: PluginBlueprintRepository;
  scaffold: PluginScaffoldService;
  testRunner?: PluginTestRunner;
  profilePaths?: ProfilePaths;
}

export interface TestPluginMethodInput {
  methodId: string;
  params: Record<string, unknown>;
  credentials: Record<string, unknown>;
  timeoutMs?: number;
}

export interface PluginCreatorGeneratedPreview {
  files: Array<{
    relativePath: string;
    content: string;
  }>;
}

export class PluginCreatorEngine {
  private readonly repository: PluginBlueprintRepository;
  private readonly scaffold: PluginScaffoldService;
  private readonly testRunner?: PluginTestRunner;
  private readonly profilePaths?: ProfilePaths;

  constructor(dependencies: PluginCreatorEngineDependencies) {
    this.repository = dependencies.repository;
    this.scaffold = dependencies.scaffold;
    this.testRunner = dependencies.testRunner;
    this.profilePaths = dependencies.profilePaths;
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

  async testMethod(blueprintId: string, input: TestPluginMethodInput) {
    if (!this.testRunner) {
      throw new Error("Plugin test runner is not configured");
    }

    const blueprint = this.getBlueprint(blueprintId);
    if (!blueprint) {
      throw new Error("blueprint_not_found");
    }

    const method = blueprint.methods.find((candidate) => candidate.id === input.methodId);
    if (!method) {
      throw new Error("method_not_found");
    }

    return this.testRunner.run({
      blueprintId,
      methodId: input.methodId,
      request: method.request,
      params: input.params,
      credentials: input.credentials,
      timeoutMs: input.timeoutMs,
    });
  }

  generatePreview(blueprintId: string): PluginCreatorGeneratedPreview {
    if (!this.profilePaths) {
      throw new Error("Plugin creator profile paths are not configured");
    }

    const blueprint = this.getBlueprint(blueprintId);
    if (!blueprint) {
      throw new Error("blueprint_not_found");
    }

    const generated = generateCompletePlugin({
      profilePaths: this.profilePaths,
      blueprint,
    });

    return {
      files: generated.files.map((file) => ({
        relativePath: file.relativePath,
        content: file.content ?? "",
      })),
    };
  }
}
