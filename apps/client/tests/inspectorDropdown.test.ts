/**
 * Tests for InspectorDropdown and the shared picker components that use it.
 *
 * Strategy: render via react-test-renderer, inspect element tree props,
 * and use act() to simulate interaction (press trigger to open/close).
 */
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, test, vi } from "vitest";
import { InspectorDropdown } from "../src/features/admin/inspector/InspectorDropdown";
import { InspectorConnectionPicker } from "../src/features/admin/inspector/InspectorConnectionPicker";
import { InspectorResourcePicker } from "../src/features/admin/inspector/InspectorResourcePicker";
import { InspectorRenderer } from "../src/features/admin/inspector/InspectorRenderer";
import type { InspectorDefinition } from "../src/features/admin/inspector/inspector.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const OPTIONS = [
  { label: "Option A", value: "a" },
  { label: "Option B", value: "b" },
  { label: "Option C", value: "c" },
];

/** Find all pressables with a given accessibilityRole. */
function findByRole(
  tree: TestRenderer.ReactTestRenderer,
  role: string,
): TestRenderer.ReactTestInstance[] {
  return tree.root.findAll(
    (node) =>
      (node.type as unknown) === "pressable" &&
      node.props.accessibilityRole === role,
  );
}

/** Find all open dropdown option rows (radio pressables inside the options panel). */
function findOptionRows(
  tree: TestRenderer.ReactTestRenderer,
): TestRenderer.ReactTestInstance[] {
  return findByRole(tree, "radio");
}

// ---------------------------------------------------------------------------
// InspectorDropdown — collapsed state
// ---------------------------------------------------------------------------

describe("InspectorDropdown collapsed", () => {
  test("renders a single trigger (combobox) pressable when closed", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorDropdown, {
        options: OPTIONS,
        value: "a",
        onChange: vi.fn(),
      }),
    );
    const triggers = findByRole(tree, "combobox");
    expect(triggers).toHaveLength(1);
    // No option pressables visible yet
    const optionPressables = findOptionRows(tree);
    expect(optionPressables).toHaveLength(0);
  });

  test("trigger shows selected option label when value is set", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorDropdown, {
        options: OPTIONS,
        value: "b",
        onChange: vi.fn(),
      }),
    );
    const trigger = findByRole(tree, "combobox")[0];
    // Find Text children to check the displayed label
    const texts = trigger.findAll((n) => n.type === "text" && typeof n.props.children === "string");
    const labels = texts.map((t) => t.props.children as string);
    expect(labels).toContain("Option B");
  });

  test("trigger shows placeholder when value is null", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorDropdown, {
        options: OPTIONS,
        value: null,
        onChange: vi.fn(),
        placeholder: "Pick one",
      }),
    );
    const trigger = findByRole(tree, "combobox")[0];
    const texts = trigger.findAll((n) => n.type === "text" && typeof n.props.children === "string");
    const labels = texts.map((t) => t.props.children as string);
    expect(labels).toContain("Pick one");
  });

  test("renders empty text (no trigger) when options array is empty", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorDropdown, {
        options: [],
        value: null,
        onChange: vi.fn(),
        placeholder: "Nothing here",
      }),
    );
    // No combobox trigger when empty
    expect(findByRole(tree, "combobox")).toHaveLength(0);
    // Static text rendered instead
    const allPressables = tree.root.findAllByType("pressable" as any);
    expect(allPressables).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// InspectorDropdown — open/close
// ---------------------------------------------------------------------------

