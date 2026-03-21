import type { OrchestrationRule } from "@ambient/shared-contracts";

type IntervalHandle = ReturnType<typeof setInterval>;

interface TimerApi {
  setInterval: (callback: () => void, intervalMs: number) => IntervalHandle;
  clearInterval: (intervalId: IntervalHandle) => void;
}

interface OrchestrationLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

interface CreateOrchestrationEngineInput {
  loadRules?: () => Promise<OrchestrationRule[]>;
  onRefresh: () => void | Promise<void>;
  onSwitchProfile?: (profileId: string) => void | Promise<void>;
  onRuleExecuted?: (rule: OrchestrationRule) => void;
  timerApi?: TimerApi;
  logger?: OrchestrationLogger;
}

export interface OrchestrationEngine {
  start: () => Promise<void>;
  reload: () => Promise<void>;
  stop: () => void;
}

const defaultTimerApi: TimerApi = {
  setInterval: (callback, intervalMs) => setInterval(callback, intervalMs),
  clearInterval: (intervalId) => clearInterval(intervalId),
};

const defaultLogger: OrchestrationLogger = {
  info: (message, meta) => {
    console.info(`[orchestration] ${message}`, meta ?? {});
  },
  error: (message, meta) => {
    console.error(`[orchestration] ${message}`, meta ?? {});
  },
};

async function defaultLoadRules(): Promise<OrchestrationRule[]> {
  const { getOrchestrationRules } = await import("../../../services/api/orchestrationRulesApi");
  return getOrchestrationRules();
}

function isSupportedRule(rule: OrchestrationRule): boolean {
  return rule.type === "interval" || rule.type === "rotation";
}

function normalizeIndex(index: number, profileCount: number): number {
  if (profileCount <= 0) {
    return 0;
  }

  if (!Number.isInteger(index) || index < 0) {
    return 0;
  }

  return index % profileCount;
}

function areRulesEquivalent(previousRule: OrchestrationRule, nextRule: OrchestrationRule): boolean {
  if (previousRule.type !== nextRule.type || previousRule.intervalSec !== nextRule.intervalSec) {
    return false;
  }

  if (previousRule.type !== "rotation" || nextRule.type !== "rotation") {
    return true;
  }

  if (previousRule.currentIndex !== nextRule.currentIndex) {
    return false;
  }

  if (previousRule.rotationProfileIds.length !== nextRule.rotationProfileIds.length) {
    return false;
  }

  return previousRule.rotationProfileIds.every((profileId, index) => (
    profileId === nextRule.rotationProfileIds[index]
  ));
}

export function createOrchestrationEngine(
  input: CreateOrchestrationEngineInput,
): OrchestrationEngine {
  const loadRules = input.loadRules ?? defaultLoadRules;
  const timerApi = input.timerApi ?? defaultTimerApi;
  const logger = input.logger ?? defaultLogger;
  const intervalByRuleId = new Map<string, IntervalHandle>();
  const activeRuleById = new Map<string, OrchestrationRule>();
  const currentIndexByRuleId = new Map<string, number>();
  const runningRuleIds = new Set<string>();
  let isStarted = false;

  async function executeRotationRule(rule: OrchestrationRule) {
    const profileIds = rule.rotationProfileIds;
    if (profileIds.length < 2) {
      logger.info("rotation skipped due to insufficient profiles", {
        ruleId: rule.id,
        profileCount: profileIds.length,
      });
      return;
    }

    if (!input.onSwitchProfile) {
      logger.error("rotation rule skipped because onSwitchProfile callback is missing", {
        ruleId: rule.id,
      });
      return;
    }

    const currentIndex = normalizeIndex(currentIndexByRuleId.get(rule.id) ?? rule.currentIndex, profileIds.length);
    const nextIndex = (currentIndex + 1) % profileIds.length;
    const nextProfileId = profileIds[nextIndex];
    currentIndexByRuleId.set(rule.id, nextIndex);
    await Promise.resolve(input.onSwitchProfile(nextProfileId));
  }

  async function executeRule(rule: OrchestrationRule) {
    if (runningRuleIds.has(rule.id)) {
      return;
    }

    runningRuleIds.add(rule.id);
    try {
      if (rule.type === "rotation") {
        await executeRotationRule(rule);
      } else {
        await Promise.resolve(input.onRefresh());
      }

      input.onRuleExecuted?.(rule);
      logger.info("rule executed", {
        ruleId: rule.id,
        type: rule.type,
      });
    } catch (error) {
      logger.error("rule execution failed", {
        ruleId: rule.id,
        type: rule.type,
        error: error instanceof Error ? error.message : "unknown",
      });
    } finally {
      runningRuleIds.delete(rule.id);
    }
  }

  function stopRule(ruleId: string) {
    const interval = intervalByRuleId.get(ruleId);
    if (!interval) {
      return;
    }

    timerApi.clearInterval(interval);
    intervalByRuleId.delete(ruleId);
    activeRuleById.delete(ruleId);
    currentIndexByRuleId.delete(ruleId);
    runningRuleIds.delete(ruleId);
    logger.info("rule stopped", {
      ruleId,
    });
  }

  function startRule(rule: OrchestrationRule) {
    const existingRule = activeRuleById.get(rule.id);
    if (existingRule && areRulesEquivalent(existingRule, rule)) {
      return;
    }

    stopRule(rule.id);
    activeRuleById.set(rule.id, rule);
    if (rule.type === "rotation") {
      currentIndexByRuleId.set(rule.id, normalizeIndex(rule.currentIndex, rule.rotationProfileIds.length));
    }

    const intervalMs = rule.intervalSec * 1000;
    const intervalId = timerApi.setInterval(() => {
      void executeRule(rule);
    }, intervalMs);
    intervalByRuleId.set(rule.id, intervalId);

    logger.info("rule started", {
      ruleId: rule.id,
      type: rule.type,
      intervalSec: rule.intervalSec,
    });
  }

  function syncRules(rules: OrchestrationRule[]) {
    const activeRules = rules.filter((rule) => rule.isActive && isSupportedRule(rule));
    const activeRuleIds = new Set(activeRules.map((rule) => rule.id));

    for (const ruleId of intervalByRuleId.keys()) {
      if (!activeRuleIds.has(ruleId)) {
        stopRule(ruleId);
      }
    }

    for (const rule of activeRules) {
      startRule(rule);
    }
  }

  async function reload() {
    if (!isStarted) {
      return;
    }

    const rules = await loadRules();
    syncRules(rules);
  }

  async function start() {
    isStarted = true;
    await reload();
  }

  function stop() {
    isStarted = false;
    for (const ruleId of intervalByRuleId.keys()) {
      stopRule(ruleId);
    }
  }

  return {
    start,
    reload,
    stop,
  };
}
