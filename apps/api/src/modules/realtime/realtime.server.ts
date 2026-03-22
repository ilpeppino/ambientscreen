import { URL } from "node:url";
import type { IncomingMessage } from "node:http";
import type { Server as HttpServer } from "node:http";
import type { RawData } from "ws";
import { WebSocket, WebSocketServer } from "ws";
import type { RemoteCommand } from "@ambient/shared-contracts";
import { authService } from "../auth/auth.service";
import { devicesRepository } from "../devices/devices.repository";
import { profilesRepository } from "../profiles/profiles.repository";
import { sharedSessionsRepository } from "../sharedSessions/sharedSessions.repository";
import type { RealtimeEvent, RealtimeServer } from "./realtime.types";

interface ClientSubscription {
  userId: string;
  profileId: string | null;
  sessionId: string | null;
  deviceId: string | null;
}

interface SubscribeMessage {
  type: "subscribe";
  profileId: string;
}

interface SubscribeSessionMessage {
  type: "subscribeSession";
  sessionId: string;
}

interface SubscribeDeviceMessage {
  type: "subscribeDevice";
  deviceId: string;
}

type ClientMessage = SubscribeMessage | SubscribeSessionMessage | SubscribeDeviceMessage;

interface RealtimeHandshake {
  userId: string;
  profileId: string | null;
  sessionId: string | null;
  deviceId: string | null;
}

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

function parseRawId(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseIdFromRequest(request: IncomingMessage, key: "profileId" | "sessionId" | "deviceId"): string | null {
  const host = request.headers.host;
  if (!host || !request.url) {
    return null;
  }

  const url = new URL(request.url, `http://${host}`);
  return parseRawId(url.searchParams.get(key));
}

function getTokenFromRequest(request: IncomingMessage): string | null {
  const host = request.headers.host;
  if (host && request.url) {
    const url = new URL(request.url, `http://${host}`);
    const tokenFromQuery = parseRawId(url.searchParams.get("token"));
    if (tokenFromQuery) {
      return tokenFromQuery;
    }
  }

  const authorizationHeader = request.headers.authorization;
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer") {
    return null;
  }

  return parseRawId(token);
}

