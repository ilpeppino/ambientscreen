import type {
  WeatherWidgetData,
  WidgetDataEnvelope,
} from "@ambient/shared-contracts";

export async function resolveWeatherWidgetData(input: {
  widgetInstanceId: string;
}): Promise<WidgetDataEnvelope<WeatherWidgetData, "weather">> {
  return {
    widgetInstanceId: input.widgetInstanceId,
    widgetKey: "weather",
    state: "empty",
    data: null,
    meta: {
      message: "Weather provider not configured yet.",
    },
  };
}
