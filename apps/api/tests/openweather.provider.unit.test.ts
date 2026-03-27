import { test, expect, beforeEach, afterEach } from "vitest";
import { fetchOpenWeatherData } from "../src/modules/widgetData/providers/openweather.provider";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.OPENWEATHER_API_KEY;

function makeCurrentResponse(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    name: "Amsterdam",
    sys: { country: "NL" },
    main: { temp: 15.0 },
    weather: [{ id: 800 }],
    dt: 1742464500,
    ...overrides,
  });
}

function makeForecastResponse(items: unknown[] = []) {
  return JSON.stringify({
    city: { name: "Amsterdam", country: "NL" },
    list: items,
  });
}

beforeEach(() => {
  process.env.OPENWEATHER_API_KEY = "test-key";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) {
    delete process.env.OPENWEATHER_API_KEY;
  } else {
    process.env.OPENWEATHER_API_KEY = originalApiKey;
  }
});

test("fetchOpenWeatherData normalizes current weather for metric units", async () => {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/weather")) {
      return new Response(makeCurrentResponse({ main: { temp: 9.24 }, weather: [{ id: 501 }] }), { status: 200 });
    }
    return new Response(makeForecastResponse(), { status: 200 });
  };

  const result = await fetchOpenWeatherData({
    city: "Amsterdam",
    units: "metric",
    forecastSlots: 3,
  });

  expect(result).not.toBeNull();
  expect(result!.locationLabel).toBe("Amsterdam, NL");
  expect(result!.temperatureC).toBe(9.2);
  expect(result!.conditionLabel).toBe("Rain");
});

test("fetchOpenWeatherData converts Fahrenheit to Celsius for imperial units", async () => {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/weather")) {
      return new Response(makeCurrentResponse({ main: { temp: 50.0 }, weather: [{ id: 800 }] }), { status: 200 });
    }
    return new Response(makeForecastResponse(), { status: 200 });
  };

  const result = await fetchOpenWeatherData({
    city: "New York",
    units: "imperial",
    forecastSlots: 3,
  });

  expect(result).not.toBeNull();
  // 50°F → 10°C
  expect(result!.temperatureC).toBe(10);
});

test("fetchOpenWeatherData converts Kelvin to Celsius for standard units", async () => {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/weather")) {
      return new Response(makeCurrentResponse({ main: { temp: 283.15 }, weather: [{ id: 800 }] }), { status: 200 });
    }
    return new Response(makeForecastResponse(), { status: 200 });
  };

  const result = await fetchOpenWeatherData({
    city: "Amsterdam",
    units: "standard",
    forecastSlots: 3,
  });

  expect(result).not.toBeNull();
  // 283.15K → 10°C
  expect(result!.temperatureC).toBe(10);
});

test("fetchOpenWeatherData returns null for 404 (location not found)", async () => {
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ message: "city not found" }), { status: 404 });
  };

  const result = await fetchOpenWeatherData({
    city: "NoSuchPlaceXYZ",
    units: "metric",
    forecastSlots: 3,
  });

  expect(result).toBeNull();
});

test("fetchOpenWeatherData throws when OPENWEATHER_API_KEY is missing", async () => {
  delete process.env.OPENWEATHER_API_KEY;

  await expect(
    fetchOpenWeatherData({ city: "Amsterdam", units: "metric", forecastSlots: 3 }),
  ).rejects.toThrow("OPENWEATHER_API_KEY is not configured");
});

test("fetchOpenWeatherData includes forecast slots in result", async () => {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/weather")) {
      return new Response(makeCurrentResponse(), { status: 200 });
    }
    return new Response(
      makeForecastResponse([
        { dt: 1, main: { temp: 12.0 }, weather: [{ id: 800 }], dt_txt: "2026-03-20T12:00:00" },
        { dt: 2, main: { temp: 11.0 }, weather: [{ id: 501 }], dt_txt: "2026-03-20T15:00:00" },
        { dt: 3, main: { temp: 10.0 }, weather: [{ id: 600 }], dt_txt: "2026-03-20T18:00:00" },
      ]),
      { status: 200 },
    );
  };

  const result = await fetchOpenWeatherData({
    city: "Amsterdam",
    units: "metric",
    forecastSlots: 3,
  });

  expect(result).not.toBeNull();
  expect(result!.forecast).toHaveLength(3);
  expect(result!.forecast[0].temperatureC).toBe(12);
  expect(result!.forecast[0].conditionLabel).toBe("Clear");
  expect(result!.forecast[1].conditionLabel).toBe("Rain");
  expect(result!.forecast[2].conditionLabel).toBe("Snow");
});

test("fetchOpenWeatherData returns empty forecast when forecast endpoint fails", async () => {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/weather")) {
      return new Response(makeCurrentResponse(), { status: 200 });
    }
    throw new Error("forecast endpoint unreachable");
  };

  const result = await fetchOpenWeatherData({
    city: "Amsterdam",
    units: "metric",
    forecastSlots: 3,
  });

  expect(result).not.toBeNull();
  expect(result!.forecast).toEqual([]);
  // Current weather data is still present
  expect(result!.temperatureC).toBe(15);
});

test("fetchOpenWeatherData includes countryCode in query when provided", async () => {
  let capturedUrl = "";

  globalThis.fetch = async (input) => {
    capturedUrl = String(input);
    if (capturedUrl.includes("/weather")) {
      return new Response(makeCurrentResponse(), { status: 200 });
    }
    return new Response(makeForecastResponse(), { status: 200 });
  };

  await fetchOpenWeatherData({
    city: "Amsterdam",
    countryCode: "NL",
    units: "metric",
    forecastSlots: 3,
  });

  expect(capturedUrl).toContain("q=Amsterdam%2CNL");
});

test("fetchOpenWeatherData maps condition IDs to expected labels", async () => {
  const cases: Array<{ id: number; expected: string }> = [
    { id: 200, expected: "Thunderstorm" },
    { id: 300, expected: "Drizzle" },
    { id: 500, expected: "Rain" },
    { id: 601, expected: "Snow" },
    { id: 741, expected: "Fog" },
    { id: 800, expected: "Clear" },
    { id: 802, expected: "Partly cloudy" },
    { id: 804, expected: "Overcast" },
  ];

  for (const { id, expected } of cases) {
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes("/weather")) {
        return new Response(makeCurrentResponse({ weather: [{ id }] }), { status: 200 });
      }
      return new Response(makeForecastResponse(), { status: 200 });
    };

    const result = await fetchOpenWeatherData({ city: "Amsterdam", units: "metric", forecastSlots: 1 });
    expect(result!.conditionLabel).toBe(expected);
  }
});
