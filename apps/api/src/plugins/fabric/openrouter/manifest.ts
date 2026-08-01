import { definePluginManifest } from "@auvexis/fabric-sdk";

export default definePluginManifest({
  "metadata": {
    "id": "openrouter",
    "name": "OpenRouter",
    "description": "Call OpenRouter models for chat, JSON extraction, routing, comparison, and summaries.",
    "icon": "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/dark/openrouter.png",
    "iconDark": "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/light/openrouter.png",
    "iconLight": "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-png@latest/dark/openrouter.png",
    "categories": [
      "AI"
    ],
    "author": "Fabric",
    "version": "1.0.0",
    "repository": "https://github.com/Auvexis/fabric",
    "agentCapabilities": {
      "chatModel": {
        "enabled": true,
        "adapter": "openrouter",
        "label": "OpenRouter Chat Model",
        "description": "Use OpenRouter's native Chat Completions API as an Agent Chat Model.",
        "defaultModel": "openai/gpt-4.1-mini",
        "defaultBaseUrl": "https://openrouter.ai/api/v1",
        "credentialPluginId": "openrouter",
        "thinking": {
          "enabled": true,
          "request": {
            "reasoning": {
              "enabled": true
            }
          }
        }
      }
    }
  },
  "methods": {
    "listModels": {
      "metadata": {
        "label": "List Models",
        "description": "Lists available models."
      },
      "parameters": {
        "type": "object",
        "properties": {}
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "openrouter_list_models",
        "description": "Lists available models.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "chatCompletion": {
      "metadata": {
        "label": "Chat Completion",
        "description": "Creates a chat completion."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "model": {
            "type": "string",
            "x-label": "Model",
            "x-input-type": "text"
          },
          "messages": {
            "type": "string",
            "x-label": "Messages JSON",
            "x-input-type": "json"
          },
          "temperature": {
            "type": "number",
            "x-label": "Temperature",
            "x-input-type": "number"
          },
          "maxTokens": {
            "type": "number",
            "x-label": "Max Tokens",
            "x-input-type": "number"
          },
          "providerPreferences": {
            "type": "string",
            "x-label": "Provider Preferences JSON",
            "x-input-type": "json"
          }
        },
        "required": [
          "model",
          "messages"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "openrouter_chat_completion",
        "description": "Creates a chat completion.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "jsonChatCompletion": {
      "metadata": {
        "label": "JSON Chat Completion",
        "description": "Creates a JSON-mode chat completion."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "model": {
            "type": "string",
            "x-label": "Model",
            "x-input-type": "text"
          },
          "prompt": {
            "type": "string",
            "x-label": "Prompt",
            "x-input-type": "textarea"
          },
          "system": {
            "type": "string",
            "x-label": "System",
            "x-input-type": "textarea"
          },
          "temperature": {
            "type": "number",
            "x-label": "Temperature",
            "x-input-type": "number"
          },
          "maxTokens": {
            "type": "number",
            "x-label": "Max Tokens",
            "x-input-type": "number"
          }
        },
        "required": [
          "model",
          "prompt"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "openrouter_json_chat_completion",
        "description": "Creates a JSON-mode chat completion.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "routePrompt": {
      "metadata": {
        "label": "Route Prompt",
        "description": "Runs a prompt with provider routing preferences."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "model": {
            "type": "string",
            "x-label": "Model",
            "x-input-type": "text"
          },
          "prompt": {
            "type": "string",
            "x-label": "Prompt",
            "x-input-type": "textarea"
          },
          "system": {
            "type": "string",
            "x-label": "System",
            "x-input-type": "textarea"
          },
          "providerPreferences": {
            "type": "string",
            "x-label": "Provider Preferences JSON",
            "x-input-type": "json"
          },
          "temperature": {
            "type": "number",
            "x-label": "Temperature",
            "x-input-type": "number"
          },
          "maxTokens": {
            "type": "number",
            "x-label": "Max Tokens",
            "x-input-type": "number"
          }
        },
        "required": [
          "model",
          "prompt"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "openrouter_route_prompt",
        "description": "Runs a prompt with provider routing preferences.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "compareModels": {
      "metadata": {
        "label": "Compare Models",
        "description": "Runs a prompt against 2 to 4 models."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "models": {
            "type": "string",
            "x-label": "Models",
            "x-input-type": "text"
          },
          "prompt": {
            "type": "string",
            "x-label": "Prompt",
            "x-input-type": "textarea"
          },
          "system": {
            "type": "string",
            "x-label": "System",
            "x-input-type": "textarea"
          },
          "temperature": {
            "type": "number",
            "x-label": "Temperature",
            "x-input-type": "number"
          },
          "maxTokens": {
            "type": "number",
            "x-label": "Max Tokens",
            "x-input-type": "number"
          }
        },
        "required": [
          "models",
          "prompt"
        ]
      },
      "responseSchema": {
        "type": "array",
        "items": {
          "type": "object"
        }
      },
      "agentTool": {
        "enabled": true,
        "name": "openrouter_compare_models",
        "description": "Runs a prompt against 2 to 4 models.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "summarizeText": {
      "metadata": {
        "label": "Summarize Text",
        "description": "Summarizes text."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "model": {
            "type": "string",
            "x-label": "Model",
            "x-input-type": "text"
          },
          "text": {
            "type": "string",
            "x-label": "Text",
            "x-input-type": "textarea"
          },
          "system": {
            "type": "string",
            "x-label": "System",
            "x-input-type": "textarea"
          },
          "temperature": {
            "type": "number",
            "default": 0.2,
            "x-label": "Temperature",
            "x-input-type": "number"
          },
          "maxTokens": {
            "type": "number",
            "x-label": "Max Tokens",
            "x-input-type": "number"
          }
        },
        "required": [
          "model",
          "text"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "openrouter_summarize_text",
        "description": "Allow an AI Agent to run Summarizes text. when explicitly enabled.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "extractJson": {
      "metadata": {
        "label": "Extract JSON",
        "description": "Extracts structured JSON."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "model": {
            "type": "string",
            "x-label": "Model",
            "x-input-type": "text"
          },
          "text": {
            "type": "string",
            "x-label": "Text",
            "x-input-type": "textarea"
          },
          "responseSchema": {
            "type": "string",
            "x-label": "Schema",
            "x-input-type": "textarea"
          },
          "temperature": {
            "type": "number",
            "default": 0,
            "x-label": "Temperature",
            "x-input-type": "number"
          },
          "maxTokens": {
            "type": "number",
            "x-label": "Max Tokens",
            "x-input-type": "number"
          }
        },
        "required": [
          "model",
          "text"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "openrouter_extract_json",
        "description": "Extracts structured JSON.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "moderatePromptLocalRules": {
      "metadata": {
        "label": "Moderate Prompt Local Rules",
        "description": "Checks simple local blocked terms before sending a prompt."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "prompt": {
            "type": "string",
            "x-label": "Prompt",
            "x-input-type": "textarea"
          },
          "blockedTerms": {
            "type": "string",
            "x-label": "Blocked Terms",
            "x-input-type": "textarea"
          }
        },
        "required": [
          "prompt"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "openrouter_moderate_prompt_local_rules",
        "description": "Checks simple local blocked terms before sending a prompt.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    }
  }
});
