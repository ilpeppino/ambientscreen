export type TransitionType = "fade" | "slide" | "none";

export interface TransitionPreset {
  durationMs: number;
}

export const transitionPresets: Record<TransitionType, TransitionPreset> = {
  fade: { durationMs: 360 },
  slide: { durationMs: 420 },
  none: { durationMs: 0 },
};

export interface DashboardTransitionState<TDashboard> {
  currentDashboard: TDashboard | null;
  previousDashboard: TDashboard | null;
  phase: "idle" | "animating";
  transitionType: TransitionType;
  transitionId: number;
}

interface CreateTransitionManagerInput<TDashboard> {
  transitionType?: TransitionType;
  initialDashboard?: TDashboard | null;
}

export interface TransitionManager<TDashboard> {
  getState: () => DashboardTransitionState<TDashboard>;
  setTransitionType: (nextType: TransitionType) => DashboardTransitionState<TDashboard>;
  replaceDashboard: (nextDashboard: TDashboard | null) => DashboardTransitionState<TDashboard>;
  beginDashboardTransition: (nextDashboard: TDashboard | null) => DashboardTransitionState<TDashboard>;
  completeDashboardTransition: (transitionId: number) => DashboardTransitionState<TDashboard>;
  cancelDashboardTransition: () => DashboardTransitionState<TDashboard>;
}

export type AnimatedItemPhase = "enter" | "stable" | "exit";

export interface AnimatedItem<TItem> {
  key: string;
  item: TItem;
  phase: AnimatedItemPhase;
}

export function reconcileAnimatedItems<TItem>(
  previousItems: AnimatedItem<TItem>[],
  nextItems: TItem[],
  getKey: (item: TItem) => string,
): AnimatedItem<TItem>[] {
  const previousByKey = new Map(previousItems.map((entry) => [entry.key, entry]));
  const nextKeys = new Set(nextItems.map(getKey));
  const resolved: AnimatedItem<TItem>[] = [];

  for (const nextItem of nextItems) {
    const key = getKey(nextItem);
    const previous = previousByKey.get(key);

    if (!previous || previous.phase === "exit") {
      resolved.push({
        key,
        item: nextItem,
        phase: "enter",
      });
      continue;
    }

    resolved.push({
      key,
      item: nextItem,
      phase: "stable",
    });
  }

  for (const previous of previousItems) {
    if (nextKeys.has(previous.key)) {
      continue;
    }

    resolved.push({
      key: previous.key,
      item: previous.item,
      phase: "exit",
    });
  }

  return resolved;
}

export function settleAnimatedItems<TItem>(
  animatedItems: AnimatedItem<TItem>[],
): AnimatedItem<TItem>[] {
  return animatedItems
    .filter((entry) => entry.phase !== "exit")
    .map((entry) => ({
      ...entry,
      phase: "stable",
    }));
}

export function createTransitionManager<TDashboard>(
  input: CreateTransitionManagerInput<TDashboard> = {},
): TransitionManager<TDashboard> {
  let state: DashboardTransitionState<TDashboard> = {
    currentDashboard: input.initialDashboard ?? null,
    previousDashboard: null,
    phase: "idle",
    transitionType: input.transitionType ?? "fade",
    transitionId: 0,
  };

  function update(nextState: DashboardTransitionState<TDashboard>): DashboardTransitionState<TDashboard> {
    state = nextState;
    return state;
  }

  function getState(): DashboardTransitionState<TDashboard> {
    return state;
  }

  function setTransitionType(nextType: TransitionType): DashboardTransitionState<TDashboard> {
    if (state.transitionType === nextType) {
      return state;
    }

    return update({
      ...state,
      transitionType: nextType,
    });
  }

  function replaceDashboard(nextDashboard: TDashboard | null): DashboardTransitionState<TDashboard> {
    return update({
      ...state,
      currentDashboard: nextDashboard,
      previousDashboard: null,
      phase: "idle",
      transitionId: state.transitionId + 1,
    });
  }

  function beginDashboardTransition(nextDashboard: TDashboard | null): DashboardTransitionState<TDashboard> {
    if (state.transitionType === "none" || state.currentDashboard === null) {
      return replaceDashboard(nextDashboard);
    }

    return update({
      ...state,
      currentDashboard: nextDashboard,
      previousDashboard: state.currentDashboard,
      phase: "animating",
      transitionId: state.transitionId + 1,
    });
  }

  function completeDashboardTransition(transitionId: number): DashboardTransitionState<TDashboard> {
    if (state.phase !== "animating" || transitionId !== state.transitionId) {
      return state;
    }

    return update({
      ...state,
      previousDashboard: null,
      phase: "idle",
    });
  }

  function cancelDashboardTransition(): DashboardTransitionState<TDashboard> {
    return update({
      ...state,
      previousDashboard: null,
      phase: "idle",
      transitionId: state.transitionId + 1,
    });
  }

  return {
    getState,
    setTransitionType,
    replaceDashboard,
    beginDashboardTransition,
    completeDashboardTransition,
    cancelDashboardTransition,
  };
}
