import { google } from "googleapis";
import type { PluginContext } from "@auvexis/fabric-sdk";

function getAuthClient(context: PluginContext) {
  if (!context.tokens?.access_token) {
    throw new Error("Plugin not authorized - missing access token. Connect the plugin via Settings > Plugins first.");
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

function required(value: string | undefined, fieldName: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`'${fieldName}' is required.`);
  return trimmed;
}

export function parseJsonArray(value: string | any[], fieldName: string): any[] {
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
    if (error.message.includes("must evaluate")) throw error;
    throw new Error(`Failed to parse '${fieldName}' as a JSON array: ${error.message}`);
  }
}

export function rowsToObjects(rows: any[][]): Record<string, any>[] {
  if (rows.length === 0) return [];
  const [headers, ...dataRows] = rows;
  return dataRows.map((row) => {
    const obj: Record<string, any> = {};
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i] ? String(headers[i]).trim() : `Column${i + 1}`;
      obj[key] = row[i] !== undefined ? row[i] : null;
    }
    return obj;
  });
}

export function findHeaderIndex(headers: any[], keyColumn: string): number {
  const target = required(keyColumn, "keyColumn").toLowerCase();
  const index = headers.findIndex((header) => String(header ?? "").trim().toLowerCase() === target);
  if (index === -1) throw new Error(`'keyColumn' was not found in the header row: ${keyColumn}`);
  return index;
}

function sheetsClient(context: PluginContext) {
  return google.sheets({ version: "v4", auth: getAuthClient(context) });
}

function driveClient(context: PluginContext) {
  return google.drive({ version: "v3", auth: getAuthClient(context) });
}

function rowObjectToValues(headers: any[], row: Record<string, any>): any[] {
  return headers.map((header) => row[String(header).trim()] ?? "");
}

function sheetRange(sheetName: string, rowNumber: number, width: number): string {
  const endColumn = columnName(width);
  return `${sheetName}!A${rowNumber}:${endColumn}${rowNumber}`;
}