describe("InspectorDropdown open/close", () => {
  test("pressing trigger opens the options panel", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorDropdown, {
        options: OPTIONS,
        value: "a",
        onChange: vi.fn(),
      }),
    );

    act(() => {
      findByRole(tree, "combobox")[0].props.onPress();
    });

    const optionPressables = findOptionRows(tree);
    expect(optionPressables).toHaveLength(OPTIONS.length);
  });

  test("all available options are rendered when open", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorDropdown, {
        options: OPTIONS,
        value: null,
        onChange: vi.fn(),
      }),
    );

    act(() => {
      findByRole(tree, "combobox")[0].props.onPress();
    });

    expect(findOptionRows(tree)).toHaveLength(3);
  });

  test("pressing trigger again closes the options panel", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorDropdown, {
        options: OPTIONS,
        value: "a",
        onChange: vi.fn(),
      }),
    );

    // Open
    act(() => {
      findByRole(tree, "combobox")[0].props.onPress();
    });
    expect(findOptionRows(tree)).toHaveLength(OPTIONS.length);

    // Close
    act(() => {
      findByRole(tree, "combobox")[0].props.onPress();
    });
    expect(findOptionRows(tree)).toHaveLength(0);
  });

  test("selecting an option calls onChange with the option value", () => {
    const onChange = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(InspectorDropdown, {
        options: OPTIONS,
        value: "a",
        onChange,
      }),
    );

    act(() => {
      findByRole(tree, "combobox")[0].props.onPress();
    });

    const optionPressables = findOptionRows(tree);
    act(() => {
      // Press "Option C" (index 2)
      optionPressables[2].props.onPress();
    });

    expect(onChange).toHaveBeenCalledWith("c");
  });

  test("selecting an option closes the dropdown", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorDropdown, {
        options: OPTIONS,
        value: "a",
        onChange: vi.fn(),
      }),
    );

    act(() => {
      findByRole(tree, "combobox")[0].props.onPress();
    });

    act(() => {
      findOptionRows(tree)[1].props.onPress();
    });

    // Options panel should be gone
    expect(findOptionRows(tree)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// InspectorDropdown — disabled state
// ---------------------------------------------------------------------------

describe("InspectorDropdown disabled", () => {
  test("disabled: trigger pressable has disabled=true", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorDropdown, {
        options: OPTIONS,
        value: "a",
        onChange: vi.fn(),
        disabled: true,
      }),
    );
    const trigger = findByRole(tree, "combobox")[0];
    expect(trigger.props.disabled).toBe(true);
  });

  test("disabled: options panel does not open on press attempt", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorDropdown, {
        options: OPTIONS,
        value: "a",
        onChange: vi.fn(),
        disabled: true,
      }),
    );

    act(() => {
      findByRole(tree, "combobox")[0].props.onPress();
    });

    // Panel must remain closed
    expect(findOptionRows(tree)).toHaveLength(0);
  });

  test("disabled: accessibilityState reflects disabled", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorDropdown, {
        options: OPTIONS,
        value: null,
        onChange: vi.fn(),
        disabled: true,
      }),
    );
    const trigger = findByRole(tree, "combobox")[0];
    expect(trigger.props.accessibilityState.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// InspectorConnectionPicker with dropdown
// ---------------------------------------------------------------------------

describe("InspectorConnectionPicker", () => {
  test("renders Connect button and dropdown trigger when accounts are available", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorConnectionPicker, {
        options: [
          { label: "Work account", value: "conn-1" },
          { label: "Personal account", value: "conn-2" },
        ],
        value: "conn-1",
        onChange: vi.fn(),
        onConnect: vi.fn(),
      }),
    );

    // Connect button (accessibilityRole="button")
    const connectButtons = findByRole(tree, "button");
    expect(connectButtons).toHaveLength(1);

    // Dropdown trigger (accessibilityRole="combobox")
    const triggers = findByRole(tree, "combobox");
    expect(triggers).toHaveLength(1);
  });

  test("onConnect fires when Connect button is pressed", () => {
    const onConnect = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(InspectorConnectionPicker, {
        options: [{ label: "Work account", value: "conn-1" }],
        value: "conn-1",
        onChange: vi.fn(),
        onConnect,
      }),
    );

    const connectButton = findByRole(tree, "button")[0];
    act(() => {
      connectButton.props.onPress();
    });

    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  test("onChange fires when an account is selected via dropdown", () => {
    const onChange = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(InspectorConnectionPicker, {
        options: [
          { label: "Work account", value: "conn-1" },
          { label: "Personal account", value: "conn-2" },
        ],
        value: null,
        onChange,
        onConnect: vi.fn(),
      }),
    );

    // Open dropdown
    act(() => {
      findByRole(tree, "combobox")[0].props.onPress();
    });

    // Select second account
    act(() => {
      findOptionRows(tree)[1].props.onPress();
    });

    expect(onChange).toHaveBeenCalledWith("conn-2");
  });

  test("shows helper text when no accounts are available", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorConnectionPicker, {
        options: [],
        value: null,
        onChange: vi.fn(),
        onConnect: vi.fn(),
        helperText: "Connect an account to get started",
      }),
    );

    // No dropdown trigger when options is empty
    expect(findByRole(tree, "combobox")).toHaveLength(0);

    // Connect button still visible
    expect(findByRole(tree, "button")).toHaveLength(1);
  });

  test("disabled: Connect button and dropdown trigger are both disabled", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorConnectionPicker, {
        options: [{ label: "Work account", value: "conn-1" }],
        value: "conn-1",
        onChange: vi.fn(),
        onConnect: vi.fn(),
        disabled: true,
      }),
    );

    const allPressables = tree.root.findAllByType("pressable" as any);
    expect(allPressables.every((p) => p.props.disabled === true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// InspectorResourcePicker with dropdown
// ---------------------------------------------------------------------------

describe("InspectorResourcePicker", () => {
  test("shows loading state when loading=true", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorResourcePicker, {
        options: [],
        value: null,
        onChange: vi.fn(),
        loading: true,
      }),
    );
    // No dropdown trigger during loading
    expect(findByRole(tree, "combobox")).toHaveLength(0);
  });

  test("shows empty state when options array is empty and not loading", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorResourcePicker, {
        options: [],
        value: null,
        onChange: vi.fn(),
        loading: false,
        placeholder: "No calendars found",
      }),
    );
    expect(findByRole(tree, "combobox")).toHaveLength(0);
    expect(findOptionRows(tree)).toHaveLength(0);
  });

  test("shows error state when error is provided", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorResourcePicker, {
        options: [],
        value: null,
        onChange: vi.fn(),
        error: "Failed to load resources",
      }),
    );
    expect(findByRole(tree, "combobox")).toHaveLength(0);
  });

  test("renders dropdown trigger when resources are available", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorResourcePicker, {
        options: [
          { label: "Primary calendar", value: "cal-1" },
          { label: "Work calendar", value: "cal-2" },
        ],
        value: "cal-1",
        onChange: vi.fn(),
      }),
    );
    expect(findByRole(tree, "combobox")).toHaveLength(1);
  });

  test("onChange fires when a resource is selected", () => {
    const onChange = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(InspectorResourcePicker, {
        options: [
          { label: "Primary calendar", value: "cal-1" },
          { label: "Work calendar", value: "cal-2" },
        ],
        value: null,
        onChange,
      }),
    );

    act(() => {
      findByRole(tree, "combobox")[0].props.onPress();
    });

    act(() => {
      findOptionRows(tree)[1].props.onPress();
    });

    expect(onChange).toHaveBeenCalledWith("cal-2");
  });

  test("multi-select mode renders button trigger and checkbox options", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorResourcePicker, {
        options: [
          { label: "Primary calendar", value: "cal-1" },
          { label: "Work calendar", value: "cal-2" },
        ],
        value: ["cal-1"],
        selectionMode: "multiple",
        onChange: vi.fn(),
      }),
    );

    expect(findByRole(tree, "button")).toHaveLength(1);

    act(() => {
      findByRole(tree, "button")[0].props.onPress();
    });

    const checkboxes = findByRole(tree, "checkbox");
    expect(checkboxes).toHaveLength(2);
  });

  test("multi-select mode toggles selected resources", () => {
    const onChange = vi.fn();
    const tree = TestRenderer.create(
      React.createElement(InspectorResourcePicker, {
        options: [
          { label: "Primary calendar", value: "cal-1" },
          { label: "Work calendar", value: "cal-2" },
        ],
        value: ["cal-1"],
        selectionMode: "multiple",
        onChange,
      }),
    );

    act(() => {
      findByRole(tree, "button")[0].props.onPress();
    });

    act(() => {
      findByRole(tree, "checkbox")[1].props.onPress();
    });

    expect(onChange).toHaveBeenCalledWith(["cal-1", "cal-2"]);
  });
});

