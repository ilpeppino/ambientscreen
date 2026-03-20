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

  const sourceType = normalizedConfig.sourceType ?? "ical";
  const feedUrl = normalizedConfig.feedUrl;
  const lookAheadDays = normalizedConfig.lookAheadDays ?? 7;
  const includeAllDay = normalizedConfig.includeAllDay ?? true;
  const maxEvents = normalizedConfig.maxEvents ?? 10;

  if (!feedUrl) {
    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "calendar",
      state: "empty",
      data: buildEmptyCalendarData(),
      meta: {
        source: sourceType,
        errorCode: "CALENDAR_FEED_NOT_CONFIGURED",
        message: "Calendar feed URL is not configured.",
      },
    };
  }

  const fetchCalendarData = input.fetchCalendarData ?? fetchIcsCalendarEvents;
  const windowStart = new Date();
  const windowEnd = new Date(windowStart);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + lookAheadDays);

  try {
    const providerResult = await fetchCalendarData({
      feedUrl,
      windowStartIso: windowStart.toISOString(),
      windowEndIso: windowEnd.toISOString(),
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
          source: sourceType,
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
        source: sourceType,
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
        source: sourceType,
        errorCode: "CALENDAR_PROVIDER_UNAVAILABLE",
        message: "Calendar provider request failed.",
      },
    };
  }
}
