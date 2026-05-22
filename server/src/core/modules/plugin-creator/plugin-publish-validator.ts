import ts from "typescript";

import type { ProfilePaths } from "../../profiles/profile-paths.ts";
import type { PluginBlueprint } from "./plugin-blueprint-types.ts";
import { generateCompletePlugin } from "./plugin-code-generator.ts";

export interface PluginPublishValidationInput {
  profilePaths: ProfilePaths;
  blueprint: PluginBlueprint;
}

export type PluginPublishValidationResult =
  | { success: true }
  | { success: false; error: string };

export function validatePluginCreatorPublish(
  input: PluginPublishValidationInput,
): PluginPublishValidationResult {
  try {
    const generated = generateCompletePlugin({
      profilePaths: input.profilePaths,
      blueprint: input.blueprint,
    });
    const methodsSource = generated.files.find((file) => file.relativePath === "methods.ts")?.content;
    if (methodsSource) {
      const diagnostics = ts.transpileModule(methodsSource, {
        compilerOptions: {
          module: ts.ModuleKind.NodeNext,
          target: ts.ScriptTarget.ES2022,
          moduleResolution: ts.ModuleResolutionKind.NodeNext,
        },
        reportDiagnostics: true,
      }).diagnostics ?? [];

      const blocking = diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
      if (blocking.length > 0) {
        return { success: false, error: ts.flattenDiagnosticMessageText(blocking[0]!.messageText, "\n") };
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "publish_validation_failed",
    };
  }
}
