import React from "react";
import type { WidgetClientPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { TasksRenderer } from "../tasks/renderer";
import { TasksInspectorContent } from "../tasks/TasksInspectorContent";

const definition = widgetBuiltinDefinitions.tasks;

export const tasksWidgetPlugin: WidgetClientPluginModule<"tasks", React.ReactElement> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  client: {
    Renderer: (props) => <TasksRenderer {...props} />,
    SettingsForm: (props) => (
      <TasksInspectorContent
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
