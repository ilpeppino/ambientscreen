import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockListIntegrationProviders: vi.fn(),
  mockGetIntegrationProviderAuthorizationUrl: vi.fn(),
  mockOpenURL: vi.fn(),
}));

vi.mock("../src/features/integrations/integrations.hooks", () => ({
  useIntegrations: () => ({
    connections: [],
    loading: false,
    error: null,
    reload: vi.fn(),
    rename: vi.fn(),
    refresh: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock("../src/features/integrations/IntegrationConnectionTile", () => ({
  IntegrationConnectionTile: () => React.createElement("view", { accessibilityLabel: "connection-tile" }),
}));

vi.mock("../src/features/integrations/IntegrationProviderPicker", () => ({
  IntegrationProviderPicker: ({
    providers,
    loading,
    error,
    onSelect,
  }: {
    providers: Array<{ key: string; label: string; description: string; authType: string }>;
    loading: boolean;
    error: string | null;
    onSelect: (provider: { key: string; label: string; description: string; authType: string }) => void;
  }) =>
    React.createElement(
      "view",
      { accessibilityLabel: "provider-picker" },
      React.createElement("text", null, "Choose a provider"),
      loading ? React.createElement("text", null, "Loading providers") : null,
      error ? React.createElement("text", null, "Something went wrong") : null,
      error ? React.createElement("text", null, error) : null,
      !loading && !error && providers.length > 0
        ? React.createElement("pressable", {
            accessibilityLabel: "Connect",
            onPress: () => onSelect(providers[0]),
          })
        : null,
    ),
}));

vi.mock("../src/shared/ui/management", () => {
  const ReactRuntime = require("react");
  return {
    EmptyPanel: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("view", { accessibilityLabel: "empty-panel", ...props }, props.children),
    ManagementActionButton: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("pressable", {
        accessibilityLabel: String(props.label),
        onPress: props.onPress,
      }, props.children),
    ActionRow: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("view", { accessibilityLabel: "action-row", ...props }, props.children),
    SectionHeader: ({ title, rightAction }: { title: string; rightAction?: React.ReactNode }) =>
      ReactRuntime.createElement(
        "view",
        { accessibilityLabel: "section-header" },
        ReactRuntime.createElement("text", null, title),
        rightAction,
      ),
    SearchBar: () => ReactRuntime.createElement("view", { accessibilityLabel: "search-bar" }),
  };
});

vi.mock("../src/shared/ui/ErrorState", () => {
  const ReactRuntime = require("react");
  return {
    ErrorState: ({ message, onRetry }: { message: string; onRetry?: () => void }) =>
      ReactRuntime.createElement(
        "view",
        { accessibilityLabel: "error-state" },
        ReactRuntime.createElement("text", null, "Something went wrong"),
        ReactRuntime.createElement("text", null, message),
        onRetry ? ReactRuntime.createElement("pressable", { accessibilityLabel: "Retry", onPress: onRetry }) : null,
      ),
  };
});

vi.mock("../src/shared/ui/components/Text", () => {
  const ReactRuntime = require("react");
  return {
    Text: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("text", props, props.children),
  };
});

vi.mock("../src/shared/ui/theme", () => ({
  colors: {
    backgroundPrimary: "#000",
    statusSuccessBg: "#000",
    statusSuccessBorder: "#000",
    statusWarningBg: "#000",
    statusWarningBorder: "#000",
    textPrimary: "#fff",
  },
  spacing: { lg: 24, md: 16, sm: 8 },
}));

vi.mock("../src/services/api/integrationsApi", () => ({
  listIntegrationProviders: (...args: unknown[]) => mocks.mockListIntegrationProviders(...args),
  getIntegrationProviderAuthorizationUrl: (...args: unknown[]) =>
    mocks.mockGetIntegrationProviderAuthorizationUrl(...args),
  getGoogleConnectUrl: vi.fn(async () => "https://accounts.google.com/o/oauth2/v2/auth"),
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
    useWindowDimensions: () => ({ width: 1280, height: 720, scale: 1, fontScale: 1 }),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("IntegrationsScreen", () => {
  test("Add Connection loads providers before starting OAuth", async () => {
    mocks.mockListIntegrationProviders.mockResolvedValue([
      {
        key: "google",
        label: "Google",
        description: "Connect a Google account to access calendar resources.",
        authType: "oauth",
      },
    ]);
    mocks.mockGetIntegrationProviderAuthorizationUrl.mockResolvedValue(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );

    const { IntegrationsScreen } = await import("../src/features/integrations/IntegrationsScreen");
    const tree = TestRenderer.create(React.createElement(IntegrationsScreen, { onBack: vi.fn() }));

    const addButton = tree.root.findByProps({ accessibilityLabel: "Add Connection" });

    await act(async () => {
      addButton.props.onPress();
      await Promise.resolve();
    });
    await flush();

    expect(mocks.mockListIntegrationProviders).toHaveBeenCalledTimes(1);
    expect(tree.root.findByProps({ children: "Choose a provider" })).toBeTruthy();

    const connectButton = tree.root.findByProps({ accessibilityLabel: "Connect" });
    await act(async () => {
      connectButton.props.onPress();
      await Promise.resolve();
    });

    expect(mocks.mockGetIntegrationProviderAuthorizationUrl).toHaveBeenCalledWith("google", undefined);
    expect(mocks.mockOpenURL).toHaveBeenCalledWith("https://accounts.google.com/o/oauth2/v2/auth");
  });

  test("provider load failure shows a safe error state", async () => {
    mocks.mockListIntegrationProviders.mockRejectedValue(new Error("Network unavailable"));

    const { IntegrationsScreen } = await import("../src/features/integrations/IntegrationsScreen");
    const tree = TestRenderer.create(React.createElement(IntegrationsScreen, { onBack: vi.fn() }));

    const addButton = tree.root.findByProps({ accessibilityLabel: "Add Connection" });

    await act(async () => {
      addButton.props.onPress();
      await Promise.resolve();
    });
    await flush();

    expect(tree.root.findAllByProps({ children: "Something went wrong" }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ children: "Network unavailable" }).length).toBeGreaterThan(0);
  });
});
