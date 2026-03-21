import React from "react";
import {
  type WidgetConfigByKey,
  type WidgetConfigSchema,
  widgetConfigRegistry,
  type WidgetDataByKey,
  type WidgetDataEnvelope,
  type WidgetKey,
} from "@ambient/shared-contracts";
import { CalendarRenderer } from "./calendar/renderer";
import { ClockDateRenderer } from "./clockDate/renderer";
import { WeatherRenderer } from "./weather/renderer";
import { resolveWidgetRendererKind } from "./widgetRendererMap.logic";

export type WidgetEnvelope =
  | WidgetDataEnvelope<WidgetDataByKey["clockDate"], "clockDate">
  | WidgetDataEnvelope<WidgetDataByKey["weather"], "weather">
  | WidgetDataEnvelope<WidgetDataByKey["calendar"], "calendar">;

interface WidgetRegistryEntry<TKey extends WidgetKey> {
  key: TKey;
  name: string;
  defaultConfig: WidgetConfigByKey[TKey];
  configSchema: WidgetConfigSchema;
}

export const widgetRegistry: { [TKey in WidgetKey]: WidgetRegistryEntry<TKey> } = {
  clockDate: {
    key: "clockDate",
    name: "Clock & Date",
    defaultConfig: widgetConfigRegistry.clockDate.defaultConfig,
    configSchema: widgetConfigRegistry.clockDate.configSchema,
  },
  weather: {
    key: "weather",
    name: "Weather",
    defaultConfig: widgetConfigRegistry.weather.defaultConfig,
    configSchema: widgetConfigRegistry.weather.configSchema,
  },
  calendar: {
    key: "calendar",
    name: "Calendar",
    defaultConfig: widgetConfigRegistry.calendar.defaultConfig,
    configSchema: widgetConfigRegistry.calendar.configSchema,
  },
};

export function renderWidgetFromKey(
  widgetKey: WidgetKey,
  data: WidgetDataByKey[WidgetKey] | null,
) {
  const rendererKind = resolveWidgetRendererKind(widgetKey);

  if (rendererKind === "clockDate") {
    return <ClockDateRenderer data={data as WidgetDataByKey["clockDate"] | null} />;
  }

  if (rendererKind === "weather") {
    return <WeatherRenderer data={data as WidgetDataByKey["weather"] | null} />;
  }

  return <CalendarRenderer data={data as WidgetDataByKey["calendar"] | null} />;
}

export function renderWidgetFromEnvelope(envelope: WidgetEnvelope) {
  return renderWidgetFromKey(envelope.widgetKey, envelope.data);
}
