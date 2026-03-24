import React from "react";
import type { WidgetClientPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { WeatherRenderer } from "../weather/renderer";

const definition = widgetBuiltinDefinitions.weather;

export const weatherWidgetPlugin: WidgetClientPluginModule<"weather", React.ReactElement> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  client: {
    Renderer: (props) => <WeatherRenderer {...props} />,
  },
};
