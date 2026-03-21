import type {
  WidgetConfigByKey,
  ClockDateWidgetData,
  WidgetDataEnvelope,
} from "@ambient/shared-contracts";
import { normalizeWidgetConfig } from "../../widgets/widget-contracts";

export async function resolveClockDateWidgetData(input: {
  widgetInstanceId: string;
  widgetConfig: unknown;
}): Promise<WidgetDataEnvelope<ClockDateWidgetData, "clockDate">> {
  const now = new Date();
  const normalizedConfig = normalizeWidgetConfig("clockDate", input.widgetConfig) as WidgetConfigByKey["clockDate"];
  const format = normalizedConfig.format ?? (normalizedConfig.hour12 ? "12h" : "24h");
  const showSeconds = normalizedConfig.showSeconds ?? false;
  const timezone = normalizedConfig.timezone && normalizedConfig.timezone.length > 0
    ? normalizedConfig.timezone
    : "local";
  const locale = normalizedConfig.locale && normalizedConfig.locale.length > 0
    ? normalizedConfig.locale
    : "en-GB";
  const hour12 = format === "12h";
  const baseTimeFormat: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12,
    ...(showSeconds ? { second: "2-digit" } : {}),
    ...(timezone === "local" ? {} : { timeZone: timezone }),
  };
  const dateFormat: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...(timezone === "local" ? {} : { timeZone: timezone }),
  };
  const weekdayFormat: Intl.DateTimeFormatOptions = {
    weekday: "long",
    ...(timezone === "local" ? {} : { timeZone: timezone }),
  };

  const timeFormatter = createDateTimeFormat(locale, baseTimeFormat);
  const dateFormatter = createDateTimeFormat(locale, dateFormat);
  const weekdayFormatter = createDateTimeFormat(locale, weekdayFormat);

  return {
    widgetInstanceId: input.widgetInstanceId,
    widgetKey: "clockDate",
    state: "ready",
    data: {
      nowIso: now.toISOString(),
      formattedTime: timeFormatter.format(now),
      formattedDate: dateFormatter.format(now),
      weekdayLabel: weekdayFormatter.format(now),
    },
    meta: {
      fetchedAt: now.toISOString(),
      source: "system",
    },
  };
}

function createDateTimeFormat(locale: string, options: Intl.DateTimeFormatOptions) {
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch {
    const fallbackOptions: Intl.DateTimeFormatOptions = { ...options };
    delete fallbackOptions.timeZone;
    return new Intl.DateTimeFormat(locale, fallbackOptions);
  }
}
