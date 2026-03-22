import { API_BASE_URL } from "../../core/config/api";
import { apiFetchWithTimeout, toApiErrorMessage } from "./apiClient";
import type { Device, DevicePlatform, DeviceType, RemoteCommand } from "@ambient/shared-contracts";

const DEVICES_TIMEOUT_MS = 8000;

interface RegisterDevicePayload {
  name: string;
  platform: DevicePlatform;
  deviceType: DeviceType;
}

interface HeartbeatPayload {
  deviceId: string;
}

interface UpdateDevicePayload {
  name: string;
}

interface HeartbeatResponse {
  success: boolean;
  deviceId: string;
  lastSeenAt: string;
}

export async function registerDevice(payload: RegisterDevicePayload): Promise<Device> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/devices/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, DEVICES_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to register device: ${message}`);
  }

  return response.json();
}

export async function heartbeatDevice(payload: HeartbeatPayload): Promise<HeartbeatResponse> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/devices/heartbeat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, DEVICES_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to heartbeat device: ${message}`);
  }

  return response.json();
}

export async function getDevices(): Promise<Device[]> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/devices`, undefined, DEVICES_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch devices: ${message}`);
  }

  return response.json();
}

export async function updateDeviceName(deviceId: string, payload: UpdateDevicePayload): Promise<Device> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/devices/${deviceId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, DEVICES_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to update device: ${message}`);
  }

  return response.json();
}

export async function deleteDevice(deviceId: string): Promise<void> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/devices/${deviceId}`, {
    method: "DELETE",
  }, DEVICES_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to delete device: ${message}`);
  }
}

export async function sendDeviceCommand(deviceId: string, command: RemoteCommand): Promise<void> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/devices/${deviceId}/command`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  }, DEVICES_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to send remote command: ${message}`);
  }
}
