import { Dimensions, Platform } from "react-native";
import type { DeviceMetadata } from "./deviceRegistration.logic";

const TABLET_BREAKPOINT = 900;

function mapPlatformToDevicePlatform(): DeviceMetadata["platform"] {
  if (Platform.OS === "ios") {
    return "ios";
  }

  if (Platform.OS === "android") {
    return "android";
  }

  return "web";
}

function inferDeviceType(): DeviceMetadata["deviceType"] {
  if (Platform.OS === "web") {
    return "web";
  }

  const { width, height } = Dimensions.get("window");
  const longestSide = Math.max(width, height);

  if (longestSide >= TABLET_BREAKPOINT) {
    return "tablet";
  }

  return "phone";
}

function buildDefaultDeviceName(platform: DeviceMetadata["platform"], deviceType: DeviceMetadata["deviceType"]): string {
  if (platform === "ios") {
    if (deviceType === "tablet") {
      return "iOS Tablet";
    }

    return "iOS Phone";
  }

  if (platform === "android") {
    if (deviceType === "tablet") {
      return "Android Tablet";
    }

    if (deviceType === "display") {
      return "Android Display";
    }

    return "Android Phone";
  }

  return "Web Browser";
}

export function getCurrentDeviceMetadata(): DeviceMetadata {
  const platform = mapPlatformToDevicePlatform();
  const deviceType = inferDeviceType();

  return {
    name: buildDefaultDeviceName(platform, deviceType),
    platform,
    deviceType,
  };
}
