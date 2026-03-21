import { describe, expect, test } from "vitest";
import {
  createTransitionManager,
  reconcileAnimatedItems,
  settleAnimatedItems,
  transitionPresets,
  type AnimatedItem,
} from "../src/features/display/animations/transitionManager";

describe("transition manager", () => {
  test("starts idle and can replace dashboard without animation", () => {
    const manager = createTransitionManager<string[]>({
      initialDashboard: ["dashboard-a"],
      transitionType: "fade",
    });

    const state = manager.replaceDashboard(["dashboard-b"]);
    expect(state.phase).toBe("idle");
    expect(state.previousDashboard).toBeNull();
    expect(state.currentDashboard).toEqual(["dashboard-b"]);
  });

  test("keeps previous dashboard while animating and clears it on completion", () => {
    const manager = createTransitionManager<string[]>({
      initialDashboard: ["dashboard-a"],
      transitionType: "fade",
    });

    const started = manager.beginDashboardTransition(["dashboard-b"]);
    expect(started.phase).toBe("animating");
    expect(started.previousDashboard).toEqual(["dashboard-a"]);
    expect(started.currentDashboard).toEqual(["dashboard-b"]);

    const completed = manager.completeDashboardTransition(started.transitionId);
    expect(completed.phase).toBe("idle");
    expect(completed.previousDashboard).toBeNull();
    expect(completed.currentDashboard).toEqual(["dashboard-b"]);
  });

  test("ignores stale completion ids during rapid profile switching", () => {
    const manager = createTransitionManager<string[]>({
      initialDashboard: ["dashboard-a"],
      transitionType: "fade",
    });

    const first = manager.beginDashboardTransition(["dashboard-b"]);
    const second = manager.beginDashboardTransition(["dashboard-c"]);
    const staleCompletion = manager.completeDashboardTransition(first.transitionId);

    expect(staleCompletion.phase).toBe("animating");
    expect(staleCompletion.currentDashboard).toEqual(["dashboard-c"]);
    expect(staleCompletion.previousDashboard).toEqual(["dashboard-b"]);

    const finalState = manager.completeDashboardTransition(second.transitionId);
    expect(finalState.phase).toBe("idle");
    expect(finalState.previousDashboard).toBeNull();
    expect(finalState.currentDashboard).toEqual(["dashboard-c"]);
  });

  test("none transition type bypasses animation", () => {
    const manager = createTransitionManager<string[]>({
      initialDashboard: ["dashboard-a"],
      transitionType: "none",
    });

    const nextState = manager.beginDashboardTransition(["dashboard-b"]);
    expect(nextState.phase).toBe("idle");
    expect(nextState.previousDashboard).toBeNull();
    expect(nextState.currentDashboard).toEqual(["dashboard-b"]);
  });
});

describe("animated item reconciliation", () => {
  test("marks entering and exiting widgets for mount/unmount animation", () => {
    const previous: AnimatedItem<{ id: string }>[] = [
      { key: "widget-a", item: { id: "widget-a" }, phase: "stable" },
      { key: "widget-b", item: { id: "widget-b" }, phase: "stable" },
    ];

    const reconciled = reconcileAnimatedItems(
      previous,
      [{ id: "widget-b" }, { id: "widget-c" }],
      (widget) => widget.id,
    );

    expect(reconciled).toEqual([
      { key: "widget-b", item: { id: "widget-b" }, phase: "stable" },
      { key: "widget-c", item: { id: "widget-c" }, phase: "enter" },
      { key: "widget-a", item: { id: "widget-a" }, phase: "exit" },
    ]);
  });

  test("settle removes exiting items and normalizes entering items", () => {
    const settled = settleAnimatedItems([
      { key: "widget-a", item: { id: "widget-a" }, phase: "stable" as const },
      { key: "widget-b", item: { id: "widget-b" }, phase: "enter" as const },
      { key: "widget-c", item: { id: "widget-c" }, phase: "exit" as const },
    ]);

    expect(settled).toEqual([
      { key: "widget-a", item: { id: "widget-a" }, phase: "stable" },
      { key: "widget-b", item: { id: "widget-b" }, phase: "stable" },
    ]);
  });

  test("transition presets include fade, slide, and none variants", () => {
    expect(transitionPresets.fade.durationMs > 0).toBeTruthy();
    expect(transitionPresets.slide.durationMs >= transitionPresets.fade.durationMs).toBeTruthy();
    expect(transitionPresets.none.durationMs).toBe(0);
  });
});
