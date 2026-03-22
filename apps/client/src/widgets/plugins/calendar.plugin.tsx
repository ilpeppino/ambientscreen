import type { WidgetClientPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { CalendarRenderer } from "../calendar/renderer";

const definition = widgetBuiltinDefinitions.calendar;

export const calendarWidgetPlugin: WidgetClientPluginModule<"calendar", JSX.Element> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  client: {
    Renderer: ({ data }) => <CalendarRenderer data={data} />,
  },
};
