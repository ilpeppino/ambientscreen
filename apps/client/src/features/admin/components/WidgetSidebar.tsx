import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { widgetBuiltinDefinitions, type FeatureFlagKey } from "@ambient/shared-contracts";
import { TextInput as AppTextInput } from "../../../shared/ui/components";
import { ErrorState } from "../../../shared/ui/ErrorState";
import {
  ActionRow,
  EmptyPanel,
  FilterChips,
  InlineStatusBadge,
  ManagementActionButton,
  ManagementCard,
} from "../../../shared/ui/management";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import type { WidgetInstance } from "../../../services/api/widgetsApi";
import {
  CALENDAR_PROVIDERS,
  CALENDAR_TIME_WINDOWS,
  type CalendarProvider,
  type CalendarTimeWindow,
  CREATABLE_WIDGET_TYPES,
  type CreatableWidgetType,
  WEATHER_UNITS,
  type WeatherUnit,
} from "../adminHome.logic";

interface WidgetSidebarProps {
  plan: "free" | "pro";
  hasFeature: (feature: FeatureFlagKey) => boolean;
  onUpgradePress: () => void;

  // Widget library
  selectedWidgetType: CreatableWidgetType;
  onSelectWidgetType: (type: CreatableWidgetType) => void;
  weatherLocation: string;
  setWeatherLocation: (val: string) => void;
  weatherUnits: WeatherUnit;
  setWeatherUnits: (val: WeatherUnit) => void;
  calendarProvider: CalendarProvider;
  setCalendarProvider: (val: CalendarProvider) => void;
  calendarAccount: string;
  setCalendarAccount: (val: string) => void;
  calendarTimeWindow: CalendarTimeWindow;
  setCalendarTimeWindow: (val: CalendarTimeWindow) => void;
  creatingWidget: boolean;
  createError: string | null;
  onCreateWidget: () => void;

  // Configured widgets
  widgets: WidgetInstance[];
  activeError: string | null;
  settingActiveWidgetId: string | null;
  onSetActiveWidget: (widgetId: string) => void;
  onRetryLoadWidgets: () => void;
}

export function WidgetSidebar({
  plan,
  hasFeature,
  onUpgradePress,
  selectedWidgetType,
  onSelectWidgetType,
  weatherLocation,
  setWeatherLocation,
  weatherUnits,
  setWeatherUnits,
  calendarProvider,
  setCalendarProvider,
  calendarAccount,
  setCalendarAccount,
  calendarTimeWindow,
  setCalendarTimeWindow,
  creatingWidget,
  createError,
  onCreateWidget,
  widgets,
  activeError,
  settingActiveWidgetId,
  onSetActiveWidget,
  onRetryLoadWidgets,
}: WidgetSidebarProps) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Widget Library</Text>
        {plan === "free" ? (
          <ManagementActionButton
            label="Upgrade"
            tone="secondary"
            icon="star"
            onPress={onUpgradePress}
          />
        ) : (
          <InlineStatusBadge label="Pro" tone="premium" icon="star" />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Widget type selector */}
        <FilterChips
          items={CREATABLE_WIDGET_TYPES.map((widgetType) => ({
            key: widgetType,
            label: widgetType,
            icon:
              widgetType === "calendar"
                ? "calendar"
                : widgetType === "weather"
                  ? "weather"
                  : "clock",
          }))}
          activeKey={selectedWidgetType}
          onChange={(next) => {
            const isPremium =
              widgetBuiltinDefinitions[next as CreatableWidgetType]?.manifest?.premium === true;
            if (isPremium && !hasFeature("premium_widgets")) {
              onUpgradePress();
              return;
            }
            onSelectWidgetType(next as CreatableWidgetType);
          }}
        />

        {/* Widget-specific config fields */}
        {selectedWidgetType === "weather" ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Location</Text>
            <AppTextInput
              accessibilityLabel="Weather location"
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.textInput}
              value={weatherLocation}
              onChangeText={setWeatherLocation}
              placeholder="City or location"
            />
            <Text style={styles.fieldLabel}>Units</Text>
            <FilterChips
              items={WEATHER_UNITS.map((unit) => ({ key: unit, label: unit, icon: "weather" }))}
              activeKey={weatherUnits}
              onChange={(next) => setWeatherUnits(next as WeatherUnit)}
            />
          </View>
        ) : selectedWidgetType === "calendar" ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Provider</Text>
            <FilterChips
              items={CALENDAR_PROVIDERS.map((provider) => ({
                key: provider,
                label: provider,
                icon: "calendar",
              }))}
              activeKey={calendarProvider}
              onChange={(next) => setCalendarProvider(next as CalendarProvider)}
            />
            <Text style={styles.fieldLabel}>Account (iCal URL)</Text>
            <AppTextInput
              accessibilityLabel="Calendar account"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.textInput}
              value={calendarAccount}
              onChangeText={setCalendarAccount}
              placeholder="https://calendar.example.com/feed.ics"
            />
            <Text style={styles.fieldLabel}>Time window</Text>
            <FilterChips
              items={CALENDAR_TIME_WINDOWS.map((window) => ({
                key: window,
                label: window,
                icon: "calendar",
              }))}
              activeKey={calendarTimeWindow}
              onChange={(next) => setCalendarTimeWindow(next as CalendarTimeWindow)}
            />
          </View>
        ) : null}

        <ActionRow>
          <ManagementActionButton
            label="Add Widget"
            tone="primary"
            icon="plus"
            loading={creatingWidget}
            onPress={onCreateWidget}
          />
        </ActionRow>
        {createError ? <ErrorState compact message={createError} /> : null}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Configured widgets */}
        <Text style={styles.sectionLabel}>Configured Widgets</Text>
        {widgets.length === 0 ? (
          <EmptyPanel
            title="No widgets yet"
            message="Add a widget above to get started."
          />
        ) : (
          <View style={styles.widgetList}>
            {widgets.map((widget) => (
              <ManagementCard
                key={widget.id}
                title={widget.type}
                subtitle={`ID: ${widget.id.slice(0, 8)}…`}
                icon={
                  widget.type === "calendar"
                    ? "calendar"
                    : widget.type === "weather"
                      ? "weather"
                      : "clock"
                }
                badges={
                  widget.isActive ? (
                    <InlineStatusBadge label="Active" tone="success" icon="check" />
                  ) : (
                    <InlineStatusBadge label="Inactive" tone="neutral" icon="close" />
                  )
                }
                footer={
                  <ActionRow>
                    <ManagementActionButton
                      label="Set Active"
                      tone="secondary"
                      disabled={widget.isActive}
                      loading={settingActiveWidgetId === widget.id}
                      onPress={() => onSetActiveWidget(widget.id)}
                    />
                  </ActionRow>
                }
              />
            ))}
          </View>
        )}
        {activeError ? (
          <ErrorState compact message={activeError} onRetry={onRetryLoadWidgets} />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 288,
    backgroundColor: colors.surfaceCard,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    flexDirection: "column",
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panelTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.sm,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.body.fontSize,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  sectionLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  widgetList: {
    gap: spacing.sm,
  },
});
