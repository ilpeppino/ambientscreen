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

function isIntervalRule(rule: OrchestrationRule): boolean {
  return rule.type === "interval";
}

export function createOrchestrationEngine(
  input: CreateOrchestrationEngineInput,
): OrchestrationEngine {
  const loadRules = input.loadRules ?? defaultLoadRules;
  const timerApi = input.timerApi ?? defaultTimerApi;
  const logger = input.logger ?? defaultLogger;
  const intervalByRuleId = new Map<string, IntervalHandle>();
  const activeRuleById = new Map<string, OrchestrationRule>();
  const runningRuleIds = new Set<string>();
  let isStarted = false;

  async function executeRule(rule: OrchestrationRule) {
    if (runningRuleIds.has(rule.id)) {
      return;
    }

    runningRuleIds.add(rule.id);
    try {
      await Promise.resolve(input.onRefresh());
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
    runningRuleIds.delete(ruleId);
    logger.info("rule stopped", {
      ruleId,
    });
  }

  function startRule(rule: OrchestrationRule) {
    const existingRule = activeRuleById.get(rule.id);
    if (existingRule && existingRule.intervalSec === rule.intervalSec) {
      return;
    }

    stopRule(rule.id);
    activeRuleById.set(rule.id, rule);
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
    const activeRules = rules.filter((rule) => rule.isActive && isIntervalRule(rule));
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
