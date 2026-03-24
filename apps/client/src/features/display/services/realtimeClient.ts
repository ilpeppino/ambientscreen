import { getApiAuthToken } from "../../../services/api/apiClient";

export type RealtimeEventType =
  | "profile.updated"
  | "widget.created"
  | "widget.updated"
  | "widget.deleted"
  | "layout.updated"
  | "display.refreshRequested";

export interface RealtimeEvent {
  type: RealtimeEventType;
  profileId: string;
  widgetId?: string;
  timestamp: string;
}

export type RealtimeConnectionState = "connecting" | "connected" | "disconnected" | "error";

type WebSocketLike = {
  onopen: ((event: unknown) => void) | null;
  onclose: ((event: { code?: number; reason?: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  close: () => void;
  send: (payload: string) => void;
};

type WebSocketFactory = (url: string) => WebSocketLike;

interface RealtimeClientOptions {
  apiBaseUrl: string;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  websocketFactory?: WebSocketFactory;
  onEvent: (event: RealtimeEvent) => void;
  onConnectionStateChange: (state: RealtimeConnectionState) => void;
}

interface RealtimeClient {
  connect: () => void;
  disconnect: () => void;
  setProfileId: (profileId: string | null) => void;
}

const DEFAULT_RECONNECT_DELAY_MS = 1000;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 30000;
const SUPPORTED_EVENT_TYPES = new Set<RealtimeEventType>([
  "profile.updated",
  "widget.created",
  "widget.updated",
  "widget.deleted",
  "layout.updated",
  "display.refreshRequested",
]);

export function buildRealtimeUrl(apiBaseUrl: string, profileId: string | null, token: string | null): string {
  const url = new URL(apiBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/realtime";
  url.search = "";

  if (token) {
    url.searchParams.set("token", token);
  }

  if (profileId) {
    url.searchParams.set("profileId", profileId);
  }

  return url.toString();
}

function parseRealtimeEvent(rawData: string): RealtimeEvent | null {
  try {
    const parsed = JSON.parse(rawData) as Partial<RealtimeEvent>;

    if (
      typeof parsed.type !== "string"
      || typeof parsed.profileId !== "string"
      || typeof parsed.timestamp !== "string"
    ) {
      return null;
    }
    if (!SUPPORTED_EVENT_TYPES.has(parsed.type as RealtimeEventType)) {
      return null;
    }

    return {
      type: parsed.type as RealtimeEventType,
      profileId: parsed.profileId,
      timestamp: parsed.timestamp,
      ...(typeof parsed.widgetId === "string" ? { widgetId: parsed.widgetId } : {}),
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

export function createRealtimeClient(options: RealtimeClientOptions): RealtimeClient {
  const reconnectDelayMs = options.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS;
  const maxReconnectDelayMs = options.maxReconnectDelayMs ?? DEFAULT_MAX_RECONNECT_DELAY_MS;
  const websocketFactory = options.websocketFactory ?? defaultWebSocketFactory;

  let socket: WebSocketLike | null = null;
  let activeProfileId: string | null = null;
  let shouldReconnect = true;
  let reconnectAttempt = 0;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  function setState(state: RealtimeConnectionState) {
    options.onConnectionStateChange(state);
  }

  function clearReconnectTimeout() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  }

  function sendSubscription() {
    if (!socket || !activeProfileId) {
      return;
    }

    socket.send(
      JSON.stringify({
        type: "subscribe",
        profileId: activeProfileId,
      }),
    );
  }

  function scheduleReconnect() {
    if (!shouldReconnect || reconnectTimeout) {
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

    if (socket) {
      socket.close();
      socket = null;
    }

    setState("connecting");

    const url = buildRealtimeUrl(options.apiBaseUrl, activeProfileId, getApiAuthToken());
    const nextSocket = websocketFactory(url);
    socket = nextSocket;

    nextSocket.onopen = () => {
      reconnectAttempt = 0;
      setState("connected");
      sendSubscription();
    };

    nextSocket.onmessage = (event) => {
      const parsed = parseRealtimeEvent(event.data);
      if (!parsed) {
        return;
      }

      options.onEvent(parsed);
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
    setProfileId(profileId: string | null) {
      activeProfileId = profileId;
      sendSubscription();
    },
  };
}
