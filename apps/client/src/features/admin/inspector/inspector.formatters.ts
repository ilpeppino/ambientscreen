import type { Option } from "./inspector.types";

/** Format a boolean value for display. Never exposes raw true/false. */
export function formatBoolean(value: unknown): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

/**
 * Format an enum value using a human-readable label map.
 * Falls back to `fallback` if the value is not in the map.
 */
export function formatEnum(
  value: string | undefined | null,
  map: Record<string, string>,
  fallback = "—",
): string {
  if (value === undefined || value === null || value === "") return fallback;
  return map[value] ?? fallback;
}

/** Format a calendar provider value. */
export function formatProvider(value: unknown): string {
  return formatEnum(typeof value === "string" ? value : null, {
    google: "Google Calendar",
    ical:   "iCal Feed",
  });
}

/** Format a calendar time window value. */
export function formatTimeWindow(value: unknown): string {
  return formatEnum(typeof value === "string" ? value : null, {
    today:   "Today",
    next24h: "Next 24h",
    next7d:  "Next 7 days",
  });
}

/**
 * Derive a human-readable display value for a field.
 * Checks options list first, then falls back to kind-based formatting.
 */
export function formatDisplayValue(
  kind: string,
  value: unknown,
  options?: Option[],
): string {
  if (value === null || value === undefined) return "—";

  if (options && options.length > 0) {
    const match = options.find((o) => o.value === value);
    if (match) return match.label;
  }

  if (kind === "boolean") return formatBoolean(value);

  return String(value);
}

/** Format a timezone value. "local" → "Local"; IANA zones pass through. */
export function formatTimezoneLabel(timezone: string): string {
  if (timezone === "local") return "Local";
  return timezone;
}

/** Format a BCP-47 locale code into a human-readable name. */
export function formatLocaleLabel(locale: string): string {
  const localeNames: Record<string, string> = {
    "en-US": "English (US)",
    "en-GB": "English (UK)",
    "fr-FR": "French",
    "de-DE": "German",
    "es-ES": "Spanish",
    "it-IT": "Italian",
    "ja-JP": "Japanese",
    "zh-CN": "Chinese (Simplified)",
    "ko-KR": "Korean",
    "pt-BR": "Portuguese (Brazil)",
    "ru-RU": "Russian",
    "ar-SA": "Arabic",
  };
  return localeNames[locale] ?? locale;
}
