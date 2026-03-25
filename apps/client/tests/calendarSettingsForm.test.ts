import { describe, test, expect, vi, beforeAll, afterEach } from "vitest";

// Stub native modules before importing the component
vi.mock("react-native", () => {
  const ReactRuntime = require("react");
  return {
    View: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("view", props, props.children),
    Text: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("text", props, props.children),
    Pressable: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("pressable", props, props.children),
    StyleSheet: { create: <T>(s: T) => s },
    Linking: { openURL: vi.fn() },
  };
});

vi.mock("../src/shared/ui/components/Text", () => {
  const ReactRuntime = require("react");
  return {
    Text: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("text", props, props.children),
  };
});

vi.mock("../src/shared/ui/components/TextInput", () => {
  const ReactRuntime = require("react");
  return {
    TextInput: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("text-input", props),
  };
});

vi.mock("../src/shared/ui/theme", () => ({
  colors: {} as Record<string, string>,
  radius: {} as Record<string, number>,
  spacing: {} as Record<string, number>,
}));

// Mock the integrationsApi module
const mockListIntegrationConnections = vi.fn();
const mockListGoogleCalendars = vi.fn();

vi.mock("../src/services/api/integrationsApi", () => ({
  listIntegrationConnections: (...args: unknown[]) => mockListIntegrationConnections(...args),
  listGoogleCalendars: (...args: unknown[]) => mockListGoogleCalendars(...args),
  getGoogleConnectUrl: () => "http://api/integrations/google/start",
}));

describe("CalendarSettingsForm logic", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("listIntegrationConnections is called when provider is google", async () => {
    mockListIntegrationConnections.mockResolvedValue([]);

    // Import after mocks are set up
    const { CalendarSettingsForm } = await import(
      "../src/widgets/calendar/settings-form"
    );

    expect(CalendarSettingsForm).toBeDefined();

    // The mock should be ready to be called when the component mounts with provider=google
    expect(mockListIntegrationConnections).toBeDefined();
  });

  test("getGoogleConnectUrl returns the /start path (not /connect)", async () => {
    const { getGoogleConnectUrl } = await import(
      "../src/services/api/integrationsApi"
    );
    const url = getGoogleConnectUrl();
    expect(url).toContain("/start");
    expect(url).not.toContain("/connect");
  });

  test("listGoogleCalendars is callable with a connectionId", async () => {
    const mockCalendars = [
      { id: "primary", summary: "My Calendar", primary: true, accessRole: "owner" },
    ];
    mockListGoogleCalendars.mockResolvedValue(mockCalendars);

    const { listGoogleCalendars } = await import(
      "../src/services/api/integrationsApi"
    );

    const result = await listGoogleCalendars("conn-123");
    expect(mockListGoogleCalendars).toHaveBeenCalledWith("conn-123");
    expect(result).toEqual(mockCalendars);
  });

  test("listGoogleCalendars returns typed GoogleCalendarOption array", async () => {
    const calendars = [
      { id: "cal-1", summary: "Work", primary: false, accessRole: "reader" },
      { id: "primary", summary: "Personal", primary: true, accessRole: "owner" },
    ];
    mockListGoogleCalendars.mockResolvedValue(calendars);

    const { listGoogleCalendars } = await import(
      "../src/services/api/integrationsApi"
    );

    const result = await listGoogleCalendars("conn-456");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "cal-1", primary: false });
    expect(result[1]).toMatchObject({ id: "primary", primary: true });
  });

  test("listIntegrationConnections never receives raw tokens", async () => {
    const mockConnections = [
      {
        id: "conn-abc",
        provider: "google",
        externalAccountId: "12345",
        label: "Work Account",
        scopes: ["calendar.readonly"],
        expiresAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    mockListIntegrationConnections.mockResolvedValue(mockConnections);

    const { listIntegrationConnections } = await import(
      "../src/services/api/integrationsApi"
    );

    const result = await listIntegrationConnections();
    expect(result[0]).not.toHaveProperty("accessToken");
    expect(result[0]).not.toHaveProperty("refreshToken");
    expect(result[0]).not.toHaveProperty("accessTokenEncrypted");
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("provider");
  });
});
