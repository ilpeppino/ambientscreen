interface OpenWeatherCurrentResponse {
  name?: string;
  sys?: { country?: string };
  main?: { temp?: number };
  weather?: Array<{ id?: number }>;
  dt?: number;
  cod?: number | string;
  message?: string;
}

interface OpenWeatherForecastItem {
  dt?: number;
  main?: { temp?: number };
  weather?: Array<{ id?: number }>;
  dt_txt?: string;
}

interface OpenWeatherForecastResponse {
  city?: { name?: string; country?: string };
  list?: OpenWeatherForecastItem[];
  cod?: string;
  message?: string;
}

export interface OpenWeatherInput {
  city: string;
  countryCode?: string;
  units: "metric" | "imperial" | "standard";
  forecastSlots: number;
}

export interface OpenWeatherForecastSlot {
  timeIso: string;
  temperatureC: number | null;
  conditionLabel: string | null;
}

export interface OpenWeatherResult {
  locationLabel: string;
  temperatureC: number | null;
  conditionLabel: string | null;
  forecast: OpenWeatherForecastSlot[];
  fetchedAtIso: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toTemperatureC(value: number, units: "metric" | "imperial" | "standard"): number {
  if (units === "imperial") {
    return ((value - 32) * 5) / 9;
  }
  if (units === "standard") {
    return value - 273.15;
  }
  return value;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function mapConditionIdToLabel(id: number | null): string | null {
  if (id === null) return null;
  if (id >= 200 && id < 300) return "Thunderstorm";
  if (id >= 300 && id < 400) return "Drizzle";
  if (id >= 500 && id < 600) return "Rain";
  if (id >= 600 && id < 700) return "Snow";
  if (id >= 700 && id < 800) return "Fog";
  if (id === 800) return "Clear";
  if (id >= 801 && id <= 803) return "Partly cloudy";
  if (id === 804) return "Overcast";
  return "Unknown";
}

async function parseJsonResponse<TResponse>(response: Response): Promise<TResponse> {
  if (!response.ok) {
    throw new Error(`OpenWeather request failed with status ${response.status}`);
  }
  return response.json() as Promise<TResponse>;
}

function buildLocationQuery(city: string, countryCode?: string): string {
  if (countryCode && countryCode.trim().length > 0) {
    return `${city.trim()},${countryCode.trim()}`;
  }
  return city.trim();
}

export async function fetchOpenWeatherData(
  input: OpenWeatherInput,
): Promise<OpenWeatherResult | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENWEATHER_API_KEY is not configured");
  }

  const locationQuery = buildLocationQuery(input.city, input.countryCode);

  const currentParams = new URLSearchParams({
    q: locationQuery,
    units: input.units,
    appid: apiKey,
  });

  const currentResponse = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?${currentParams.toString()}`,
  );

  if (currentResponse.status === 404) {
    return null;
  }

  const currentPayload = await parseJsonResponse<OpenWeatherCurrentResponse>(currentResponse);

  const rawTemp = currentPayload.main?.temp;
  const conditionId = currentPayload.weather?.[0]?.id ?? null;
  const temperatureC = isFiniteNumber(rawTemp)
    ? roundToOneDecimal(toTemperatureC(rawTemp, input.units))
    : null;

  const countryLabel = currentPayload.sys?.country ? `, ${currentPayload.sys.country}` : "";
  const locationLabel =
    currentPayload.name ? `${currentPayload.name}${countryLabel}` : locationQuery;

  const fetchedAtIso = currentPayload.dt
    ? new Date(currentPayload.dt * 1000).toISOString()
    : new Date().toISOString();

  const forecastParams = new URLSearchParams({
    q: locationQuery,
    units: input.units,
    cnt: String(Math.min(input.forecastSlots, 10)),
    appid: apiKey,
  });

  let forecast: OpenWeatherForecastSlot[] = [];
  try {
    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?${forecastParams.toString()}`,
    );
    if (forecastResponse.ok) {
      const forecastPayload = await forecastResponse.json() as OpenWeatherForecastResponse;
      const items = forecastPayload.list ?? [];
      forecast = items.slice(0, input.forecastSlots).map((item) => {
        const slotTemp = item.main?.temp;
        const slotConditionId = item.weather?.[0]?.id ?? null;
        return {
          timeIso: item.dt_txt
            ? new Date(item.dt_txt).toISOString()
            : new Date((item.dt ?? 0) * 1000).toISOString(),
          temperatureC: isFiniteNumber(slotTemp)
            ? roundToOneDecimal(toTemperatureC(slotTemp, input.units))
            : null,
          conditionLabel: mapConditionIdToLabel(isFiniteNumber(slotConditionId) ? slotConditionId : null),
        };
      });
    }
  } catch {
    // Forecast fetch failure is non-fatal: return current weather with empty forecast
    forecast = [];
  }

  return {
    locationLabel,
    temperatureC,
    conditionLabel: mapConditionIdToLabel(isFiniteNumber(conditionId) ? conditionId : null),
    forecast,
    fetchedAtIso,
  };
}