// ---------------------------------------------------------------------------
// InspectorRenderer select field renders dropdown
// ---------------------------------------------------------------------------

describe("InspectorRenderer select field", () => {
  function makeSelectDefinition(): InspectorDefinition {
    return {
      sections: [
        {
          id: "s1",
          title: "Time",
          fields: [
            {
              id: "timezone",
              label: "Time zone",
              kind: "select",
              value: "local",
              editable: true,
              options: [
                { label: "Local", value: "local" },
                { label: "New York (ET)", value: "America/New_York" },
                { label: "London (GMT/BST)", value: "Europe/London" },
              ],
              onChange: vi.fn(),
            },
          ],
        },
      ],
    };
  }

  test("select field renders a dropdown trigger (combobox) in edit mode", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorRenderer, {
        definition: makeSelectDefinition(),
        mode: "edit",
      }),
    );
    expect(findByRole(tree, "combobox")).toHaveLength(1);
  });

  test("select field shows no options before trigger is pressed", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorRenderer, {
        definition: makeSelectDefinition(),
        mode: "edit",
      }),
    );
    expect(findOptionRows(tree)).toHaveLength(0);
  });

  test("select field opens dropdown and shows options on trigger press", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorRenderer, {
        definition: makeSelectDefinition(),
        mode: "edit",
      }),
    );

    act(() => {
      findByRole(tree, "combobox")[0].props.onPress();
    });

    expect(findOptionRows(tree)).toHaveLength(3);
  });

  test("select field in readOnly mode renders no dropdown trigger", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorRenderer, {
        definition: makeSelectDefinition(),
        mode: "readOnly",
      }),
    );
    expect(findByRole(tree, "combobox")).toHaveLength(0);
  });

  test("disabled select field: dropdown trigger is disabled", () => {
    const def: InspectorDefinition = {
      sections: [
        {
          id: "s1",
          title: "Section",
          fields: [
            {
              id: "tz",
              label: "TZ",
              kind: "select",
              value: "local",
              editable: true,
              isDisabled: true,
              options: [{ label: "Local", value: "local" }],
              onChange: vi.fn(),
            },
          ],
        },
      ],
    };
    const tree = TestRenderer.create(
      React.createElement(InspectorRenderer, { definition: def, mode: "edit" }),
    );
    const trigger = findByRole(tree, "combobox")[0];
    expect(trigger.props.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// optionList field kind renders always-visible list (not dropdown)
// ---------------------------------------------------------------------------

describe("InspectorRenderer optionList field", () => {
  test("optionList renders all options as visible radio rows, not a dropdown trigger", () => {
    const def: InspectorDefinition = {
      sections: [
        {
          id: "s1",
          title: "Section",
          fields: [
            {
              id: "list",
              label: "Pick one",
              kind: "optionList",
              value: "a",
              editable: true,
              options: [
                { label: "A", value: "a" },
                { label: "B", value: "b" },
              ],
              onChange: vi.fn(),
            },
          ],
        },
      ],
    };
    const tree = TestRenderer.create(
      React.createElement(InspectorRenderer, { definition: def, mode: "edit" }),
    );
    // No dropdown combobox trigger
    expect(findByRole(tree, "combobox")).toHaveLength(0);
    // All options visible immediately as radio items
    const radios = tree.root.findAll(
      (n) => n.type === ("pressable" as unknown) && n.props.accessibilityRole === "radio",
    );
    expect(radios).toHaveLength(2);
  });
});
