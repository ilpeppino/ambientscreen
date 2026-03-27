/**
 * Weather widget inspector definition.
 *
 * Golden reference implementation for an unauthenticated provider widget.
 * No OAuth, no integration connections — config is purely location + display prefs.
 *
 * Pattern: follows the same getInspectorDefinition shape as clockDate and calendar.
 */

import type { InspectorDefinition } from "../../features/admin/inspector/inspector.types";

// ---------------------------------------------------------------------------
// Config type
// ---------------------------------------------------------------------------

export interface WeatherConfig {
  city?: string;
  countryCode?: string;
  units?: "metric" | "imperial" | "standard";
  forecastSlots?: number;
}

// ---------------------------------------------------------------------------
// Context contract
// ---------------------------------------------------------------------------

export interface WeatherInspectorContext {
  onChange: (patch: Partial<WeatherConfig>) => void;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const UNITS_LABELS: Record<string, string> = {
  metric:   "Celsius (°C)",
  imperial: "Fahrenheit (°F)",
  standard: "Kelvin (K)",
};

// ---------------------------------------------------------------------------
// Definition
// ---------------------------------------------------------------------------

export function getInspectorDefinition(
  config: WeatherConfig,
  context: WeatherInspectorContext,
): InspectorDefinition {
  const city          = config.city ?? "";
  const countryCode   = config.countryCode ?? "";
  const units         = config.units ?? "metric";
  const forecastSlots = config.forecastSlots ?? 3;

  return {
    sections: [
      // ── 1. LOCATION ──────────────────────────────────────────────────────
      {
        id: "location",
        title: "Location",
        fields: [
          {
            id: "city",
            label: "City",
            kind: "text",
            value: city,
            displayValue: city || "—",
            editable: true,
            helperText: "e.g. Amsterdam",
            onChange: (value: string) => context.onChange({ city: value }),
          },
          {
            id: "countryCode",
            label: "Country code",
            kind: "text",
            value: countryCode,
            // Empty country code is optional — show dash in read-only mode
            displayValue: countryCode || "—",
            editable: true,
            helperText: "Optional, e.g. NL",
            onChange: (value: string) =>
              context.onChange({ countryCode: value || undefined }),
          },
        ],
      },

      // ── 2. DISPLAY ───────────────────────────────────────────────────────
      {
        id: "display",
        title: "Display",
        fields: [
          {
            id: "units",
            label: "Units",
            kind: "segmented",
            value: units,
            displayValue: UNITS_LABELS[units] ?? units,
            editable: true,
            options: [
              { label: "°C", value: "metric"   },
              { label: "°F", value: "imperial" },
              { label: "K",  value: "standard" },
            ],
            onChange: (value: "metric" | "imperial" | "standard") =>
              context.onChange({ units: value }),
          },
          {
            id: "forecastSlots",
            label: "Forecast slots",
            kind: "segmented",
            value: forecastSlots,
            displayValue: String(forecastSlots),
            editable: true,
            options: [1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n })),
            onChange: (value: number) => context.onChange({ forecastSlots: value }),
          },
        ],
      },
    ],
  };
}
