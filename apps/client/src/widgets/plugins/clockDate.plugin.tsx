import React from "react";
import type { WidgetClientPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { ClockDateRenderer } from "../clockDate/renderer";
import { ClockDateInspectorContent } from "../clockDate/ClockDateInspectorContent";

const definition = widgetBuiltinDefinitions.clockDate;

export const clockDateWidgetPlugin: WidgetClientPluginModule<"clockDate", React.ReactElement> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  client: {
    Renderer: (props) => <ClockDateRenderer {...props} />,
    SettingsForm: (props) => (
      <ClockDateInspectorContent
        config={props.config as Record<string, unknown>}
        draft={props.config as Record<string, unknown>}
        mode="edit"
        onChange={(patch) =>
          props.onChange({ ...props.config, ...patch } as typeof props.config)
        }
        disabled={props.disabled}
      />
    ),
  },
};
