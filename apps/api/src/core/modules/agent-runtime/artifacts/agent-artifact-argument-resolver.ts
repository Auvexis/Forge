import type { AgentArtifactService } from "./agent-artifact-service.ts";

export class AgentArtifactArgumentResolver {
  constructor(private readonly artifacts: AgentArtifactService) {}

  async resolve(
    profileId: string,
    value: unknown,
    schema: Record<string, any> = {},
  ): Promise<unknown> {
    if (typeof value === "string" && value.startsWith("artifact://")) {
      const content = await this.artifacts.resolveReference(profileId, value);
      return artifactEncoding(schema) === "base64" ? content.toString("base64") : content;
    }
    if (Array.isArray(value)) {
      const itemSchema = isRecord(schema.items) ? schema.items : {};
      return Promise.all(value.map((item) => this.resolve(profileId, item, itemSchema)));
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
        await this.resolve(
          profileId,
          child,
          isRecord(properties[key]) ? properties[key] as Record<string, any> : {},
        ),
      ] as const),
    ));
  }
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
