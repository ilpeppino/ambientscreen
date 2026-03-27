import React from "react";
import type { WidgetClientPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { RssNewsRenderer } from "../rssNews/renderer";

const definition = widgetBuiltinDefinitions.rssNews;

export const rssNewsWidgetPlugin: WidgetClientPluginModule<"rssNews", React.ReactElement> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  client: {
    Renderer: (props) => <RssNewsRenderer {...props} />,
  },
};
