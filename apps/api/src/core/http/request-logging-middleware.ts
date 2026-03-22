import type { NextFunction, Request, Response } from "express"

function formatDurationMs(durationMs: number) {
  return durationMs >= 100 ? durationMs.toFixed(0) : durationMs.toFixed(1)
}

export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startedAt = process.hrtime.bigint()

  res.once("finish", () => {
    const finishedAt = process.hrtime.bigint()
    const durationMs = Number(finishedAt - startedAt) / 1_000_000
    const formattedDuration = formatDurationMs(durationMs)
    const reqId = req.requestId ? ` [${req.requestId}]` : ""
    const message = `[API]${reqId} ${req.method} ${req.originalUrl} -> ${res.statusCode} ${formattedDuration}ms`

    console.info(message)
  })

  next()
}
