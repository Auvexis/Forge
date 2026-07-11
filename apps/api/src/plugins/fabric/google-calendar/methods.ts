import { google } from "googleapis";
import type { PluginContext } from "@auvexis/fabric-sdk";

function required(value: string | undefined, fieldName: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`'${fieldName}' is required.`);
  return trimmed;
}

function getCalendarClient(context: PluginContext) {
  if (!context.tokens?.access_token) {
    throw new Error("Plugin not authorized - missing access token. Connect Google Calendar via Settings > Plugins first.");
  }
  const oauth2Client = new google.auth.OAuth2(context.credentials.client_id, context.credentials.client_secret);
  oauth2Client.setCredentials({
    access_token: context.tokens.access_token,
    refresh_token: context.tokens.refresh_token,
  });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

function parseAttendees(value?: string | string[]) {
  if (!value) return undefined;
  const emails = Array.isArray(value) ? value : value.split(",");
  return emails.map((email) => ({ email: email.trim() })).filter((item) => item.email);
}

function eventBody(params: {
  summary?: string;
  description?: string;
  location?: string;
  start?: string;
  end?: string;
  timeZone?: string;
  attendees?: string | string[];
}) {
  return {
    ...(params.summary?.trim() ? { summary: params.summary.trim() } : {}),
    ...(params.description?.trim() ? { description: params.description.trim() } : {}),
    ...(params.location?.trim() ? { location: params.location.trim() } : {}),
    ...(params.start?.trim() ? { start: { dateTime: params.start.trim(), timeZone: params.timeZone?.trim() } } : {}),
    ...(params.end?.trim() ? { end: { dateTime: params.end.trim(), timeZone: params.timeZone?.trim() } } : {}),
    ...(parseAttendees(params.attendees) ? { attendees: parseAttendees(params.attendees) } : {}),
  };
}

export function createGoogleCalendarMethods() {
  return {
    listCalendars: async (
      params: { maxResults?: number } = {},
      context?: PluginContext,
    ) => {
      const response = await getCalendarClient(context!).calendarList.list({ maxResults: params.maxResults ?? 100 });
      return response.data.items || [];
    },

    listEvents: async (
      params: { calendarId: string; timeMin?: string; timeMax?: string; maxResults?: number; q?: string },
      context?: PluginContext,
    ) => {
      const response = await getCalendarClient(context!).events.list({
        calendarId: required(params.calendarId, "calendarId"),
        timeMin: params.timeMin?.trim(),
        timeMax: params.timeMax?.trim(),
        maxResults: params.maxResults ?? 50,
        q: params.q?.trim(),
        singleEvents: true,
        orderBy: "startTime",
      });
      return response.data.items || [];
    },

    getEvent: async (
      params: { calendarId: string; eventId: string },
      context?: PluginContext,
    ) => {
      const response = await getCalendarClient(context!).events.get({
        calendarId: required(params.calendarId, "calendarId"),
        eventId: required(params.eventId, "eventId"),
      });
      return response.data;
    },

    createEvent: async (
      params: { calendarId: string; summary: string; start: string; end: string; description?: string; location?: string; timeZone?: string; attendees?: string | string[] },
      context?: PluginContext,
    ) => {
      const response = await getCalendarClient(context!).events.insert({
        calendarId: required(params.calendarId, "calendarId"),
        requestBody: eventBody(params),
      });
      return response.data;
    },

    updateEvent: async (
      params: { calendarId: string; eventId: string; summary?: string; start?: string; end?: string; description?: string; location?: string; timeZone?: string; attendees?: string | string[] },
      context?: PluginContext,
    ) => {
      const response = await getCalendarClient(context!).events.patch({
        calendarId: required(params.calendarId, "calendarId"),
        eventId: required(params.eventId, "eventId"),
        requestBody: eventBody(params),
      });
      return response.data;
    },

    deleteEvent: async (
      params: { calendarId: string; eventId: string; confirm?: boolean },
      context?: PluginContext,
    ) => {
      if (params.confirm !== true) throw new Error("'confirm' must be true before deleting a Google Calendar event.");
      await getCalendarClient(context!).events.delete({
        calendarId: required(params.calendarId, "calendarId"),
        eventId: required(params.eventId, "eventId"),
      });
      return { ok: true };
    },

    freeBusy: async (
      params: { calendarIds: string | string[]; timeMin: string; timeMax: string; timeZone?: string },
      context?: PluginContext,
    ) => {
      const ids = Array.isArray(params.calendarIds) ? params.calendarIds : params.calendarIds.split(",");
      const response = await getCalendarClient(context!).freebusy.query({
        requestBody: {
          timeMin: required(params.timeMin, "timeMin"),
          timeMax: required(params.timeMax, "timeMax"),
          timeZone: params.timeZone?.trim(),
          items: ids.map((id) => ({ id: id.trim() })).filter((item) => item.id),
        },
      });
      return response.data;
    },

    quickAddEvent: async (
      params: { calendarId: string; text: string },
      context?: PluginContext,
    ) => {
      const response = await getCalendarClient(context!).events.quickAdd({
        calendarId: required(params.calendarId, "calendarId"),
        text: required(params.text, "text"),
      });
      return response.data;
    },
  };
}
