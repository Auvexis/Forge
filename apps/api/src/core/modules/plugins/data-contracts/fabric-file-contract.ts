type Schema = Record<string, any>;

export function projectPluginSchemaForAgent(schema: Schema): Schema {
  if (isFileSchema(schema)) {
    return {
      type: "object",
      description: schema.description,
      properties: {
        ref: { type: "string", description: "Artifact reference returned by a previous tool." },
        name: { type: "string", description: "File name." },
        mimeType: { type: "string", description: "File MIME type." },
        size: { type: "number", description: "File size in bytes." },
      },
      additionalProperties: false,
    };
  }

  const projected = { ...schema };
  if (isSchema(schema.items)) projected.items = projectPluginSchemaForAgent(schema.items);
  if (isSchema(schema.properties)) {
    projected.properties = Object.fromEntries(Object.entries(schema.properties).map(
      ([key, child]) => [key, isSchema(child) ? projectPluginSchemaForAgent(child) : child],
    ));
  }
  return projected;
}

export function materializePluginData(value: unknown, schema: Schema, path = "root"): unknown {
  if (isFileSchema(schema)) return materializeFile(value, schema, path);
  if (Array.isArray(value)) {
    const itemSchema = isSchema(schema.items) ? schema.items : {};
    return value.map((item, index) => materializePluginData(item, itemSchema, `${path}[${index}]`));
  }
  if (!isRecord(value) || Buffer.isBuffer(value)) return value;
  const properties = isSchema(schema.properties) ? schema.properties : {};
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    materializePluginData(child, isSchema(properties[key]) ? properties[key] : {}, `${path}.${key}`),
  ]));
}

function materializeFile(value: unknown, schema: Schema, path: string): unknown {
  if (!isRecord(value) || Buffer.isBuffer(value)) {
    throw new TypeError(`${path} must be a Fabric file object`);
  }
  const name = value.name;
  const mimeType = value.mimeType;
  if (typeof name !== "string" || !name.trim()) throw new TypeError(`${path}.name must be a non-empty string`);
  if (typeof mimeType !== "string" || !mimeType.trim()) throw new TypeError(`${path}.mimeType must be a non-empty string`);

  const encoding = schema["x-fabric-binary-encoding"];
  const content = value.content;
  let normalized: Buffer | string;
  if (encoding === "buffer") {
    if (Buffer.isBuffer(content)) normalized = content;
    else if (isBase64(content)) normalized = Buffer.from(content, "base64");
    else throw new TypeError(`${path}.content must be a Buffer or valid Base64 string`);
  } else if (encoding === "base64") {
    if (Buffer.isBuffer(content)) normalized = content.toString("base64");
    else if (isBase64(content)) normalized = content;
    else throw new TypeError(`${path}.content must be a Buffer or valid Base64 string`);
  } else {
    throw new TypeError(`${path} has an unsupported binary encoding`);
  }

  return {
    name: name.trim(),
    mimeType: mimeType.trim(),
    ...(typeof value.size === "number" ? { size: value.size } : {}),
    content: normalized,
  };
}

function isFileSchema(schema: Schema): boolean {
  return schema["x-fabric-value-type"] === "file";
}

function isBase64(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]*={0,2}$/.test(value) && Buffer.from(value, "base64").toString("base64") === value;
}

function isSchema(value: unknown): value is Schema {
  return isRecord(value);
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
