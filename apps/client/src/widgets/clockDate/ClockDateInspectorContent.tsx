import React from "react";
import { InspectorRenderer } from "../../features/admin/inspector/InspectorRenderer";
import type { InspectorMode } from "../../features/admin/inspector/inspector.types";
import { getInspectorDefinition } from "./inspector";
import type { ClockDateConfig } from "./inspector";

interface ClockDateInspectorContentProps {
  /** Persisted widget config. */
  config: Record<string, unknown>;
  /**
   * Current draft config in edit mode.
   * Ignored in readOnly mode.
   */
  draft: Record<string, unknown>;
  mode: InspectorMode;
  /** Called with a raw config patch. */
  onChange: (patch: Record<string, unknown>) => void;
}

/**
 * Self-contained ClockDate inspector content.
 * Wires getInspectorDefinition to InspectorRenderer.
 * Drop this inside any existing panel or ScrollView.
 */
export function ClockDateInspectorContent({
  config,
  draft,
  mode,
  onChange,
}: ClockDateInspectorContentProps) {
  const activeConfig = mode === "edit" ? draft : config;

  const definition = getInspectorDefinition(activeConfig as ClockDateConfig, {
    onChange: (patch) => onChange(patch as Record<string, unknown>),
  });

  return <InspectorRenderer definition={definition} mode={mode} />;
}
