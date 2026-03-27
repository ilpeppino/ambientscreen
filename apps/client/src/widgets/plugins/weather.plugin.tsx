import React from "react";
import type { WidgetClientPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { WeatherRenderer } from "../weather/renderer";
import { WeatherInspectorContent } from "../weather/WeatherInspectorContent";
import { WeatherPreview } from "../weather/preview";

const definition = widgetBuiltinDefinitions.weather;

export const weatherWidgetPlugin: WidgetClientPluginModule<"weather", React.ReactElement> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  client: {
    Renderer: (props) => <WeatherRenderer {...props} />,
    SettingsForm: (props) => (
      <WeatherInspectorContent
        config={props.config as Record<string, unknown>}
        draft={props.config as Record<string, unknown>}
        mode="edit"
        onChange={(patch) =>
          props.onChange({ ...props.config, ...patch } as typeof props.config)
        }
      />
    ),
    Preview: (props) => <WeatherPreview {...props} />,
  },
};
