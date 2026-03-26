import type { InspectorDefinition } from "../../features/admin/inspector/inspector.types";
import { formatBoolean, formatLocaleLabel, formatTimezoneLabel } from "../../features/admin/inspector/inspector.formatters";

export interface ClockDateConfig {
  timezone?: string;
  locale?: string;
  hour12?: boolean;
}

export interface ClockDateInspectorContext {
  onChange: (patch: Partial<ClockDateConfig>) => void;
}

const TIMEZONE_OPTIONS = [
  { label: "Local",                value: "local"               },
  { label: "New York (ET)",        value: "America/New_York"    },
  { label: "Chicago (CT)",         value: "America/Chicago"     },
  { label: "Denver (MT)",          value: "America/Denver"      },
  { label: "Los Angeles (PT)",     value: "America/Los_Angeles" },
  { label: "London (GMT/BST)",     value: "Europe/London"       },
  { label: "Paris (CET)",          value: "Europe/Paris"        },
  { label: "Berlin (CET)",         value: "Europe/Berlin"       },
  { label: "Tokyo (JST)",          value: "Asia/Tokyo"          },
  { label: "Shanghai (CST)",       value: "Asia/Shanghai"       },
  { label: "Mumbai (IST)",         value: "Asia/Kolkata"        },
  { label: "Sydney (AEST)",        value: "Australia/Sydney"    },
  { label: "Auckland (NZST)",      value: "Pacific/Auckland"    },
];

const LOCALE_OPTIONS = [
  { label: "English (US)",          value: "en-US" },
  { label: "English (UK)",          value: "en-GB" },
  { label: "French",                value: "fr-FR" },
  { label: "German",                value: "de-DE" },
  { label: "Spanish",               value: "es-ES" },
  { label: "Italian",               value: "it-IT" },
  { label: "Japanese",              value: "ja-JP" },
  { label: "Chinese (Simplified)",  value: "zh-CN" },
  { label: "Korean",                value: "ko-KR" },
  { label: "Portuguese (Brazil)",   value: "pt-BR" },
  { label: "Russian",               value: "ru-RU" },
  { label: "Arabic",                value: "ar-SA" },
];

export function getInspectorDefinition(
  config: ClockDateConfig,
  context: ClockDateInspectorContext,
): InspectorDefinition {
  const timezone = config.timezone ?? "local";
  const locale = config.locale;
  const hour12 = config.hour12;

  return {
    sections: [
      {
        id: "time",
        title: "Time",
        fields: [
          {
            id: "timezone",
            label: "Time zone",
            kind: "select",
            value: timezone,
            displayValue: formatTimezoneLabel(timezone),
            editable: true,
            options: TIMEZONE_OPTIONS,
            onChange: (value: string) => context.onChange({ timezone: value }),
          },
          {
            id: "locale",
            label: "Locale",
            kind: "select",
            value: locale ?? null,
            displayValue: locale ? formatLocaleLabel(locale) : "—",
            editable: true,
            options: LOCALE_OPTIONS,
            onChange: (value: string) => context.onChange({ locale: value }),
          },
        ],
      },
      {
        id: "format",
        title: "Format",
        fields: [
          {
            id: "hour12",
            label: "12-hour clock",
            kind: "boolean",
            value: hour12,
            displayValue: hour12 === undefined ? "—" : formatBoolean(hour12),
            editable: true,
            onChange: (value: boolean) => context.onChange({ hour12: value }),
          },
        ],
      },
    ],
  };
}
