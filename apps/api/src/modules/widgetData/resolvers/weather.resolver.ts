import type {
  WidgetConfigByKey,
  WeatherWidgetData,
  WeatherForecastSlot,
  WidgetDataEnvelope,
} from "@ambient/shared-contracts";
import {
  fetchOpenWeatherData,
  type OpenWeatherResult,
} from "../providers/openweather.provider";

function toWeatherConfig(config: unknown): WidgetConfigByKey["weather"] {
  const raw = config && typeof config === "object" && !Array.isArray(config)
    ? config as Record<string, unknown>
    : {};

  const units = raw.units === "metric" || raw.units === "imperial" || raw.units === "standard"
    ? raw.units
    : "metric";

  const forecastSlots =
    typeof raw.forecastSlots === "number" && Number.isFinite(raw.forecastSlots) && raw.forecastSlots >= 1
      ? Math.min(Math.round(raw.forecastSlots), 10)
      : 3;

  return {
    city: typeof raw.city === "string" && raw.city.length > 0 ? raw.city : "Amsterdam",
    countryCode: typeof raw.countryCode === "string" && raw.countryCode.length > 0 ? raw.countryCode : undefined,
    units,
    forecastSlots,
  };
}

function toStableWeatherData(result: OpenWeatherResult): WeatherWidgetData {
  const forecast: WeatherForecastSlot[] = result.forecast.map((slot) => ({
    timeIso: slot.timeIso,
    temperatureC: slot.temperatureC,
    conditionLabel: slot.conditionLabel,
  }));

  return {
    location: result.locationLabel,
    temperatureC: result.temperatureC,
    conditionLabel: result.conditionLabel,
    forecast,
  };
}

export async function resolveWeatherWidgetData(input: {
  widgetInstanceId: string;
  widgetConfig: unknown;
  fetchWeatherData?: (input: {
    city: string;
    countryCode?: string;
    units: "metric" | "imperial" | "standard";
    forecastSlots: number;
  }) => Promise<OpenWeatherResult | null>;
}): Promise<WidgetDataEnvelope<WeatherWidgetData, "weather">> {
  const normalizedConfig = toWeatherConfig(input.widgetConfig);
  const city = normalizedConfig.city ?? "Amsterdam";
  const countryCode = normalizedConfig.countryCode;
  const units = normalizedConfig.units ?? "metric";
  const forecastSlots = normalizedConfig.forecastSlots ?? 3;
  const fetchWeatherData = input.fetchWeatherData ?? fetchOpenWeatherData;

  const emptyData: WeatherWidgetData = {
    location: city,
    temperatureC: null,
    conditionLabel: null,
    forecast: [],
  };

  try {
    const providerResult = await fetchWeatherData({ city, countryCode, units, forecastSlots });

    if (!providerResult) {
      return {
        widgetInstanceId: input.widgetInstanceId,
        widgetKey: "weather",
        state: "empty",
        data: emptyData,
        meta: {
          source: "openweather",
          errorCode: "WEATHER_LOCATION_NOT_FOUND",
          message: `No weather results for location '${city}'.`,
        },
      };
    }

    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "weather",
      state: "ready",
      data: toStableWeatherData(providerResult),
      meta: {
        fetchedAt: providerResult.fetchedAtIso,
        source: "openweather",
      },
    };
  } catch {
    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "weather",
      state: "stale",
      data: emptyData,
      meta: {
        source: "openweather",
        errorCode: "WEATHER_PROVIDER_UNAVAILABLE",
        message: "Weather provider request failed.",
      },
    };
  }
}
