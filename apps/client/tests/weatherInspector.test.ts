import { describe, it, expect, vi } from "vitest";
import { getInspectorDefinition } from "../src/widgets/weather/inspector";
import type { WeatherConfig, WeatherInspectorContext } from "../src/widgets/weather/inspector";

function makeContext(onChange = vi.fn()): WeatherInspectorContext {
  return { onChange };
}

function makeConfig(overrides: Partial<WeatherConfig> = {}): WeatherConfig {
  return {
    city: "Amsterdam",
    units: "metric",
    forecastSlots: 3,
    ...overrides,
  };
}

describe("Weather getInspectorDefinition — section structure", () => {
  it("returns exactly 2 sections", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    expect(def.sections).toHaveLength(2);
  });

  it("sections are in order: location, display", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    expect(def.sections[0].id).toBe("location");
    expect(def.sections[1].id).toBe("display");
  });

  it("sections have human-readable titles", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    expect(def.sections[0].title).toBe("Location");
    expect(def.sections[1].title).toBe("Display");
  });

  it("no layout or identity section is present", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const ids = def.sections.map((s) => s.id);
    expect(ids).not.toContain("layout");
    expect(ids).not.toContain("identity");
    expect(ids).not.toContain("widget");
  });
});

describe("Weather getInspectorDefinition — city field", () => {
  it("city field id is 'city'", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[0].fields[0];
    expect(field.id).toBe("city");
  });

  it("city field label is 'City'", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[0].fields[0];
    expect(field.label).toBe("City");
  });

  it("city field kind is 'text'", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[0].fields[0];
    expect(field.kind).toBe("text");
  });

  it("city value reflects config", () => {
    const def = getInspectorDefinition(makeConfig({ city: "Berlin" }), makeContext());
    const field = def.sections[0].fields[0];
    expect(field.value).toBe("Berlin");
  });

  it("city displayValue reflects config city", () => {
    const def = getInspectorDefinition(makeConfig({ city: "Tokyo" }), makeContext());
    const field = def.sections[0].fields[0];
    expect(field.displayValue).toBe("Tokyo");
  });

  it("city displayValue is '—' when city is empty", () => {
    const def = getInspectorDefinition(makeConfig({ city: "" }), makeContext());
    const field = def.sections[0].fields[0];
    expect(field.displayValue).toBe("—");
  });

  it("city displayValue is '—' when city is undefined", () => {
    const def = getInspectorDefinition(makeConfig({ city: undefined }), makeContext());
    const field = def.sections[0].fields[0];
    expect(field.displayValue).toBe("—");
  });

  it("city onChange calls context.onChange with city patch", () => {
    const onChange = vi.fn();
    const def = getInspectorDefinition(makeConfig(), makeContext(onChange));
    const field = def.sections[0].fields[0];
    field.onChange?.("London" as never);
    expect(onChange).toHaveBeenCalledWith({ city: "London" });
  });
});

describe("Weather getInspectorDefinition — countryCode field", () => {
  it("countryCode field id is 'countryCode'", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[0].fields[1];
    expect(field.id).toBe("countryCode");
  });

  it("countryCode field label is 'Country code'", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[0].fields[1];
    expect(field.label).toBe("Country code");
  });

  it("countryCode field kind is 'text'", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[0].fields[1];
    expect(field.kind).toBe("text");
  });

  it("countryCode value reflects config", () => {
    const def = getInspectorDefinition(makeConfig({ countryCode: "NL" }), makeContext());
    const field = def.sections[0].fields[1];
    expect(field.value).toBe("NL");
  });

  it("countryCode displayValue is '—' when not set", () => {
    const def = getInspectorDefinition(makeConfig({ countryCode: undefined }), makeContext());
    const field = def.sections[0].fields[1];
    expect(field.displayValue).toBe("—");
  });

  it("countryCode displayValue reflects config value when set", () => {
    const def = getInspectorDefinition(makeConfig({ countryCode: "GB" }), makeContext());
    const field = def.sections[0].fields[1];
    expect(field.displayValue).toBe("GB");
  });

  it("countryCode onChange calls context.onChange with countryCode patch", () => {
    const onChange = vi.fn();
    const def = getInspectorDefinition(makeConfig(), makeContext(onChange));
    const field = def.sections[0].fields[1];
    field.onChange?.("DE" as never);
    expect(onChange).toHaveBeenCalledWith({ countryCode: "DE" });
  });

  it("countryCode onChange passes undefined when value is empty string", () => {
    const onChange = vi.fn();
    const def = getInspectorDefinition(makeConfig(), makeContext(onChange));
    const field = def.sections[0].fields[1];
    field.onChange?.("" as never);
    expect(onChange).toHaveBeenCalledWith({ countryCode: undefined });
  });
});

