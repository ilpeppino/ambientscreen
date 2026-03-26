export type InspectorMode = "readOnly" | "edit";

export type FieldKind =
  | "text"
  | "boolean"
  | "segmented"
  | "select"
  | "optionList"
  | "connectionPicker"
  | "resourcePicker"
  | "custom";

export interface Option {
  label: string;
  value: string | number;
}

export interface InspectorAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

export interface InspectorFieldDefinition {
  id: string;
  label: string;
  kind: FieldKind;
  value: unknown;
  /** Human-readable value for read-only mode. Never expose raw enum values or IDs. */
  displayValue?: string;
  editable: boolean;
  multiline?: boolean;
  options?: Option[];
  helperText?: string;
  onChange?: (value: never) => void;
  /**
   * connectionPicker only.
   * Called when the user initiates a new OAuth connection.
   * OAuth logic must live outside the widget — this is a callback, not a flow.
   */
  onConnect?: () => void;
  isVisible?: boolean;
  isDisabled?: boolean;
}

export interface InspectorSectionDefinition {
  id: string;
  title: string;
  description?: string;
  fields: InspectorFieldDefinition[];
  actions?: InspectorAction[];
  isVisible?: boolean;
}

export interface InspectorDefinition {
  sections: InspectorSectionDefinition[];
}
