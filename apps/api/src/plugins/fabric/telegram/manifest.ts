import { definePluginManifest } from "@auvexis/fabric-sdk";

export default definePluginManifest({
  "metadata": {
    "id": "telegram",
    "name": "Telegram",
    "description": "Send messages, files, photos, and polls via a Telegram Bot. Supports webhooks for receiving user updates.",
    "icon": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/telegram.svg",
    "categories": [
      "Apps"
    ],
    "author": "Fabric",
    "version": "1.0.0",
    "repository": "https://github.com/Auvexis/fabric"
  },
  "methods": {
    "sendMessage": {
      "metadata": {
        "label": "Send Message",
        "description": "Sends a text message to a Telegram chat. Supports MarkdownV2/HTML formatting, silent notifications, content protection, and interactive inline keyboards."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "chatId": {
            "type": "string",
            "description": "The Telegram Chat ID, channel username (e.g. @mychannel), or user ID to send the message to.",
            "x-label": "Chat ID",
            "x-input-type": "text"
          },
          "text": {
            "type": "string",
            "description": "The text content of the message. Supports plain text or formatting if parseMode is enabled.",
            "x-label": "Message Text",
            "x-input-type": "textarea"
          },
          "useFormatting": {
            "type": "boolean",
            "description": "Enable message formatting (MarkdownV2 or HTML). When disabled, the text is sent as plain text.",
            "default": false,
            "x-label": "Enable Formatting",
            "x-input-type": "toggle"
          },
          "parseMode": {
            "type": "string",
            "description": "Formatting mode. MarkdownV2 supports bold, italic, code blocks and more. HTML supports <b>, <i>, <code> tags.",
            "enum": [
              "MarkdownV2",
              "HTML"
            ],
            "x-label": "Parse Mode",
            "x-input-type": "select",
            "x-visible-if": {
              "field": "useFormatting",
              "operator": "equals",
              "value": true
            }
          },
          "disableNotification": {
            "type": "boolean",
            "description": "Send the message silently â€” the recipient will receive a notification with no sound.",
            "default": false,
            "x-label": "Silent Notification",
            "x-input-type": "toggle"
          },
          "protectContent": {
            "type": "boolean",
            "description": "Prevent the message content from being forwarded or saved by the recipient.",
            "default": false,
            "x-label": "Protect Content",
            "x-input-type": "toggle"
          },
          "useKeyboard": {
            "type": "boolean",
            "description": "Attach an inline keyboard with clickable buttons to the message.",
            "default": false,
            "x-label": "Add Inline Keyboard",
            "x-input-type": "toggle"
          },
          "replyMarkup": {
            "type": "string",
            "description": "Inline keyboard definition as a JSON object (InlineKeyboardMarkup). Example: {\"inline_keyboard\": [[{\"text\": \"Yes\", \"callback_data\": \"yes\"}]]}",
            "x-label": "Keyboard JSON",
            "x-input-type": "json",
            "x-visible-if": {
              "field": "useKeyboard",
              "operator": "equals",
              "value": true
            }
          }
        },
        "required": [
          "chatId",
          "text"
        ]
      },
      "responseSchema": {
        "type": "object",
        "properties": {
          "message_id": {
            "type": "number",
            "x-label": "Message ID"
          },
          "date": {
            "type": "number",
            "x-label": "Date (Unix)"
          },
          "text": {
            "type": "string",
            "x-label": "Text"
          },
          "chat": {
            "type": "object",
            "x-label": "Chat"
          }
        }
      },
      "agentTool": {
        "enabled": true,
        "name": "telegram_send_message",
        "description": "Sends a text message to a Telegram chat. Supports MarkdownV2/HTML formatting, silent notifications, content protection, and interactive inline keyboards.",
        "sideEffect": "external-message",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "sendDocument": {
      "metadata": {
        "label": "Send Document",
        "description": "Sends a file to a Telegram chat. Connect to a previous step that outputs a file (e.g. Drive Download, HTTP Request) to pipe binary data directly."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "chatId": {
            "type": "string",
            "description": "The Telegram Chat ID or channel username.",
            "x-label": "Chat ID",
            "x-input-type": "text"
          },
          "file": {
            "type": "object",
            "x-fabric-value-type": "file",
            "x-fabric-binary-encoding": "buffer",
            "description": "Canonical Fabric file to send, usually from a previous file-producing step.",
            "x-label": "File",
            "x-input-type": "file",
            "properties": {
              "name": { "type": "string" }, "mimeType": { "type": "string" },
              "size": { "type": "number" }, "content": { "type": "object" }
            },
            "required": ["name", "mimeType", "content"],
            "additionalProperties": false
          },
          "caption": {
            "type": "string",
            "description": "Optional caption text displayed below the file (max 1024 characters).",
            "x-label": "Caption",
            "x-input-type": "text"
          },
          "parseMode": {
            "type": "string",
            "description": "Formatting mode for the caption.",
            "enum": [
              "MarkdownV2",
              "HTML"
            ],
            "default": "HTML",
            "x-label": "Caption Format",
            "x-input-type": "select"
          }
        },
        "required": [
          "chatId",
          "file"
        ]
      },
      "responseSchema": {
        "type": "object",
        "properties": {
          "message_id": {
            "type": "number",
            "x-label": "Message ID"
          },
          "date": {
            "type": "number",
            "x-label": "Date (Unix)"
          },
          "document": {
            "type": "object",
            "x-label": "Document"
          }
        }
      },
      "agentTool": {
        "enabled": true,
        "name": "telegram_send_document",
        "description": "Sends a file to a Telegram chat. Connect to a previous step that outputs a file (e.g. Drive Download, HTTP Request) to pipe binary data directly.",
        "sideEffect": "external-message",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "sendPhoto": {
      "metadata": {
        "label": "Send Photo",
        "description": "Sends a photo to a Telegram chat. Supports either a URL (Telegram downloads it) or a binary buffer from the workflow pipeline."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "chatId": {
            "type": "string",
            "description": "The Telegram Chat ID or channel username.",
            "x-label": "Chat ID",
            "x-input-type": "text"
          },
          "useUrl": {
            "type": "boolean",
            "description": "Send the photo from a public URL instead of uploading a file. Telegram downloads the image directly.",
            "default": false,
            "x-label": "Use URL",
            "x-input-type": "toggle"
          },
          "photoUrl": {
            "type": "string",
            "description": "Public HTTPS URL of the photo to send.",
            "x-label": "Photo URL",
            "x-input-type": "url",
            "x-visible-if": {
              "field": "useUrl",
              "operator": "equals",
              "value": true
            }
          },
          "file": {
            "type": "object",
            "x-fabric-value-type": "file",
            "x-fabric-binary-encoding": "buffer",
            "description": "Binary image file from a previous workflow step.",
            "x-label": "Image File",
            "x-input-type": "file",
            "properties": {
              "name": { "type": "string" }, "mimeType": { "type": "string" },
              "size": { "type": "number" }, "content": { "type": "object" }
            },
            "required": ["name", "mimeType", "content"],
            "additionalProperties": false,
            "x-visible-if": {
              "field": "useUrl",
              "operator": "equals",
              "value": false
            }
          },
          "caption": {
            "type": "string",
            "description": "Optional caption shown below the photo.",
            "x-label": "Caption",
            "x-input-type": "text"
          },
          "parseMode": {
            "type": "string",
            "description": "Formatting mode for the caption.",
            "enum": [
              "",
              "MarkdownV2",
              "HTML"
            ],
            "x-label": "Caption Format",
            "x-input-type": "select"
          }
        },
        "required": [
          "chatId"
        ]
      },
      "responseSchema": {
        "type": "object",
        "properties": {
          "message_id": {
            "type": "number",
            "x-label": "Message ID"
          },
          "date": {
            "type": "number",
            "x-label": "Date (Unix)"
          },
          "photo": {
            "type": "array",
            "x-label": "Photo"
          }
        }
      },
      "agentTool": {
        "enabled": true,
        "name": "telegram_send_photo",
        "description": "Sends a photo to a Telegram chat. Supports either a URL (Telegram downloads it) or a binary buffer from the workflow pipeline.",
        "sideEffect": "external-message",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "sendPoll": {
      "metadata": {
        "label": "Send Poll",
        "description": "Creates a poll or quiz in a Telegram chat. Supports anonymous votes, multiple answers, and quiz mode with a correct answer."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "chatId": {
            "type": "string",
            "description": "The Telegram Chat ID or channel username.",
            "x-label": "Chat ID",
            "x-input-type": "text"
          },
          "question": {
            "type": "string",
            "description": "The poll question (max 300 characters).",
            "x-label": "Question",
            "x-input-type": "text"
          },
          "options": {
            "type": "string",
            "description": "Poll options as a JSON array of strings (2â€“10 items). Example: [\"Option A\", \"Option B\", \"Option C\"]",
            "x-label": "Options (JSON array)",
            "x-input-type": "json"
          },
          "isAnonymous": {
            "type": "boolean",
            "description": "If true, who voted for what is not publicly visible. Default is true.",
            "default": true,
            "x-label": "Anonymous Vote",
            "x-input-type": "toggle"
          },
          "allowsMultipleAnswers": {
            "type": "boolean",
            "description": "Allow participants to vote for more than one option. Cannot be used with Quiz mode.",
            "default": false,
            "x-label": "Allow Multiple Answers",
            "x-input-type": "toggle"
          },
          "isQuiz": {
            "type": "boolean",
            "description": "Turn the poll into a quiz with a single correct answer. Requires 'Correct Option ID'.",
            "default": false,
            "x-label": "Quiz Mode",
            "x-input-type": "toggle"
          },
          "correctOptionId": {
            "type": "integer",
            "description": "Zero-based index of the correct answer in the options array (e.g. 0 = first option).",
            "minimum": 0,
            "x-label": "Correct Option (0-based index)",
            "x-input-type": "number",
            "x-visible-if": {
              "field": "isQuiz",
              "operator": "equals",
              "value": true
            }
          }
        },
        "required": [
          "chatId",
          "question",
          "options"
        ]
      },
      "responseSchema": {
        "type": "object",
        "properties": {
          "message_id": {
            "type": "number",
            "x-label": "Message ID"
          },
          "poll": {
            "type": "object",
            "x-label": "Poll"
          }
        }
      },
      "agentTool": {
        "enabled": true,
        "name": "telegram_send_poll",
        "description": "Creates a poll or quiz in a Telegram chat. Supports anonymous votes, multiple answers, and quiz mode with a correct answer.",
        "sideEffect": "external-message",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    }
  },
  "triggers": {
    "onMessage": {
      "metadata": {
        "label": "On New Message",
        "description": "Triggers when the Telegram bot receives a new message."
      },
      "delivery": {
        "mode": "webhook",
        "requiresPublicUrl": true
      },
      "parameters": {
        "type": "object",
        "properties": {
          "allowedUpdateTypes": {
            "type": "string",
            "description": "Comma-separated provider update types. Leave empty for provider defaults.",
            "x-label": "Allowed Update Types",
            "x-input-type": "text"
          },
          "channelId": {
            "type": "string",
            "description": "Only accept events from this channel/chat/conversation ID. Leave empty for any channel.",
            "x-label": "Channel ID",
            "x-input-type": "text"
          },
          "userId": {
            "type": "string",
            "description": "Only accept events created by this user ID. Leave empty for any user.",
            "x-label": "User ID",
            "x-input-type": "text"
          },
          "messageContains": {
            "type": "string",
            "description": "Only accept events whose text contains this value, case-insensitive.",
            "x-label": "Message Contains",
            "x-input-type": "text"
          },
          "messageRegex": {
            "type": "string",
            "description": "Only accept events whose text matches this regular expression. Invalid regex ignores the event.",
            "x-label": "Message Regex",
            "x-input-type": "text"
          },
          "commandName": {
            "type": "string",
            "description": "Only accept this command name. Example: /deploy or deploy.",
            "x-label": "Command Name",
            "x-input-type": "text"
          },
          "ignoreBots": {
            "type": "boolean",
            "description": "Ignore events created by bots when the provider exposes bot metadata.",
            "default": true,
            "x-label": "Ignore Bots",
            "x-input-type": "toggle"
          }
        }
      },
      "payloadSchema": {
        "type": "object",
        "properties": {
          "eventId": {
            "type": "string",
            "description": "Provider event identifier."
          },
          "messageId": {
            "type": "string",
            "description": "Provider message identifier."
          },
          "channelId": {
            "type": "string",
            "description": "Conversation, chat, or channel identifier."
          },
          "userId": {
            "type": "string",
            "description": "User identifier that caused the event."
          },
          "text": {
            "type": "string",
            "description": "Text content when available."
          },
          "command": {
            "type": "string",
            "description": "Command name when available."
          },
          "raw": {
            "type": "object",
            "description": "Original provider payload."
          }
        },
        "required": [
          "eventId"
        ]
      }
    },
    "onCommand": {
      "metadata": {
        "label": "On Command",
        "description": "Triggers when the Telegram bot receives a slash command message."
      },
      "delivery": {
        "mode": "webhook",
        "requiresPublicUrl": true
      },
      "parameters": {
        "type": "object",
        "properties": {
          "allowedUpdateTypes": {
            "type": "string",
            "description": "Comma-separated provider update types. Leave empty for provider defaults.",
            "x-label": "Allowed Update Types",
            "x-input-type": "text"
          },
          "channelId": {
            "type": "string",
            "description": "Only accept events from this channel/chat/conversation ID. Leave empty for any channel.",
            "x-label": "Channel ID",
            "x-input-type": "text"
          },
          "userId": {
            "type": "string",
            "description": "Only accept events created by this user ID. Leave empty for any user.",
            "x-label": "User ID",
            "x-input-type": "text"
          },
          "messageContains": {
            "type": "string",
            "description": "Only accept events whose text contains this value, case-insensitive.",
            "x-label": "Message Contains",
            "x-input-type": "text"
          },
          "messageRegex": {
            "type": "string",
            "description": "Only accept events whose text matches this regular expression. Invalid regex ignores the event.",
            "x-label": "Message Regex",
            "x-input-type": "text"
          },
          "commandName": {
            "type": "string",
            "description": "Only accept this command name. Example: /deploy or deploy.",
            "x-label": "Command Name",
            "x-input-type": "text"
          },
          "ignoreBots": {
            "type": "boolean",
            "description": "Ignore events created by bots when the provider exposes bot metadata.",
            "default": true,
            "x-label": "Ignore Bots",
            "x-input-type": "toggle"
          }
        }
      },
      "payloadSchema": {
        "type": "object",
        "properties": {
          "eventId": {
            "type": "string",
            "description": "Provider event identifier."
          },
          "messageId": {
            "type": "string",
            "description": "Provider message identifier."
          },
          "channelId": {
            "type": "string",
            "description": "Conversation, chat, or channel identifier."
          },
          "userId": {
            "type": "string",
            "description": "User identifier that caused the event."
          },
          "text": {
            "type": "string",
            "description": "Text content when available."
          },
          "command": {
            "type": "string",
            "description": "Command name when available."
          },
          "raw": {
            "type": "object",
            "description": "Original provider payload."
          }
        },
        "required": [
          "eventId"
        ]
      }
    },
    "onCallbackQuery": {
      "metadata": {
        "label": "On Callback Query",
        "description": "Triggers when a user taps an inline keyboard callback button."
      },
      "delivery": {
        "mode": "webhook",
        "requiresPublicUrl": true
      },
      "parameters": {
        "type": "object",
        "properties": {
          "allowedUpdateTypes": {
            "type": "string",
            "description": "Comma-separated provider update types. Leave empty for provider defaults.",
            "x-label": "Allowed Update Types",
            "x-input-type": "text"
          },
          "channelId": {
            "type": "string",
            "description": "Only accept events from this channel/chat/conversation ID. Leave empty for any channel.",
            "x-label": "Channel ID",
            "x-input-type": "text"
          },
          "userId": {
            "type": "string",
            "description": "Only accept events created by this user ID. Leave empty for any user.",
            "x-label": "User ID",
            "x-input-type": "text"
          },
          "messageContains": {
            "type": "string",
            "description": "Only accept events whose text contains this value, case-insensitive.",
            "x-label": "Message Contains",
            "x-input-type": "text"
          },
          "messageRegex": {
            "type": "string",
            "description": "Only accept events whose text matches this regular expression. Invalid regex ignores the event.",
            "x-label": "Message Regex",
            "x-input-type": "text"
          },
          "commandName": {
            "type": "string",
            "description": "Only accept this command name. Example: /deploy or deploy.",
            "x-label": "Command Name",
            "x-input-type": "text"
          },
          "ignoreBots": {
            "type": "boolean",
            "description": "Ignore events created by bots when the provider exposes bot metadata.",
            "default": true,
            "x-label": "Ignore Bots",
            "x-input-type": "toggle"
          }
        }
      },
      "payloadSchema": {
        "type": "object",
        "properties": {
          "eventId": {
            "type": "string",
            "description": "Provider event identifier."
          },
          "messageId": {
            "type": "string",
            "description": "Provider message identifier."
          },
          "channelId": {
            "type": "string",
            "description": "Conversation, chat, or channel identifier."
          },
          "userId": {
            "type": "string",
            "description": "User identifier that caused the event."
          },
          "text": {
            "type": "string",
            "description": "Text content when available."
          },
          "command": {
            "type": "string",
            "description": "Command name when available."
          },
          "raw": {
            "type": "object",
            "description": "Original provider payload."
          }
        },
        "required": [
          "eventId"
        ]
      }
    }
  }
});
