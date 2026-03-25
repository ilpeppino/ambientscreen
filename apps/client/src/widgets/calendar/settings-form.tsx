import React, { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import type { WidgetSettingsFormProps } from "@ambient/shared-contracts";
import { Text } from "../../shared/ui/components/Text";
import { TextInput } from "../../shared/ui/components/TextInput";
import { colors, radius, spacing } from "../../shared/ui/theme";
import {
  listIntegrationConnections,
  listGoogleCalendars,
  getGoogleConnectUrl,
  type IntegrationConnection,
  type GoogleCalendarOption,
} from "../../services/api/integrationsApi";

type CalendarProvider = "ical" | "google";
type TimeWindow = "today" | "next24h" | "next7d";

const PROVIDER_OPTIONS: { value: CalendarProvider; label: string }[] = [
  { value: "ical", label: "iCal Feed" },
  { value: "google", label: "Google Calendar" },
];

const TIME_WINDOW_OPTIONS: { value: TimeWindow; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "next24h", label: "Next 24h" },
  { value: "next7d", label: "Next 7 days" },
];

export function CalendarSettingsForm({
  config,
  disabled,
  onChange,
}: WidgetSettingsFormProps<"calendar">) {
  const provider = (config.provider ?? "ical") as CalendarProvider;
  const account = config.account ?? "";
  const integrationConnectionId = config.integrationConnectionId ?? "";
  const calendarId = config.calendarId ?? "";
  const timeWindow = (config.timeWindow ?? "next7d") as TimeWindow;
  const maxEvents = config.maxEvents ?? 10;
  const includeAllDay = config.includeAllDay ?? true;

  const [googleConnections, setGoogleConnections] = useState<IntegrationConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  // Phase 2: calendar list loaded after connection is selected
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendarOption[]>([]);
  const [calendarsLoading, setCalendarsLoading] = useState(false);

  const loadConnections = useCallback(() => {
    if (provider !== "google") return;
    setConnectionsLoading(true);
    listIntegrationConnections()
      .then((all) => setGoogleConnections(all.filter((c) => c.provider === "google")))
      .catch(() => setGoogleConnections([]))
      .finally(() => setConnectionsLoading(false));
  }, [provider]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Load calendar list whenever a connection is selected (Phase 2)
  useEffect(() => {
    if (provider !== "google" || !integrationConnectionId) {
      setGoogleCalendars([]);
      return;
    }
    setCalendarsLoading(true);
    listGoogleCalendars(integrationConnectionId)
      .then(setGoogleCalendars)
      .catch(() => setGoogleCalendars([]))
      .finally(() => setCalendarsLoading(false));
  }, [provider, integrationConnectionId]);

  const handleConnectGoogle = () => {
    void Linking.openURL(getGoogleConnectUrl());
  };

  return (
    <View style={styles.container}>
      {/* Provider */}
      <Text variant="caption" color="textSecondary" style={styles.sectionLabel}>
        Provider
      </Text>
      <View style={styles.chipRow}>
        {PROVIDER_OPTIONS.map((opt) => {
          const selected = provider === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[styles.chip, selected ? styles.chipSelected : null]}
              onPress={() => !disabled && onChange({ ...config, provider: opt.value })}
              disabled={disabled}
            >
              <Text style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.fieldGap} />

      {/* iCal-specific */}
      {provider === "ical" && (
        <TextInput
          label="iCal Feed URL"
          value={account}
          onChangeText={(value) => onChange({ ...config, account: value })}
          placeholder="https://calendar.example.com/feed.ics"
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}

      {/* Google Calendar-specific */}
      {provider === "google" && (
        <View>
          {/* Phase 1: select Google connection */}
          <Pressable
            style={[styles.connectButton, disabled ? styles.connectButtonDisabled : null]}
            onPress={handleConnectGoogle}
            disabled={disabled}
          >
            <Text style={styles.connectButtonLabel}>Connect Google Account</Text>
          </Pressable>

          {connectionsLoading ? (
            <Text color="textSecondary" variant="caption" style={styles.hint}>
              Loading connections…
            </Text>
          ) : googleConnections.length > 0 ? (
            <View style={styles.connectionList}>
              <Text variant="caption" color="textSecondary" style={styles.sectionLabel}>
                Select account
              </Text>
              {googleConnections.map((conn) => {
                const selected = integrationConnectionId === conn.id;
                return (
                  <Pressable
                    key={conn.id}
                    style={[styles.connectionRow, selected ? styles.connectionRowSelected : null]}
                    onPress={() =>
                      !disabled &&
                      onChange({ ...config, integrationConnectionId: conn.id, calendarId: undefined })
                    }
                    disabled={disabled}
                  >
                    <Text style={styles.connectionLabel}>
                      {conn.label ?? conn.externalAccountId}
                    </Text>
                    {selected ? (
                      <Text style={styles.connectionSelectedBadge}>Selected</Text>
                    ) : null}
                  </Pressable>
                );
              })}
              <Pressable onPress={loadConnections} disabled={disabled} style={styles.refreshLink}>
                <Text style={styles.refreshLinkLabel}>Refresh list</Text>
              </Pressable>
            </View>
          ) : (
            <Text color="textSecondary" variant="caption" style={styles.hint}>
              No Google accounts connected yet. Tap "Connect Google Account" above,
              then return here and refresh the list.
            </Text>
          )}

          {/* Phase 2: select calendar — only shown after a connection is chosen */}
          {integrationConnectionId ? (
            <View style={styles.calendarPhase}>
              <Text variant="caption" color="textSecondary" style={styles.sectionLabel}>
                Calendar
              </Text>
              {/* V1: single-calendar select. Multi-select can be added in a future iteration. */}
              {calendarsLoading ? (
                <Text color="textSecondary" variant="caption" style={styles.hint}>
                  Loading calendars…
                </Text>
              ) : googleCalendars.length > 0 ? (
                <View style={styles.connectionList}>
                  {googleCalendars.map((cal) => {
                    const selected = calendarId ? calendarId === cal.id : cal.primary;
                    return (
                      <Pressable
                        key={cal.id}
                        style={[styles.connectionRow, selected ? styles.connectionRowSelected : null]}
                        onPress={() =>
                          !disabled && onChange({ ...config, calendarId: cal.id })
                        }
                        disabled={disabled}
                      >
                        <Text style={styles.connectionLabel}>
                          {cal.summary}
                          {cal.primary ? " (primary)" : ""}
                        </Text>
                        {selected ? (
                          <Text style={styles.connectionSelectedBadge}>Selected</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text color="textSecondary" variant="caption" style={styles.hint}>
                  No calendars found. The connection may need to be reconnected.
                </Text>
              )}
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.fieldGap} />

      {/* Time window */}
      <Text variant="caption" color="textSecondary" style={styles.sectionLabel}>
        Time window
      </Text>
      <View style={styles.chipRow}>
        {TIME_WINDOW_OPTIONS.map((opt) => {
          const selected = timeWindow === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[styles.chip, selected ? styles.chipSelected : null]}
              onPress={() => !disabled && onChange({ ...config, timeWindow: opt.value })}
              disabled={disabled}
            >
              <Text style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.fieldGap} />

      {/* Include all-day */}
      <Text variant="caption" color="textSecondary" style={styles.sectionLabel}>
        Include all-day events
      </Text>
      <View style={styles.chipRow}>
        {([true, false] as const).map((value) => {
          const selected = includeAllDay === value;
          return (
            <Pressable
              key={String(value)}
              style={[styles.chip, selected ? styles.chipSelected : null]}
              onPress={() => !disabled && onChange({ ...config, includeAllDay: value })}
              disabled={disabled}
            >
              <Text style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]}>
                {value ? "Yes" : "No"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.fieldGap} />

      {/* Max events */}
      <Text variant="caption" color="textSecondary" style={styles.sectionLabel}>
        Max events
      </Text>
      <View style={styles.chipRow}>
        {[5, 10, 15, 20].map((count) => {
          const selected = maxEvents === count;
          return (
            <Pressable
              key={count}
              style={[styles.chip, selected ? styles.chipSelected : null]}
              onPress={() => !disabled && onChange({ ...config, maxEvents: count })}
              disabled={disabled}
            >
              <Text style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]}>
                {String(count)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fieldGap: {
    height: spacing.md,
  },
  sectionLabel: {
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceInput,
  },
  chipSelected: {
    borderColor: colors.accentBlue,
    backgroundColor: colors.accentBlue,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  chipLabelSelected: {
    color: colors.textPrimary,
  },
  connectButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentBlue,
    alignItems: "center",
  },
  connectButtonDisabled: {
    opacity: 0.5,
  },
  connectButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accentBlue,
  },
  connectionList: {
    marginTop: spacing.sm,
  },
  connectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceInput,
    marginBottom: spacing.xs,
  },
  connectionRowSelected: {
    borderColor: colors.accentBlue,
  },
  connectionLabel: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  connectionSelectedBadge: {
    fontSize: 11,
    color: colors.accentBlue,
    fontWeight: "600",
  },
  refreshLink: {
    marginTop: spacing.xs,
    alignSelf: "flex-start",
  },
  refreshLinkLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
  hint: {
    marginTop: spacing.sm,
  },
  calendarPhase: {
    marginTop: spacing.md,
  },
});
