import { EventEmitter } from "node:events"
import { test, expect, afterEach, beforeEach } from "vitest"
import { requestLoggingMiddleware } from "../src/core/http/request-logging-middleware"

let capturedLogs: string[] = []
const originalConsoleInfo = console.info

beforeEach(() => {
  capturedLogs = []
  console.info = ((...args: unknown[]) => {
    capturedLogs.push(args.map((value) => String(value)).join(" "))
  }) as typeof console.info
})

afterEach(() => {
  console.info = originalConsoleInfo
})

function createStubResponse(statusCode: number) {
  const response = new EventEmitter() as EventEmitter & { statusCode: number }
  response.statusCode = statusCode
  return response
}

test("M0-3: successful requests log method, path, status, and duration", () => {
  const req = {
    method: "GET",
    originalUrl: "/health"
  }
  const res = createStubResponse(200)

  let nextCalled = false
  requestLoggingMiddleware(req as never, res as never, () => {
    nextCalled = true
  })

  res.emit("finish")

  expect(nextCalled).toBe(true)
  expect(capturedLogs.length).toBe(1)
  expect(capturedLogs[0]).toMatch(/^\[API\] GET \/health -> 200 /)
  expect(capturedLogs[0]).toMatch(/ms$/)
})

test("M0-3: failed requests are traceable via status and duration logging", () => {
  const req = {
    method: "POST",
    originalUrl: "/users"
  }
  const res = createStubResponse(500)

  requestLoggingMiddleware(req as never, res as never, () => undefined)
  res.emit("finish")

  expect(capturedLogs.length).toBe(1)
  expect(capturedLogs[0]).toMatch(/^\[API\] POST \/users -> 500 /)
  expect(capturedLogs[0]).toMatch(/ms$/)
})
