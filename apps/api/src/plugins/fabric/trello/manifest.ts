import { definePluginManifest } from "@auvexis/fabric-sdk";

export default definePluginManifest({
  "metadata": {
    "id": "trello",
    "name": "Trello",
    "description": "Manage boards, lists, cards, comments, and checklist items.",
    "icon": "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/trello.svg",
    "categories": [
      "Apps"
    ],
    "author": "Fabric",
    "version": "1.0.0",
    "repository": "https://github.com/Auvexis/fabric"
  },
  "methods": {
    "listBoards": {
      "metadata": {
        "label": "List Boards",
        "description": "Lists boards."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "filter": {
            "type": "string",
            "default": "open",
            "x-label": "Filter",
            "x-input-type": "text"
          }
        }
      },
      "responseSchema": {
        "type": "array",
        "items": {
          "type": "object"
        }
      },
      "agentTool": {
        "enabled": true,
        "name": "trello_list_boards",
        "description": "Allow an AI Agent to run Lists boards. when explicitly enabled.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "listLists": {
      "metadata": {
        "label": "List Lists",
        "description": "Lists lists in a board."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "boardId": {
            "type": "string",
            "x-label": "Board ID",
            "x-input-type": "text"
          },
          "filter": {
            "type": "string",
            "default": "open",
            "x-label": "Filter",
            "x-input-type": "text"
          }
        },
        "required": [
          "boardId"
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
        "name": "trello_list_lists",
        "description": "Lists lists in a board.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "listCards": {
      "metadata": {
        "label": "List Cards",
        "description": "Lists cards by board or list."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "boardId": {
            "type": "string",
            "x-label": "Board ID",
            "x-input-type": "text"
          },
          "listId": {
            "type": "string",
            "x-label": "List ID",
            "x-input-type": "text"
          },
          "filter": {
            "type": "string",
            "default": "open",
            "x-label": "Filter",
            "x-input-type": "text"
          }
        }
      },
      "responseSchema": {
        "type": "array",
        "items": {
          "type": "object"
        }
      },
      "agentTool": {
        "enabled": true,
        "name": "trello_list_cards",
        "description": "Lists cards by board or list.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "createCard": {
      "metadata": {
        "label": "Create Card",
        "description": "Creates a card."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "listId": {
            "type": "string",
            "x-label": "List ID",
            "x-input-type": "text"
          },
          "name": {
            "type": "string",
            "x-label": "Name",
            "x-input-type": "text"
          },
          "desc": {
            "type": "string",
            "x-label": "Description",
            "x-input-type": "textarea"
          },
          "due": {
            "type": "string",
            "x-label": "Due",
            "x-input-type": "text"
          },
          "idLabels": {
            "type": "string",
            "x-label": "Label IDs",
            "x-input-type": "text"
          },
          "pos": {
            "type": "string",
            "x-label": "Position",
            "x-input-type": "text"
          }
        },
        "required": [
          "listId",
          "name"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "trello_create_card",
        "description": "Allow an AI Agent to run Creates a card. when explicitly enabled.",
        "sideEffect": "write",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "updateCard": {
      "metadata": {
        "label": "Update Card",
        "description": "Updates card fields."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "cardId": {
            "type": "string",
            "x-label": "Card ID",
            "x-input-type": "text"
          },
          "name": {
            "type": "string",
            "x-label": "Name",
            "x-input-type": "text"
          },
          "desc": {
            "type": "string",
            "x-label": "Description",
            "x-input-type": "textarea"
          },
          "due": {
            "type": "string",
            "x-label": "Due",
            "x-input-type": "text"
          },
          "idLabels": {
            "type": "string",
            "x-label": "Label IDs",
            "x-input-type": "text"
          }
        },
        "required": [
          "cardId"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "trello_update_card",
        "description": "Updates card fields.",
        "sideEffect": "write",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "moveCard": {
      "metadata": {
        "label": "Move Card",
        "description": "Moves a card to another list."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "cardId": {
            "type": "string",
            "x-label": "Card ID",
            "x-input-type": "text"
          },
          "listId": {
            "type": "string",
            "x-label": "List ID",
            "x-input-type": "text"
          },
          "pos": {
            "type": "string",
            "x-label": "Position",
            "x-input-type": "text"
          }
        },
        "required": [
          "cardId",
          "listId"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "trello_move_card",
        "description": "Moves a card to another list.",
        "sideEffect": "write",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "addCommentToCard": {
      "metadata": {
        "label": "Add Comment To Card",
        "description": "Adds a card comment."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "cardId": {
            "type": "string",
            "x-label": "Card ID",
            "x-input-type": "text"
          },
          "comment": {
            "type": "string",
            "x-label": "Comment",
            "x-input-type": "textarea"
          }
        },
        "required": [
          "cardId",
          "comment"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "trello_add_comment_to_card",
        "description": "Adds a card comment.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "createChecklistItem": {
      "metadata": {
        "label": "Create Checklist Item",
        "description": "Creates a checklist item, creating a checklist when needed."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "cardId": {
            "type": "string",
            "x-label": "Card ID",
            "x-input-type": "text"
          },
          "checklistId": {
            "type": "string",
            "x-label": "Checklist ID",
            "x-input-type": "text"
          },
          "checklistName": {
            "type": "string",
            "default": "Checklist",
            "x-label": "Checklist Name",
            "x-input-type": "text"
          },
          "itemName": {
            "type": "string",
            "x-label": "Item Name",
            "x-input-type": "text"
          }
        },
        "required": [
          "cardId",
          "itemName"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "trello_create_checklist_item",
        "description": "Creates a checklist item, creating a checklist when needed.",
        "sideEffect": "write",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    }
  },
  "triggers": {
    "onCardCreated": {
      "metadata": {
        "label": "On Card Created",
        "description": "Triggers when a Trello card is created."
      },
      "delivery": {
        "mode": "webhook",
        "requiresPublicUrl": true
      },
      "parameters": {
        "type": "object",
        "properties": {
          "boardId": {
            "type": "string",
            "description": "Trello board ID.",
            "x-label": "Board ID",
            "x-input-type": "text"
          },
          "resourceId": {
            "type": "string",
            "description": "Only accept events for this provider resource ID, such as issue, file, row, video, page, or card ID.",
            "x-label": "Resource ID",
            "x-input-type": "text"
          },
          "eventAction": {
            "type": "string",
            "description": "Only accept this event action/operation. Example: created, updated, insert, failure.",
            "x-label": "Event Action",
            "x-input-type": "text"
          },
          "userId": {
            "type": "string",
            "description": "Only accept events created by this user ID. Leave empty for any user.",
            "x-label": "User ID",
            "x-input-type": "text"
          }
        },
        "required": [
          "boardId"
        ]
      },
      "payloadSchema": {
        "type": "object",
        "properties": {
          "eventId": {
            "type": "string",
            "description": "Provider event identifier."
          },
          "resourceId": {
            "type": "string",
            "description": "Primary provider resource identifier."
          },
          "resourceType": {
            "type": "string",
            "description": "Provider resource type."
          },
          "action": {
            "type": "string",
            "description": "Provider event action."
          },
          "actorId": {
            "type": "string",
            "description": "User or actor identifier when available."
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
    "onCardMoved": {
      "metadata": {
        "label": "On Card Moved",
        "description": "Triggers when a Trello card moves lists."
      },
      "delivery": {
        "mode": "webhook",
        "requiresPublicUrl": true
      },
      "parameters": {
        "type": "object",
        "properties": {
          "boardId": {
            "type": "string",
            "description": "Trello board ID.",
            "x-label": "Board ID",
            "x-input-type": "text"
          },
          "listId": {
            "type": "string",
            "description": "Optional destination list ID.",
            "x-label": "List ID",
            "x-input-type": "text"
          },
          "resourceId": {
            "type": "string",
            "description": "Only accept events for this provider resource ID, such as issue, file, row, video, page, or card ID.",
            "x-label": "Resource ID",
            "x-input-type": "text"
          },
          "eventAction": {
            "type": "string",
            "description": "Only accept this event action/operation. Example: created, updated, insert, failure.",
            "x-label": "Event Action",
            "x-input-type": "text"
          },
          "userId": {
            "type": "string",
            "description": "Only accept events created by this user ID. Leave empty for any user.",
            "x-label": "User ID",
            "x-input-type": "text"
          }
        },
        "required": [
          "boardId"
        ]
      },
      "payloadSchema": {
        "type": "object",
        "properties": {
          "eventId": {
            "type": "string",
            "description": "Provider event identifier."
          },
          "resourceId": {
            "type": "string",
            "description": "Primary provider resource identifier."
          },
          "resourceType": {
            "type": "string",
            "description": "Provider resource type."
          },
          "action": {
            "type": "string",
            "description": "Provider event action."
          },
          "actorId": {
            "type": "string",
            "description": "User or actor identifier when available."
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
    "onCommentAdded": {
      "metadata": {
        "label": "On Comment Added",
        "description": "Triggers when a Trello card comment is added."
      },
      "delivery": {
        "mode": "webhook",
        "requiresPublicUrl": true
      },
      "parameters": {
        "type": "object",
        "properties": {
          "boardId": {
            "type": "string",
            "description": "Trello board ID.",
            "x-label": "Board ID",
            "x-input-type": "text"
          },
          "resourceId": {
            "type": "string",
            "description": "Only accept events for this provider resource ID, such as issue, file, row, video, page, or card ID.",
            "x-label": "Resource ID",
            "x-input-type": "text"
          },
          "eventAction": {
            "type": "string",
            "description": "Only accept this event action/operation. Example: created, updated, insert, failure.",
            "x-label": "Event Action",
            "x-input-type": "text"
          },
          "userId": {
            "type": "string",
            "description": "Only accept events created by this user ID. Leave empty for any user.",
            "x-label": "User ID",
            "x-input-type": "text"
          }
        },
        "required": [
          "boardId"
        ]
      },
      "payloadSchema": {
        "type": "object",
        "properties": {
          "eventId": {
            "type": "string",
            "description": "Provider event identifier."
          },
          "resourceId": {
            "type": "string",
            "description": "Primary provider resource identifier."
          },
          "resourceType": {
            "type": "string",
            "description": "Provider resource type."
          },
          "action": {
            "type": "string",
            "description": "Provider event action."
          },
          "actorId": {
            "type": "string",
            "description": "User or actor identifier when available."
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
