import type { RemoteCommand } from "@ambient/shared-contracts";
import { getApiAuthToken } from "../../../services/api/apiClient";

type WebSocketLike = {
  onopen: ((event: unknown) => void) | null;
  onclose: ((event: { code?: number; reason?: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  close: () => void;
  send: (payload: string) => void;
};

type WebSocketFactory = (url: string) => WebSocketLike;

export type RemoteCommandConnectionState = "connecting" | "connected" | "disconnected" | "error";

interface DeviceCommandEvent {
  scope: "device";
  type: "device.command";
  deviceId: string;
  timestamp: string;
  command: RemoteCommand;
}

interface RemoteCommandClientOptions {
  apiBaseUrl: string;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  websocketFactory?: WebSocketFactory;
  onCommand: (command: RemoteCommand) => void;
  onConnectionStateChange: (state: RemoteCommandConnectionState) => void;
}

interface RemoteCommandClient {
  connect: () => void;
  disconnect: () => void;
  setDeviceId: (deviceId: string | null) => void;
}

const DEFAULT_RECONNECT_DELAY_MS = 1000;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 30000;

function isRemoteCommand(value: unknown): value is RemoteCommand {
  if (typeof value !== "object" || !value) {
    return false;
  }

  const parsed = value as Partial<RemoteCommand>;
  if (parsed.type === "REFRESH") {
    return true;
  }

  if (parsed.type === "SET_PROFILE") {
    return typeof parsed.profileId === "string" && parsed.profileId.trim().length > 0;
  }

  if (parsed.type === "SET_SLIDESHOW") {
    return typeof parsed.enabled === "boolean";
  }

  return false;
}

function parseDeviceCommandEvent(rawData: string): DeviceCommandEvent | null {
  try {
    const parsed = JSON.parse(rawData) as Partial<DeviceCommandEvent>;
    if (
      parsed.scope !== "device"
      || parsed.type !== "device.command"
      || typeof parsed.deviceId !== "string"
      || typeof parsed.timestamp !== "string"
      || !isRemoteCommand(parsed.command)
    ) {
      return null;
    }

    return {
      scope: "device",
      type: "device.command",
      deviceId: parsed.deviceId,
      timestamp: parsed.timestamp,
      command: parsed.command,
    };
  } catch {
    return null;
  }
}

function defaultWebSocketFactory(url: string): WebSocketLike {
  const webSocketConstructor = (globalThis as unknown as {
    WebSocket?: new (wsUrl: string) => unknown;
  }).WebSocket;

  if (!webSocketConstructor) {
    throw new Error("WebSocket is not available in this runtime.");
  }

  return new webSocketConstructor(url) as WebSocketLike;
}

function buildRemoteCommandRealtimeUrl(apiBaseUrl: string, deviceId: string | null, token: string | null): string {
  const url = new URL(apiBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/realtime";
  url.search = "";

  if (token) {
    url.searchParams.set("token", token);
  }

  if (deviceId) {
    url.searchParams.set("deviceId", deviceId);
  }

  return url.toString();
}

export function createRemoteCommandClient(options: RemoteCommandClientOptions): RemoteCommandClient {
  const reconnectDelayMs = options.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS;
  const maxReconnectDelayMs = options.maxReconnectDelayMs ?? DEFAULT_MAX_RECONNECT_DELAY_MS;
  const websocketFactory = options.websocketFactory ?? defaultWebSocketFactory;

  let socket: WebSocketLike | null = null;
  let activeDeviceId: string | null = null;
  let shouldReconnect = true;
  let reconnectAttempt = 0;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  function setState(state: RemoteCommandConnectionState) {
    options.onConnectionStateChange(state);
  }

  function clearReconnectTimeout() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  }

  function sendSubscription() {
    if (!socket || !activeDeviceId) {
      return;
    }

    socket.send(
      JSON.stringify({
        type: "subscribeDevice",
        deviceId: activeDeviceId,
      }),
    );
  }

  function scheduleReconnect() {
    if (!shouldReconnect || reconnectTimeout || !activeDeviceId) {
      return;
    }

    const delay = Math.min(reconnectDelayMs * (2 ** reconnectAttempt), maxReconnectDelayMs);
    reconnectAttempt += 1;

    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      connectInternal();
    }, delay);
  }

  function connectInternal() {
    clearReconnectTimeout();

    if (!activeDeviceId) {
      setState("disconnected");
      return;
    }

    if (socket) {
      socket.close();
      socket = null;
    }

    setState("connecting");
    const url = buildRemoteCommandRealtimeUrl(options.apiBaseUrl, activeDeviceId, getApiAuthToken());
    const nextSocket = websocketFactory(url);
    socket = nextSocket;

    nextSocket.onopen = () => {
      reconnectAttempt = 0;
      setState("connected");
      sendSubscription();
    };

    nextSocket.onmessage = (event) => {
      const parsed = parseDeviceCommandEvent(event.data);
      if (!parsed || parsed.deviceId !== activeDeviceId) {
        return;
      }

      options.onCommand(parsed.command);
    };

    nextSocket.onerror = () => {
      setState("error");
    };

    nextSocket.onclose = () => {
      socket = null;
      setState("disconnected");
      scheduleReconnect();
    };
  }

  return {
    connect() {
      shouldReconnect = true;
      connectInternal();
    },
    disconnect() {
      shouldReconnect = false;
      clearReconnectTimeout();

      if (socket) {
        const closingSocket = socket;
        socket = null;
        closingSocket.close();
      }

      setState("disconnected");
    },
    setDeviceId(deviceId: string | null) {
      activeDeviceId = deviceId;
      sendSubscription();
    },
  };
}