function parseMessage(rawMessage: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(rawMessage) as Partial<ClientMessage>;
    if (parsed.type === "subscribe") {
      if (typeof parsed.profileId !== "string" || parsed.profileId.trim().length === 0) {
        return null;
      }

      return {
        type: "subscribe",
        profileId: parsed.profileId,
      };
    }

    if (parsed.type === "subscribeSession") {
      if (typeof parsed.sessionId !== "string" || parsed.sessionId.trim().length === 0) {
        return null;
      }

      return {
        type: "subscribeSession",
        sessionId: parsed.sessionId,
      };
    }

    if (parsed.type === "subscribeDevice") {
      if (typeof parsed.deviceId !== "string" || parsed.deviceId.trim().length === 0) {
        return null;
      }

      return {
        type: "subscribeDevice",
        deviceId: parsed.deviceId,
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function resolveHandshake(request: IncomingMessage): Promise<RealtimeHandshake | null> {
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }

  let userId: string;
  try {
    const user = authService.verifyToken(token);
    userId = user.id;
  } catch {
    return null;
  }

  const profileId = parseIdFromRequest(request, "profileId");
  const sessionId = parseIdFromRequest(request, "sessionId");
  const deviceId = parseIdFromRequest(request, "deviceId");

  return {
    userId,
    profileId,
    sessionId,
    deviceId,
  };
}

export function createRealtimeServer(httpServer: HttpServer): RealtimeServer {
  const websocketServer = new WebSocketServer({ noServer: true });
  const subscriptionByClient = new Map<WebSocket, ClientSubscription>();
  const handshakeByClient = new Map<WebSocket, RealtimeHandshake>();
  const clientsByProfile = new Map<string, Set<WebSocket>>();
  const clientsBySession = new Map<string, Set<WebSocket>>();
  const clientsByDevice = new Map<string, Set<WebSocket>>();
  const lastDeviceConnectionAtById = new Map<string, Date>();

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

  function removeClientFromDevice(client: WebSocket, deviceId: string | null) {
    if (!deviceId) {
      return;
    }

    const deviceClients = clientsByDevice.get(deviceId);
    if (!deviceClients) {
      return;
    }

    deviceClients.delete(client);
    if (deviceClients.size === 0) {
      clientsByDevice.delete(deviceId);
    }
  }

  async function subscribeClientToProfile(client: WebSocket, profileId: string): Promise<void> {
    const previousSubscription = subscriptionByClient.get(client);
    if (!previousSubscription) {
      return;
    }

    const isAuthorized = await profilesRepository.findByIdForUser({
      id: profileId,
      userId: previousSubscription.userId,
    });
    if (!isAuthorized) {
      return;
    }

    removeClientFromProfile(client, previousSubscription.profileId);

    const nextSubscription: ClientSubscription = {
      ...previousSubscription,
      profileId,
    };
    subscriptionByClient.set(client, nextSubscription);

    const profileClients = clientsByProfile.get(profileId) ?? new Set<WebSocket>();
    profileClients.add(client);
    clientsByProfile.set(profileId, profileClients);
  }

  async function subscribeClientToSession(client: WebSocket, sessionId: string): Promise<void> {
    const previousSubscription = subscriptionByClient.get(client);
    if (!previousSubscription) {
      return;
    }

    const isAuthorized = await sharedSessionsRepository.findByIdForUser({
      id: sessionId,
      userId: previousSubscription.userId,
    });
    if (!isAuthorized) {
      return;
    }

    removeClientFromSession(client, previousSubscription.sessionId);

    const nextSubscription: ClientSubscription = {
      ...previousSubscription,
      sessionId,
    };
    subscriptionByClient.set(client, nextSubscription);

    const sessionClients = clientsBySession.get(sessionId) ?? new Set<WebSocket>();
    sessionClients.add(client);
    clientsBySession.set(sessionId, sessionClients);
  }

  async function subscribeClientToDevice(client: WebSocket, deviceId: string): Promise<void> {
    const previousSubscription = subscriptionByClient.get(client);
    if (!previousSubscription) {
      return;
    }

    const isAuthorized = await devicesRepository.findByIdForUser({
      id: deviceId,
      userId: previousSubscription.userId,
    });
    if (!isAuthorized) {
      return;
    }

    removeClientFromDevice(client, previousSubscription.deviceId);

    const nextSubscription: ClientSubscription = {
      ...previousSubscription,
      deviceId,
    };
    subscriptionByClient.set(client, nextSubscription);

    const deviceClients = clientsByDevice.get(deviceId) ?? new Set<WebSocket>();
    deviceClients.add(client);
    clientsByDevice.set(deviceId, deviceClients);
    lastDeviceConnectionAtById.set(deviceId, new Date());
  }

  websocketServer.on("connection", (client: WebSocket) => {
    const resolvedHandshake = handshakeByClient.get(client);
    if (!resolvedHandshake) {
      client.close();
      return;
    }

    subscriptionByClient.set(client, {
      userId: resolvedHandshake.userId,
      profileId: null,
      sessionId: null,
      deviceId: null,
    });

    if (resolvedHandshake.profileId) {
      void subscribeClientToProfile(client, resolvedHandshake.profileId);
    }
    if (resolvedHandshake.sessionId) {
      void subscribeClientToSession(client, resolvedHandshake.sessionId);
    }
    if (resolvedHandshake.deviceId) {
      void subscribeClientToDevice(client, resolvedHandshake.deviceId);
    }

    client.on("message", (data: RawData) => {
      const rawMessage = toMessageString(data);
      if (!rawMessage) {
        return;
      }
      const message = parseMessage(rawMessage);
      if (!message) {
        return;
      }

      if (message.type === "subscribe") {
        void subscribeClientToProfile(client, message.profileId);
        return;
      }

      if (message.type === "subscribeSession") {
        void subscribeClientToSession(client, message.sessionId);
        return;
      }

      if (message.type === "subscribeDevice") {
        void subscribeClientToDevice(client, message.deviceId);
      }
    });

    client.on("close", () => {
      const currentSubscription = subscriptionByClient.get(client);
      removeClientFromProfile(client, currentSubscription?.profileId ?? null);
      removeClientFromSession(client, currentSubscription?.sessionId ?? null);
      removeClientFromDevice(client, currentSubscription?.deviceId ?? null);
      subscriptionByClient.delete(client);
      handshakeByClient.delete(client);
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

    void (async () => {
      const handshake = await resolveHandshake(request);
      if (!handshake) {
        socket.destroy();
        return;
      }

      websocketServer.handleUpgrade(request, socket, head, (client) => {
        handshakeByClient.set(client, handshake);
        websocketServer.emit("connection", client, request);
      });
    })();
  });

  return {
    publish(event: RealtimeEvent) {
      let clients: Set<WebSocket> | undefined;
      if (event.scope === "sharedSession") {
        clients = clientsBySession.get(event.sessionId);
      } else if (event.scope === "profile") {
        clients = clientsByProfile.get(event.profileId);
      } else {
        clients = clientsByDevice.get(event.deviceId);
      }

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
    publishDeviceCommand(input: { userId: string; deviceId: string; command: RemoteCommand }): boolean {
      const deviceClients = clientsByDevice.get(input.deviceId);
      if (!deviceClients || deviceClients.size === 0) {
        return false;
      }

      const payload = JSON.stringify({
        scope: "device",
        type: "device.command",
        deviceId: input.deviceId,
        timestamp: new Date().toISOString(),
        command: input.command,
      });

      let delivered = false;
      for (const client of deviceClients) {
        if (client.readyState !== WebSocket.OPEN) {
          continue;
        }

        const subscription = subscriptionByClient.get(client);
        if (!subscription || subscription.userId !== input.userId) {
          continue;
        }

        client.send(payload);
        delivered = true;
      }

      return delivered;
    },
    getDeviceConnectionSnapshot(deviceId: string) {
      return {
        online: (clientsByDevice.get(deviceId)?.size ?? 0) > 0,
        lastConnectedAt: lastDeviceConnectionAtById.get(deviceId) ?? null,
      };
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
