/**
 * Tests for InspectorRenderer global disabled propagation and field-level isDisabled.
 *
 * Strategy: render InspectorRenderer via react-test-renderer and inspect the
 * element tree — specifically the `disabled` prop on <pressable> elements and
 * the `editable` prop on <text-input> elements.
 */
import React from "react";
import TestRenderer from "react-test-renderer";
import { describe, expect, test, vi } from "vitest";
import { InspectorRenderer } from "../src/features/admin/inspector/InspectorRenderer";
import type { InspectorDefinition } from "../src/features/admin/inspector/inspector.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDefinition(overrides?: Partial<InspectorDefinition["sections"][number]>): InspectorDefinition {
  return {
    sections: [
      {
        id: "s1",
        title: "Section",
        fields: [
          {
            id: "seg",
            label: "Segmented",
            kind: "segmented",
            value: "a",
            editable: true,
            options: [
              { label: "A", value: "a" },
              { label: "B", value: "b" },
            ],
            onChange: vi.fn(),
          },
          {
            id: "bool",
            label: "Boolean",
            kind: "boolean",
            value: true,
            editable: true,
            onChange: vi.fn(),
          },
        ],
        actions: [{ label: "Refresh", onClick: vi.fn() }],
        ...overrides,
      },
    ],
  };
}

function makeTextDefinition(): InspectorDefinition {
  return {
    sections: [
      {
        id: "s1",
        title: "Section",
        fields: [
          {
            id: "txt",
            label: "Text",
            kind: "text",
            value: "hello",
            editable: true,
            onChange: vi.fn(),
          },
        ],
      },
    ],
  };
}

/** Collect all `disabled` prop values from rendered <pressable> elements. */
function collectPressableDisabled(tree: TestRenderer.ReactTestRenderer): unknown[] {
  return tree.root.findAllByType("pressable" as any).map((p) => p.props.disabled);
}

// ---------------------------------------------------------------------------
// Global disabled propagation
// ---------------------------------------------------------------------------

