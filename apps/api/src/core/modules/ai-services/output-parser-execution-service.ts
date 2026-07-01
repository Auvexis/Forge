import { Ajv } from "ajv/dist/ajv.js";

export class OutputParserExecutionService {
  private readonly validate: ReturnType<Ajv["compile"]>;

  constructor(schema: Record<string, unknown>, strict: boolean) {
    this.validate = new Ajv({ allErrors: true, strict }).compile(schema);
  }

  async parse(value: string): Promise<unknown> {
    const source = stripJsonFence(value);
    let parsed: unknown;
    try {
      parsed = JSON.parse(source);
    } catch {
      throw new Error("Structured JSON Parser could not parse JSON");
    }

    if (!this.validate(parsed)) {
      const error = this.validate.errors?.[0];
      const path = error?.instancePath || "/";
      throw new Error(`Structured JSON Parser validation failed at ${path}: ${error?.message ?? "invalid value"}`);
    }
    return parsed;
  }
}

function stripJsonFence(value: string): string {
  const match = value.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() ?? value.trim();
}
