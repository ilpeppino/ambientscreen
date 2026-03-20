import React from "react";
import type {
  WidgetDataByKey,
  WidgetDataEnvelope,
} from "@ambient/shared-contracts";
import { CalendarRenderer } from "./calendar/renderer";
import { ClockDateRenderer } from "./clockDate/renderer";
import { WeatherRenderer } from "./weather/renderer";

type WidgetEnvelope =
  | WidgetDataEnvelope<WidgetDataByKey["clockDate"], "clockDate">
  | WidgetDataEnvelope<WidgetDataByKey["weather"], "weather">
  | WidgetDataEnvelope<WidgetDataByKey["calendar"], "calendar">;

export function renderWidgetFromEnvelope(envelope: WidgetEnvelope) {
  if (envelope.widgetKey === "clockDate") {
    return <ClockDateRenderer data={envelope.data} />;
  }

  if (envelope.widgetKey === "weather") {
    return <WeatherRenderer data={envelope.data} />;
  }

  return <CalendarRenderer data={envelope.data} />;
}
