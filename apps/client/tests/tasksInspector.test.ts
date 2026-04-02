import { describe, expect, it, vi } from "vitest";
import { getInspectorDefinition } from "../src/widgets/tasks/inspector";
import type { TasksConfig, TasksInspectorContext } from "../src/widgets/tasks/inspector";

function makeContext(overrides: Partial<TasksInspectorContext> = {}): TasksInspectorContext {
  return {
    connections: [],
    taskLists: [],
    onConnect: vi.fn(),
    onSelectConnection: vi.fn(),
    onSelectTaskLists: vi.fn(),
    onChange: vi.fn(),
    ...overrides,
  };
}

function makeConfig(overrides: Partial<TasksConfig> = {}): TasksConfig {
  return {
    provider: "google-tasks",
    integrationConnectionId: "",
    selectedTaskListIds: [],
    displayMode: "list",
    maxItems: 5,
    showCompleted: false,
    ...overrides,
  };
}

describe("tasks inspector definition", () => {
  it("returns 3 sections in canonical order", () => {
    const definition = getInspectorDefinition(makeConfig(), makeContext());
    expect(definition.sections).toHaveLength(3);
    expect(definition.sections.map((section) => section.id)).toEqual(["connection", "resource", "display"]);
  });

  it("disables task list selection until a connection is selected", () => {
    const definition = getInspectorDefinition(makeConfig({ integrationConnectionId: "" }), makeContext());
    const listField = definition.sections[1].fields.find((field) => field.id === "selectedTaskListIds");
    expect(listField?.isDisabled).toBe(true);
  });

  it("uses multi-select optionList for task list selection", () => {
    const definition = getInspectorDefinition(
      makeConfig({ integrationConnectionId: "conn-1", selectedTaskListIds: ["work"] }),
      makeContext({ taskLists: [{ id: "work", label: "Work" }] }),
    );

    const listField = definition.sections[1].fields.find((field) => field.id === "selectedTaskListIds");
    expect(listField?.kind).toBe("optionList");
    expect(listField?.selectionMode).toBe("multiple");
    expect(listField?.displayValue).toBe("Work");
  });

  it("wires immediate onChange handlers without save actions", () => {
    const onChange = vi.fn();
    const onSelectTaskLists = vi.fn();
    const definition = getInspectorDefinition(
      makeConfig({ integrationConnectionId: "conn-1" }),
      makeContext({ onChange, onSelectTaskLists }),
    );

    const displayModeField = definition.sections[2].fields.find((field) => field.id === "displayMode");
    displayModeField?.onChange?.("focus" as never);
    expect(onChange).toHaveBeenCalledWith({ displayMode: "focus" });

    const listField = definition.sections[1].fields.find((field) => field.id === "selectedTaskListIds");
    listField?.onChange?.(["work", "home"] as never);
    expect(onSelectTaskLists).toHaveBeenCalledWith(["work", "home"]);

    const allActions = definition.sections.flatMap((section) => section.actions ?? []);
    expect(allActions.some((action) => /save/i.test(action.label))).toBe(false);
  });
});
