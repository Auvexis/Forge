import type { PluginBlueprint } from "./plugin-blueprint-types.ts";
import type { PluginBlueprintRepository } from "./plugin-blueprint-repository.ts";
import type { PluginTestRunner } from "./plugin-test-runner.ts";
import type { ProfilePaths } from "../../profiles/profile-paths.ts";
import { generateCompletePlugin } from "./plugin-code-generator.ts";
import type { PluginVersionService } from "./plugin-version-service.ts";
import type { PluginPublishService } from "./plugin-publish-service.ts";
import type { PluginExportService } from "./plugin-export-service.ts";
import type {
  CreatePluginBlueprintInput,
  PluginScaffoldService,
} from "./plugin-scaffold-service.ts";
import { buildPluginMethodPlans } from "./plugin-method-plan.ts";
import { PluginMethodPlanRunner } from "./plugin-method-plan-runner.ts";

export interface PluginCreatorEngineDependencies {
  repository: PluginBlueprintRepository;
  scaffold: PluginScaffoldService;
  testRunner?: PluginTestRunner;
  profilePaths?: ProfilePaths;
  versionService?: PluginVersionService;
  publishService?: PluginPublishService;
  exportService?: PluginExportService;
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
  private readonly versionService?: PluginVersionService;
  private readonly publishService?: PluginPublishService;
  private readonly exportService?: PluginExportService;

  constructor(dependencies: PluginCreatorEngineDependencies) {
    this.repository = dependencies.repository;
    this.scaffold = dependencies.scaffold;
    this.testRunner = dependencies.testRunner;
    this.profilePaths = dependencies.profilePaths;
    this.versionService = dependencies.versionService;
    this.publishService = dependencies.publishService;
    this.exportService = dependencies.exportService;
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
    this.versionService?.createSnapshot(updated, "manual-save");
    return updated;
  }

  async testMethod(blueprintId: string, input: TestPluginMethodInput) {
    const blueprint = this.getBlueprint(blueprintId);
    if (!blueprint) {
      throw new Error("blueprint_not_found");
    }

    const method = blueprint.methods.find((candidate) => candidate.id === input.methodId);
    if (!method) {
      throw new Error("method_not_found");
    }

    const plan = buildPluginMethodPlans(blueprint).find((candidate) => candidate.methodId === method.id);
    if (!plan) {
      throw new Error("method_plan_not_found");
    }

    return new PluginMethodPlanRunner({ repository: this.repository }).run({
      blueprint,
      method,
      plan,
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

  listVersions(blueprintId: string) {
    if (!this.versionService) {
      throw new Error("Plugin version service is not configured");
    }

    if (!this.getBlueprint(blueprintId)) {
      throw new Error("blueprint_not_found");
    }

    return {
      snapshots: this.versionService.listSnapshots(blueprintId),
      releases: this.publishService?.listReleases(blueprintId) ?? [],
    };
  }

  rollback(blueprintId: string, snapshotId: string): PluginBlueprint {
    if (!this.versionService) {
      throw new Error("Plugin version service is not configured");
    }

    return this.versionService.rollback(blueprintId, snapshotId);
  }

  publish(blueprintId: string) {
    if (!this.publishService) {
      throw new Error("Plugin publish service is not configured");
    }

    return this.publishService.publish(blueprintId);
  }

  exportZip(blueprintId: string) {
    if (!this.exportService) {
      throw new Error("Plugin export service is not configured");
    }

    const blueprint = this.getBlueprint(blueprintId);
    if (!blueprint) {
      throw new Error("blueprint_not_found");
    }

    return this.exportService.exportZip(blueprintId, blueprint.metadata.version);
  }
}
