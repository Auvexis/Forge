import { google } from "googleapis";
import type { PluginContext } from "@auvexis/sailor-sdk";

// ──────────── Auth Helper ────────────

/**
 * Creates an authorized Google API client (auth object).
 */
function getAuthClient(context: PluginContext) {
  if (!context.tokens?.access_token) {
    throw new Error("Plugin not authorized — missing access token. Connect the plugin via Settings > Plugins first.");
  }

  const oauth2Client = new google.auth.OAuth2(
    context.credentials.client_id,
    context.credentials.client_secret,
  );

  oauth2Client.setCredentials({
    access_token: context.tokens.access_token,
    refresh_token: context.tokens.refresh_token,
  });

  return oauth2Client;
}

// ──────────── Value Parsing Helpers ────────────

/**
 * Parses a string input into a JSON array, throwing a descriptive error if it fails.
 */
function parseJsonArray(value: string | any[], fieldName: string): any[] {
  if (Array.isArray(value)) return value;
  
  if (typeof value !== "string") {
    throw new Error(`'${fieldName}' must be a JSON array string. Received: ${typeof value}`);
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      throw new Error(`'${fieldName}' must evaluate to a JSON array. Evaluated to: ${typeof parsed}`);
    }
    return parsed;
  } catch (error: any) {
    throw new Error(`Failed to parse '${fieldName}' as a JSON array: ${error.message}`);
  }
}

// ──────────── Methods ────────────

export function createGoogleSheetsMethods() {
  return {
    /**
     * Lists all spreadsheets the user has access to.
     * Uses the Drive API since Sheets API doesn't have a list method.
     * Used internally by the UI for `x-dynamic-options`.
     */
    listSpreadsheets: async (
      _params: Record<string, never>,
      context?: PluginContext,
    ) => {
      const authClient = getAuthClient(context!);
      const drive = google.drive({ version: "v3", auth: authClient });

      const response = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
        fields: "files(id, name)",
        orderBy: "modifiedTime desc",
        pageSize: 100, // Reasonable limit for a UI dropdown
      });

      return response.data.files || [];
    },

    /**
     * Reads a range of values from a spreadsheet.
     * Optionally parses the first row as headers and maps the remaining rows to objects.
     */
    readRows: async (
      params: {
        spreadsheetId: string;
        range: string;
        includeHeader?: boolean;
      },
      context?: PluginContext,
    ) => {
      const authClient = getAuthClient(context!);
      const sheets = google.sheets({ version: "v4", auth: authClient });

      if (!params.spreadsheetId?.trim() || !params.range?.trim()) {
        throw new Error("'spreadsheetId' and 'range' are required.");
      }

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: params.spreadsheetId.trim(),
        range: params.range.trim(),
      });

      const rows = response.data.values || [];

      // If empty or no headers requested, just return the raw array of arrays
      if (!rows.length || !params.includeHeader) {
        return rows;
      }

      // Convert array of arrays to array of objects using the first row as keys
      const [headers, ...dataRows] = rows;
      
      return dataRows.map((row) => {
        const obj: Record<string, any> = {};
        // Use headers length to iterate so we don't drop empty trailing columns
        for (let i = 0; i < headers.length; i++) {
          const key = headers[i] ? String(headers[i]).trim() : `Column${i + 1}`;
          obj[key] = row[i] !== undefined ? row[i] : null;
        }
        return obj;
      });
    },

    /**
     * Appends a new row of data to the specified sheet/range.
     */
    appendRow: async (
      params: {
        spreadsheetId: string;
        range: string;
        values: string | any[];
      },
      context?: PluginContext,
    ) => {
      const authClient = getAuthClient(context!);
      const sheets = google.sheets({ version: "v4", auth: authClient });

      if (!params.spreadsheetId?.trim() || !params.range?.trim() || !params.values) {
        throw new Error("'spreadsheetId', 'range', and 'values' are required.");
      }

      // Parse the input row
      const rowData = parseJsonArray(params.values, "values");

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: params.spreadsheetId.trim(),
        range: params.range.trim(),
        // USER_ENTERED means Google Sheets parses dates/numbers just like someone typing in the UI
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [rowData], // Must be an array of arrays (rows)
        },
      });

      return response.data.updates || {};
    },
  };
}
