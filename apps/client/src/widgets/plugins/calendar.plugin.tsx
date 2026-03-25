import React from "react";
import type { WidgetClientPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { CalendarRenderer } from "../calendar/renderer";
import { CalendarSettingsForm } from "../calendar/settings-form";
import { CalendarPreview } from "../calendar/preview";

const definition = widgetBuiltinDefinitions.calendar;

export const calendarWidgetPlugin: WidgetClientPluginModule<"calendar", React.ReactElement> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  client: {
    Renderer: (props) => <CalendarRenderer {...props} />,
    SettingsForm: (props) => <CalendarSettingsForm {...props} />,
    Preview: (props) => <CalendarPreview {...props} />,
  },
};
