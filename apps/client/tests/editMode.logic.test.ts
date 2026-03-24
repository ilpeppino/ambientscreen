import { expect, test } from "vitest";
import {
  clearEditModeSelection,
  selectWidgetInEditMode,
  shouldShowEditModeHint,
  shouldShowGridOverlay,
  shouldShowWidgetAffordances,
  toggleEditModeState,
} from "../src/features/display/components/editMode.logic";

test("toggleEditModeState enables edit mode and keeps selection when entering", () => {
  const next = toggleEditModeState({
    editMode: false,
    selectedWidgetId: "widget-a",
  });

  expect(next).toEqual({
    editMode: true,
    selectedWidgetId: "widget-a",
  });
});

test("toggleEditModeState exits edit mode and clears selection", () => {
  const next = toggleEditModeState({
    editMode: true,
    selectedWidgetId: "widget-a",
  });

  expect(next).toEqual({
    editMode: false,
    selectedWidgetId: null,
  });
});

test("selectWidgetInEditMode keeps a single selected widget", () => {
  const selectedA = selectWidgetInEditMode(
    { editMode: true, selectedWidgetId: null },
    "widget-a",
  );
  const selectedB = selectWidgetInEditMode(selectedA, "widget-b");

  expect(selectedA.selectedWidgetId).toBe("widget-a");
  expect(selectedB.selectedWidgetId).toBe("widget-b");
});

test("selectWidgetInEditMode is ignored outside edit mode", () => {
  const next = selectWidgetInEditMode(
    { editMode: false, selectedWidgetId: null },
    "widget-a",
  );

  expect(next.selectedWidgetId).toBe(null);
});

test("clearEditModeSelection clears current selection", () => {
  const next = clearEditModeSelection({
    editMode: true,
    selectedWidgetId: "widget-a",
  });

  expect(next.selectedWidgetId).toBe(null);
});

test("shouldShowGridOverlay only in edit mode", () => {
  expect(shouldShowGridOverlay(true)).toBe(true);
  expect(shouldShowGridOverlay(false)).toBe(false);
});

test("shouldShowEditModeHint only when edit mode is active and nothing is selected", () => {
  expect(shouldShowEditModeHint(true, null)).toBe(true);
  expect(shouldShowEditModeHint(true, "widget-a")).toBe(false);
  expect(shouldShowEditModeHint(false, null)).toBe(false);
});

test("shouldShowWidgetAffordances only for selected widgets in edit mode", () => {
  expect(shouldShowWidgetAffordances(true, true)).toBe(true);
  expect(shouldShowWidgetAffordances(true, false)).toBe(false);
  expect(shouldShowWidgetAffordances(false, true)).toBe(false);
});
