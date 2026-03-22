import type { WidgetClientPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { ClockDateRenderer } from "../clockDate/renderer";

const definition = widgetBuiltinDefinitions.clockDate;

export const clockDateWidgetPlugin: WidgetClientPluginModule<"clockDate", JSX.Element> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  client: {
    Renderer: ({ data }) => <ClockDateRenderer data={data} />,
  },
};
