import { createServer } from "node:http";
import { test, expect } from "vitest";
import WebSocket from "ws";
import { createRealtimeEvent } from "../src/modules/realtime/realtime.events";
import { createRealtimeServer } from "../src/modules/realtime/realtime.server";

function rawDataToString(data: WebSocket.RawData): string {
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

function waitForOpen(client: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const onOpen = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    function cleanup() {
      client.off("open", onOpen);
      client.off("error", onError);
    }

    client.on("open", onOpen);
    client.on("error", onError);
  });
}

function waitForMessage(client: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const onMessage = (data: WebSocket.RawData) => {
      cleanup();
      resolve(rawDataToString(data));
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    function cleanup() {
      client.off("message", onMessage);
      client.off("error", onError);
    }

    client.on("message", onMessage);
    client.on("error", onError);
  });
}

function waitForSilence(client: WebSocket, durationMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, durationMs);

    const onMessage = () => {
      cleanup();
      reject(new Error("Unexpected message received."));
    };

    function cleanup() {
      clearTimeout(timeout);
      client.off("message", onMessage);
    }

    client.on("message", onMessage);
  });
}

async function startServerWithEphemeralPort(httpServer: ReturnType<typeof createServer>) {
  return new Promise<number>((resolve, reject) => {
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onListening = () => {
      cleanup();
      const address = httpServer.address();
      if (!address || typeof address === "string") {
        reject(new Error("Expected numeric server address."));
        return;
      }
      resolve(address.port);
    };

    function cleanup() {
      httpServer.off("error", onError);
      httpServer.off("listening", onListening);
    }

    httpServer.on("error", onError);
    httpServer.on("listening", onListening);
    httpServer.listen(0, "127.0.0.1");
  });
}

test("realtime server initializes and delivers events for subscribed profile", async (t) => {
  const httpServer = createServer();
  const realtimeServer = createRealtimeServer(httpServer);

  let port: number;
  try {
    port = await startServerWithEphemeralPort(httpServer);
  } catch (error) {
    if ((error as { code?: string }).code === "EPERM") {
      t.skip("Sandbox does not allow binding local ports.");
      return;
    }
    throw error;
  }

  const client = new WebSocket(`ws://127.0.0.1:${port}/realtime?profileId=profile-1`);
  await waitForOpen(client);

  const messagePromise = waitForMessage(client);

  realtimeServer.publish(
    createRealtimeEvent({
      type: "display.refreshRequested",
      profileId: "profile-1",
      widgetId: "widget-1",
      timestamp: "2026-03-21T10:00:00.000Z",
    }),
  );

  const payload = await messagePromise;
  const parsed = JSON.parse(payload) as {
    type: string;
    profileId: string;
    widgetId?: string;
    timestamp: string;
  };

  expect(parsed.type).toBe("display.refreshRequested");
  expect(parsed.profileId).toBe("profile-1");
  expect(parsed.widgetId).toBe("widget-1");
  expect(parsed.timestamp).toBe("2026-03-21T10:00:00.000Z");

  client.close();
  await realtimeServer.close();
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
});

test("realtime server scopes event delivery by profile", async (t) => {
  const httpServer = createServer();
  const realtimeServer = createRealtimeServer(httpServer);

  let port: number;
  try {
    port = await startServerWithEphemeralPort(httpServer);
  } catch (error) {
    if ((error as { code?: string }).code === "EPERM") {
      t.skip("Sandbox does not allow binding local ports.");
      return;
    }
    throw error;
  }

  const profileOneClient = new WebSocket(`ws://127.0.0.1:${port}/realtime`);
  const profileTwoClient = new WebSocket(`ws://127.0.0.1:${port}/realtime`);
  await Promise.all([waitForOpen(profileOneClient), waitForOpen(profileTwoClient)]);

  profileOneClient.send(JSON.stringify({ type: "subscribe", profileId: "profile-1" }));
  profileTwoClient.send(JSON.stringify({ type: "subscribe", profileId: "profile-2" }));

  await new Promise((resolve) => setTimeout(resolve, 50));

  const profileOneMessagePromise = waitForMessage(profileOneClient);

  realtimeServer.publish(
    createRealtimeEvent({
      type: "layout.updated",
      profileId: "profile-1",
      timestamp: "2026-03-21T11:00:00.000Z",
    }),
  );

  const profileOnePayload = await profileOneMessagePromise;
  const profileOneEvent = JSON.parse(profileOnePayload) as { profileId: string; type: string };
  expect(profileOneEvent.profileId).toBe("profile-1");
  expect(profileOneEvent.type).toBe("layout.updated");

  await waitForSilence(profileTwoClient, 120);

  profileOneClient.close();
  profileTwoClient.close();
  await realtimeServer.close();
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
});
