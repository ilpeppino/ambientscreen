# Realtime Transport (Current)

This document supersedes the original M3.1 note and reflects the current implementation.

## Transport Choice

- Native WebSocket via `ws` package on API
- Endpoint: `/realtime`

## Authentication

- WebSocket handshake requires JWT
- Token is passed as `token` query param
- Server verifies token before accepting upgrade

## Channel Types

The server supports three scoped subscriptions:

- profile channel
  - subscribe: `{ "type": "subscribe", "profileId": "..." }`
- shared session channel
  - subscribe: `{ "type": "subscribeSession", "sessionId": "..." }`
- device channel (M4.4 remote control)
  - subscribe: `{ "type": "subscribeDevice", "deviceId": "..." }`

Ownership validation is enforced server-side for each subscription.

## Event Families

### Profile events

```ts
{
  scope: "profile"
  type: "profile.updated" | "widget.created" | "widget.updated" | "widget.deleted" | "layout.updated" | "display.refreshRequested"
  profileId: string
  widgetId?: string
  timestamp: string
}
```

### Shared session events

```ts
{
  scope: "sharedSession"
  type: "sharedSession.updated" | "sharedSession.profileChanged" | "sharedSession.rotationAdvanced" | "sharedSession.participantJoined" | "sharedSession.participantLeft"
  sessionId: string
  timestamp: string
  payload?: Record<string, unknown>
}
```

### Device command events

```ts
{
  scope: "device"
  type: "device.command"
  deviceId: string
  timestamp: string
  command: RemoteCommand
}
```

## Remote Command Delivery

`POST /devices/:id/command` triggers device-command fan-out to connected sockets mapped to that device ID.

If no active connection exists for target device, API returns an offline error.
