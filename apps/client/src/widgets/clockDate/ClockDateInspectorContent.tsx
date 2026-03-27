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
  /** When true, all interactive controls are non-interactive (e.g. save in progress). */
  disabled?: boolean;
}

/**
 * Normalizes a raw persisted config into the canonical ClockDateConfig shape.
 * Handles legacy data that stored `format` instead of `hour12`.
 */
function normalizeForInspector(raw: Record<string, unknown>): ClockDateConfig {
  const result: ClockDateConfig = {
    timezone: typeof raw.timezone === "string" ? raw.timezone : undefined,
    locale: typeof raw.locale === "string" ? raw.locale : undefined,
  };
  if (typeof raw.hour12 === "boolean") {
    result.hour12 = raw.hour12;
  } else if (raw.format === "12h") {
    result.hour12 = true;
  } else if (raw.format === "24h") {
    result.hour12 = false;
  }
  return result;
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
  disabled,
}: ClockDateInspectorContentProps) {
  const activeConfig = mode === "edit" ? draft : config;

  const definition = getInspectorDefinition(normalizeForInspector(activeConfig), {
    onChange: (patch) => onChange(patch as Record<string, unknown>),
  });

  return <InspectorRenderer definition={definition} mode={mode} disabled={disabled} />;
}
