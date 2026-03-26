import React from "react";
import { InspectorRenderer } from "../../features/admin/inspector/InspectorRenderer";
import type { InspectorMode } from "../../features/admin/inspector/inspector.types";
import { getInspectorDefinition } from "./inspector";
import { useCalendarInspectorContext } from "./useCalendarInspectorContext";

interface CalendarInspectorContentProps {
  /** Persisted widget config (uses `account` key). */
  config: Record<string, unknown>;
  /**
   * Current draft config in edit mode (uses `account` key).
   * Ignored in readOnly mode.
   */
  draft: Record<string, unknown>;
  mode: InspectorMode;
  /** Called with a raw config patch (uses `account` key, not `icalUrl`). */
  onChange: (patch: Record<string, unknown>) => void;
}

/**
 * Self-contained calendar inspector content.
 * Manages connections/calendars state and wires getInspectorDefinition
 * to InspectorRenderer. Drop this inside any existing panel or ScrollView.
 */
export function CalendarInspectorContent({
  config,
  draft,
  mode,
  onChange,
}: CalendarInspectorContentProps) {
  const activeConfig = mode === "edit" ? draft : config;

  // Normalize account → icalUrl for the inspector definition
  const inspectorConfig = {
    ...activeConfig,
    icalUrl: activeConfig.account as string | undefined,
  };

  const context = useCalendarInspectorContext({
    connectionId: activeConfig.integrationConnectionId as string | undefined,
    onChange,
  });

  const definition = getInspectorDefinition(inspectorConfig, context);

  return (
    <InspectorRenderer
      definition={definition}
      mode={mode}
      resourcesLoading={context.calendarsLoading}
    />
  );
}
