import { API_BASE_URL } from "../../core/config/api";
import { apiFetchWithTimeout, toApiErrorMessage } from "./apiClient";
import type { OrchestrationRule, OrchestrationRuleType } from "@ambient/shared-contracts";

const ORCHESTRATION_RULES_TIMEOUT_MS = 8000;

interface CreateOrchestrationRuleInput {
  type: OrchestrationRuleType;
  intervalSec: number;
  isActive?: boolean;
  rotationProfileIds?: string[];
  currentIndex?: number;
}

interface UpdateOrchestrationRuleInput {
  type?: OrchestrationRuleType;
  intervalSec?: number;
  isActive?: boolean;
  rotationProfileIds?: string[];
  currentIndex?: number;
}

export async function getOrchestrationRules(): Promise<OrchestrationRule[]> {
  const response = await apiFetchWithTimeout(
    `${API_BASE_URL}/orchestration-rules`,
    undefined,
    ORCHESTRATION_RULES_TIMEOUT_MS,
  );
  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch orchestration rules: ${message}`);
  }

  return response.json();
}

export async function createOrchestrationRule(
  payload: CreateOrchestrationRuleInput,
): Promise<OrchestrationRule> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/orchestration-rules`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, ORCHESTRATION_RULES_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to create orchestration rule: ${message}`);
  }

  return response.json();
}

export async function updateOrchestrationRule(
  ruleId: string,
  payload: UpdateOrchestrationRuleInput,
): Promise<OrchestrationRule> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/orchestration-rules/${ruleId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, ORCHESTRATION_RULES_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to update orchestration rule: ${message}`);
  }

  return response.json();
}

export async function deleteOrchestrationRule(ruleId: string): Promise<void> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/orchestration-rules/${ruleId}`, {
    method: "DELETE",
  }, ORCHESTRATION_RULES_TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to delete orchestration rule: ${message}`);
  }
}
