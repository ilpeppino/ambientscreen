import type { WidgetConfigFieldSchema, WidgetConfigSchema } from "@ambient/shared-contracts";

export type WidgetConfigFieldKind = "string" | "boolean" | "number" | "enum";

export interface WidgetConfigFieldDescriptor {
  key: string;
  label: string;
  kind: WidgetConfigFieldKind;
  options?: readonly string[];
}

interface BuildConfigDraftInput {
  schema: WidgetConfigSchema;
  config: Record<string, unknown>;
}

export function humanizeFieldLabel(fieldKey: string): string {
  if (!fieldKey) {
    return "";
  }

  const normalized = fieldKey.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function toFieldDescriptor(key: string, schema: WidgetConfigFieldSchema): WidgetConfigFieldDescriptor {
  if (Array.isArray(schema)) {
    return {
      key,
      label: humanizeFieldLabel(key),
      kind: "enum",
      options: schema,
    };
  }

  if (schema === "boolean") {
    return {
      key,
      label: humanizeFieldLabel(key),
      kind: "boolean",
    };
  }

  if (schema === "number") {
    return {
      key,
      label: humanizeFieldLabel(key),
      kind: "number",
    };
  }

  return {
    key,
    label: humanizeFieldLabel(key),
    kind: "string",
  };
}

export function buildFieldDescriptors(schema: WidgetConfigSchema): WidgetConfigFieldDescriptor[] {
  return Object.entries(schema).map(([key, fieldSchema]) => toFieldDescriptor(key, fieldSchema));
}

export function buildConfigDraft(input: BuildConfigDraftInput): Record<string, unknown> {
  const draft: Record<string, unknown> = {};

  for (const [key, fieldSchema] of Object.entries(input.schema)) {
    const currentValue = input.config[key];

    if (Array.isArray(fieldSchema)) {
      draft[key] = typeof currentValue === "string" && fieldSchema.includes(currentValue)
        ? currentValue
        : fieldSchema[0];
      continue;
    }

    if (fieldSchema === "boolean") {
      draft[key] = typeof currentValue === "boolean" ? currentValue : false;
      continue;
    }

    if (fieldSchema === "number") {
      draft[key] = typeof currentValue === "number" ? currentValue : 0;
      continue;
    }

    draft[key] = typeof currentValue === "string" ? currentValue : "";
  }

  return draft;
}

export function validateConfigDraft(
  schema: WidgetConfigSchema,
  config: Record<string, unknown>,
): { valid: true } | { valid: false; message: string } {
  for (const key of Object.keys(config)) {
    if (!(key in schema)) {
      return { valid: false, message: `Unsupported setting: ${key}` };
    }
  }

  for (const [key, fieldSchema] of Object.entries(schema)) {
    const value = config[key];

    if (Array.isArray(fieldSchema)) {
      if (typeof value !== "string" || !fieldSchema.includes(value)) {
        return { valid: false, message: `${humanizeFieldLabel(key)} has an invalid value.` };
      }
      continue;
    }

    if (fieldSchema === "boolean") {
      if (typeof value !== "boolean") {
        return { valid: false, message: `${humanizeFieldLabel(key)} must be true or false.` };
      }
      continue;
    }

    if (fieldSchema === "number") {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return { valid: false, message: `${humanizeFieldLabel(key)} must be a number.` };
      }
      continue;
    }

    if (typeof value !== "string") {
      return { valid: false, message: `${humanizeFieldLabel(key)} must be text.` };
    }
  }

  return { valid: true };
}

interface WidgetWithConfig {
  widgetInstanceId: string;
  config: Record<string, unknown>;
}

export function applyWidgetConfigUpdate<TWidget extends WidgetWithConfig>(
  widgets: TWidget[],
  widgetId: string,
  config: Record<string, unknown>,
): TWidget[] {
  return widgets.map((widget) => {
    if (widget.widgetInstanceId !== widgetId) {
      return widget;
    }

    return {
      ...widget,
      config,
    };
  });
}
