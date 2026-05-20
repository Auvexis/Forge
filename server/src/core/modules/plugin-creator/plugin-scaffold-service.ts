import { randomUUID } from "node:crypto";

import type {
  PluginBlueprint,
  PluginBlueprintCanvas,
  PluginBlueprintMethod,
  PluginBlueprintNode,
} from "./plugin-blueprint-types.ts";
import { parsePluginBlueprint, validateMethodHandle, validatePluginHandle } from "./plugin-blueprint-validation.ts";

export interface CreatePluginBlueprintInput {
  handle: string;
  name: string;
  description: string;
  icon?: string;
  iconDark?: string;
  iconLight?: string;
  includeDefaultMethod?: boolean;
}

export interface CreateDefaultMethodInput {
  handle?: string;
  name?: string;
  description?: string;
  category?: string;
}

export interface PluginScaffoldServiceDependencies {
  createId?: (prefix: string) => string;
  now?: () => string;
}

export class PluginScaffoldService {
  private readonly createId: (prefix: string) => string;
  private readonly now: () => string;

  constructor(dependencies: PluginScaffoldServiceDependencies = {}) {
    this.createId = dependencies.createId ?? ((prefix) => `${prefix}_${randomUUID()}`);
    this.now = dependencies.now ?? (() => new Date().toISOString());
  }

  createBlueprint(input: CreatePluginBlueprintInput): PluginBlueprint {
    const timestamp = this.now();
    const methods = input.includeDefaultMethod ? [this.createDefaultMethod()] : [];
    const canvas = input.includeDefaultMethod && methods[0]
      ? this.createDefaultMethodCanvas(methods[0].id)
      : { nodes: {}, edges: [] };

    return parsePluginBlueprint({
      id: this.createId("bp"),
      metadata: {
        handle: validatePluginHandle(input.handle),
        name: input.name,
        version: "0.1.0",
        description: input.description,
      },
      icons: {
        icon: input.icon,
        iconDark: input.iconDark,
        iconLight: input.iconLight,
      },
      auth: { type: "none", fields: [] },
      methods,
      canvas,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  createDefaultMethod(input: CreateDefaultMethodInput = {}): PluginBlueprintMethod {
    const handle = validateMethodHandle(input.handle ?? "callApi");

    return {
      id: this.createId("method"),
      handle,
      name: input.name ?? "Call API",
      description: input.description ?? "Call an external API endpoint",
      category: input.category,
      inputs: [],
      request: {
        method: "GET",
        url: "https://api.example.com",
        headers: [],
        query: [],
        body: { type: "none" },
      },
      responseMapping: [],
      errorMapping: [],
    };
  }

  private createDefaultMethodCanvas(methodId: string): PluginBlueprintCanvas {
    const methodNode = createNode(this.createId("node_method"), "method", 0, 0, { methodId });
    const inputsNode = createNode(this.createId("node_inputs"), "input", 280, -90, { methodId });
    const requestNode = createNode(this.createId("node_request"), "request", 280, 90, { methodId });
    const responseNode = createNode(this.createId("node_response"), "responseMapper", 560, 90, { methodId });
    const outputNode = createNode(this.createId("node_output"), "output", 840, 90, { methodId });

    return {
      nodes: {
        [methodNode.id]: methodNode,
        [inputsNode.id]: inputsNode,
        [requestNode.id]: requestNode,
        [responseNode.id]: responseNode,
        [outputNode.id]: outputNode,
      },
      edges: [
        { id: "edge_inputs_request", source: inputsNode.id, target: requestNode.id },
        { id: "edge_request_response", source: requestNode.id, target: responseNode.id },
        { id: "edge_response_output", source: responseNode.id, target: outputNode.id },
      ],
    };
  }
}

function createNode(
  id: string,
  type: PluginBlueprintNode["type"],
  x: number,
  y: number,
  data: Record<string, unknown>,
): PluginBlueprintNode {
  return {
    id,
    type,
    position: { x, y },
    data,
  };
}
