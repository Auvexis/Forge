export interface SailorPluginErrorOptions {
  code: string;
  status?: number;
  details?: unknown;
}

export interface AssertHttpOkResponse {
  status: number;
  body?: unknown;
}

export class SailorPluginError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, options: SailorPluginErrorOptions) {
    super(message);
    this.name = "SailorPluginError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

export function assertHttpOk(
  response: AssertHttpOkResponse,
  statusMessages: Record<number, string> = {},
): void {
  if (response.status >= 200 && response.status < 300) {
    return;
  }

  throw new SailorPluginError(
    statusMessages[response.status] ?? `HTTP request failed with status ${response.status}`,
    {
      code: `HTTP_${response.status}`,
      status: response.status,
      details: response.body,
    },
  );
}
