import assert from "node:assert/strict";
import test from "node:test";
import {
  getEffectivePollingIntervalMs,
  getDisplayStatusModel,
  getDisplayFrameModel,
  getDisplayRefreshIntervalMs,
  resolveDisplayUiState,
  selectDisplayWidget,
} from "../src/features/display/displayScreen.logic";

const widgetA = {
  id: "widget-a",
  userId: "user-1",
  type: "weather",
  config: {},
  position: 0,
  isActive: false,
  createdAt: "2026-03-20T12:00:00.000Z",
  updatedAt: "2026-03-20T12:00:00.000Z",
};

const widgetB = {
  id: "widget-b",
  userId: "user-1",
  type: "clockDate",
  config: {},
  position: 1,
  isActive: true,
  createdAt: "2026-03-20T12:00:00.000Z",
  updatedAt: "2026-03-20T12:00:00.000Z",
};

test("selectDisplayWidget picks the active widget when there is no previous selection", () => {
  const selected = selectDisplayWidget([widgetA, widgetB], null);
  assert.equal(selected?.id, "widget-b");
});

test("selectDisplayWidget prefers active widget over previous selection", () => {
  const selected = selectDisplayWidget([widgetA, widgetB], widgetA);
  assert.equal(selected?.id, "widget-b");
});

test("selectDisplayWidget keeps previous selection if no active widget exists", () => {
  const selected = selectDisplayWidget(
    [{ ...widgetA, isActive: false }, { ...widgetB, isActive: false }],
    widgetB,
  );
  assert.equal(selected?.id, "widget-b");
});

test("selectDisplayWidget keeps previous selection if it is still active", () => {
  const selected = selectDisplayWidget([widgetA, widgetB], widgetB);
  assert.equal(selected?.id, "widget-b");
});

test("selectDisplayWidget falls back to first widget when previous is gone", () => {
  const selected = selectDisplayWidget([widgetA], widgetB);
  assert.equal(selected?.id, "widget-a");
});

test("getDisplayRefreshIntervalMs follows widget refresh policy rules", () => {
  assert.equal(getDisplayRefreshIntervalMs("clockDate"), 1000);
  assert.equal(getDisplayRefreshIntervalMs("weather"), 300000);
  assert.equal(getDisplayRefreshIntervalMs("calendar"), 60000);
  assert.equal(getDisplayRefreshIntervalMs(undefined), null);
});

test("getEffectivePollingIntervalMs reduces polling frequency when realtime is connected", () => {
  assert.equal(getEffectivePollingIntervalMs(1000, "connected"), 120000);
  assert.equal(getEffectivePollingIntervalMs(300000, "connected"), 300000);
  assert.equal(getEffectivePollingIntervalMs(1000, "disconnected"), 1000);
});

test("resolveDisplayUiState returns loadingWidgets while widgets are loading", () => {
  const state = resolveDisplayUiState({
    loadingWidgets: true,
    loadingWidgetData: false,
    hasError: false,
    hasSelectedWidget: false,
    hasWidgetData: false,
  });

  assert.equal(state, "loadingWidgets");
});

test("resolveDisplayUiState returns error before empty state", () => {
  const state = resolveDisplayUiState({
    loadingWidgets: false,
    loadingWidgetData: false,
    hasError: true,
    hasSelectedWidget: false,
    hasWidgetData: false,
  });

  assert.equal(state, "error");
});

test("resolveDisplayUiState returns loadingWidgetData while waiting for first payload", () => {
  const state = resolveDisplayUiState({
    loadingWidgets: false,
    loadingWidgetData: true,
    hasError: false,
    hasSelectedWidget: true,
    hasWidgetData: false,
  });

  assert.equal(state, "loadingWidgetData");
});

test("resolveDisplayUiState returns ready when widget data exists", () => {
  const state = resolveDisplayUiState({
    loadingWidgets: false,
    loadingWidgetData: false,
    hasError: false,
    hasSelectedWidget: true,
    hasWidgetData: true,
  });

  assert.equal(state, "ready");
});

test("resolveDisplayUiState returns unsupported for selected widget without payload", () => {
  const state = resolveDisplayUiState({
    loadingWidgets: false,
    loadingWidgetData: false,
    hasError: false,
    hasSelectedWidget: true,
    hasWidgetData: false,
  });

  assert.equal(state, "unsupported");
});

test("getDisplayFrameModel returns default shell when no widget is selected", () => {
  const model = getDisplayFrameModel(undefined);

  assert.equal(model.title, "Ambient Display");
  assert.equal(model.subtitle, "Live ambient mode");
  assert.equal(model.footerLabel, "Ambient Screen");
});

test("getDisplayFrameModel includes manifest title and refresh policy label", () => {
  const model = getDisplayFrameModel("weather");

  assert.equal(model.title, "Weather");
  assert.equal(model.subtitle, "Live ambient mode");
  assert.equal(model.footerLabel, "Refresh every 5m");
});

test("getDisplayStatusModel exposes loading widgets status copy", () => {
  const model = getDisplayStatusModel("loadingWidgets", null);

  assert.equal(model.title, "Preparing display");
  assert.equal(model.message, "Loading widgets and display settings.");
  assert.equal(model.tone, "neutral");
  assert.equal(model.showSpinner, true);
});

test("getDisplayStatusModel returns error tone and provided message", () => {
  const model = getDisplayStatusModel("error", "Failed to load widgets");

  assert.equal(model.title, "Display unavailable");
  assert.equal(model.message, "Failed to load widgets");
  assert.equal(model.tone, "error");
  assert.equal(model.showSpinner, false);
});

test("getDisplayStatusModel returns unsupported copy for unsupported state", () => {
  const model = getDisplayStatusModel("unsupported", null);

  assert.equal(model.title, "Unsupported widget");
  assert.equal(model.message, "This widget type is not available in display mode yet.");
  assert.equal(model.tone, "error");
  assert.equal(model.showSpinner, false);
});
