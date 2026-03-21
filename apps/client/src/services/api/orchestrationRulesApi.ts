import { API_BASE_URL } from "../../core/config/api";
import type { OrchestrationRule, OrchestrationRuleType } from "@ambient/shared-contracts";

const ORCHESTRATION_RULES_TIMEOUT_MS = 8000;

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
}

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

async function toApiErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorResponse;
    if (body.error?.message) {
      return body.error.message;
    }
  } catch {
    // Fallback to status-based message when response is not JSON.
  }

  return `Request failed with status ${response.status}`;
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    abortController.abort();
  }, ORCHESTRATION_RULES_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: abortController.signal,
    });
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      throw new Error(`Request timed out after ${ORCHESTRATION_RULES_TIMEOUT_MS}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function getOrchestrationRules(): Promise<OrchestrationRule[]> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/orchestration-rules`);
  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch orchestration rules: ${message}`);
  }

  return response.json();
}

export async function createOrchestrationRule(
  payload: CreateOrchestrationRuleInput,
): Promise<OrchestrationRule> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/orchestration-rules`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

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
  const response = await fetchWithTimeout(`${API_BASE_URL}/orchestration-rules/${ruleId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to update orchestration rule: ${message}`);
  }

  return response.json();
}

export async function deleteOrchestrationRule(ruleId: string): Promise<void> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/orchestration-rules/${ruleId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to delete orchestration rule: ${message}`);
  }
}
