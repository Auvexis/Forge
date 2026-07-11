import type { PluginContext } from "@auvexis/fabric-sdk";

// ──────────── Telegram API Helper ────────────

const TELEGRAM_API_BASE = "https://api.telegram.org";

/**
 * Generic Telegram Bot API caller.
 *
 * Extracts the bot token from the plugin context, calls the specified endpoint,
 * and handles Telegram's consistent error response format (`{ ok: false, description }`).
 *
 * @param context - Plugin context injected by the Fabric executor
 * @param endpoint - Telegram API method name (e.g. "sendMessage", "sendDocument")
 * @param body - Request body (will be JSON-serialized)
 */
async function telegramApi(
  context: PluginContext,
  endpoint: string,
  body: Record<string, any>,
): Promise<any> {
  const token = context.credentials?.bot_token?.trim();

  if (!token) {
    throw new Error(
      "Telegram bot token is not configured. Go to Settings > Plugins > Telegram and enter your Bot Token."
    );
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json() as { ok: boolean; result?: any; description?: string; error_code?: number };

  if (!data.ok) {
    throw new Error(
      `Telegram API error on '${endpoint}': ${data.description ?? "Unknown error"} (code: ${data.error_code ?? response.status})`
    );
  }

  return data.result;
}

/**
 * Telegram API caller for multipart/form-data (file uploads).
 * Uses FormData so Node.js handles the multipart boundary automatically.
 */
async function telegramApiMultipart(
  context: PluginContext,
  endpoint: string,
  formData: FormData,
): Promise<any> {
  const token = context.credentials?.bot_token?.trim();

  if (!token) {
    throw new Error("Telegram bot token is not configured.");
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    body: formData,
    // Do NOT set Content-Type — browser/Node fetch sets it with correct boundary
  });

  const data = await response.json() as { ok: boolean; result?: any; description?: string; error_code?: number };

  if (!data.ok) {
    throw new Error(
      `Telegram API error on '${endpoint}': ${data.description ?? "Unknown error"} (code: ${data.error_code ?? response.status})`
    );
  }

  return data.result;
}

// ──────────── Input Helpers ────────────

/**
 * Parses the `options` field for sendPoll.
 * Accepts a JSON array string or a pre-parsed array.
 */
function parsePollOptions(options: string | string[]): string[] {
  if (Array.isArray(options)) return options;
  try {
    const parsed = JSON.parse(options);
    if (!Array.isArray(parsed)) throw new Error("Expected a JSON array");
    return parsed;
  } catch {
    throw new Error(
      "'options' must be a JSON array of strings (e.g. [\"Option A\", \"Option B\"]). Received: " + String(options)
    );
  }
}

/**
 * Parses the `replyMarkup` field for sendMessage.
 * Accepts a JSON object string or a pre-parsed object.
 */
function parseJsonField(value: string | object | undefined, fieldName: string): object | undefined {
  if (!value) return undefined;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value as string);
  } catch {
    throw new Error(`'${fieldName}' must be a valid JSON object. Received: ${String(value)}`);
  }
}

// ──────────── Methods ────────────

