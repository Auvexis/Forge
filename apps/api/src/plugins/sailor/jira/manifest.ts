import { definePluginManifest } from "@auvexis/sailor-sdk";

export default definePluginManifest({
  "metadata": {
    "id": "jira",
    "name": "Jira",
    "description": "Search and manage Jira Cloud projects, issues, comments, transitions, and assignees.",
    "icon": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/jira.svg",
    "categories": [
      "Apps",
      "Developer"
    ],
    "author": "Sailor",
    "version": "1.0.0",
    "repository": "https://github.com/Auvexis/sailor"
  },
  "methods": {
    "listProjects": {
      "metadata": {
        "label": "List Projects",
        "description": "Lists accessible projects."
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
        "name": "jira_list_projects",
        "description": "Lists accessible projects.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "searchIssues": {
      "metadata": {
        "label": "Search Issues",
        "description": "Searches issues with JQL."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "jql": {
            "type": "string",
            "x-label": "JQL",
            "x-input-type": "textarea"
          },
          "maxResults": {
            "type": "number",
            "default": 50,
            "x-label": "Max Results",
            "x-input-type": "number"
          },
          "fields": {
            "type": "string",
            "x-label": "Fields",
            "x-input-type": "text"
          }
        },
        "required": [
          "jql"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "jira_search_issues",
        "description": "Searches issues with JQL.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "getIssue": {
      "metadata": {
        "label": "Get Issue",
        "description": "Gets an issue."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "issueIdOrKey": {
            "type": "string",
            "x-label": "Issue ID Or Key",
            "x-input-type": "text"
          }
        },
        "required": [
          "issueIdOrKey"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "jira_get_issue",
        "description": "Allow an AI Agent to run Gets an issue. when explicitly enabled.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "createIssue": {
      "metadata": {
        "label": "Create Issue",
        "description": "Creates an issue."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "projectKey": {
            "type": "string",
            "x-label": "Project Key",
            "x-input-type": "text"
          },
          "issueType": {
            "type": "string",
            "x-label": "Issue Type",
            "x-input-type": "text"
          },
          "summary": {
            "type": "string",
            "x-label": "Summary",
            "x-input-type": "text"
          },
          "description": {
            "type": "string",
            "x-label": "Description",
            "x-input-type": "textarea"
          },
          "fields": {
            "type": "string",
            "x-label": "Fields JSON",
            "x-input-type": "json"
          }
        },
        "required": [
          "projectKey",
          "issueType",
          "summary"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "jira_create_issue",
        "description": "Allow an AI Agent to run Creates an issue. when explicitly enabled.",
        "sideEffect": "write",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "updateIssue": {
      "metadata": {
        "label": "Update Issue",
        "description": "Updates issue fields."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "issueIdOrKey": {
            "type": "string",
            "x-label": "Issue ID Or Key",
            "x-input-type": "text"
          },
          "fields": {
            "type": "string",
            "x-label": "Fields JSON",
            "x-input-type": "json"
          }
        },
        "required": [
          "issueIdOrKey",
          "fields"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "jira_update_issue",
        "description": "Updates issue fields.",
        "sideEffect": "write",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "transitionIssue": {
      "metadata": {
        "label": "Transition Issue",
        "description": "Transitions an issue."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "issueIdOrKey": {
            "type": "string",
            "x-label": "Issue ID Or Key",
            "x-input-type": "text"
          },
          "transitionId": {
            "type": "string",
            "x-label": "Transition ID",
            "x-input-type": "text"
          }
        },
        "required": [
          "issueIdOrKey",
          "transitionId"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "jira_transition_issue",
        "description": "Transitions an issue.",
        "sideEffect": "write",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "addComment": {
      "metadata": {
        "label": "Add Comment",
        "description": "Adds a comment."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "issueIdOrKey": {
            "type": "string",
            "x-label": "Issue ID Or Key",
            "x-input-type": "text"
          },
          "comment": {
            "type": "string",
            "x-label": "Comment",
            "x-input-type": "textarea"
          }
        },
        "required": [
          "issueIdOrKey",
          "comment"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "jira_add_comment",
        "description": "Allow an AI Agent to run Adds a comment. when explicitly enabled.",
        "sideEffect": "external-message",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "assignIssue": {
      "metadata": {
        "label": "Assign Issue",
        "description": "Assigns an issue."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "issueIdOrKey": {
            "type": "string",
            "x-label": "Issue ID Or Key",
            "x-input-type": "text"
          },
          "accountId": {
            "type": "string",
            "x-label": "Account ID",
            "x-input-type": "text"
          }
        },
        "required": [
          "issueIdOrKey",
          "accountId"
        ]
      },
      "responseSchema": {
        "type": "object"
      },
      "agentTool": {
        "enabled": true,
        "name": "jira_assign_issue",
        "description": "Allow an AI Agent to run Assigns an issue. when explicitly enabled.",
        "sideEffect": "write",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    }
  },
  "triggers": {
    "onIssueCreated": {
      "metadata": {
        "label": "On Issue Created",
        "description": "Triggers when a Jira issue is created."
      },
      "delivery": {
        "mode": "webhook",
        "requiresPublicUrl": true
      },
      "parameters": {
        "type": "object",
        "properties": {
          "projectKey": {
            "type": "string",
            "description": "Optional Jira project key filter.",
            "x-label": "Project Key",
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
        "required": []
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
    "onIssueUpdated": {
      "metadata": {
        "label": "On Issue Updated",
        "description": "Triggers when a Jira issue is updated."
      },
      "delivery": {
        "mode": "webhook",
        "requiresPublicUrl": true
      },
      "parameters": {
        "type": "object",
        "properties": {
          "projectKey": {
            "type": "string",
            "description": "Optional Jira project key filter.",
            "x-label": "Project Key",
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
        "required": []
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
    "onStatusChanged": {
      "metadata": {
        "label": "On Status Changed",
        "description": "Triggers when a Jira issue changes status."
      },
      "delivery": {
        "mode": "webhook",
        "requiresPublicUrl": true
      },
      "parameters": {
        "type": "object",
        "properties": {
          "projectKey": {
            "type": "string",
            "description": "Optional Jira project key filter.",
            "x-label": "Project Key",
            "x-input-type": "text"
          },
          "status": {
            "type": "string",
            "description": "Optional target status name.",
            "x-label": "Status",
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
        "required": []
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
