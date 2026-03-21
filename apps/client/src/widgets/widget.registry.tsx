import React from "react";
import type {
  WidgetDataByKey,
  WidgetDataEnvelope,
  WidgetKey,
} from "@ambient/shared-contracts";
import { CalendarRenderer } from "./calendar/renderer";
import { ClockDateRenderer } from "./clockDate/renderer";
import { WeatherRenderer } from "./weather/renderer";
import { resolveWidgetRendererKind } from "./widgetRendererMap.logic";

export type WidgetEnvelope =
  | WidgetDataEnvelope<WidgetDataByKey["clockDate"], "clockDate">
  | WidgetDataEnvelope<WidgetDataByKey["weather"], "weather">
  | WidgetDataEnvelope<WidgetDataByKey["calendar"], "calendar">;

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
