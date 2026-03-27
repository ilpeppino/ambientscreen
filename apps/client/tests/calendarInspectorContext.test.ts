import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockListIntegrationConnections: vi.fn(),
  mockListGoogleCalendars: vi.fn(),
  mockGetIntegrationProviderAuthorizationUrl: vi.fn(),
  mockOpenURL: vi.fn(),
}));

vi.mock("../src/services/api/integrationsApi", () => ({
  listIntegrationConnections: (...args: unknown[]) => mocks.mockListIntegrationConnections(...args),
  listGoogleCalendars: (...args: unknown[]) => mocks.mockListGoogleCalendars(...args),
  getIntegrationProviderAuthorizationUrl: (...args: unknown[]) =>
    mocks.mockGetIntegrationProviderAuthorizationUrl(...args),
}));

vi.mock("react-native", () => {
  const ReactRuntime = require("react");
  return {
    View: (props: Record<string, unknown>) => ReactRuntime.createElement("view", props, props.children),
    Text: (props: Record<string, unknown>) => ReactRuntime.createElement("text", props, props.children),
    Pressable: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("pressable", props, props.children),
    ScrollView: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("scroll-view", props, props.children),
    StyleSheet: { create: (styles: Record<string, unknown>) => styles },
    Linking: { openURL: mocks.mockOpenURL },
    Platform: { OS: "web" },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

let useCalendarInspectorContext: typeof import("../src/widgets/calendar/useCalendarInspectorContext").useCalendarInspectorContext;

beforeAll(async () => {
  ({ useCalendarInspectorContext } = await import("../src/widgets/calendar/useCalendarInspectorContext"));
});

describe("useCalendarInspectorContext", () => {
  test("onConnect uses the shared authenticated provider-start helper", async () => {
    mocks.mockListIntegrationConnections.mockResolvedValue([]);
    mocks.mockListGoogleCalendars.mockResolvedValue([]);
    mocks.mockGetIntegrationProviderAuthorizationUrl.mockResolvedValue(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );

    let latestContext: any = null;

    function Harness() {
      latestContext = useCalendarInspectorContext({
        connectionId: undefined,
        onChange: vi.fn(),
      });
      return React.createElement("view", null);
    }

    TestRenderer.create(React.createElement(Harness));
    await act(async () => {
      await Promise.resolve();
    });

    expect(latestContext).toBeTruthy();
    latestContext?.onConnect();
    await act(async () => {
      await Promise.resolve();
    });

    expect(mocks.mockGetIntegrationProviderAuthorizationUrl).toHaveBeenCalledWith("google", undefined);
    expect(mocks.mockOpenURL).toHaveBeenCalledWith("https://accounts.google.com/o/oauth2/v2/auth");
  });
});
