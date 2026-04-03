import type { WidgetKey } from "@ambient/shared-contracts";

export const INSPECTOR_LABELS: Record<string, string> = {
  provider: "Provider",
  account: "iCal URL",
  integrationConnectionId: "Connected account",
  calendarIds: "Calendars",
  timeWindow: "Time window",
  maxItems: "Max events",
  includeAllDay: "Include all-day events",
  city: "City",
  countryCode: "Country code",
  units: "Units",
  forecastSlots: "Forecast slots",
  feedUrl: "RSS feed URL",
  showImages: "Show images",
  showPublishedAt: "Show published date",
  layout: "Layout",
  title: "Widget title",
  format: "Format",
  showSeconds: "Show seconds",
  timezone: "Timezone",
  selectedTaskListIds: "Task lists",
  displayMode: "Display mode",
  showCompleted: "Show completed",
  label: "Mailbox",
  customLabel: "Custom label",
  onlyUnread: "Unread only",
  showPreview: "Show preview",
};

export function formatInspectorValue(key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  // Provider labels
  if (key === "provider") {
    if (value === "google") return "Google Calendar";
    if (value === "ical") return "iCal Feed";
    if (value === "google-tasks") return "Google Tasks";
    if (value === "microsoft-todo") return "Microsoft To Do";
    if (value === "todoist") return "Todoist";
    if (value === "gmail") return "Gmail";
    if (value === "outlook") return "Outlook";
    if (value === "imap") return "IMAP";
    if (value === "slack") return "Slack";
    if (value === "teams") return "Teams";
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

  if (key === "layout") {
    if (value === "headline-list") return "Headline list";
    if (value === "ticker") return "Ticker";
  }

  if (key === "displayMode") {
    if (value === "list") return "List";
    if (value === "compact") return "Compact";
    if (value === "focus") return "Focus";
  }

  if (key === "label") {
    if (value === "INBOX") return "Inbox";
    if (value === "IMPORTANT") return "Important";
    if (value === "CUSTOM") return "Custom";
  }

  if (key === "selectedTaskListIds" && Array.isArray(value)) {
    return value.length > 0 ? `${value.length} selected` : "All lists";
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
  const normalizedConfig = normalizeCalendarSummaryConfig(widgetKey, config);

  // Define which fields to show for each widget, in order
  const fieldKeys: Record<WidgetKey, string[]> = {
    clockDate: ["format", "showSeconds", "timezone"],
    weather: ["city", "countryCode", "units", "forecastSlots"],
    calendar: ["provider", "account", "timeWindow", "maxItems", "includeAllDay"],
    rssNews: ["title", "feedUrl", "layout", "maxItems", "showImages", "showPublishedAt"],
    tasks: ["provider", "selectedTaskListIds", "displayMode", "maxItems", "showCompleted"],
    emailFeed: ["provider", "label", "customLabel", "onlyUnread", "showPreview", "maxItems"],
  };

  const keysForWidget = fieldKeys[widgetKey] ?? [];

  // Special handling for calendar: skip account if provider is not ical
  const calendarProvider = normalizedConfig.provider as string | undefined;
  const filteredKeys =
    widgetKey === "calendar" && calendarProvider !== "ical"
      ? keysForWidget.filter((k) => k !== "account")
      : widgetKey === "emailFeed" && normalizedConfig.label !== "CUSTOM"
      ? keysForWidget.filter((k) => k !== "customLabel")
      : keysForWidget;

  for (const key of filteredKeys) {
    const value = normalizedConfig[key];

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

function normalizeCalendarSummaryConfig(
  widgetKey: WidgetKey,
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (widgetKey !== "calendar") {
    return config;
  }

  const normalized = { ...config };

  if (typeof normalized.maxItems !== "number" && typeof normalized.maxEvents === "number") {
    normalized.maxItems = normalized.maxEvents;
  }

  return normalized;
}
