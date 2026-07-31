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
    if (typeof value === "string" && value.startsWith("artifact://")) return value;
    if (Array.isArray(value)) {
      const itemSchema = artifactItemSchema(schema);
      return Promise.all(value.map((item) => this.resolveValue(
        profileId,
        bindAvailableArtifact(item, itemSchema, available),
        itemSchema,
        available,
      )));
    }
    if (!isRecord(value) || Buffer.isBuffer(value)) return value;

    if (typeof value.ref === "string" && value.ref.startsWith("artifact://")) {
      const content = await this.artifacts.resolveReference(profileId, value.ref);
      const encoded = artifactEncoding(schema) === "base64"
        ? content.toString("base64")
        : content;
      return {
        name: normalizedName(value),
        mimeType: typeof value.mimeType === "string" && value.mimeType.trim()
          ? value.mimeType
          : "application/octet-stream",
        ...(typeof value.size === "number" ? { size: value.size } : {}),
        content: encoded,
      };
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
  return isRecord(schema.items) ? schema.items : {};
}

function isArtifactInput(schema: Record<string, any>): boolean {
  return schema["x-fabric-value-type"] === "file";
}

function hasArtifactContent(value: Record<string, any>): boolean {
  return typeof value.ref === "string" ||
    value.content !== undefined ||
    value.buffer !== undefined ||
    value.contentBase64 !== undefined ||
    value.data !== undefined;
}

function artifactEncoding(
  schema: Record<string, any>,
): "buffer" | "base64" {
  return schema["x-fabric-binary-encoding"] === "base64" ? "base64" : "buffer";
}

function normalizedName(value: Record<string, any>): string {
  const name = [value.name, value.fileName, value.filename]
    .find((candidate) => typeof candidate === "string" && candidate.trim());
  return typeof name === "string" ? name.trim() : "artifact.bin";
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
