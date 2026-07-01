import { definePluginManifest } from "@auvexis/sailor-sdk";

export default definePluginManifest({
  "metadata": {
    "id": "sailor-crypto",
    "name": "Crypto / Hash",
    "description": "Generate hashes, HMACs, UUIDs and encode/decode Base64 using Node.js built-in crypto.",
    "icon": "shield-check",
    "categories": [
      "Core",
      "Data transformation"
    ],
    "author": "Sailor",
    "version": "1.0.0",
    "utility": true,
    "style": {
      "icon": "shield-check",
      "iconColor": "rgb(16, 185, 129)",
      "bgColor": "rgba(16, 185, 129, 0.12)",
      "borderColor": "rgba(16, 185, 129, 0.4)"
    }
  },
  "methods": {
    "hash": {
      "metadata": {
        "label": "Hash String",
        "description": "Hash a string using SHA-256, SHA-512 or MD5."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "input": {
            "type": "string",
            "description": "The string to hash.",
            "x-input-type": "text"
          },
          "algorithm": {
            "type": "string",
            "description": "sha256 | sha512 | md5. Default: sha256.",
            "x-input-type": "text"
          },
          "encoding": {
            "type": "string",
            "description": "hex | base64. Default: hex.",
            "x-input-type": "text"
          }
        },
        "required": [
          "input"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "crypto_hash",
        "description": "Hash a string using SHA-256, SHA-512 or MD5.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "hmac": {
      "metadata": {
        "label": "HMAC",
        "description": "Compute HMAC-SHA256 of a message with a secret key."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "message": {
            "type": "string",
            "description": "Message to sign.",
            "x-input-type": "text"
          },
          "secret": {
            "type": "string",
            "description": "Secret key.",
            "x-input-type": "text"
          },
          "algorithm": {
            "type": "string",
            "description": "sha256 | sha512. Default: sha256.",
            "x-input-type": "text"
          },
          "encoding": {
            "type": "string",
            "description": "hex | base64. Default: hex.",
            "x-input-type": "text"
          }
        },
        "required": [
          "message",
          "secret"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "crypto_hmac",
        "description": "Compute HMAC-SHA256 of a message with a secret key.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "base64Encode": {
      "metadata": {
        "label": "Base64 Encode",
        "description": "Encode a string to Base64."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "input": {
            "type": "string",
            "description": "String to encode.",
            "x-input-type": "text"
          }
        },
        "required": [
          "input"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "crypto_base64_encode",
        "description": "Encode a string to Base64.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "base64Decode": {
      "metadata": {
        "label": "Base64 Decode",
        "description": "Decode a Base64 string back to plain text."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "input": {
            "type": "string",
            "description": "Base64 string to decode.",
            "x-input-type": "text"
          }
        },
        "required": [
          "input"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "crypto_base64_decode",
        "description": "Decode a Base64 string back to plain text.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "generateUUID": {
      "metadata": {
        "label": "Generate UUID",
        "description": "Generate a cryptographically random UUID v4."
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
        "name": "crypto_generate_uuid",
        "description": "Generate a cryptographically random UUID v4.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "generateRandomString": {
      "metadata": {
        "label": "Generate Random String",
        "description": "Generate a cryptographically random hex string."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "bytes": {
            "type": "number",
            "description": "Number of random bytes. Default: 16.",
            "x-input-type": "number"
          }
        }
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "crypto_generate_random_string",
        "description": "Generate a cryptographically random hex string.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    }
  }
});
