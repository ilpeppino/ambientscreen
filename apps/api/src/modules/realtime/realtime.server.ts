import { URL } from "node:url";
import type { IncomingMessage } from "node:http";
import type { Server as HttpServer } from "node:http";
import type { RawData } from "ws";
import { WebSocket, WebSocketServer } from "ws";
import type { RealtimeEvent, RealtimeServer } from "./realtime.types";

interface ClientSubscription {
  profileId: string | null;
}

interface SubscribeMessage {
  type: "subscribe";
  profileId: string;
}

type ClientMessage = SubscribeMessage;

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

function parseProfileIdFromRequest(request: IncomingMessage): string | null {
  const host = request.headers.host;
  if (!host || !request.url) {
    return null;
  }

  const url = new URL(request.url, `http://${host}`);
  const profileId = url.searchParams.get("profileId");

  return profileId && profileId.trim().length > 0 ? profileId : null;
}

function parseMessage(rawMessage: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(rawMessage) as Partial<ClientMessage>;
    if (parsed.type !== "subscribe") {
      return null;
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

    const nextSubscription: ClientSubscription = { profileId };
    subscriptionByClient.set(client, nextSubscription);

    const profileClients = clientsByProfile.get(profileId) ?? new Set<WebSocket>();
    profileClients.add(client);
    clientsByProfile.set(profileId, profileClients);
  }

  websocketServer.on("connection", (client, request) => {
    subscriptionByClient.set(client, {
      profileId: null,
    });

    const initialProfileId = parseProfileIdFromRequest(request);
    if (initialProfileId) {
      subscribeClientToProfile(client, initialProfileId);
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
      }
    });

    client.on("close", () => {
      const currentSubscription = subscriptionByClient.get(client);
      removeClientFromProfile(client, currentSubscription?.profileId ?? null);
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
      const clients = clientsByProfile.get(event.profileId);
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
