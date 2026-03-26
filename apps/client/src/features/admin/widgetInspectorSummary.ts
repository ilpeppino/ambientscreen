import type { WidgetKey } from "@ambient/shared-contracts";

export const INSPECTOR_LABELS: Record<string, string> = {
  provider: "Provider",
  account: "iCal URL",
  integrationConnectionId: "Connected account",
  calendarId: "Calendar",
  timeWindow: "Time window",
  maxEvents: "Max events",
  includeAllDay: "Include all-day events",
  city: "City",
  countryCode: "Country code",
  units: "Units",
  forecastSlots: "Forecast slots",
  format: "Format",
  showSeconds: "Show seconds",
  timezone: "Timezone",
};

export function formatInspectorValue(key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  // Provider labels
  if (key === "provider") {
    if (value === "google") return "Google Calendar";
    if (value === "ical") return "iCal Feed";
  }

  // Time window labels
  if (key === "timeWindow") {
    if (value === "today") return "Today";
    if (value === "next24h") return "Next 24 hours";
    if (value === "next7d") return "Next 7 days";
  }

  // Units labels
  if (key === "units") {
    if (value === "metric") return "°C (Metric)";
    if (value === "imperial") return "°F (Imperial)";
    if (value === "standard") return "Kelvin (Standard)";
  }

  // Format labels
  if (key === "format") {
    if (value === "12h") return "12-hour";
    if (value === "24h") return "24-hour";
  }

  // Boolean labels
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  // Default: convert to string
  return String(value);
}

export interface InspectorField {
  key: string;
  label: string;
  value: string;
}

export function buildWidgetReadOnlyFields(
  widgetKey: WidgetKey,
  config: Record<string, unknown>,
): InspectorField[] {
  const fields: InspectorField[] = [];

  // Define which fields to show for each widget, in order
  const fieldKeys: Record<WidgetKey, string[]> = {
    clockDate: ["format", "showSeconds", "timezone"],
    weather: ["city", "countryCode", "units", "forecastSlots"],
    calendar: ["provider", "account", "timeWindow", "maxEvents", "includeAllDay"],
  };

  const keysForWidget = fieldKeys[widgetKey] ?? [];

  // Special handling for calendar: skip account if provider is not ical
  const calendarProvider = config.provider as string | undefined;
  const filteredKeys =
    widgetKey === "calendar" && calendarProvider !== "ical"
      ? keysForWidget.filter((k) => k !== "account")
      : keysForWidget;

  for (const key of filteredKeys) {
    const value = config[key];

    // Skip null, undefined, empty string
    if (value === null || value === undefined || value === "") {
      continue;
    }

    // Skip false for booleans (but not for numbers or strings that might be falsy)
    if (typeof value === "boolean" && value === false && key === "countryCode") {
      // Actually countryCode would never be a boolean, so this check is moot
      // Keep it for clarity but the real check is below
    }

    const label = INSPECTOR_LABELS[key] ?? key;
    const formattedValue = formatInspectorValue(key, value);

    if (formattedValue) {
      // Skip if the formatted value is empty after formatting
      fields.push({
        key,
        label,
        value: formattedValue,
      });
    }
  }

  return fields;
}
