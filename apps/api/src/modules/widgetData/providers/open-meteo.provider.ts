type TemperatureUnit = "celsius" | "fahrenheit";

interface OpenMeteoGeocodingResponse {
  results?: Array<{
    name?: string;
    admin1?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }>;
}

interface OpenMeteoForecastResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    time?: string;
  };
  current_units?: {
    temperature_2m?: string;
  };
}

export interface OpenMeteoWeatherInput {
  locationQuery: string;
  units: "metric" | "imperial";
}

export interface OpenMeteoWeatherResult {
  locationLabel: string;
  temperature: number | null;
  temperatureUnit: TemperatureUnit;
  conditionLabel: string | null;
  fetchedAtIso: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function buildLocationLabel(input: {
  name?: string;
  admin1?: string;
  country?: string;
}): string {
  return [input.name, input.admin1, input.country]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .join(", ");
}

function mapWeatherCodeToLabel(code: number | null): string | null {
  if (code === null) {
    return null;
  }

  if (code === 0) {
    return "Clear";
  }

  if (code >= 1 && code <= 3) {
    return "Partly cloudy";
  }

  if (code === 45 || code === 48) {
    return "Fog";
  }

  if (code >= 51 && code <= 57) {
    return "Drizzle";
  }

  if (code >= 61 && code <= 67) {
    return "Rain";
  }

  if (code >= 71 && code <= 77) {
    return "Snow";
  }

  if (code >= 80 && code <= 82) {
    return "Rain showers";
  }

  if (code >= 85 && code <= 86) {
    return "Snow showers";
  }

  if (code === 95) {
    return "Thunderstorm";
  }

  if (code >= 96 && code <= 99) {
    return "Thunderstorm with hail";
  }

  return "Unknown";
}

async function parseJsonResponse<TResponse>(response: Response): Promise<TResponse> {
  if (!response.ok) {
    throw new Error(`Weather provider request failed with status ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export async function fetchOpenMeteoWeather(
  input: OpenMeteoWeatherInput,
): Promise<OpenMeteoWeatherResult | null> {
  const geocodeParams = new URLSearchParams({
    name: input.locationQuery,
    count: "1",
    language: "en",
    format: "json",
  });

  const geocodeResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${geocodeParams.toString()}`,
  );
  const geocodePayload =
    await parseJsonResponse<OpenMeteoGeocodingResponse>(geocodeResponse);

  const candidate = geocodePayload.results?.[0];
  if (
    !candidate ||
    !isFiniteNumber(candidate.latitude) ||
    !isFiniteNumber(candidate.longitude)
  ) {
    return null;
  }

  const temperatureUnit = input.units === "imperial" ? "fahrenheit" : "celsius";
  const forecastParams = new URLSearchParams({
    latitude: String(candidate.latitude),
    longitude: String(candidate.longitude),
    current: "temperature_2m,weather_code",
    temperature_unit: temperatureUnit,
  });

  const forecastResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?${forecastParams.toString()}`,
  );
  const forecastPayload =
    await parseJsonResponse<OpenMeteoForecastResponse>(forecastResponse);

  const rawTemp = forecastPayload.current?.temperature_2m;
  const resolvedUnit = forecastPayload.current_units?.temperature_2m;
  const conditionCode = forecastPayload.current?.weather_code;
  const locationLabel = buildLocationLabel(candidate) || input.locationQuery;
  const fetchedAtIso = forecastPayload.current?.time ?? new Date().toISOString();

  return {
    locationLabel,
    temperature: isFiniteNumber(rawTemp) ? rawTemp : null,
    temperatureUnit:
      resolvedUnit === "°F"
        ? "fahrenheit"
        : resolvedUnit === "°C"
          ? "celsius"
          : temperatureUnit,
    conditionLabel: mapWeatherCodeToLabel(
      isFiniteNumber(conditionCode) ? conditionCode : null,
    ),
    fetchedAtIso,
  };
}
