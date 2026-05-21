import type {
  CredentialProvider,
  CredentialSchema,
  JSONSchemaObject,
  JSONSchemaProperty,
  JSONSchemaResponse,
  PluginManifest,
} from "@auvexis/sailor-sdk";

import type {
  PluginBlueprint,
  PluginBlueprintInput,
  PluginBlueprintInputType,
  PluginBlueprintOutputType,
  PluginBlueprintResponseMapping,
} from "./plugin-blueprint-types.ts";

export interface GeneratePluginManifestOptions {
  creatorVersion?: string;
}

export type GeneratedPluginManifest = PluginManifest & {
  "x-created-by": "sailor-plugin-creator";
  "x-creator-version": string;
  "x-editable-low-code": true;
};

export function generatePluginManifest(
  blueprint: PluginBlueprint,
  options: GeneratePluginManifestOptions = {},
): GeneratedPluginManifest {
  const manifest: GeneratedPluginManifest = {
    metadata: {
      id: blueprint.metadata.handle,
      name: blueprint.metadata.name,
      description: blueprint.metadata.description,
      icon: blueprint.icons.icon,
      iconDark: blueprint.icons.iconDark,
      iconLight: blueprint.icons.iconLight,
      category: blueprint.metadata.category ?? "Custom",
      author: blueprint.metadata.author ?? "Sailor",
      version: blueprint.metadata.version,
      repository: blueprint.metadata.repository ?? "",
      ...(blueprint.metadata.homepage ? { homepage: blueprint.metadata.homepage } : {}),
      ...(blueprint.metadata.docsUrl ? { docsUrl: blueprint.metadata.docsUrl } : {}),
      ...(blueprint.metadata.tags?.length ? { tags: blueprint.metadata.tags } : {}),
    },
    methods: Object.fromEntries(
      blueprint.methods.map((method) => [
        method.handle,
        {
          metadata: {
            label: method.name,
            description: method.description,
          },
          parameters: inputsToParameters(method.inputs),
          responseSchema: responseMappingsToSchema(method.responseMapping),
        },
      ]),
    ),
    "x-created-by": "sailor-plugin-creator",
    "x-creator-version": options.creatorVersion ?? "1.0.0",
    "x-editable-low-code": true,
  };

  return manifest;
}

export function generatePluginAuthProvider(blueprint: PluginBlueprint): CredentialProvider {
  if (blueprint.auth.type === "none") {
    return { type: "none", credentialSchema: {} };
  }

  const credentialSchema: CredentialSchema = Object.fromEntries(
    blueprint.auth.fields.map((field) => [
      field.name,
      {
        type: "string",
        inputType: "password",
        label: field.label,
        description: field.description,
        required: field.required ?? true,
        placeholder: undefined,
      },
    ]),
  );

  return {
    type: "api_key",
    credentialSchema,
  };
}

function inputsToParameters(inputs: PluginBlueprintInput[]): JSONSchemaObject {
  const properties = Object.fromEntries(
    inputs.map((input) => [input.name, inputToSchemaProperty(input)]),
  );
  const required = inputs.filter((input) => input.required).map((input) => input.name);

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

function inputToSchemaProperty(input: PluginBlueprintInput): JSONSchemaProperty {
  const property: JSONSchemaProperty = {
    type: inputTypeToJsonSchemaType(input.type),
    description: input.description,
    default: input.default,
    "x-input-type": inputTypeToUiInputType(input.type),
    "x-label": humanizeFieldName(input.name),
  };

  if (input.type === "select" && input.options) {
    property.enum = input.options.map((option) => option.value);
  }

  if (input.type === "array") {
    property.items = { type: "object" };
  }

  if (input.type === "object") {
    property.additionalProperties = true;
  }

  return removeUndefined(property);
}

function responseMappingsToSchema(mappings: PluginBlueprintResponseMapping[]): JSONSchemaResponse {
  const properties = Object.fromEntries(
    mappings.map((mapping) => [mapping.outputName, outputToSchemaProperty(mapping.type)]),
  );
  const required = mappings
    .filter((mapping) => mapping.required)
    .map((mapping) => mapping.outputName);

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

function outputToSchemaProperty(type: PluginBlueprintOutputType): JSONSchemaProperty {
  if (type === "array") {
    return { type: "array", items: { type: "object" } };
  }

  if (type === "select") {
    return { type: "string" };
  }

  return { type };
}

function inputTypeToJsonSchemaType(type: PluginBlueprintInputType): JSONSchemaProperty["type"] {
  if (type === "select" || type === "file") return "string";
  return type;
}

function inputTypeToUiInputType(type: PluginBlueprintInputType): JSONSchemaProperty["x-input-type"] {
  if (type === "string") return "text";
  if (type === "boolean") return "toggle";
  if (type === "object" || type === "array") return "json";
  return type;
}

function humanizeFieldName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function removeUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, entryValue]) => entryValue !== undefined),
  ) as T;
}
