import type {
  ClockDateWidgetData,
  WidgetDataEnvelope,
} from "@ambient/shared-contracts";

export async function resolveClockDateWidgetData(input: {
  widgetInstanceId: string;
}): Promise<WidgetDataEnvelope<ClockDateWidgetData, "clockDate">> {
  const now = new Date();

  return {
    widgetInstanceId: input.widgetInstanceId,
    widgetKey: "clockDate",
    state: "ready",
    data: {
      nowIso: now.toISOString(),
      formattedTime: new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now),
      formattedDate: new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(now),
      weekdayLabel: new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
      }).format(now),
    },
    meta: {
      fetchedAt: now.toISOString(),
      source: "system",
    },
  };
}
