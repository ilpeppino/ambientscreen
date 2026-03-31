import type {
  CalendarWidgetData,
  WidgetConfigByKey,
  WidgetDataEnvelope,
} from "@ambient/shared-contracts";
import {
  fetchIcsCalendarEvents,
  type IcsCalendarResult,
} from "../providers/ical.provider";
import {
  fetchGoogleCalendarEvents,
  type GoogleCalendarResult,
} from "../providers/googleCalendar.provider";
import { integrationsService } from "../../integrations/integrations.service";

function toCalendarConfig(config: unknown): WidgetConfigByKey["calendar"] {
  const raw = config && typeof config === "object" && !Array.isArray(config)
    ? config as Record<string, unknown>
    : {};

  const provider = raw.provider === "google" ? "google" : "ical";

  const timeWindow = raw.timeWindow === "today" || raw.timeWindow === "next24h" || raw.timeWindow === "next7d"
    ? raw.timeWindow
    : "next7d";

  const maxItemsInput = typeof raw.maxItems === "number"
    ? raw.maxItems
    : typeof raw.maxEvents === "number"
    ? raw.maxEvents
    : null;

  const maxItems = typeof maxItemsInput === "number" && Number.isInteger(maxItemsInput)
    ? Math.min(20, Math.max(1, maxItemsInput))
    : 10;

  const normalizedCalendarIds = Array.isArray(raw.calendarIds)
    ? raw.calendarIds
      .filter((id): id is string => typeof id === "string")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
    : [];

  const legacyCalendarId = typeof raw.calendarId === "string" && raw.calendarId.trim().length > 0
    ? raw.calendarId.trim()
    : undefined;

  const calendarIds = normalizedCalendarIds.length > 0
    ? normalizedCalendarIds
    : legacyCalendarId
    ? [legacyCalendarId]
    : undefined;

  return {
    provider,
    account: typeof raw.account === "string" ? raw.account : "",
    integrationConnectionId: typeof raw.integrationConnectionId === "string"
      ? raw.integrationConnectionId
      : undefined,
    calendarIds,
    calendarId: legacyCalendarId,
    timeWindow,
    includeAllDay: typeof raw.includeAllDay === "boolean" ? raw.includeAllDay : true,
    maxItems,
  };
}

function buildEmptyCalendarData(): CalendarWidgetData {
  return { upcomingCount: 0, events: [] };
}

function buildWindowBounds(timeWindow: "today" | "next24h" | "next7d"): {
  windowStartIso: string;
  windowEndIso: string;
} {
  const now = new Date();
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const windowEnd = new Date(windowStart);

  if (timeWindow === "today") {
    windowEnd.setUTCHours(23, 59, 59, 999);
  } else if (timeWindow === "next24h") {
    windowEnd.setTime(windowEnd.getTime() + 24 * 60 * 60 * 1000);
  } else {
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 7);
  }

  return {
    windowStartIso: windowStart.toISOString(),
    windowEndIso: windowEnd.toISOString(),
  };
}

async function resolveIcalCalendar(
  config: WidgetConfigByKey["calendar"],
  widgetInstanceId: string,
  fetchCalendarData: (input: {
    feedUrl: string;
    windowStartIso: string;
    windowEndIso: string;
    includeAllDay: boolean;
    maxEvents: number;
  }) => Promise<IcsCalendarResult>,
): Promise<WidgetDataEnvelope<CalendarWidgetData, "calendar">> {
  const account = config.account ?? "";
  const timeWindow = config.timeWindow ?? "next7d";
  const includeAllDay = config.includeAllDay ?? true;
  const maxItems = config.maxItems ?? config.maxEvents ?? 10;

  if (!account) {
    return {
      widgetInstanceId,
      widgetKey: "calendar",
      state: "empty",
      data: buildEmptyCalendarData(),
      meta: {
        source: "ical",
        errorCode: "CALENDAR_FEED_NOT_CONFIGURED",
        message: "Calendar account is not configured.",
      },
    };
  }

  const { windowStartIso, windowEndIso } = buildWindowBounds(timeWindow);

  try {
    const result = await fetchCalendarData({
      feedUrl: account,
      windowStartIso,
      windowEndIso,
      includeAllDay,
      maxEvents: maxItems,
    });

    if (result.events.length === 0) {
      return {
        widgetInstanceId,
        widgetKey: "calendar",
        state: "empty",
        data: buildEmptyCalendarData(),
        meta: {
          source: "ical",
          fetchedAt: result.fetchedAtIso,
          message: "No upcoming events in the configured time window.",
        },
      };
    }

    return {
      widgetInstanceId,
      widgetKey: "calendar",
      state: "ready",
      data: { upcomingCount: result.events.length, events: result.events },
      meta: { source: "ical", fetchedAt: result.fetchedAtIso },
    };
  } catch {
    return {
      widgetInstanceId,
      widgetKey: "calendar",
      state: "stale",
      data: buildEmptyCalendarData(),
      meta: {
        source: "ical",
        errorCode: "CALENDAR_PROVIDER_UNAVAILABLE",
        message: "Calendar provider request failed.",
      },
    };
  }
}

