import type {
  WidgetConfigByKey,
  ClockDateWidgetData,
  WidgetDataEnvelope,
} from "@ambient/shared-contracts";

function toClockDateConfig(config: unknown): WidgetConfigByKey["clockDate"] {
  const raw = config && typeof config === "object" && !Array.isArray(config)
    ? config as Record<string, unknown>
    : {};

  // `hour12` is canonical. `format` is a legacy fallback for data persisted before the migration.
  let hour12: boolean;
  if (typeof raw.hour12 === "boolean") {
    hour12 = raw.hour12;
  } else if (raw.format === "12h") {
    hour12 = true;
  } else if (raw.format === "24h") {
    hour12 = false;
  } else {
    hour12 = false;
  }

  return {
    hour12,
    showSeconds: typeof raw.showSeconds === "boolean" ? raw.showSeconds : false,
    timezone: typeof raw.timezone === "string" && raw.timezone.length > 0 ? raw.timezone : "local",
    locale: typeof raw.locale === "string" && raw.locale.length > 0 ? raw.locale : undefined,
  };
}

export async function resolveClockDateWidgetData(input: {
  widgetInstanceId: string;
  widgetConfig: unknown;
}): Promise<WidgetDataEnvelope<ClockDateWidgetData, "clockDate">> {
  const now = new Date();
  const normalizedConfig = toClockDateConfig(input.widgetConfig);
  const hour12 = normalizedConfig.hour12 ?? false;
  const showSeconds = normalizedConfig.showSeconds ?? false;
  const timezone = normalizedConfig.timezone && normalizedConfig.timezone.length > 0
    ? normalizedConfig.timezone
    : "local";
  const locale = normalizedConfig.locale && normalizedConfig.locale.length > 0
    ? normalizedConfig.locale
    : "en-GB";
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
