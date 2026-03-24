import type {
  CalendarWidgetData,
  WidgetConfigByKey,
  WidgetDataEnvelope,
} from "@ambient/shared-contracts";
import {
  fetchIcsCalendarEvents,
  type IcsCalendarResult,
} from "../providers/ical.provider";

function toCalendarConfig(config: unknown): WidgetConfigByKey["calendar"] {
  const raw = config && typeof config === "object" && !Array.isArray(config)
    ? config as Record<string, unknown>
    : {};

  const timeWindow = raw.timeWindow === "today" || raw.timeWindow === "next24h" || raw.timeWindow === "next7d"
    ? raw.timeWindow
    : "next7d";

  const maxEvents = typeof raw.maxEvents === "number" && Number.isInteger(raw.maxEvents)
    ? Math.min(20, Math.max(1, raw.maxEvents))
    : 10;

  return {
    provider: raw.provider === "ical" ? "ical" : "ical",
    account: typeof raw.account === "string" ? raw.account : "",
    timeWindow,
    includeAllDay: typeof raw.includeAllDay === "boolean" ? raw.includeAllDay : true,
    maxEvents,
  };
}

function buildEmptyCalendarData(): CalendarWidgetData {
  return {
    upcomingCount: 0,
    events: [],
  };
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

export async function resolveCalendarWidgetData(input: {
  widgetInstanceId: string;
  widgetConfig: unknown;
  fetchCalendarData?: (input: {
    feedUrl: string;
    windowStartIso: string;
    windowEndIso: string;
    includeAllDay: boolean;
    maxEvents: number;
  }) => Promise<IcsCalendarResult>;
}): Promise<WidgetDataEnvelope<CalendarWidgetData, "calendar">> {
  const normalizedConfig = toCalendarConfig(input.widgetConfig);

  const provider = normalizedConfig.provider ?? "ical";
  const account = normalizedConfig.account;
  const timeWindow = normalizedConfig.timeWindow ?? "next7d";
  const includeAllDay = normalizedConfig.includeAllDay ?? true;
  const maxEvents = normalizedConfig.maxEvents ?? 10;

  if (!account) {
    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "calendar",
      state: "empty",
      data: buildEmptyCalendarData(),
      meta: {
        source: provider,
        errorCode: "CALENDAR_FEED_NOT_CONFIGURED",
        message: "Calendar account is not configured.",
      },
    };
  }

  const fetchCalendarData = input.fetchCalendarData ?? fetchIcsCalendarEvents;
  const { windowStartIso, windowEndIso } = buildWindowBounds(timeWindow);

  try {
    const providerResult = await fetchCalendarData({
      feedUrl: account,
      windowStartIso,
      windowEndIso,
      includeAllDay,
      maxEvents,
    });

    if (providerResult.events.length === 0) {
      return {
        widgetInstanceId: input.widgetInstanceId,
        widgetKey: "calendar",
        state: "empty",
        data: buildEmptyCalendarData(),
        meta: {
          source: provider,
          fetchedAt: providerResult.fetchedAtIso,
          message: "No upcoming events in the configured time window.",
        },
      };
    }

    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "calendar",
      state: "ready",
      data: {
        upcomingCount: providerResult.events.length,
        events: providerResult.events,
      },
      meta: {
        source: provider,
        fetchedAt: providerResult.fetchedAtIso,
      },
    };
  } catch {
    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "calendar",
      state: "stale",
      data: buildEmptyCalendarData(),
      meta: {
        source: provider,
        errorCode: "CALENDAR_PROVIDER_UNAVAILABLE",
        message: "Calendar provider request failed.",
      },
    };
  }
}