describe("Weather getInspectorDefinition — units field", () => {
  it("units field id is 'units'", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[1].fields[0];
    expect(field.id).toBe("units");
  });

  it("units field label is 'Units'", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[1].fields[0];
    expect(field.label).toBe("Units");
  });

  it("units field kind is 'segmented'", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[1].fields[0];
    expect(field.kind).toBe("segmented");
  });

  it("units defaults to 'metric' when not configured", () => {
    const def = getInspectorDefinition(makeConfig({ units: undefined }), makeContext());
    const field = def.sections[1].fields[0];
    expect(field.value).toBe("metric");
  });

  it("units value reflects config", () => {
    const def = getInspectorDefinition(makeConfig({ units: "imperial" }), makeContext());
    const field = def.sections[1].fields[0];
    expect(field.value).toBe("imperial");
  });

  it("units displayValue for metric is human-readable and not 'metric'", () => {
    const def = getInspectorDefinition(makeConfig({ units: "metric" }), makeContext());
    const field = def.sections[1].fields[0];
    expect(field.displayValue).not.toBe("metric");
    expect(field.displayValue).toContain("°C");
  });

  it("units displayValue for imperial contains °F", () => {
    const def = getInspectorDefinition(makeConfig({ units: "imperial" }), makeContext());
    const field = def.sections[1].fields[0];
    expect(field.displayValue).toContain("°F");
  });

  it("units displayValue for standard contains K", () => {
    const def = getInspectorDefinition(makeConfig({ units: "standard" }), makeContext());
    const field = def.sections[1].fields[0];
    expect(field.displayValue).toContain("K");
  });

  it("units has exactly 3 options (metric, imperial, standard)", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[1].fields[0];
    const values = field.options?.map((o) => o.value) ?? [];
    expect(values).toContain("metric");
    expect(values).toContain("imperial");
    expect(values).toContain("standard");
    expect(values).toHaveLength(3);
  });

  it("units options do not use raw enum values as labels", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[1].fields[0];
    const labels = field.options?.map((o) => o.label) ?? [];
    expect(labels).not.toContain("metric");
    expect(labels).not.toContain("imperial");
    expect(labels).not.toContain("standard");
  });

  it("units onChange calls context.onChange with units patch", () => {
    const onChange = vi.fn();
    const def = getInspectorDefinition(makeConfig(), makeContext(onChange));
    const field = def.sections[1].fields[0];
    field.onChange?.("imperial" as never);
    expect(onChange).toHaveBeenCalledWith({ units: "imperial" });
  });
});

describe("Weather getInspectorDefinition — forecastSlots field", () => {
  it("forecastSlots field id is 'forecastSlots'", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[1].fields[1];
    expect(field.id).toBe("forecastSlots");
  });

  it("forecastSlots field label is 'Forecast slots'", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[1].fields[1];
    expect(field.label).toBe("Forecast slots");
  });

  it("forecastSlots field kind is 'segmented'", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[1].fields[1];
    expect(field.kind).toBe("segmented");
  });

  it("forecastSlots defaults to 3 when not configured", () => {
    const def = getInspectorDefinition(makeConfig({ forecastSlots: undefined }), makeContext());
    const field = def.sections[1].fields[1];
    expect(field.value).toBe(3);
  });

  it("forecastSlots value reflects config", () => {
    const def = getInspectorDefinition(makeConfig({ forecastSlots: 5 }), makeContext());
    const field = def.sections[1].fields[1];
    expect(field.value).toBe(5);
  });

  it("forecastSlots displayValue is the slot count as a string", () => {
    const def = getInspectorDefinition(makeConfig({ forecastSlots: 4 }), makeContext());
    const field = def.sections[1].fields[1];
    expect(field.displayValue).toBe("4");
  });

  it("forecastSlots has options 1 through 5", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[1].fields[1];
    const values = field.options?.map((o) => o.value) ?? [];
    expect(values).toEqual([1, 2, 3, 4, 5]);
  });

  it("forecastSlots onChange calls context.onChange with forecastSlots patch", () => {
    const onChange = vi.fn();
    const def = getInspectorDefinition(makeConfig(), makeContext(onChange));
    const field = def.sections[1].fields[1];
    field.onChange?.(2 as never);
    expect(onChange).toHaveBeenCalledWith({ forecastSlots: 2 });
  });
});

describe("Weather getInspectorDefinition — no layout or ID leakage", () => {
  it("no field has id 'widgetInstanceId' or 'widgetId'", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const allFields = def.sections.flatMap((s) => s.fields);
    const ids = allFields.map((f) => f.id);
    expect(ids).not.toContain("widgetInstanceId");
    expect(ids).not.toContain("widgetId");
    expect(ids).not.toContain("id");
  });

  it("no UUID-shaped value appears in any field", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}/;
    for (const section of def.sections) {
      for (const field of section.fields) {
        expect(String(field.value ?? "")).not.toMatch(uuidPattern);
        expect(field.displayValue ?? "").not.toMatch(uuidPattern);
      }
    }
  });

  it("contains no layout section", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    expect(def.sections.map((s) => s.id)).not.toContain("layout");
  });

  it("all displayValues are non-empty strings when config is fully populated", () => {
    const def = getInspectorDefinition(
      makeConfig({ city: "Paris", countryCode: "FR", units: "metric", forecastSlots: 3 }),
      makeContext(),
    );
    for (const section of def.sections) {
      for (const field of section.fields) {
        if (field.displayValue !== undefined) {
          expect(typeof field.displayValue).toBe("string");
          expect(field.displayValue.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
