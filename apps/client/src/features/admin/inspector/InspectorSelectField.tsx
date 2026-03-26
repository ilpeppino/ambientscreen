import React from "react";
import { InspectorOptionList } from "./InspectorOptionList";
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
 * In React Native, rendered as an InspectorOptionList.
 * Can be swapped for a native picker if needed.
 */
export function InspectorSelectField({
  options,
  value,
  onChange,
  disabled,
  placeholder,
}: InspectorSelectFieldProps) {
  return (
    <InspectorOptionList
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
}
