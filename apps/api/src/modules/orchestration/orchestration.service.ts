import { orchestrationRepository } from "./orchestration.repository";

export const SUPPORTED_ORCHESTRATION_RULE_TYPES = ["interval", "rotation"] as const;

export type SupportedOrchestrationRuleType = (typeof SUPPORTED_ORCHESTRATION_RULE_TYPES)[number];

interface CreateOrchestrationRuleInput {
  userId: string;
  type: SupportedOrchestrationRuleType;
  intervalSec: number;
  isActive?: boolean;
  rotationProfileIds?: string[];
  currentIndex?: number;
}

interface UpdateOrchestrationRuleInput {
  id: string;
  userId: string;
  type?: SupportedOrchestrationRuleType;
  intervalSec?: number;
  isActive?: boolean;
  rotationProfileIds?: string[];
  currentIndex?: number;
}

interface DeleteOrchestrationRuleInput {
  id: string;
  userId: string;
}

export const orchestrationService = {
  getRulesForUser(userId: string) {
    return orchestrationRepository.findAllByUser(userId);
  },

  getRuleByIdForUser(input: { id: string; userId: string }) {
    return orchestrationRepository.findByIdForUser(input);
  },

  createRule(input: CreateOrchestrationRuleInput) {
    const rotationProfileIds = input.type === "rotation"
      ? input.rotationProfileIds ?? []
      : [];
    const currentIndex = input.type === "rotation"
      ? normalizeCurrentIndex(input.currentIndex, rotationProfileIds.length)
      : 0;

    return orchestrationRepository.create({
      userId: input.userId,
      type: input.type,
      intervalSec: input.intervalSec,
      isActive: input.isActive ?? true,
      rotationProfileIds,
      currentIndex,
    });
  },

  async updateRule(input: UpdateOrchestrationRuleInput) {
    const existingRule = await orchestrationRepository.findByIdForUser({
      id: input.id,
      userId: input.userId,
    });
    if (!existingRule) {
      return null;
    }

    const nextType = input.type ?? existingRule.type;
    const nextRotationProfileIds = nextType === "rotation"
      ? input.rotationProfileIds ?? existingRule.rotationProfileIds
      : [];
    const nextCurrentIndex = nextType === "rotation"
      ? normalizeCurrentIndex(input.currentIndex ?? existingRule.currentIndex, nextRotationProfileIds.length)
      : 0;

    return orchestrationRepository.update({
      ...input,
      rotationProfileIds: nextRotationProfileIds,
      currentIndex: nextCurrentIndex,
    });
  },

  deleteRule(input: DeleteOrchestrationRuleInput) {
    return orchestrationRepository.deleteById(input);
  },

  removeProfileFromRotationRules(input: { userId: string; profileId: string }) {
    return orchestrationRepository.removeProfileFromRotationRules(input);
  },
};

function normalizeCurrentIndex(index: number | undefined, profileCount: number): number {
  if (profileCount <= 0) {
    return 0;
  }

  if (index === undefined || !Number.isInteger(index) || index < 0) {
    return 0;
  }

  return index % profileCount;
}
