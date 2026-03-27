import React from "react";
import type { WidgetClientPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { CalendarRenderer } from "../calendar/renderer";
import { CalendarInspectorContent } from "../calendar/CalendarInspectorContent";
import { CalendarPreview } from "../calendar/preview";

const definition = widgetBuiltinDefinitions.calendar;

export const calendarWidgetPlugin: WidgetClientPluginModule<"calendar", React.ReactElement> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  client: {
    Renderer: (props) => <CalendarRenderer {...props} />,
    SettingsForm: (props) => (
      <CalendarInspectorContent
        config={props.config as Record<string, unknown>}
        draft={props.config as Record<string, unknown>}
        mode="edit"
        onChange={(patch) =>
          props.onChange({ ...props.config, ...patch } as typeof props.config)
        }
      />
    ),
    Preview: (props) => <CalendarPreview {...props} />,
  },
};
