import { describe, expect, it, vi } from "vitest";
import { getInspectorDefinition } from "../src/widgets/emailFeed/inspector";
import type { EmailFeedConfig, EmailFeedInspectorContext } from "../src/widgets/emailFeed/inspector";

function makeContext(overrides: Partial<EmailFeedInspectorContext> = {}): EmailFeedInspectorContext {
  return {
    connections: [],
    labels: [],
    labelsLoading: false,
    onConnect: vi.fn(),
    onSelectConnection: vi.fn(),
    onChange: vi.fn(),
    ...overrides,
  };
}

function makeConfig(overrides: Partial<EmailFeedConfig> = {}): EmailFeedConfig {
  return {
    provider: "gmail",
    integrationConnectionId: "",
    label: "INBOX",
    customLabel: "",
    onlyUnread: true,
    showPreview: false,
    maxItems: 8,
    ...overrides,
  };
}

describe("email feed inspector definition", () => {
  it("returns Connection, Mailbox, Display sections in canonical order", () => {
    const definition = getInspectorDefinition(makeConfig(), makeContext());
    expect(definition.sections).toHaveLength(3);
    expect(definition.sections.map((section) => section.id)).toEqual(["connection", "resource", "display"]);
  });

  it("disables custom label picker until Gmail connection is selected", () => {
    const definition = getInspectorDefinition(
      makeConfig({ label: "CUSTOM", integrationConnectionId: "" }),
      makeContext(),
    );

    const customLabelField = definition.sections[1].fields.find((field) => field.id === "customLabel");
    expect(customLabelField?.isVisible).toBe(true);
    expect(customLabelField?.isDisabled).toBe(true);
  });

  it("wires immediate onChange handlers without save actions", () => {
    const onChange = vi.fn();
    const onSelectConnection = vi.fn();

    const definition = getInspectorDefinition(
      makeConfig({ integrationConnectionId: "conn-1" }),
      makeContext({ onChange, onSelectConnection }),
    );

    const unreadField = definition.sections[2].fields.find((field) => field.id === "onlyUnread");
    unreadField?.onChange?.(false as never);
    expect(onChange).toHaveBeenCalledWith({ onlyUnread: false });

    const connectionField = definition.sections[0].fields.find((field) => field.id === "integrationConnectionId");
    connectionField?.onChange?.("conn-2" as never);
    expect(onSelectConnection).toHaveBeenCalledWith("conn-2");

    const allActions = definition.sections.flatMap((section) => section.actions ?? []);
    expect(allActions.some((action) => /save/i.test(action.label))).toBe(false);
  });
});
