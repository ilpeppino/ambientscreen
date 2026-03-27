import { describe, it, expect, vi } from "vitest";
import { getInspectorDefinition } from "../src/widgets/calendar/inspector";
import type { CalendarConfig, CalendarInspectorContext } from "../src/widgets/calendar/inspector";

function makeContext(overrides: Partial<CalendarInspectorContext> = {}): CalendarInspectorContext {
  return {
    connections: [],
    calendars: [],
    onConnect: vi.fn(),
    onSelectConnection: vi.fn(),
    onSelectCalendar: vi.fn(),
    onRefresh: vi.fn(),
    onChange: vi.fn(),
    ...overrides,
  };
}

function makeConfig(overrides: Partial<CalendarConfig> = {}): CalendarConfig {
  return {
    provider: "ical",
    ...overrides,
  };
}

describe("getInspectorDefinition — section structure", () => {
  it("returns exactly 3 sections", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    expect(def.sections).toHaveLength(3);
  });

  it("sections are in order: connection, calendar, display", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    expect(def.sections[0].id).toBe("connection");
    expect(def.sections[1].id).toBe("calendar");
    expect(def.sections[2].id).toBe("display");
  });

  it("sections have human-readable titles", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    expect(def.sections[0].title).toBe("Connection");
    expect(def.sections[1].title).toBe("Calendar");
    expect(def.sections[2].title).toBe("Display");
  });
});

describe("getInspectorDefinition — Connection section", () => {
  it("includes a provider field with segmented kind", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const connectionSection = def.sections[0];
    const providerField = connectionSection.fields.find((f) => f.id === "provider");
    expect(providerField).toBeDefined();
    expect(providerField?.kind).toBe("segmented");
  });

  it("provider field has human-readable options", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const providerField = def.sections[0].fields.find((f) => f.id === "provider");
    const labels = providerField?.options?.map((o) => o.label) ?? [];
    expect(labels).toContain("iCal Feed");
    expect(labels).toContain("Google Calendar");
    // Must not expose raw enum values as labels
    expect(labels).not.toContain("ical");
    expect(labels).not.toContain("google");
  });

  it("shows icalUrl field when provider is ical", () => {
    const def = getInspectorDefinition(makeConfig({ provider: "ical" }), makeContext());
    const icalField = def.sections[0].fields.find((f) => f.id === "icalUrl");
    expect(icalField?.isVisible).not.toBe(false);
  });

  it("hides icalUrl field when provider is google", () => {
    const def = getInspectorDefinition(makeConfig({ provider: "google" }), makeContext());
    const icalField = def.sections[0].fields.find((f) => f.id === "icalUrl");
    expect(icalField?.isVisible).toBe(false);
  });

  it("shows connectionPicker when provider is google", () => {
    const def = getInspectorDefinition(makeConfig({ provider: "google" }), makeContext());
    const connField = def.sections[0].fields.find((f) => f.kind === "connectionPicker");
    expect(connField).toBeDefined();
    expect(connField?.isVisible).not.toBe(false);
  });

  it("hides connectionPicker when provider is ical", () => {
    const def = getInspectorDefinition(makeConfig({ provider: "ical" }), makeContext());
    const connField = def.sections[0].fields.find((f) => f.kind === "connectionPicker");
    expect(connField?.isVisible).toBe(false);
  });

  it("connectionPicker field has onConnect callback", () => {
    const onConnect = vi.fn();
    const def = getInspectorDefinition(
      makeConfig({ provider: "google" }),
      makeContext({ onConnect }),
    );
    const connField = def.sections[0].fields.find((f) => f.kind === "connectionPicker");
    expect(connField?.onConnect).toBe(onConnect);
  });
});

