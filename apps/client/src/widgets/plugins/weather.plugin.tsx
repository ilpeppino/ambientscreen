import type { WidgetClientPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { WeatherRenderer } from "../weather/renderer";

const definition = widgetBuiltinDefinitions.weather;

export const weatherWidgetPlugin: WidgetClientPluginModule<"weather", JSX.Element> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  client: {
    Renderer: ({ data }) => <WeatherRenderer data={data} />,
  },
};
