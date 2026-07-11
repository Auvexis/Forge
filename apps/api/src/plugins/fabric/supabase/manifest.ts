import { definePluginManifest } from "@auvexis/fabric-sdk";

export default definePluginManifest({
  "metadata": {
    "id": "fabric-supabase",
    "name": "Supabase",
    "description": "Connect to Supabase local, self-hosted, or remote projects.",
    "icon": "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/supabase.svg",
    "categories": [
      "Developer",
      "Apps",
      "Data transformation"
    ],
    "author": "Fabric",
    "version": "1.0.0",
    "repository": "https://github.com/Auvexis/fabric"
  },
  "methods": {
    "testConnection": {
      "metadata": {
        "label": "Test Connection",
        "description": "Validates Supabase URL and key by calling the API."
      },
      "parameters": {
        "type": "object",
        "properties": {},
        "required": []
      },
      "responseSchema": {
        "type": "object",
        "properties": {
          "ok": {
            "type": "boolean"
          }
        }
      },
      "agentTool": {
        "enabled": true,
        "name": "supabase_test_connection",
        "description": "Validates Supabase URL and key by calling the API.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "listTables": {
      "metadata": {
        "label": "List Tables",
        "description": "Lists tables through the fabric_list_tables RPC."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "schema": {
            "type": "string",
            "description": "Schema name. Default: credential schema or public.",
            "default": "public",
            "x-input-type": "text"
          }
        },
        "required": []
      },
      "responseSchema": {
        "type": "array",
        "items": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "agentTool": {
        "enabled": true,
        "name": "supabase_list_tables",
        "description": "Lists tables through the fabric_list_tables RPC.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "selectRows": {
      "metadata": {
        "label": "Select Rows",
        "description": "Selects rows with optional filters, ordering, limit, and offset."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "table": {
            "type": "string",
            "description": "Table name.",
            "x-input-type": "text"
          },
          "columns": {
            "type": "array",
            "description": "Columns to select. Empty selects all.",
            "items": {
              "type": "string"
            },
            "x-input-type": "json"
          },
          "filters": {
            "type": "array",
            "description": "Filters with operators: eq, neq, gt, gte, lt, lte, ilike, is, in.",
            "items": {
              "type": "object",
              "properties": {
                "column": {
                  "type": "string"
                },
                "operator": {
                  "type": "string",
                  "enum": [
                    "eq",
                    "neq",
                    "gt",
                    "gte",
                    "lt",
                    "lte",
                    "ilike",
                    "is",
                    "in"
                  ]
                },
                "value": {}
              },
              "required": [
                "column",
                "operator",
                "value"
              ],
              "additionalProperties": false
            },
            "x-input-type": "json"
          },
          "orderBy": {
            "type": "object",
            "description": "Order configuration.",
            "properties": {
              "column": {
                "type": "string"
              },
              "direction": {
                "type": "string",
                "enum": [
                  "asc",
                  "desc"
                ]
              }
            },
            "additionalProperties": false,
            "x-input-type": "json"
          },
          "limit": {
            "type": "number",
            "description": "Maximum rows. Max: 1000.",
            "default": 100,
            "x-input-type": "number"
          },
          "offset": {
            "type": "number",
            "description": "Rows to skip.",
            "default": 0,
            "x-input-type": "number"
          }
        },
        "required": [
          "table"
        ]
      },
      "responseSchema": {
        "type": "array",
        "items": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "agentTool": {
        "enabled": true,
        "name": "supabase_select_rows",
        "description": "Selects rows with optional filters, ordering, limit, and offset.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "insertRow": {
      "metadata": {
        "label": "Insert Row",
        "description": "Inserts one row and returns it."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "table": {
            "type": "string",
            "description": "Table name.",
            "x-input-type": "text"
          },
          "row": {
            "type": "object",
            "description": "Row values.",
            "additionalProperties": true,
            "x-input-type": "json"
          }
        },
        "required": [
          "table",
          "row"
        ]
      },
      "responseSchema": {
        "type": "object",
        "properties": {}
      },
      "agentTool": {
        "enabled": true,
        "name": "supabase_insert_row",
        "description": "Inserts one row and returns it.",
        "sideEffect": "write",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "updateRows": {
      "metadata": {
        "label": "Update Rows",
        "description": "Updates rows matching filters and returns changed rows."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "table": {
            "type": "string",
            "description": "Table name.",
            "x-input-type": "text"
          },
          "patch": {
            "type": "object",
            "description": "Fields to update.",
            "additionalProperties": true,
            "x-input-type": "json"
          },
          "filters": {
            "type": "array",
            "description": "Filter list.",
            "items": {
              "type": "object",
              "additionalProperties": true
            },
            "x-input-type": "json"
          }
        },
        "required": [
          "table",
          "patch"
        ]
      },
      "responseSchema": {
        "type": "array",
        "items": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "agentTool": {
        "enabled": true,
        "name": "supabase_update_rows",
        "description": "Updates rows matching filters and returns changed rows.",
        "sideEffect": "write",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "deleteRows": {
      "metadata": {
        "label": "Delete Rows",
        "description": "Deletes rows matching filters and requires confirm: true."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "table": {
            "type": "string",
            "description": "Table name.",
            "x-input-type": "text"
          },
          "filters": {
            "type": "array",
            "description": "Filter list.",
            "items": {
              "type": "object",
              "additionalProperties": true
            },
            "x-input-type": "json"
          },
          "confirm": {
            "type": "boolean",
            "description": "Must be true to delete rows.",
            "x-input-type": "toggle"
          }
        },
        "required": [
          "table",
          "confirm"
        ]
      },
      "responseSchema": {
        "type": "array",
        "items": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "agentTool": {
        "enabled": true,
        "name": "supabase_delete_rows",
        "description": "Deletes rows matching filters and requires confirm: true.",
        "sideEffect": "delete",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "upsertRow": {
      "metadata": {
        "label": "Upsert Row",
        "description": "Upserts one row and returns it."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "table": {
            "type": "string",
            "description": "Table name.",
            "x-input-type": "text"
          },
          "row": {
            "type": "object",
            "description": "Row values.",
            "additionalProperties": true,
            "x-input-type": "json"
          },
          "onConflict": {
            "type": "string",
            "description": "Comma-separated conflict columns.",
            "x-input-type": "text"
          }
        },
        "required": [
          "table",
          "row"
        ]
      },
      "responseSchema": {
        "type": "object",
        "properties": {}
      },
      "agentTool": {
        "enabled": true,
        "name": "supabase_upsert_row",
        "description": "Upserts one row and returns it.",
        "sideEffect": "write",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "callRpc": {
      "metadata": {
        "label": "Call RPC",
        "description": "Calls a Supabase Postgres function with a JSON payload."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "RPC function name.",
            "x-input-type": "text"
          },
          "payload": {
            "type": "object",
            "description": "RPC payload.",
            "additionalProperties": true,
            "x-input-type": "json"
          }
        },
        "required": [
          "name"
        ]
      },
      "responseSchema": {
        "type": "object",
        "properties": {}
      },
      "agentTool": {
        "enabled": true,
        "name": "supabase_call_rpc",
        "description": "Calls a Supabase Postgres function with a JSON payload.",
        "sideEffect": "write",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "uploadObject": {
      "metadata": {
        "label": "Upload Object",
        "description": "Uploads text or base64 content to Supabase Storage."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "bucket": {
            "type": "string",
            "description": "Storage bucket.",
            "x-input-type": "text"
          },
          "path": {
            "type": "string",
            "description": "Object path.",
            "x-input-type": "text"
          },
          "content": {
            "type": "string",
            "description": "Text or base64 content.",
            "x-input-type": "textarea"
          },
          "encoding": {
            "type": "string",
            "description": "text or base64. Default: text.",
            "enum": [
              "text",
              "base64"
            ],
            "default": "text",
            "x-input-type": "select"
          },
          "contentType": {
            "type": "string",
            "description": "MIME type.",
            "x-input-type": "text"
          },
          "upsert": {
            "type": "boolean",
            "description": "Replace existing object.",
            "x-input-type": "toggle"
          }
        },
        "required": [
          "bucket",
          "path",
          "content"
        ]
      },
      "responseSchema": {
        "type": "object",
        "properties": {}
      },
      "agentTool": {
        "enabled": true,
        "name": "supabase_upload_object",
        "description": "Uploads text or base64 content to Supabase Storage.",
        "sideEffect": "write",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "downloadObject": {
      "metadata": {
        "label": "Download Object",
        "description": "Downloads a Storage object as base64."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "bucket": {
            "type": "string",
            "description": "Storage bucket.",
            "x-input-type": "text"
          },
          "path": {
            "type": "string",
            "description": "Object path.",
            "x-input-type": "text"
          }
        },
        "required": [
          "bucket",
          "path"
        ]
      },
      "responseSchema": {
        "type": "object",
        "properties": {
          "content": {
            "type": "string"
          },
          "encoding": {
            "type": "string"
          },
          "contentType": {
            "type": "string"
          },
          "sizeBytes": {
            "type": "number"
          }
        }
      },
      "agentTool": {
        "enabled": true,
        "name": "supabase_download_object",
        "description": "Downloads a Storage object as base64.",
        "sideEffect": "read",
        "requiresApproval": false,
        "timeoutMs": 30000
      }
    },
    "deleteObject": {
      "metadata": {
        "label": "Delete Object",
        "description": "Deletes one Storage object."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "bucket": {
            "type": "string",
            "description": "Storage bucket.",
            "x-input-type": "text"
          },
          "path": {
            "type": "string",
            "description": "Object path.",
            "x-input-type": "text"
          }
        },
        "required": [
          "bucket",
          "path"
        ]
      },
      "responseSchema": {
        "type": "array",
        "items": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "agentTool": {
        "enabled": true,
        "name": "supabase_delete_object",
        "description": "Deletes one Storage object.",
        "sideEffect": "delete",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    },
    "createSignedUrl": {
      "metadata": {
        "label": "Create Signed URL",
        "description": "Creates a temporary signed URL for a Storage object."
      },
      "parameters": {
        "type": "object",
        "properties": {
          "bucket": {
            "type": "string",
            "description": "Storage bucket.",
            "x-input-type": "text"
          },
          "path": {
            "type": "string",
            "description": "Object path.",
            "x-input-type": "text"
          },
          "expiresIn": {
            "type": "number",
            "description": "Seconds until expiration. Default: 3600.",
            "default": 3600,
            "x-input-type": "number"
          }
        },
        "required": [
          "bucket",
          "path"
        ]
      },
      "responseSchema": {
        "type": "object",
        "properties": {}
      },
      "agentTool": {
        "enabled": true,
        "name": "supabase_create_signed_url",
        "description": "Creates a temporary signed URL for a Storage object.",
        "sideEffect": "write",
        "requiresApproval": true,
        "timeoutMs": 30000
      }
    }
  },
  "triggers": {
    "onRowInserted": {
      "metadata": {
        "label": "On Row Inserted",
        "description": "Triggers when a Supabase row is inserted."
      },
      "delivery": {
        "mode": "realtime"
      },
      "parameters": {
        "type": "object",
        "properties": {
          "schema": {
            "type": "string",
            "description": "Database schema.",
            "x-label": "Schema",
            "x-input-type": "text"
          },
          "table": {
            "type": "string",
            "description": "Table name.",
            "x-label": "Table",
            "x-input-type": "text"
          },
          "eventAction": {
            "type": "string",
            "description": "Only accept this event action/operation. Example: created, updated, insert, failure.",
            "x-label": "Event Action",
            "x-input-type": "text"
          }
        },
        "required": [
          "table"
        ]
      },
      "payloadSchema": {
        "type": "object",
        "properties": {
          "eventId": {
            "type": "string",
            "description": "Database event identifier."
          },
          "table": {
            "type": "string",
            "description": "Table name."
          },
          "schema": {
            "type": "string",
            "description": "Database schema."
          },
          "operation": {
            "type": "string",
            "enum": [
              "insert",
              "update",
              "query_match",
              "auth_user_created"
            ]
          },
          "row": {
            "type": "object",
            "description": "Current row."
          },
          "oldRow": {
            "type": "object",
            "description": "Previous row when available."
          },
          "raw": {
            "type": "object",
            "description": "Original provider payload."
          }
        },
        "required": [
          "eventId",
          "operation"
        ]
      }
    },
    "onRowUpdated": {
      "metadata": {
        "label": "On Row Updated",
        "description": "Triggers when a Supabase row is updated."
      },
      "delivery": {
        "mode": "realtime"
      },
      "parameters": {
        "type": "object",
        "properties": {
          "schema": {
            "type": "string",
            "description": "Database schema.",
            "x-label": "Schema",
            "x-input-type": "text"
          },
          "table": {
            "type": "string",
            "description": "Table name.",
            "x-label": "Table",
            "x-input-type": "text"
          },
          "eventAction": {
            "type": "string",
            "description": "Only accept this event action/operation. Example: created, updated, insert, failure.",
            "x-label": "Event Action",
            "x-input-type": "text"
          }
        },
        "required": [
          "table"
        ]
      },
      "payloadSchema": {
        "type": "object",
        "properties": {
          "eventId": {
            "type": "string",
            "description": "Database event identifier."
          },
          "table": {
            "type": "string",
            "description": "Table name."
          },
          "schema": {
            "type": "string",
            "description": "Database schema."
          },
          "operation": {
            "type": "string",
            "enum": [
              "insert",
              "update",
              "query_match",
              "auth_user_created"
            ]
          },
          "row": {
            "type": "object",
            "description": "Current row."
          },
          "oldRow": {
            "type": "object",
            "description": "Previous row when available."
          },
          "raw": {
            "type": "object",
            "description": "Original provider payload."
          }
        },
        "required": [
          "eventId",
          "operation"
        ]
      }
    },
    "onAuthUserCreated": {
      "metadata": {
        "label": "On Auth User Created",
        "description": "Triggers when a Supabase Auth user is created."
      },
      "delivery": {
        "mode": "webhook",
        "requiresPublicUrl": true
      },
      "parameters": {
        "type": "object",
        "properties": {
          "schema": {
            "type": "string",
            "description": "Database schema to watch or filter. Leave empty for provider default.",
            "x-label": "Schema",
            "x-input-type": "text"
          },
          "table": {
            "type": "string",
            "description": "Database table to watch or filter.",
            "x-label": "Table",
            "x-input-type": "text"
          },
          "eventAction": {
            "type": "string",
            "description": "Only accept this event action/operation. Example: created, updated, insert, failure.",
            "x-label": "Event Action",
            "x-input-type": "text"
          }
        }
      },
      "payloadSchema": {
        "type": "object",
        "properties": {
          "eventId": {
            "type": "string",
            "description": "Database event identifier."
          },
          "table": {
            "type": "string",
            "description": "Table name."
          },
          "schema": {
            "type": "string",
            "description": "Database schema."
          },
          "operation": {
            "type": "string",
            "enum": [
              "insert",
              "update",
              "query_match",
              "auth_user_created"
            ]
          },
          "row": {
            "type": "object",
            "description": "Current row."
          },
          "oldRow": {
            "type": "object",
            "description": "Previous row when available."
          },
          "raw": {
            "type": "object",
            "description": "Original provider payload."
          }
        },
        "required": [
          "eventId",
          "operation"
        ]
      }
    }
  }
});