export function createTelegramMethods() {
  return {
    /**
     * Sends a text message to a Telegram chat.
     * Supports MarkdownV2 / HTML formatting, silent notifications, content protection,
     * and Inline Keyboard (reply_markup).
     */
    sendMessage: async (
      params: {
        chatId: string;
        text: string;
        useFormatting?: boolean;
        parseMode?: "MarkdownV2" | "HTML";
        disableNotification?: boolean;
        protectContent?: boolean;
        useKeyboard?: boolean;
        replyMarkup?: string | object;
      },
      context?: PluginContext,
    ) => {
      if (!params.chatId?.trim()) throw new Error("'chatId' is required.");
      if (!params.text?.trim()) throw new Error("'text' is required.");

      const body: Record<string, any> = {
        chat_id: params.chatId.trim(),
        text: params.text,
      };

      if (params.useFormatting && params.parseMode) {
        body.parse_mode = params.parseMode;
      }

      if (params.disableNotification) {
        body.disable_notification = true;
      }

      if (params.protectContent) {
        body.protect_content = true;
      }

      if (params.useKeyboard && params.replyMarkup) {
        body.reply_markup = parseJsonField(params.replyMarkup, "replyMarkup");
      }

      return telegramApi(context!, "sendMessage", body);
    },

    /**
     * Sends a document/file to a Telegram chat.
     * The `file` parameter accepts a raw Buffer from the Fabric pipeline
     * (the executor automatically unwraps `{ content: Buffer }` objects).
     */
    sendDocument: async (
      params: {
        chatId: string;
        file: Buffer;
        filename?: string;
        caption?: string;
        parseMode?: "MarkdownV2" | "HTML" | "";
      },
      context?: PluginContext,
    ) => {
      if (!params.chatId?.trim()) throw new Error("'chatId' is required.");
      if (!params.file) throw new Error("'file' is required. Connect a file output from a previous step.");

      if (!Buffer.isBuffer(params.file)) {
        throw new Error(
          "'file' must be a Buffer. Ensure the previous step returns a file/binary output and the parameter is mapped correctly."
        );
      }

      const formData = new FormData();
      formData.append("chat_id", params.chatId.trim());

      // Convert Buffer to Blob for FormData — cast buffer to ArrayBuffer to satisfy TS strict types
      const blob = new Blob([params.file.buffer as ArrayBuffer]);
      formData.append("document", blob, params.filename?.trim() || "file");

      if (params.caption?.trim()) {
        formData.append("caption", params.caption.trim());
        if (params.parseMode) formData.append("parse_mode", params.parseMode);
      }

      return telegramApiMultipart(context!, "sendDocument", formData);
    },

    /**
     * Sends a photo to a Telegram chat.
     * Accepts either a URL (for remote images) or a Buffer from the workflow pipeline.
     */
    sendPhoto: async (
      params: {
        chatId: string;
        useUrl?: boolean;
        photoUrl?: string;
        file?: Buffer;
        filename?: string;
        caption?: string;
        parseMode?: "MarkdownV2" | "HTML" | "";
      },
      context?: PluginContext,
    ) => {
      if (!params.chatId?.trim()) throw new Error("'chatId' is required.");

      if (params.useUrl) {
        // URL mode — send as a string reference (Telegram downloads it)
        if (!params.photoUrl?.trim()) throw new Error("'photoUrl' is required when 'useUrl' is enabled.");

        return telegramApi(context!, "sendPhoto", {
          chat_id: params.chatId.trim(),
          photo: params.photoUrl.trim(),
          ...(params.caption?.trim() && { caption: params.caption.trim() }),
          ...(params.parseMode && { parse_mode: params.parseMode }),
        });
      }

      // Buffer mode — send as multipart
      if (!params.file) throw new Error("'file' is required when URL mode is disabled.");
      if (!Buffer.isBuffer(params.file)) {
        throw new Error("'file' must be a Buffer from a previous workflow step.");
      }

      const formData = new FormData();
      formData.append("chat_id", params.chatId.trim());
      formData.append("photo", new Blob([params.file.buffer as ArrayBuffer]), params.filename?.trim() || "photo.jpg");

      if (params.caption?.trim()) {
        formData.append("caption", params.caption.trim());
        if (params.parseMode) formData.append("parse_mode", params.parseMode);
      }

      return telegramApiMultipart(context!, "sendPhoto", formData);
    },

    /**
     * Creates a poll in a Telegram chat.
     * Supports regular polls and quiz mode (with a correct answer).
     */
    sendPoll: async (
      params: {
        chatId: string;
        question: string;
        options: string | string[];
        isAnonymous?: boolean;
        allowsMultipleAnswers?: boolean;
        isQuiz?: boolean;
        correctOptionId?: number;
      },
      context?: PluginContext,
    ) => {
      if (!params.chatId?.trim()) throw new Error("'chatId' is required.");
      if (!params.question?.trim()) throw new Error("'question' is required.");

      const parsedOptions = parsePollOptions(params.options);
      if (parsedOptions.length < 2) {
        throw new Error("'options' must contain at least 2 items.");
      }
      if (parsedOptions.length > 10) {
        throw new Error("'options' cannot contain more than 10 items (Telegram limit).");
      }

      if (params.isQuiz && params.correctOptionId === undefined) {
        throw new Error("'correctOptionId' is required when 'isQuiz' is enabled.");
      }

      if (params.correctOptionId !== undefined) {
        if (params.correctOptionId < 0 || params.correctOptionId >= parsedOptions.length) {
          throw new Error(
            `'correctOptionId' (${params.correctOptionId}) is out of range. Must be between 0 and ${parsedOptions.length - 1}.`
          );
        }
      }

      const body: Record<string, any> = {
        chat_id: params.chatId.trim(),
        question: params.question.trim(),
        options: parsedOptions,
        // Default to anonymous polls (Telegram default)
        is_anonymous: params.isAnonymous !== false,
      };

      if (params.allowsMultipleAnswers) body.allows_multiple_answers = true;
      if (params.isQuiz) {
        body.type = "quiz";
        body.correct_option_id = params.correctOptionId;
      }

      return telegramApi(context!, "sendPoll", body);
    }
  };
}