describe("InspectorRenderer global disabled", () => {
  test("without disabled prop, pressable controls are not disabled", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorRenderer, { definition: makeDefinition(), mode: "edit" }),
    );
    const disabledValues = collectPressableDisabled(tree);
    expect(disabledValues.length).toBeGreaterThan(0);
    expect(disabledValues.every((v) => v !== true)).toBe(true);
  });

  test("disabled=true propagates to all segmented control pressables", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorRenderer, {
        definition: makeDefinition(),
        mode: "edit",
        disabled: true,
      }),
    );
    const disabledValues = collectPressableDisabled(tree);
    expect(disabledValues.length).toBeGreaterThan(0);
    expect(disabledValues.every((v) => v === true)).toBe(true);
  });

  test("disabled=true propagates to boolean control pressables", () => {
    const def: InspectorDefinition = {
      sections: [
        {
          id: "s1",
          title: "Section",
          fields: [
            { id: "bool", label: "Bool", kind: "boolean", value: false, editable: true, onChange: vi.fn() },
          ],
        },
      ],
    };
    const tree = TestRenderer.create(
      React.createElement(InspectorRenderer, { definition: def, mode: "edit", disabled: true }),
    );
    const pressables = tree.root.findAllByType("pressable" as any);
    expect(pressables.length).toBe(2); // yes / no segments
    expect(pressables.every((p) => p.props.disabled === true)).toBe(true);
  });

  test("disabled=true sets editable=false on text input", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorRenderer, {
        definition: makeTextDefinition(),
        mode: "edit",
        disabled: true,
      }),
    );
    const input = tree.root.findByType("text-input" as any);
    expect(input.props.editable).toBe(false);
  });

  test("disabled=false leaves text input editable", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorRenderer, {
        definition: makeTextDefinition(),
        mode: "edit",
        disabled: false,
      }),
    );
    const input = tree.root.findByType("text-input" as any);
    expect(input.props.editable).toBe(true);
  });

  test("disabled=true disables section actions", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorRenderer, {
        definition: makeDefinition(),
        mode: "edit",
        disabled: true,
      }),
    );
    const pressables = tree.root.findAllByType("pressable" as any);
    // All pressables (field controls + section action) must be disabled
    expect(pressables.every((p) => p.props.disabled === true)).toBe(true);
  });

  test("section actions are not disabled when disabled=false", () => {
    const tree = TestRenderer.create(
      React.createElement(InspectorRenderer, {
        definition: makeDefinition(),
        mode: "edit",
        disabled: false,
      }),
    );
    const pressables = tree.root.findAllByType("pressable" as any);
    expect(pressables.every((p) => p.props.disabled !== true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Field-level isDisabled
// ---------------------------------------------------------------------------

describe("InspectorRenderer field-level isDisabled", () => {
  test("field isDisabled=true disables its controls without global disabled", () => {
    const def: InspectorDefinition = {
      sections: [
        {
          id: "s1",
          title: "Section",
          fields: [
            {
              id: "seg",
              label: "Seg",
              kind: "segmented",
              value: "a",
              editable: true,
              isDisabled: true,
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
    const pressables = tree.root.findAllByType("pressable" as any);
    expect(pressables.length).toBe(2);
    expect(pressables.every((p) => p.props.disabled === true)).toBe(true);
  });

  test("field isDisabled=false with global disabled=true → still disabled (global wins)", () => {
    const def: InspectorDefinition = {
      sections: [
        {
          id: "s1",
          title: "Section",
          fields: [
            {
              id: "bool",
              label: "Bool",
              kind: "boolean",
              value: true,
              editable: true,
              isDisabled: false,
              onChange: vi.fn(),
            },
          ],
        },
      ],
    };
    const tree = TestRenderer.create(
      React.createElement(InspectorRenderer, { definition: def, mode: "edit", disabled: true }),
    );
    const pressables = tree.root.findAllByType("pressable" as any);
    expect(pressables.every((p) => p.props.disabled === true)).toBe(true);
  });

  test("field isDisabled only affects its own controls, not siblings", () => {
    // Field 1: segmented with isDisabled=true  → 2 pressables, both disabled
    // Field 2: boolean with no isDisabled      → 2 pressables, neither disabled
    // No section actions to avoid counting ambiguity
    const def: InspectorDefinition = {
      sections: [
        {
          id: "s1",
          title: "Section",
          fields: [
            {
              id: "f1",
              label: "F1",
              kind: "segmented",
              value: "a",
              editable: true,
              isDisabled: true,
              options: [
                { label: "A", value: "a" },
                { label: "B", value: "b" },
              ],
              onChange: vi.fn(),
            },
            {
              id: "f2",
              label: "F2",
              kind: "boolean",
              value: true,
              editable: true,
              onChange: vi.fn(),
            },
          ],
        },
      ],
    };
    const tree = TestRenderer.create(
      React.createElement(InspectorRenderer, { definition: def, mode: "edit" }),
    );
    const pressables = tree.root.findAllByType("pressable" as any);
    // pressables[0], [1] = F1 segmented (disabled)
    // pressables[2], [3] = F2 boolean yes/no (not disabled)
    expect(pressables).toHaveLength(4);
    expect(pressables[0].props.disabled).toBe(true);
    expect(pressables[1].props.disabled).toBe(true);
    expect(pressables[2].props.disabled).not.toBe(true);
    expect(pressables[3].props.disabled).not.toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Read-only mode is unaffected by disabled
// ---------------------------------------------------------------------------

describe("InspectorRenderer read-only mode", () => {
  test("disabled=true in readOnly mode does not crash and renders no pressables", () => {
    const def: InspectorDefinition = {
      sections: [
        {
          id: "s1",
          title: "Section",
          fields: [
            { id: "seg", label: "Seg", kind: "segmented", value: "a", editable: true, displayValue: "A", onChange: vi.fn() },
          ],
        },
      ],
    };
    const tree = TestRenderer.create(
      React.createElement(InspectorRenderer, { definition: def, mode: "readOnly", disabled: true }),
    );
    // In readOnly mode, fields render as read-only text, no interactive pressables
    const pressables = tree.root.findAllByType("pressable" as any);
    expect(pressables).toHaveLength(0);
  });
});
