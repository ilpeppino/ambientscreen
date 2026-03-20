import type {
  WidgetConfigByKey,
  WeatherWidgetData,
  WidgetDataEnvelope,
} from "@ambient/shared-contracts";
import { normalizeWidgetConfig } from "../../widgets/widget-contracts";
import {
  fetchOpenMeteoWeather,
  type OpenMeteoWeatherResult,
} from "../providers/open-meteo.provider";

function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function fahrenheitToCelsius(value: number): number {
  return ((value - 32) * 5) / 9;
}

function toStableWeatherData(input: {
  locationLabel: string;
  providerResult: OpenMeteoWeatherResult;
}): WeatherWidgetData {
  const temperatureInCelsius =
    input.providerResult.temperature === null
      ? null
      : input.providerResult.temperatureUnit === "fahrenheit"
        ? roundToSingleDecimal(fahrenheitToCelsius(input.providerResult.temperature))
        : roundToSingleDecimal(input.providerResult.temperature);

  return {
    location: input.providerResult.locationLabel || input.locationLabel,
    temperatureC: temperatureInCelsius,
    conditionLabel: input.providerResult.conditionLabel,
  };
}

export async function resolveWeatherWidgetData(input: {
  widgetInstanceId: string;
  widgetConfig: unknown;
  fetchWeatherData?: (input: {
    locationQuery: string;
    units: "metric" | "imperial";
  }) => Promise<OpenMeteoWeatherResult | null>;
}): Promise<WidgetDataEnvelope<WeatherWidgetData, "weather">> {
  const normalizedConfig = normalizeWidgetConfig(
    "weather",
    input.widgetConfig,
  ) as WidgetConfigByKey["weather"];
  const locationQuery = normalizedConfig.location ?? "Amsterdam";
  const units = normalizedConfig.units ?? "metric";
  const fetchWeatherData = input.fetchWeatherData ?? fetchOpenMeteoWeather;

  try {
    const providerResult = await fetchWeatherData({
      locationQuery,
      units,
    });

    if (!providerResult) {
      return {
        widgetInstanceId: input.widgetInstanceId,
        widgetKey: "weather",
        state: "empty",
        data: {
          location: locationQuery,
          temperatureC: null,
          conditionLabel: null,
        },
        meta: {
          source: "open-meteo",
          errorCode: "WEATHER_LOCATION_NOT_FOUND",
          message: `No weather results for location '${locationQuery}'.`,
        },
      };
    }

    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "weather",
      state: "ready",
      data: toStableWeatherData({
        locationLabel: locationQuery,
        providerResult,
      }),
      meta: {
        fetchedAt: providerResult.fetchedAtIso,
        source: "open-meteo",
      },
    };
  } catch {
    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "weather",
      state: "stale",
      data: {
        location: locationQuery,
        temperatureC: null,
        conditionLabel: null,
      },
      meta: {
        source: "open-meteo",
        errorCode: "WEATHER_PROVIDER_UNAVAILABLE",
        message: "Weather provider request failed.",
      },
    };
  }
}
