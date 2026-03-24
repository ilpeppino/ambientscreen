import { useCallback, useEffect, useState } from "react";
import type { Profile } from "@ambient/shared-contracts";
import {
  createOrchestrationRule,
  getOrchestrationRules,
  updateOrchestrationRule,
} from "../../../services/api/orchestrationRulesApi";

interface PatchSessionParams {
  slideshowEnabled?: boolean;
  slideshowIntervalSec?: number;
  rotationProfileIds?: string[];
  currentIndex?: number;
  activeProfileId?: string | null;
}

interface UseSlideshowConfigOptions {
  isSharedMode: boolean;
  profiles: Profile[];
  effectiveActiveProfileId: string | null | undefined;
  patchCurrentSession: (params: PatchSessionParams) => Promise<void>;
  onAfterSave?: () => Promise<void>;
  // Shared session sync values — pass when sharedSession is non-null
  sharedSessionSlideshowEnabled?: boolean;
  sharedSessionIntervalSec?: number;
  sharedSessionRotationProfileIds?: string[];
}

interface UseSlideshowConfigReturn {
  slideshowEnabled: boolean;
  setSlideshowEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  slideshowIntervalSecInput: string;
  setSlideshowIntervalSecInput: React.Dispatch<React.SetStateAction<string>>;
  slideshowProfileIds: string[];
  setSlideshowProfileIds: React.Dispatch<React.SetStateAction<string[]>>;
  slideshowRuleId: string | null;
  setSlideshowRuleId: React.Dispatch<React.SetStateAction<string | null>>;
  slideshowSaveError: string | null;
  setSlideshowSaveError: React.Dispatch<React.SetStateAction<string | null>>;
  savingSlideshow: boolean;
  loadSlideshowConfiguration: () => Promise<void>;
  handleSaveSlideshow: () => Promise<void>;
  toggleSlideshowProfileId: (profileId: string) => void;
}

export function useSlideshowConfig({
  isSharedMode,
  profiles,
  effectiveActiveProfileId,
  patchCurrentSession,
  onAfterSave,
}: UseSlideshowConfigOptions): UseSlideshowConfigReturn {
  const [slideshowEnabled, setSlideshowEnabled] = useState(false);
  const [slideshowIntervalSecInput, setSlideshowIntervalSecInput] = useState("60");
  const [slideshowProfileIds, setSlideshowProfileIds] = useState<string[]>([]);
  const [slideshowRuleId, setSlideshowRuleId] = useState<string | null>(null);
  const [slideshowSaveError, setSlideshowSaveError] = useState<string | null>(null);
  const [savingSlideshow, setSavingSlideshow] = useState(false);

  const loadSlideshowConfiguration = useCallback(async () => {
    if (isSharedMode) {
      return;
    }

    try {
      setSlideshowSaveError(null);
      const rules = await getOrchestrationRules();
      const rotationRule = rules.find((rule) => rule.type === "rotation") ?? null;
      if (!rotationRule) {
        setSlideshowRuleId(null);
        setSlideshowEnabled(false);
        setSlideshowIntervalSecInput("60");
        setSlideshowProfileIds([]);
        return;
      }

      setSlideshowRuleId(rotationRule.id);
      setSlideshowEnabled(rotationRule.isActive);
      setSlideshowIntervalSecInput(String(rotationRule.intervalSec));
      setSlideshowProfileIds(rotationRule.rotationProfileIds);
    } catch (error) {
      console.error(error);
      setSlideshowSaveError("Failed to load slideshow settings");
    }
  }, [isSharedMode]);

  // Filter out profiles that no longer exist; disable if fewer than 2 available
  useEffect(() => {
    const availableProfileIds = new Set(profiles.map((profile) => profile.id));
    setSlideshowProfileIds((current) => current.filter((profileId) => availableProfileIds.has(profileId)));
    if (profiles.length < 2) {
      setSlideshowEnabled(false);
    }
  }, [profiles]);

  // Load when profiles are available (standalone mode only)
  useEffect(() => {
    if (profiles.length === 0 || isSharedMode) {
      return;
    }

    void loadSlideshowConfiguration();
  }, [isSharedMode, loadSlideshowConfiguration, profiles.length]);

  const toggleSlideshowProfileId = useCallback((profileId: string) => {
    setSlideshowProfileIds((current) => {
      if (current.includes(profileId)) {
        return current.filter((id) => id !== profileId);
      }
      return [...current, profileId];
    });
  }, []);

  const handleSaveSlideshow = useCallback(async () => {
    if (savingSlideshow) {
      return;
    }

    try {
      setSavingSlideshow(true);
      setSlideshowSaveError(null);

      if (isSharedMode) {
        const parsedIntervalSec = Number.parseInt(slideshowIntervalSecInput.trim(), 10);
        if (Number.isNaN(parsedIntervalSec) || parsedIntervalSec <= 0) {
          setSlideshowSaveError("Slideshow interval must be a positive number");
          return;
        }

        const normalizedProfileIds = slideshowEnabled ? slideshowProfileIds : [];
        if (slideshowEnabled && normalizedProfileIds.length < 2) {
          setSlideshowSaveError("Select at least two profiles for slideshow mode");
          return;
        }

        await patchCurrentSession({
          slideshowEnabled,
          slideshowIntervalSec: parsedIntervalSec,
          rotationProfileIds: normalizedProfileIds,
          currentIndex: 0,
          activeProfileId: normalizedProfileIds.length > 0
            ? normalizedProfileIds[0]
            : effectiveActiveProfileId,
        });
        return;
      }

      if (!slideshowEnabled) {
        if (!slideshowRuleId) {
          return;
        }

        await updateOrchestrationRule(slideshowRuleId, { isActive: false });
      } else {
        const parsedIntervalSec = Number.parseInt(slideshowIntervalSecInput.trim(), 10);
        if (Number.isNaN(parsedIntervalSec) || parsedIntervalSec <= 0) {
          setSlideshowSaveError("Slideshow interval must be a positive number");
          return;
        }

        if (slideshowProfileIds.length < 2) {
          setSlideshowSaveError("Select at least two profiles for slideshow mode");
          return;
        }

        if (!slideshowRuleId) {
          const createdRule = await createOrchestrationRule({
            type: "rotation",
            intervalSec: parsedIntervalSec,
            isActive: true,
            rotationProfileIds: slideshowProfileIds,
          });
          setSlideshowRuleId(createdRule.id);
        } else {
          await updateOrchestrationRule(slideshowRuleId, {
            type: "rotation",
            intervalSec: parsedIntervalSec,
            isActive: true,
            rotationProfileIds: slideshowProfileIds,
          });
        }
      }

      await onAfterSave?.();
    } catch (error) {
      console.error(error);
      setSlideshowSaveError(toErrorMessage(error, "Failed to save slideshow settings"));
    } finally {
      setSavingSlideshow(false);
    }
  }, [
    effectiveActiveProfileId,
    isSharedMode,
    onAfterSave,
    patchCurrentSession,
    savingSlideshow,
    slideshowEnabled,
    slideshowIntervalSecInput,
    slideshowProfileIds,
    slideshowRuleId,
  ]);

  return {
    slideshowEnabled,
    setSlideshowEnabled,
    slideshowIntervalSecInput,
    setSlideshowIntervalSecInput,
    slideshowProfileIds,
    setSlideshowProfileIds,
    slideshowRuleId,
    setSlideshowRuleId,
    slideshowSaveError,
    setSlideshowSaveError,
    savingSlideshow,
    loadSlideshowConfiguration,
    handleSaveSlideshow,
    toggleSlideshowProfileId,
  };
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}
