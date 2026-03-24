import React from "react";
import type { WidgetClientPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { WeatherRenderer } from "../weather/renderer";
import { WeatherSettingsForm } from "../weather/settings-form";
import { WeatherPreview } from "../weather/preview";

const definition = widgetBuiltinDefinitions.weather;

export const weatherWidgetPlugin: WidgetClientPluginModule<"weather", React.ReactElement> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  client: {
    Renderer: (props) => <WeatherRenderer {...props} />,
    SettingsForm: (props) => <WeatherSettingsForm {...props} />,
    Preview: (props) => <WeatherPreview {...props} />,
  },
};
