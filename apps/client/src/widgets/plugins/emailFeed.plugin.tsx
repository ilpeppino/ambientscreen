import React from "react";
import type { WidgetClientPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { EmailFeedInspectorContent } from "../emailFeed/EmailFeedInspectorContent";
import { EmailFeedRenderer } from "../emailFeed/renderer";

const definition = widgetBuiltinDefinitions.emailFeed;

export const emailFeedWidgetPlugin: WidgetClientPluginModule<"emailFeed", React.ReactElement> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  client: {
    Renderer: (props) => <EmailFeedRenderer {...props} />,
    SettingsForm: (props) => (
      <EmailFeedInspectorContent
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
