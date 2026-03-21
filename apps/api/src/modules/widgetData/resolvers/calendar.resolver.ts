import type {
  CalendarWidgetData,
  WidgetConfigByKey,
  WidgetDataEnvelope,
} from "@ambient/shared-contracts";
import { normalizeWidgetConfig } from "../../widgets/widget-contracts";
import {
  fetchIcsCalendarEvents,
  type IcsCalendarResult,
} from "../providers/ical.provider";

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
  // Anchor to start of current UTC day so all-day events for today are included
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
  const normalizedConfig = normalizeWidgetConfig(
    "calendar",
    input.widgetConfig,
  ) as WidgetConfigByKey["calendar"];

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
