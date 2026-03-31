import { useCallback, useEffect, useState } from "react";
import { Linking, Platform } from "react-native";
import {
  listIntegrationConnections,
  listGoogleCalendars,
  getIntegrationProviderAuthorizationUrl,
} from "../../services/api/integrationsApi";
import { DEEP_LINK_SCHEME } from "../../features/navigation/deepLinks";
import type { CalendarConfig, CalendarInspectorContext } from "./inspector";

interface UseCalendarInspectorContextOptions {
  /** Current integrationConnectionId from config or draft. */
  connectionId: string | undefined;
  /**
   * Called with a config patch when the user makes a change.
   * Handles icalUrl → account mapping internally.
   */
  onChange: (patch: Record<string, unknown>) => void;
}

interface UseCalendarInspectorContextResult extends CalendarInspectorContext {
  calendarsLoading: boolean;
}

/**
 * Builds the CalendarInspectorContext for use with getInspectorDefinition.
 *
 * Responsibilities:
 * - Fetches Google connections on mount
 * - Fetches calendars whenever connectionId changes
 * - Maps icalUrl → account when patching config (icalUrl is the canonical
 *   inspector name; account is the persisted config key)
 */
export function useCalendarInspectorContext({
  connectionId,
  onChange,
}: UseCalendarInspectorContextOptions): UseCalendarInspectorContextResult {
  const [connections, setConnections] = useState<Array<{ id: string; label: string }>>([]);
  const [calendars, setCalendars] = useState<Array<{ id: string; label: string }>>([]);
  const [calendarsLoading, setCalendarsLoading] = useState(false);

  // Load Google connections once on mount
  useEffect(() => {
    void listIntegrationConnections("google")
      .then((items) =>
        setConnections(
          items.map((c) => ({
            id: c.id,
            label:
              c.accountLabel ??
              c.accountEmail ??
              c.externalAccountId ??
              c.provider,
          })),
        ),
      )
      .catch(() => setConnections([]));
  }, []);

  const loadCalendars = useCallback(() => {
    if (!connectionId) {
      setCalendars([]);
      return;
    }
    setCalendarsLoading(true);
    void listGoogleCalendars(connectionId)
      .then((items) =>
        setCalendars(
          items.map((c) => ({
            id: c.id,
            label: c.summary + (c.primary ? " (primary)" : ""),
          })),
        ),
      )
      .catch(() => setCalendars([]))
      .finally(() => setCalendarsLoading(false));
  }, [connectionId]);

  useEffect(() => {
    loadCalendars();
  }, [loadCalendars]);

  const onConnect = useCallback(() => {
    const returnTo =
      Platform.OS !== "web"
        ? `${DEEP_LINK_SCHEME}://integrations`
        : undefined;
    void (async () => {
      try {
        const authorizationUrl = await getIntegrationProviderAuthorizationUrl("google", returnTo);
        await Linking.openURL(authorizationUrl);
      } catch {
        // Keep the inspector responsive if OAuth start fails.
      }
    })();
  }, []);

  const onSelectConnection = useCallback(
    (id: string) => {
      // Reset selected calendars when switching connections.
      onChange({ integrationConnectionId: id, calendarIds: undefined, calendarId: undefined });
    },
    [onChange],
  );

  const onSelectCalendars = useCallback(
    (ids: string[]) => {
      onChange({ calendarIds: ids, calendarId: undefined });
    },
    [onChange],
  );

  const handleChange = useCallback(
    (patch: Partial<CalendarConfig>) => {
      // Map icalUrl → account for the persisted config key
      const { icalUrl, ...rest } = patch as Record<string, unknown>;
      onChange({
        ...rest,
        ...(icalUrl !== undefined ? { account: icalUrl } : {}),
      });
    },
    [onChange],
  );

  return {
    connections,
    calendars,
    calendarsLoading,
    onConnect,
    onSelectConnection,
    onSelectCalendars,
    onRefresh: loadCalendars,
    onChange: handleChange,
  };
}
