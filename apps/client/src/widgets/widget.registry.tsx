import React from "react";
import type {
  WidgetDataByKey,
  WidgetDataEnvelope,
  WidgetKey,
} from "@ambient/shared-contracts";
import {
  getWidgetPlugin,
  renderWidgetFromKey as renderWidgetFromPlugin,
} from "./pluginRegistry";
import { registerBuiltinWidgetPlugins } from "./registerBuiltinPlugins";

registerBuiltinWidgetPlugins();

export type WidgetEnvelope =
  | WidgetDataEnvelope<WidgetDataByKey["clockDate"], "clockDate">
  | WidgetDataEnvelope<WidgetDataByKey["weather"], "weather">
  | WidgetDataEnvelope<WidgetDataByKey["calendar"], "calendar">
  | WidgetDataEnvelope<WidgetDataByKey["rssNews"], "rssNews">;

export const widgetRegistry = {
  clockDate: getWidgetPlugin("clockDate"),
  weather: getWidgetPlugin("weather"),
  calendar: getWidgetPlugin("calendar"),
  rssNews: getWidgetPlugin("rssNews"),
};

export function renderWidgetFromKey(
  widgetKey: WidgetKey,
  data: WidgetDataByKey[WidgetKey] | null,
) {
  return renderWidgetFromPlugin(widgetKey, {
    widgetInstanceId: `display-${widgetKey}`,
    state: "ready",
    data,
  });
}

export function renderWidgetFromEnvelope(envelope: WidgetEnvelope): React.ReactNode {
  return renderWidgetFromPlugin(envelope.widgetKey, {
    widgetInstanceId: envelope.widgetInstanceId,
    state: envelope.state,
    data: envelope.data,
    meta: envelope.meta,
  });
}
