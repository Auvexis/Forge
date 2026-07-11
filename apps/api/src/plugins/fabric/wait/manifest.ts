import { definePluginManifest } from "@auvexis/fabric-sdk";

export default definePluginManifest({
  "metadata": {
    "id": "fabric-wait",
    "name": "Wait / Sleep",
    "description": "Pause workflow execution for a specified duration without blocking the event loop.",
    "icon": "timer",
    "categories": [
      "Flow",
      "Core"
    ],
    "author": "Fabric",
    "version": "1.0.0",
    "utility": true,
    "style": {
      "icon": "timer",
      "iconColor": "rgb(20, 184, 166)",
      "bgColor": "rgba(20, 184, 166, 0.12)",
      "borderColor": "rgba(20, 184, 166, 0.4)"
    }
  },
  "methods": {
    "sleep": {
      "metadata": {
        "label": "Wait / Sleep",
        "description": "Pause for a given duration. Maximum 10 minutes."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "duration": {
            "type": "number",
            "description": "Duration to wait.",
            "x-input-type": "number"
          },
          "unit": {
            "type": "string",
            "description": "milliseconds | seconds | minutes. Default: seconds.",
            "x-input-type": "text"
          }
        },
        "required": [
          "duration"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "wait_sleep",
        "description": "Pause for a given duration. Maximum 10 minutes.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    }
  }
});
