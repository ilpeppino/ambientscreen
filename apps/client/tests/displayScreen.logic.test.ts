import { test, expect } from "vitest";
import {
  getEffectivePollingIntervalMs,
  getDisplayStatusModel,
  getDisplayFrameModel,
  getDisplayRefreshIntervalMs,
  resolveDisplayUiState,
  shouldShowDisplayEditControls,
} from "../src/features/display/displayScreen.logic";

test("getDisplayRefreshIntervalMs follows widget refresh policy rules", () => {
  expect(getDisplayRefreshIntervalMs("clockDate")).toBe(1000);
  expect(getDisplayRefreshIntervalMs("weather")).toBe(300000);
  expect(getDisplayRefreshIntervalMs("calendar")).toBe(60000);
  expect(getDisplayRefreshIntervalMs(undefined)).toBe(null);
});

test("shouldShowDisplayEditControls hides edit UI in display mode", () => {
  expect(shouldShowDisplayEditControls(false)).toBe(false);
  expect(shouldShowDisplayEditControls(true)).toBe(true);
});

test("getEffectivePollingIntervalMs reduces polling frequency when realtime is connected", () => {
  expect(getEffectivePollingIntervalMs(1000, "connected")).toBe(120000);
  expect(getEffectivePollingIntervalMs(300000, "connected")).toBe(300000);
  expect(getEffectivePollingIntervalMs(1000, "disconnected")).toBe(1000);
});

test("resolveDisplayUiState returns loadingWidgets while widgets are loading", () => {
  const state = resolveDisplayUiState({
    loadingWidgets: true,
    loadingWidgetData: false,
    hasError: false,
    hasSelectedWidget: false,
    hasWidgetData: false,
  });

  expect(state).toBe("loadingWidgets");
});

test("resolveDisplayUiState returns error before empty state", () => {
  const state = resolveDisplayUiState({
    loadingWidgets: false,
    loadingWidgetData: false,
    hasError: true,
    hasSelectedWidget: false,
    hasWidgetData: false,
  });

  expect(state).toBe("error");
});

test("resolveDisplayUiState returns loadingWidgetData while waiting for first payload", () => {
  const state = resolveDisplayUiState({
    loadingWidgets: false,
    loadingWidgetData: true,
    hasError: false,
    hasSelectedWidget: true,
    hasWidgetData: false,
  });

  expect(state).toBe("loadingWidgetData");
});

test("resolveDisplayUiState returns ready when widget data exists", () => {
  const state = resolveDisplayUiState({
    loadingWidgets: false,
    loadingWidgetData: false,
    hasError: false,
    hasSelectedWidget: true,
    hasWidgetData: true,
  });

  expect(state).toBe("ready");
});

test("resolveDisplayUiState returns unsupported for selected widget without payload", () => {
  const state = resolveDisplayUiState({
    loadingWidgets: false,
    loadingWidgetData: false,
    hasError: false,
    hasSelectedWidget: true,
    hasWidgetData: false,
  });

  expect(state).toBe("unsupported");
});

test("getDisplayFrameModel returns default shell when no widget is selected", () => {
  const model = getDisplayFrameModel(undefined);

  expect(model.title).toBe("Ambient Display");
  expect(model.subtitle).toBe("Live ambient mode");
  expect(model.footerLabel).toBe("Ambient Screen");
});

test("getDisplayFrameModel includes manifest title and refresh policy label", () => {
  const model = getDisplayFrameModel("weather");

  expect(model.title).toBe("Weather");
  expect(model.subtitle).toBe("Live ambient mode");
  expect(model.footerLabel).toBe("Refresh every 5m");
});

test("getDisplayStatusModel exposes loading widgets status copy", () => {
  const model = getDisplayStatusModel("loadingWidgets", null);

  expect(model.title).toBe("Preparing display");
  expect(model.message).toBe("Loading widgets and display settings.");
  expect(model.tone).toBe("neutral");
  expect(model.showSpinner).toBe(true);
});

test("getDisplayStatusModel returns error tone and provided message", () => {
  const model = getDisplayStatusModel("error", "Failed to load widgets");

  expect(model.title).toBe("Display unavailable");
  expect(model.message).toBe("Failed to load widgets");
  expect(model.tone).toBe("error");
  expect(model.showSpinner).toBe(false);
});

test("getDisplayStatusModel returns unsupported copy for unsupported state", () => {
  const model = getDisplayStatusModel("unsupported", null);

  expect(model.title).toBe("Unsupported widget");
  expect(model.message).toBe("This widget type is not available in display mode yet.");
  expect(model.tone).toBe("error");
  expect(model.showSpinner).toBe(false);
});