function columnName(index: number): string {
  let name = "";
  let current = index;
  while (current > 0) {
    const mod = (current - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    current = Math.floor((current - mod) / 26);
  }
  return name;
}

export function createGoogleSheetsMethods() {
  return {
    listSpreadsheets: async (
      _params: Record<string, never> = {},
      context?: PluginContext,
    ) => {
      const response = await driveClient(context!).files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
        fields: "files(id, name)",
        orderBy: "modifiedTime desc",
        pageSize: 100,
      });
      return response.data.files || [];
    },

    listSheets: async (
      params: { spreadsheetId: string },
      context?: PluginContext,
    ) => {
      const response = await sheetsClient(context!).spreadsheets.get({
        spreadsheetId: required(params.spreadsheetId, "spreadsheetId"),
        fields: "sheets(properties(sheetId,title,index,gridProperties))",
      });
      return response.data.sheets?.map((sheet) => sheet.properties) || [];
    },

    readRows: async (
      params: { spreadsheetId: string; range: string; includeHeader?: boolean },
      context?: PluginContext,
    ) => {
      const response = await sheetsClient(context!).spreadsheets.values.get({
        spreadsheetId: required(params.spreadsheetId, "spreadsheetId"),
        range: required(params.range, "range"),
      });
      const rows = response.data.values || [];
      return params.includeHeader ? rowsToObjects(rows) : rows;
    },

    appendRow: async (
      params: { spreadsheetId: string; range: string; values: string | any[] },
      context?: PluginContext,
    ) => {
      const response = await sheetsClient(context!).spreadsheets.values.append({
        spreadsheetId: required(params.spreadsheetId, "spreadsheetId"),
        range: required(params.range, "range"),
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [parseJsonArray(params.values, "values")] },
      });
      return response.data.updates || {};
    },

    appendRows: async (
      params: { spreadsheetId: string; range: string; rows: string | any[] },
      context?: PluginContext,
    ) => {
      const rows = parseJsonArray(params.rows, "rows");
      const response = await sheetsClient(context!).spreadsheets.values.append({
        spreadsheetId: required(params.spreadsheetId, "spreadsheetId"),
        range: required(params.range, "range"),
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: rows },
      });
      return response.data.updates || {};
    },

    updateRange: async (
      params: { spreadsheetId: string; range: string; values: string | any[] },
      context?: PluginContext,
    ) => {
      const values = parseJsonArray(params.values, "values");
      const response = await sheetsClient(context!).spreadsheets.values.update({
        spreadsheetId: required(params.spreadsheetId, "spreadsheetId"),
        range: required(params.range, "range"),
        valueInputOption: "USER_ENTERED",
        requestBody: { values: Array.isArray(values[0]) ? values : [values] },
      });
      return response.data;
    },

    clearRange: async (
      params: { spreadsheetId: string; range: string; confirm?: boolean },
      context?: PluginContext,
    ) => {
      if (params.confirm !== true) throw new Error("'confirm' must be true before clearing a Google Sheets range.");
      const response = await sheetsClient(context!).spreadsheets.values.clear({
        spreadsheetId: required(params.spreadsheetId, "spreadsheetId"),
        range: required(params.range, "range"),
        requestBody: {},
      });
      return response.data;
    },

    createSheet: async (
      params: { spreadsheetId: string; sheetName: string },
      context?: PluginContext,
    ) => {
      const response = await sheetsClient(context!).spreadsheets.batchUpdate({
        spreadsheetId: required(params.spreadsheetId, "spreadsheetId"),
        requestBody: { requests: [{ addSheet: { properties: { title: required(params.sheetName, "sheetName") } } }] },
      });
      return response.data;
    },

    deleteSheet: async (
      params: { spreadsheetId: string; sheetId: number; confirm?: boolean },
      context?: PluginContext,
    ) => {
      if (params.confirm !== true) throw new Error("'confirm' must be true before deleting a Google Sheets sheet.");
      const response = await sheetsClient(context!).spreadsheets.batchUpdate({
        spreadsheetId: required(params.spreadsheetId, "spreadsheetId"),
        requestBody: { requests: [{ deleteSheet: { sheetId: params.sheetId } }] },
      });
      return response.data;
    },

    findRows: async (
      params: { spreadsheetId: string; range: string; keyColumn: string; keyValue: string },
      context?: PluginContext,
    ) => {
      const response = await sheetsClient(context!).spreadsheets.values.get({
        spreadsheetId: required(params.spreadsheetId, "spreadsheetId"),
        range: required(params.range, "range"),
      });
      const rows = response.data.values || [];
      if (rows.length === 0) return [];
      const keyIndex = findHeaderIndex(rows[0], params.keyColumn);
      return rowsToObjects(rows)
        .map((row, index) => ({ ...row, _rowNumber: index + 2 }))
        .filter((row) => String(Object.values(row)[keyIndex] ?? "") === String(params.keyValue));
    },

    upsertRowByKey: async (
      params: { spreadsheetId: string; sheetName: string; keyColumn: string; keyValue: string; row: string | Record<string, any> },
      context?: PluginContext,
    ) => {
      const spreadsheetId = required(params.spreadsheetId, "spreadsheetId");
      const sheetName = required(params.sheetName, "sheetName");
      const rowObject = typeof params.row === "string" ? JSON.parse(params.row) : params.row;
      const sheets = sheetsClient(context!);
      const read = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetName });
      const rows = read.data.values || [];
      if (rows.length === 0) throw new Error("Cannot upsert without a header row.");

      const keyIndex = findHeaderIndex(rows[0], params.keyColumn);
      const foundIndex = rows.slice(1).findIndex((row) => String(row[keyIndex] ?? "") === String(params.keyValue));
      const values = rowObjectToValues(rows[0], rowObject);

      if (foundIndex >= 0) {
        const rowNumber = foundIndex + 2;
        const response = await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: sheetRange(sheetName, rowNumber, rows[0].length),
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [values] },
        });
        return { action: "updated", rowNumber, updates: response.data };
      }

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: sheetName,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [values] },
      });
      return { action: "inserted", updates: response.data.updates || {} };
    },
  };
}
