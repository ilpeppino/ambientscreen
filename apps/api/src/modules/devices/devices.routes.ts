import { Router } from "express";
import { z } from "zod";
import { apiErrors } from "../../core/http/api-error";
import { asyncHandler } from "../../core/http/async-handler";
import { getRequestUserId } from "../auth/auth.middleware";
import { devicesService } from "./devices.service";
import { createRateLimit } from "../../core/http/rate-limit";

export const devicesRouter = Router();

const registerDeviceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  platform: z.enum(["ios", "android", "web"]),
  deviceType: z.enum(["phone", "tablet", "display", "web"]),
});

const heartbeatSchema = z.object({
  deviceId: z.string().trim().min(1),
});

const updateDeviceSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

const remoteCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SET_PROFILE"),
    profileId: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal("REFRESH"),
  }),
  z.object({
    type: z.literal("SET_SLIDESHOW"),
    enabled: z.boolean(),
  }),
]);

function getRouteParamId(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return "";
}

// Rate limiters applied at router level so they do not alter route.stack
// (preserving compatibility with the route-inspection test pattern).
devicesRouter.use(
  "/register",
  createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: "Too many device registration attempts, please try again later",
  }),
);

devicesRouter.use(
  "/heartbeat",
  createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120,
    message: "Heartbeat rate limit exceeded",
  }),
);

devicesRouter.use(
  "/:id/command",
  createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    message: "Too many remote commands, please try again later",
  }),
);

devicesRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const parseResult = registerDeviceSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw apiErrors.validation("Invalid device registration payload", parseResult.error.format());
    }

    const userId = getRequestUserId(req);
    const device = await devicesService.register({
      userId,
      name: parseResult.data.name,
      platform: parseResult.data.platform,
      deviceType: parseResult.data.deviceType,
    });

    res.status(201).json(device);
  }),
);

devicesRouter.post(
  "/heartbeat",
  asyncHandler(async (req, res) => {
    const parseResult = heartbeatSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw apiErrors.validation("Invalid device heartbeat payload", parseResult.error.format());
    }

    const userId = getRequestUserId(req);
    const device = await devicesService.heartbeat({
      id: parseResult.data.deviceId,
      userId,
    });

    if (!device) {
      throw apiErrors.notFound("Device not found");
    }

    res.json({
      success: true,
      deviceId: device.id,
      lastSeenAt: device.lastSeenAt,
    });
  }),
);

devicesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const devices = await devicesService.getDevicesForUser(userId);
    res.json(devices);
  }),
);

devicesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parseResult = updateDeviceSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw apiErrors.validation("Invalid device update payload", parseResult.error.format());
    }

    const userId = getRequestUserId(req);
    const deviceId = getRouteParamId(req.params.id);

    const device = await devicesService.renameDevice({
      id: deviceId,
      userId,
      name: parseResult.data.name,
    });

    if (!device) {
      throw apiErrors.notFound("Device not found");
    }

    res.json(device);
  }),
);

devicesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = getRequestUserId(req);
    const deviceId = getRouteParamId(req.params.id);
    const deleted = await devicesService.deleteDevice({ id: deviceId, userId });

    if (!deleted) {
      throw apiErrors.notFound("Device not found");
    }

    res.status(204).send();
  }),
);

devicesRouter.post(
  "/:id/command",
  asyncHandler(async (req, res) => {
    const parseResult = remoteCommandSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw apiErrors.validation("Invalid remote command payload", parseResult.error.format());
    }

    const userId = getRequestUserId(req);
    const deviceId = getRouteParamId(req.params.id);
    const device = await devicesService.getDeviceForUser({ id: deviceId, userId });
    if (!device) {
      throw apiErrors.notFound("Device not found");
    }

    const delivered = devicesService.sendRemoteCommand({
      id: deviceId,
      userId,
      command: parseResult.data,
    });
    if (!delivered) {
      throw apiErrors.badRequest("Target device is offline");
    }

    res.status(202).json({
      success: true,
      deviceId,
      commandType: parseResult.data.type,
    });
  }),
);