async function resolveGoogleCalendar(
  config: WidgetConfigByKey["calendar"],
  widgetInstanceId: string,
  userId: string | undefined,
  getAccessToken: (connectionId: string) => Promise<string>,
  fetchGoogleEvents: (input: {
    accessToken: string;
    calendarId: string;
    timeMin: string;
    timeMax: string;
    maxResults: number;
  }) => Promise<GoogleCalendarResult>,
): Promise<WidgetDataEnvelope<CalendarWidgetData, "calendar">> {
  const connectionId = config.integrationConnectionId;
  const selectedCalendarIds = Array.isArray(config.calendarIds)
    ? config.calendarIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];
  const fallbackCalendarId = typeof config.calendarId === "string" && config.calendarId.trim().length > 0
    ? config.calendarId
    : "primary";
  const calendarIds = selectedCalendarIds.length > 0 ? selectedCalendarIds : [fallbackCalendarId];
  const timeWindow = config.timeWindow ?? "next7d";
  const maxItems = config.maxItems ?? config.maxEvents ?? 10;
  const includeAllDay = config.includeAllDay ?? true;

  if (!connectionId) {
    return {
      widgetInstanceId,
      widgetKey: "calendar",
      state: "empty",
      data: buildEmptyCalendarData(),
      meta: {
        source: "google",
        errorCode: "CALENDAR_CONNECTION_NOT_CONFIGURED",
        message: "Google Calendar connection is not configured.",
      },
    };
  }

  const { windowStartIso, windowEndIso } = buildWindowBounds(timeWindow);

  try {
    let accessToken: string;
    try {
      accessToken = await getAccessToken(connectionId);
    } catch (err) {
      const message = (err as Error).message;
      if (message === "CONNECTION_NOT_FOUND") {
        return {
          widgetInstanceId,
          widgetKey: "calendar",
          state: "error",
          data: null,
          meta: {
            source: "google",
            errorCode: "CALENDAR_CONNECTION_NOT_FOUND",
            message: "Google Calendar connection not found. Please reconnect your account.",
          },
        };
      }
      throw err;
    }

    // Ownership is enforced by the widget ownership check in widgetDataService —
    // the widget instance can only be fetched if userId matches. The connectionId
    // stored in the widget config is the user's own connection.
    void userId; // acknowledged — ownership validated upstream

    const results = await Promise.all(
      calendarIds.map((calendarId) =>
        fetchGoogleEvents({
          accessToken,
          calendarId,
          timeMin: windowStartIso,
          timeMax: windowEndIso,
          maxResults: maxItems,
        })),
    );

    const mergedEvents = results
      .flatMap((result) => result.events)
      .filter((event) => includeAllDay || !event.allDay)
      .sort((a, b) => {
        const byStart = new Date(a.startIso).getTime() - new Date(b.startIso).getTime();
        if (byStart !== 0) return byStart;
        return a.id.localeCompare(b.id);
      })
      .slice(0, maxItems);

    const fetchedAtIso = results
      .map((result) => result.fetchedAtIso)
      .sort()
      .at(-1) ?? new Date().toISOString();

    if (mergedEvents.length === 0) {
      return {
        widgetInstanceId,
        widgetKey: "calendar",
        state: "empty",
        data: buildEmptyCalendarData(),
        meta: {
          source: "google",
          fetchedAt: fetchedAtIso,
          message: "No upcoming events in the configured time window.",
        },
      };
    }

    return {
      widgetInstanceId,
      widgetKey: "calendar",
      state: "ready",
      data: { upcomingCount: mergedEvents.length, events: mergedEvents },
      meta: { source: "google", fetchedAt: fetchedAtIso },
    };
  } catch {
    return {
      widgetInstanceId,
      widgetKey: "calendar",
      state: "stale",
      data: buildEmptyCalendarData(),
      meta: {
        source: "google",
        errorCode: "CALENDAR_PROVIDER_UNAVAILABLE",
        message: "Google Calendar provider request failed.",
      },
    };
  }
}

export async function resolveCalendarWidgetData(input: {
  widgetInstanceId: string;
  widgetConfig: unknown;
  userId?: string;
  fetchCalendarData?: (input: {
    feedUrl: string;
    windowStartIso: string;
    windowEndIso: string;
    includeAllDay: boolean;
    maxEvents: number;
  }) => Promise<IcsCalendarResult>;
  getGoogleAccessToken?: (connectionId: string) => Promise<string>;
  fetchGoogleEvents?: (input: {
    accessToken: string;
    calendarId: string;
    timeMin: string;
    timeMax: string;
    maxResults: number;
  }) => Promise<GoogleCalendarResult>;
}): Promise<WidgetDataEnvelope<CalendarWidgetData, "calendar">> {
  const config = toCalendarConfig(input.widgetConfig);

  if (config.provider === "google") {
    const getAccessToken = input.getGoogleAccessToken ??
      ((connectionId) => integrationsService.getValidAccessToken(connectionId));
    const fetchGoogleEvents = input.fetchGoogleEvents ?? fetchGoogleCalendarEvents;

    return resolveGoogleCalendar(
      config,
      input.widgetInstanceId,
      input.userId,
      getAccessToken,
      fetchGoogleEvents,
    );
  }

  const fetchCalendarData = input.fetchCalendarData ?? fetchIcsCalendarEvents;
  return resolveIcalCalendar(config, input.widgetInstanceId, fetchCalendarData);
}
