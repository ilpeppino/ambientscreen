# M3.1 Realtime Transport Choice

## Selected transport

Ambient Screen V3 uses **native WebSocket** via the `ws` package on the API.

## Why this choice

- lowest added complexity for current stack (Express + single API runtime)
- profile-scoped fan-out is straightforward without extra protocol overhead
- client can use built-in `WebSocket` in Expo/web without new client dependency
- easy to keep polling fallback as independent behavior

## Connection model

- endpoint: `/realtime`
- client subscribes to one profile at a time with message:
  - `{ "type": "subscribe", "profileId": "..." }`
- server delivers only events matching subscribed profile

## Event contract

Every emitted event follows:

```ts
{
  type: "profile.updated" | "widget.created" | "widget.updated" | "widget.deleted" | "layout.updated" | "display.refreshRequested"
  profileId: string
  widgetId?: string
  timestamp: string
}
```

Payload is intentionally minimal and stable so clients refresh via existing HTTP read paths.
