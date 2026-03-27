import React from "react";
import { InspectorDropdown } from "./InspectorDropdown";
import type { Option } from "./inspector.types";

interface InspectorSelectFieldProps {
  options: Option[];
  value: string | number | null | undefined;
  onChange: (value: string | number) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Dropdown-style selection field.
 * Renders as an inline-expand InspectorDropdown.
 * Use `optionList` field kind when an always-visible list is explicitly needed.
 */
export function InspectorSelectField({
  options,
  value,
  onChange,
  disabled,
  placeholder,
}: InspectorSelectFieldProps) {
  return (
    <InspectorDropdown
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
}
