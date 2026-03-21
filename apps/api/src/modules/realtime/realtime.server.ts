import { URL } from "node:url";
import type { IncomingMessage } from "node:http";
import type { Server as HttpServer } from "node:http";
import type { RawData } from "ws";
import { WebSocket, WebSocketServer } from "ws";
import type { RealtimeEvent, RealtimeServer } from "./realtime.types";

interface ClientSubscription {
  profileId: string | null;
  sessionId: string | null;
}

interface SubscribeMessage {
  type: "subscribe";
  profileId: string;
}

interface SubscribeSessionMessage {
  type: "subscribeSession";
  sessionId: string;
}

type ClientMessage = SubscribeMessage | SubscribeSessionMessage;

function toMessageString(data: RawData): string | null {
  if (typeof data === "string") {
    return data;
  }

  if (data instanceof Buffer) {
    return data.toString("utf8");
  }

  if (Array.isArray(data)) {
    return Buffer.concat(data).toString("utf8");
  }

  return Buffer.from(new Uint8Array(data)).toString("utf8");
}

function parseIdFromRequest(request: IncomingMessage, key: "profileId" | "sessionId"): string | null {
  const host = request.headers.host;
  if (!host || !request.url) {
    return null;
  }

  const url = new URL(request.url, `http://${host}`);
  const id = url.searchParams.get(key);
  return id && id.trim().length > 0 ? id : null;
}

function parseMessage(rawMessage: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(rawMessage) as Partial<ClientMessage>;
    if (parsed.type !== "subscribe") {
      if (parsed.type !== "subscribeSession") {
        return null;
      }

      if (typeof parsed.sessionId !== "string" || parsed.sessionId.trim().length === 0) {
        return null;
      }

      return {
        type: "subscribeSession",
        sessionId: parsed.sessionId,
      };
    }

    if (typeof parsed.profileId !== "string" || parsed.profileId.trim().length === 0) {
      return null;
    }

    return {
      type: "subscribe",
      profileId: parsed.profileId,
    };
  } catch {
    return null;
  }
}

export function createRealtimeServer(httpServer: HttpServer): RealtimeServer {
  const websocketServer = new WebSocketServer({ noServer: true });
  const subscriptionByClient = new Map<WebSocket, ClientSubscription>();
  const clientsByProfile = new Map<string, Set<WebSocket>>();
  const clientsBySession = new Map<string, Set<WebSocket>>();

  function removeClientFromProfile(client: WebSocket, profileId: string | null) {
    if (!profileId) {
      return;
    }

    const profileClients = clientsByProfile.get(profileId);
    if (!profileClients) {
      return;
    }

    profileClients.delete(client);
    if (profileClients.size === 0) {
      clientsByProfile.delete(profileId);
    }
  }

  function subscribeClientToProfile(client: WebSocket, profileId: string) {
    const previousSubscription = subscriptionByClient.get(client);
    removeClientFromProfile(client, previousSubscription?.profileId ?? null);

    const nextSubscription: ClientSubscription = {
      profileId,
      sessionId: previousSubscription?.sessionId ?? null,
    };
    subscriptionByClient.set(client, nextSubscription);

    const profileClients = clientsByProfile.get(profileId) ?? new Set<WebSocket>();
    profileClients.add(client);
    clientsByProfile.set(profileId, profileClients);
  }

  function removeClientFromSession(client: WebSocket, sessionId: string | null) {
    if (!sessionId) {
      return;
    }

    const sessionClients = clientsBySession.get(sessionId);
    if (!sessionClients) {
      return;
    }

    sessionClients.delete(client);
    if (sessionClients.size === 0) {
      clientsBySession.delete(sessionId);
    }
  }

  function subscribeClientToSession(client: WebSocket, sessionId: string) {
    const previousSubscription = subscriptionByClient.get(client);
    removeClientFromSession(client, previousSubscription?.sessionId ?? null);

    const nextSubscription: ClientSubscription = {
      profileId: previousSubscription?.profileId ?? null,
      sessionId,
    };
    subscriptionByClient.set(client, nextSubscription);

    const sessionClients = clientsBySession.get(sessionId) ?? new Set<WebSocket>();
    sessionClients.add(client);
    clientsBySession.set(sessionId, sessionClients);
  }

  websocketServer.on("connection", (client, request) => {
    subscriptionByClient.set(client, {
      profileId: null,
      sessionId: null,
    });

    const initialProfileId = parseIdFromRequest(request, "profileId");
    if (initialProfileId) {
      subscribeClientToProfile(client, initialProfileId);
    }
    const initialSessionId = parseIdFromRequest(request, "sessionId");
    if (initialSessionId) {
      subscribeClientToSession(client, initialSessionId);
    }

    client.on("message", (data) => {
      const rawMessage = toMessageString(data);
      if (!rawMessage) {
        return;
      }
      const message = parseMessage(rawMessage);
      if (!message) {
        return;
      }

      if (message.type === "subscribe") {
        subscribeClientToProfile(client, message.profileId);
        return;
      }

      if (message.type === "subscribeSession") {
        subscribeClientToSession(client, message.sessionId);
      }
    });

    client.on("close", () => {
      const currentSubscription = subscriptionByClient.get(client);
      removeClientFromProfile(client, currentSubscription?.profileId ?? null);
      removeClientFromSession(client, currentSubscription?.sessionId ?? null);
      subscriptionByClient.delete(client);
    });
  });

  httpServer.on("upgrade", (request, socket, head) => {
    const host = request.headers.host;
    if (!host || !request.url) {
      socket.destroy();
      return;
    }

    const url = new URL(request.url, `http://${host}`);
    if (url.pathname !== "/realtime") {
      socket.destroy();
      return;
    }

    websocketServer.handleUpgrade(request, socket, head, (client) => {
      websocketServer.emit("connection", client, request);
    });
  });

  return {
    publish(event: RealtimeEvent) {
      const clients = event.scope === "sharedSession"
        ? clientsBySession.get(event.sessionId)
        : clientsByProfile.get(event.profileId);
      if (!clients || clients.size === 0) {
        return;
      }

      const payload = JSON.stringify(event);
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      }
    },
    async close() {
      await new Promise<void>((resolve) => {
        websocketServer.close(() => {
          resolve();
        });
      });
    },
  };
}
