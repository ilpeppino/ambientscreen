import React from "react";
import { InspectorRenderer } from "../../features/admin/inspector/InspectorRenderer";
import type { InspectorMode } from "../../features/admin/inspector/inspector.types";
import { getInspectorDefinition } from "./inspector";
import type { WeatherConfig } from "./inspector";

interface WeatherInspectorContentProps {
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
  /** When true, all interactive controls are non-interactive (e.g. save in progress). */
  disabled?: boolean;
}

/**
 * Self-contained Weather inspector content.
 * Wires getInspectorDefinition to InspectorRenderer.
 * Drop this inside any existing panel or ScrollView.
 */
export function WeatherInspectorContent({
  config,
  draft,
  mode,
  onChange,
  disabled,
}: WeatherInspectorContentProps) {
  const activeConfig = mode === "edit" ? draft : config;

  const definition = getInspectorDefinition(activeConfig as WeatherConfig, {
    onChange: (patch) => onChange(patch as Record<string, unknown>),
  });

  return <InspectorRenderer definition={definition} mode={mode} disabled={disabled} />;
}
