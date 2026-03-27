/**
 * Calendar widget inspector definition.
 *
 * Golden reference implementation of getInspectorDefinition.
 * All future widgets should follow this pattern.
 *
 * Config note: the underlying CalendarWidgetConfig uses `account` for the iCal URL.
 * This inspector uses `icalUrl` as the canonical name. The consumer layer is
 * responsible for mapping icalUrl ↔ account when reading/writing widget config.
 */

import type {
  InspectorDefinition,
  InspectorSectionDefinition,
  InspectorFieldDefinition,
  InspectorAction,
  Option,
} from "../../features/admin/inspector/inspector.types";

// Re-export the shared types used by this module
export type {
  InspectorDefinition,
  InspectorSectionDefinition,
  InspectorFieldDefinition,
  InspectorAction,
  Option,
};

// ---------------------------------------------------------------------------
// Calendar config type (canonical naming — see file header note on account/icalUrl)
// ---------------------------------------------------------------------------

export interface CalendarConfig {
  provider?: "ical" | "google";
  /** iCal subscription URL. Stored as `account` in CalendarWidgetConfig. */
  icalUrl?: string;
  integrationConnectionId?: string;
  /**
   * Google Calendar ID.
   * undefined means the server will use the primary/default calendar.
   */
  calendarId?: string;
  timeWindow?: "today" | "next24h" | "next7d";
  includeAllDay?: boolean;
  maxEvents?: number;
}

// ---------------------------------------------------------------------------
// Context contract
// ---------------------------------------------------------------------------

export interface CalendarInspectorContext {
  /** Already-fetched connections, labelled for display. No tokens exposed. */
  connections: Array<{ id: string; label: string }>;
  /** Calendars for the active connection. Empty until connection is selected. */
  calendars: Array<{ id: string; label: string }>;
  /** Initiate OAuth connect flow for a new Google account. */
  onConnect: () => void;
  onSelectConnection: (connectionId: string) => void;
  onSelectCalendar: (calendarId: string) => void;
  /** Re-fetch calendar list from the active connection. */
  onRefresh: () => void;
  onChange: (patch: Partial<CalendarConfig>) => void;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const TIME_WINDOW_LABELS: Record<string, string> = {
  today:   "Today",
  next24h: "Next 24h",
  next7d:  "Next 7 days",
};

// ---------------------------------------------------------------------------
// Definition
// ---------------------------------------------------------------------------

export function getInspectorDefinition(
  config: CalendarConfig,
  context: CalendarInspectorContext,
): InspectorDefinition {
  const provider     = config.provider ?? "ical";
  const connectionId = config.integrationConnectionId ?? null;
  const timeWindow   = config.timeWindow ?? "next7d";
  const includeAllDay = config.includeAllDay ?? true;
  const maxEvents    = config.maxEvents ?? 10;

  const selectedConnection = context.connections.find((c) => c.id === connectionId);
  const selectedCalendar   = context.calendars.find((c) => c.id === config.calendarId);

  const hasConnection = connectionId !== null;

  return {
    sections: [
      // ── 1. CONNECTION ────────────────────────────────────────────────────
      {
        id: "connection",
        title: "Connection",
        fields: [
          {
            id: "provider",
            label: "Provider",
            kind: "segmented",
            value: provider,
            displayValue: provider === "google" ? "Google Calendar" : "iCal Feed",
            editable: true,
            options: [
              { label: "iCal Feed",       value: "ical"   },
              { label: "Google Calendar", value: "google" },
            ],
            onChange: (value: "ical" | "google") =>
              context.onChange({
                provider: value,
                // Reset downstream selections when switching providers
                integrationConnectionId: undefined,
                calendarId: undefined,
                icalUrl: undefined,
              }),
          },

          // iCal: URL entry — only relevant for ical provider
          {
            id: "icalUrl",
            label: "Feed URL",
            kind: "text",
            value: config.icalUrl ?? "",
            // In read-only mode, avoid exposing the raw URL
            displayValue: config.icalUrl ? "Configured" : "Not set",
            editable: true,
            helperText: "Paste your .ics subscription URL",
            isVisible: provider === "ical",
            onChange: (value: string) => context.onChange({ icalUrl: value }),
          },

          // Google: connection picker — only relevant for google provider
          {
            id: "connection",
            label: "Google account",
            kind: "connectionPicker",
            value: connectionId,
            displayValue: selectedConnection?.label ?? "Not connected",
            editable: true,
            options: context.connections.map((c) => ({ label: c.label, value: c.id })),
            helperText: "Connect a Google account to access your calendars",
            isVisible: provider === "google",
            onConnect: context.onConnect,
            onChange: (id: string) => context.onSelectConnection(id),
          },
        ],
      },

      // ── 2. CALENDAR ──────────────────────────────────────────────────────
      {
        id: "calendar",
        title: "Calendar",
        // Visible as soon as Google is selected, but fields are disabled until
        // a connection exists. This lets users see what's coming rather than
        // having the section appear only after connecting.
        isVisible: provider === "google",
        fields: [
          {
            id: "calendarId",
            label: "Calendar",
            kind: "resourcePicker",
            value: config.calendarId ?? null,
            // calendarId === undefined → server uses the primary/default calendar
            displayValue: selectedCalendar?.label ?? "Primary calendar",
            editable: true,
            options: context.calendars.map((cal) => ({ label: cal.label, value: cal.id })),
            helperText: "Choose which calendar to display",
            isDisabled: !hasConnection,
            onChange: (id: string) => context.onSelectCalendar(id),
          },
        ],
        actions: [
          {
            label: "Refresh calendars",
            onClick: context.onRefresh,
            variant: "secondary",
          },
        ],
      },

      // ── 3. DISPLAY ───────────────────────────────────────────────────────
      {
        id: "display",
        title: "Display",
        fields: [
          {
            id: "timeWindow",
            label: "Time window",
            kind: "segmented",
            value: timeWindow,
            displayValue: TIME_WINDOW_LABELS[timeWindow] ?? timeWindow,
            editable: true,
            options: [
              { label: "Today",       value: "today"   },
              { label: "Next 24h",    value: "next24h" },
              { label: "Next 7 days", value: "next7d"  },
            ],
            onChange: (value: "today" | "next24h" | "next7d") =>
              context.onChange({ timeWindow: value }),
          },

          {
            id: "includeAllDay",
            label: "Include all-day events",
            kind: "boolean",
            value: includeAllDay,
            displayValue: includeAllDay ? "Yes" : "No",
            editable: true,
            onChange: (value: boolean) => context.onChange({ includeAllDay: value }),
          },

          {
            id: "maxEvents",
            label: "Max events",
            kind: "segmented",
            value: maxEvents,
            displayValue: String(maxEvents),
            editable: true,
            options: [
              { label: "5",  value: 5  },
              { label: "10", value: 10 },
              { label: "15", value: 15 },
              { label: "20", value: 20 },
            ],
            onChange: (value: number) => context.onChange({ maxEvents: value }),
          },
        ],
      },
    ],
  };
}