describe("getInspectorDefinition — Calendar section", () => {
  it("is hidden when provider is ical", () => {
    const def = getInspectorDefinition(makeConfig({ provider: "ical" }), makeContext());
    expect(def.sections[1].isVisible).toBe(false);
  });

  it("is visible when provider is google (even without a connection)", () => {
    const def = getInspectorDefinition(makeConfig({ provider: "google" }), makeContext());
    expect(def.sections[1].isVisible).not.toBe(false);
  });

  it("resourcePicker field is disabled when no connection is selected", () => {
    const def = getInspectorDefinition(
      makeConfig({ provider: "google", integrationConnectionId: undefined }),
      makeContext(),
    );
    const calField = def.sections[1].fields.find((f) => f.kind === "resourcePicker");
    expect(calField?.isDisabled).toBe(true);
  });

  it("resourcePicker field is enabled when a connection is selected", () => {
    const def = getInspectorDefinition(
      makeConfig({ provider: "google", integrationConnectionId: "conn-1" }),
      makeContext({ calendars: [{ id: "cal-1", label: "Work" }] }),
    );
    const calField = def.sections[1].fields.find((f) => f.kind === "resourcePicker");
    expect(calField?.isDisabled).toBe(false);
  });

  it("uses primary calendar as displayValue when calendarId is undefined", () => {
    const def = getInspectorDefinition(
      makeConfig({ provider: "google", integrationConnectionId: "conn-1", calendarId: undefined }),
      makeContext(),
    );
    const calField = def.sections[1].fields.find((f) => f.kind === "resourcePicker");
    expect(calField?.displayValue).toBe("Primary calendar");
  });

  it("has a Refresh calendars section-level action", () => {
    const def = getInspectorDefinition(makeConfig({ provider: "google" }), makeContext());
    const actions = def.sections[1].actions ?? [];
    expect(actions.some((a) => a.label === "Refresh calendars")).toBe(true);
  });
});

describe("getInspectorDefinition — Display section", () => {
  it("includes timeWindow, includeAllDay, maxEvents fields", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const displaySection = def.sections[2];
    const ids = displaySection.fields.map((f) => f.id);
    expect(ids).toContain("timeWindow");
    expect(ids).toContain("includeAllDay");
    expect(ids).toContain("maxEvents");
  });

  it("timeWindow field is segmented kind", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[2].fields.find((f) => f.id === "timeWindow");
    expect(field?.kind).toBe("segmented");
  });

  it("includeAllDay field is boolean kind", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[2].fields.find((f) => f.id === "includeAllDay");
    expect(field?.kind).toBe("boolean");
  });

  it("maxEvents field is segmented kind", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[2].fields.find((f) => f.id === "maxEvents");
    expect(field?.kind).toBe("segmented");
  });

  it("timeWindow displayValue is human-readable, not raw enum", () => {
    const def = getInspectorDefinition(makeConfig({ timeWindow: "next7d" }), makeContext());
    const field = def.sections[2].fields.find((f) => f.id === "timeWindow");
    expect(field?.displayValue).toBe("Next 7 days");
    expect(field?.displayValue).not.toBe("next7d");
  });

  it("includeAllDay displayValue is Yes or No, not raw boolean", () => {
    const defTrue = getInspectorDefinition(makeConfig({ includeAllDay: true }), makeContext());
    const fieldTrue = defTrue.sections[2].fields.find((f) => f.id === "includeAllDay");
    expect(fieldTrue?.displayValue).toBe("Yes");
    expect(fieldTrue?.displayValue).not.toBe("true");

    const defFalse = getInspectorDefinition(makeConfig({ includeAllDay: false }), makeContext());
    const fieldFalse = defFalse.sections[2].fields.find((f) => f.id === "includeAllDay");
    expect(fieldFalse?.displayValue).toBe("No");
  });

  it("maxEvents options are 5, 10, 15, 20", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const field = def.sections[2].fields.find((f) => f.id === "maxEvents");
    const values = field?.options?.map((o) => o.value) ?? [];
    expect(values).toEqual([5, 10, 15, 20]);
  });
});

describe("getInspectorDefinition — no layout or ID leakage", () => {
  it("contains no field with id 'widgetInstanceId' or 'id'", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    const allFields = def.sections.flatMap((s) => s.fields);
    const ids = allFields.map((f) => f.id);
    expect(ids).not.toContain("widgetInstanceId");
    expect(ids).not.toContain("id");
  });

  it("contains no layout section", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    expect(def.sections.map((s) => s.id)).not.toContain("layout");
  });
});
