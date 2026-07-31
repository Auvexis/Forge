import {
  isRecord,
  OpaqueProviderContinuationAdapter,
} from "./agent-provider-continuation-adapter.ts";

export class OllamaContinuationAdapter extends OpaqueProviderContinuationAdapter {
  readonly provider = "ollama";

  protected capturePayload(response: Record<string, unknown>) {
    return this.pick(response, ["context"]);
  }
}

export class OpenAiContinuationAdapter extends OpaqueProviderContinuationAdapter {
  readonly provider = "openai";

  protected capturePayload(response: Record<string, unknown>) {
    const output = Array.isArray(response.output)
      ? response.output.filter(isRecord).flatMap((item) =>
        typeof item.encrypted_content === "string"
          ? [{ encryptedContent: item.encrypted_content }]
          : []
      )
      : [];
    return {
      ...this.pick(response, ["id", "previous_response_id"]),
      ...(output.length ? { privateReasoning: output } : {}),
    };
  }
}

export class AnthropicContinuationAdapter extends OpaqueProviderContinuationAdapter {
  readonly provider = "anthropic";

  protected capturePayload(response: Record<string, unknown>) {
    const content = Array.isArray(response.content)
      ? response.content.filter(isRecord).flatMap((item) =>
        item.type === "thinking" && typeof item.signature === "string"
          ? [{ signature: item.signature }]
          : []
      )
      : [];
    return {
      ...this.pick(response, ["container"]),
      ...(content.length ? { privateReasoning: content } : {}),
    };
  }
}

export class GeminiContinuationAdapter extends OpaqueProviderContinuationAdapter {
  readonly provider = "gemini";

  protected capturePayload(response: Record<string, unknown>) {
    const signatures = collectValues(response, "thoughtSignature");
    return signatures.length ? { privateReasoning: signatures } : {};
  }
}

export class DeepSeekContinuationAdapter extends OpaqueProviderContinuationAdapter {
  readonly provider = "deepseek";

  protected capturePayload(response: Record<string, unknown>) {
    const reasoning = collectValues(response, "reasoning_content");
    return {
      ...this.pick(response, ["id"]),
      ...(reasoning.length ? { privateReasoning: reasoning } : {}),
    };
  }
}

function collectValues(value: unknown, key: string): unknown[] {
  if (Array.isArray(value)) return value.flatMap((item) => collectValues(item, key));
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([childKey, child]) => [
    ...(childKey === key ? [structuredClone(child)] : []),
    ...collectValues(child, key),
  ]);
}
