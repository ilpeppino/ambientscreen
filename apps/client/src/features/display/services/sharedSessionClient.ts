export type SharedSessionRealtimeEventType =
  | "sharedSession.updated"
  | "sharedSession.profileChanged"
  | "sharedSession.rotationAdvanced"
  | "sharedSession.participantJoined"
  | "sharedSession.participantLeft";

export interface SharedSessionRealtimeEvent {
  scope: "sharedSession";
  type: SharedSessionRealtimeEventType;
  sessionId: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export type SharedSessionConnectionState = "connecting" | "connected" | "disconnected" | "error";

type WebSocketLike = {
  onopen: ((event: unknown) => void) | null;
  onclose: ((event: { code?: number; reason?: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  close: () => void;
  send: (payload: string) => void;
};

type WebSocketFactory = (url: string) => WebSocketLike;

interface SharedSessionClientOptions {
  apiBaseUrl: string;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  websocketFactory?: WebSocketFactory;
  onEvent: (event: SharedSessionRealtimeEvent) => void;
  onConnectionStateChange: (state: SharedSessionConnectionState) => void;
  onResyncRequested: () => void;
}

interface SharedSessionClient {
  connect: () => void;
  disconnect: () => void;
  setSessionId: (sessionId: string | null) => void;
}

const DEFAULT_RECONNECT_DELAY_MS = 1000;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 30000;

const SUPPORTED_EVENT_TYPES = new Set<SharedSessionRealtimeEventType>([
  "sharedSession.updated",
  "sharedSession.profileChanged",
  "sharedSession.rotationAdvanced",
  "sharedSession.participantJoined",
  "sharedSession.participantLeft",
]);

function parseSharedSessionEvent(rawData: string): SharedSessionRealtimeEvent | null {
  try {
    const parsed = JSON.parse(rawData) as Partial<SharedSessionRealtimeEvent>;

    if (
      parsed.scope !== "sharedSession"
      || typeof parsed.type !== "string"
      || typeof parsed.sessionId !== "string"
      || typeof parsed.timestamp !== "string"
    ) {
      return null;
    }

    if (!SUPPORTED_EVENT_TYPES.has(parsed.type as SharedSessionRealtimeEventType)) {
      return null;
    }

    return {
      scope: "sharedSession",
      type: parsed.type as SharedSessionRealtimeEventType,
      sessionId: parsed.sessionId,
      timestamp: parsed.timestamp,
      ...(parsed.payload && typeof parsed.payload === "object" ? { payload: parsed.payload } : {}),
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

function buildSharedSessionRealtimeUrl(apiBaseUrl: string, sessionId: string | null): string {
  const url = new URL(apiBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/realtime";
  url.search = "";

  if (sessionId) {
    url.searchParams.set("sessionId", sessionId);
  }

  return url.toString();
}

export function createSharedSessionClient(options: SharedSessionClientOptions): SharedSessionClient {
  const reconnectDelayMs = options.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS;
  const maxReconnectDelayMs = options.maxReconnectDelayMs ?? DEFAULT_MAX_RECONNECT_DELAY_MS;
  const websocketFactory = options.websocketFactory ?? defaultWebSocketFactory;

  let socket: WebSocketLike | null = null;
  let activeSessionId: string | null = null;
  let shouldReconnect = true;
  let reconnectAttempt = 0;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  function setState(state: SharedSessionConnectionState) {
    options.onConnectionStateChange(state);
  }

  function clearReconnectTimeout() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  }

  function sendSessionSubscription() {
    if (!socket || !activeSessionId) {
      return;
    }

    socket.send(
      JSON.stringify({
        type: "subscribeSession",
        sessionId: activeSessionId,
      }),
    );
  }

  function scheduleReconnect() {
    if (!shouldReconnect || reconnectTimeout || !activeSessionId) {
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

    if (!activeSessionId) {
      setState("disconnected");
      return;
    }

    if (socket) {
      socket.close();
      socket = null;
    }

    setState("connecting");
    const url = buildSharedSessionRealtimeUrl(options.apiBaseUrl, activeSessionId);
    const nextSocket = websocketFactory(url);
    socket = nextSocket;

    nextSocket.onopen = () => {
      reconnectAttempt = 0;
      setState("connected");
      sendSessionSubscription();
      options.onResyncRequested();
    };

    nextSocket.onmessage = (event) => {
      const parsed = parseSharedSessionEvent(event.data);
      if (!parsed || parsed.sessionId !== activeSessionId) {
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
    setSessionId(sessionId: string | null) {
      activeSessionId = sessionId;
      sendSessionSubscription();
    },
  };
}
