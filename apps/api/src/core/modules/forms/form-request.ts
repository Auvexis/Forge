export async function parseFormRequestBody(
  req: any,
): Promise<Record<string, unknown>> {
  if (typeof req.isMultipart === "function" && req.isMultipart()) {
    const body: Record<string, unknown> = {};
    const appendValue = (key: string, value: unknown) => {
      const existing = body[key];
      if (existing === undefined) {
        body[key] = value;
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        body[key] = [existing, value];
      }
    };

    for await (const part of req.parts()) {
      if (part.type === "file") {
        const buffer = await part.toBuffer();
        appendValue(part.fieldname, {
          filename: part.filename,
          mimetype: part.mimetype,
          size: buffer.length,
          buffer,
        });
      } else {
        appendValue(part.fieldname, part.value);
      }
    }
    return body;
  }

  return (req.body as Record<string, unknown>) ?? {};
}
