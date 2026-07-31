import type { AgentArtifactService } from "./agent-artifact-service.ts";
import type { AgentArtifactRef } from "../contracts/agent-domain-contracts.ts";

type AvailableArtifact = Pick<AgentArtifactRef, "ref" | "name" | "mimeType" | "size">;

export class AgentArtifactArgumentResolver {
  constructor(private readonly artifacts: AgentArtifactService) {}

  async resolve(
    profileId: string,
    value: unknown,
    schema: Record<string, any> = {},
    runId?: string,
  ): Promise<unknown> {
    const available = runId ? this.artifacts.listRunReferences(profileId, runId) : [];
    return this.resolveValue(profileId, value, schema, available);
  }

  private async resolveValue(
    profileId: string,
    value: unknown,
    schema: Record<string, any>,
    available: AvailableArtifact[],
  ): Promise<unknown> {
    if (typeof value === "string" && value.startsWith("artifact://")) {
      const content = await this.artifacts.resolveReference(profileId, value);
      return artifactEncoding(schema) === "base64" ? content.toString("base64") : content;
    }
    if (Array.isArray(value)) {
      const itemSchema = artifactItemSchema(schema);
      return Promise.all(value.map((item) => this.resolveValue(
        profileId,
        bindAvailableArtifact(item, schema, available),
        itemSchema,
        available,
      )));
    }
    if (!isRecord(value) || Buffer.isBuffer(value)) return value;

    if (typeof value.ref === "string" && value.ref.startsWith("artifact://")) {
      const content = await this.artifacts.resolveReference(profileId, value.ref);
      const field = artifactContentField(schema);
      const encoded = artifactEncoding(schema, field) === "base64"
        ? content.toString("base64")
        : content;
      const { ref: _ref, ...metadata } = value;
      return { ...metadata, [field]: encoded };
    }

    const properties = isRecord(schema.properties) ? schema.properties : {};
    return Object.fromEntries(await Promise.all(
      Object.entries(value).map(async ([key, child]) => [
        key,
        await this.resolveValue(
          profileId,
          child,
          isRecord(properties[key]) ? properties[key] as Record<string, any> : {},
          available,
        ),
      ] as const),
    ));
  }
}

function bindAvailableArtifact(
  value: unknown,
  schema: Record<string, any>,
  available: AvailableArtifact[],
): unknown {
  if (!isArtifactInput(schema) || !isRecord(value) || hasArtifactContent(value)) return value;
  const requestedName = [value.filename, value.fileName, value.name]
    .find((candidate) => typeof candidate === "string" && candidate.trim()) as string | undefined;
  const matching = requestedName
    ? available.filter((artifact) => artifact.name.localeCompare(requestedName, undefined, { sensitivity: "accent" }) === 0)
    : available;
  if (matching.length !== 1) return value;
  const artifact = matching[0]!;
  return {
    ...value,
    ref: artifact.ref,
    ...(!value.filename && !value.fileName && !value.name ? { name: artifact.name } : {}),
    ...(!value.mimeType && artifact.mimeType ? { mimeType: artifact.mimeType } : {}),
  };
}

function artifactItemSchema(schema: Record<string, any>): Record<string, any> {
  const itemSchema = isRecord(schema.items) ? schema.items : {};
  return {
    ...itemSchema,
    ...(schema["x-fabric-artifact-content-field"]
      ? { "x-fabric-artifact-content-field": schema["x-fabric-artifact-content-field"] }
      : {}),
    ...(schema["x-fabric-artifact-encoding"]
      ? { "x-fabric-artifact-encoding": schema["x-fabric-artifact-encoding"] }
      : {}),
  };
}

function isArtifactInput(schema: Record<string, any>): boolean {
  return schema["x-fabric-artifact-input"] === true ||
    schema["x-input-type"] === "file" ||
    schema["x-input-type"] === "files";
}

function hasArtifactContent(value: Record<string, any>): boolean {
  return typeof value.ref === "string" ||
    value.content !== undefined ||
    value.buffer !== undefined ||
    value.contentBase64 !== undefined ||
    value.data !== undefined;
}

function artifactContentField(schema: Record<string, any>): string {
  const configured = schema["x-fabric-artifact-content-field"];
  return typeof configured === "string" && /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/.test(configured)
    ? configured
    : "content";
}

function artifactEncoding(
  schema: Record<string, any>,
  field?: string,
): "buffer" | "base64" {
  if (schema["x-fabric-artifact-encoding"] === "base64" || field === "contentBase64") {
    return "base64";
  }
  return "buffer";
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
