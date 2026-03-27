import React from "react";
import { InspectorDropdown } from "./InspectorDropdown";
import { InspectorAsyncState } from "./InspectorAsyncState";
import type { Option } from "./inspector.types";

interface InspectorResourcePickerProps {
  options: Option[];
  value: string | null | undefined;
  onChange: (value: string) => void;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  placeholder?: string;
}

export function InspectorResourcePicker({
  options,
  value,
  onChange,
  loading,
  error,
  disabled,
  placeholder,
}: InspectorResourcePickerProps) {
  if (loading) {
    return <InspectorAsyncState status="loading" />;
  }

  if (error) {
    return <InspectorAsyncState status="error" errorMessage={error} />;
  }

  if (options.length === 0) {
    return (
      <InspectorAsyncState
        status="empty"
        emptyMessage={placeholder ?? "No resources available"}
      />
    );
  }

  return (
    <InspectorDropdown
      options={options}
      value={value ?? null}
      onChange={(v) => onChange(String(v))}
      disabled={disabled}
    />
  );
}
