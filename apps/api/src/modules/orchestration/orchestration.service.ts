import { orchestrationRepository } from "./orchestration.repository";

export const SUPPORTED_ORCHESTRATION_RULE_TYPES = ["interval"] as const;

export type SupportedOrchestrationRuleType = (typeof SUPPORTED_ORCHESTRATION_RULE_TYPES)[number];

interface CreateOrchestrationRuleInput {
  userId: string;
  type: SupportedOrchestrationRuleType;
  intervalSec: number;
  isActive?: boolean;
}

interface UpdateOrchestrationRuleInput {
  id: string;
  userId: string;
  type?: SupportedOrchestrationRuleType;
  intervalSec?: number;
  isActive?: boolean;
}

interface DeleteOrchestrationRuleInput {
  id: string;
  userId: string;
}

export const orchestrationService = {
  getRulesForUser(userId: string) {
    return orchestrationRepository.findAllByUser(userId);
  },

  createRule(input: CreateOrchestrationRuleInput) {
    return orchestrationRepository.create({
      userId: input.userId,
      type: input.type,
      intervalSec: input.intervalSec,
      isActive: input.isActive ?? true,
    });
  },

  updateRule(input: UpdateOrchestrationRuleInput) {
    return orchestrationRepository.update(input);
  },

  deleteRule(input: DeleteOrchestrationRuleInput) {
    return orchestrationRepository.deleteById(input);
  },
};
