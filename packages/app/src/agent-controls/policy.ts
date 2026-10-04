import type { AgentFeature, AgentMode } from "@getpaseo/protocol/agent-types";
import { getIsElectronMac } from "@/constants/platform";

export const PLAN_MODE_FEATURE_ID = "plan_mode";
export const FAST_MODE_FEATURE_ID = "fast_mode";

export function isPlanningAgentMode(mode: Pick<AgentMode, "id" | "colorTier">): boolean {
  return mode.colorTier === "planning" || mode.id === "plan" || mode.id.endsWith("#plan");
}

export function resolveNonPlanningModeId(
  modes: readonly AgentMode[],
  defaultModeId: string | null,
): string | null {
  const defaultMode = modes.find((mode) => mode.id === defaultModeId);
  if (defaultMode && !isPlanningAgentMode(defaultMode)) {
    return defaultMode.id;
  }
  return modes.find((mode) => !isPlanningAgentMode(mode))?.id ?? null;
}

// The Mac desktop offers three permission tiers (ask, auto-review, full access); plan is a
// separate toggle and Claude's accept-edits tier is not offered.
export function filterDesktopAgentModes(
  modes: readonly AgentMode[],
  provider: string | null | undefined,
): AgentMode[] {
  return modes.filter(
    (mode) => !isPlanningAgentMode(mode) && !(provider === "claude" && mode.id === "acceptEdits"),
  );
}

export function getSelectableAgentModes(
  modes: AgentMode[],
  provider: string | null | undefined,
): AgentMode[] {
  return getIsElectronMac() ? filterDesktopAgentModes(modes, provider) : modes;
}

// Client-side memory of the permission mode an agent had before entering a planning mode.
// ponytail: module-level, not persisted. Claude briefly runs in acceptEdits after plan approval
// until the client setMode lands; fixing that needs a backend change.
const baseModeByOwner = new Map<string, string>();

interface ModeSelection {
  options: readonly AgentMode[];
  selectedId: string | null;
  select(modeId: string): void | Promise<void>;
}

function isPlanningModeId(options: readonly AgentMode[], modeId: string | null): boolean {
  const mode = options.find((option) => option.id === modeId);
  return Boolean(mode && isPlanningAgentMode(mode));
}

export function rememberBaseMode(ownerKey: string, modeId: string): void {
  baseModeByOwner.set(ownerKey, modeId);
}

export function getDisplayedModeId(
  ownerKey: string,
  options: readonly AgentMode[],
  selectedId: string | null,
): string | null {
  return (
    (isPlanningModeId(options, selectedId) ? baseModeByOwner.get(ownerKey) : null) ?? selectedId
  );
}

// A permission pick made while a mode-based plan is on changes the base, not the plan.
export function selectPermissionMode(
  ownerKey: string,
  modes: ModeSelection,
  modeId: string,
): void | Promise<void> {
  if (isPlanningModeId(modes.options, modes.selectedId) && baseModeByOwner.has(ownerKey)) {
    baseModeByOwner.set(ownerKey, modeId);
    return;
  }
  return modes.select(modeId);
}

// Returns the base mode to re-apply when the agent left plan for a different mode on its own
// (e.g. the server's switch after the plan is approved), and always forgets the base.
export function takeBaseModeOnPlanExit(
  ownerKey: string,
  options: readonly AgentMode[],
  previousId: string | null,
  currentId: string | null,
): string | null {
  if (!isPlanningModeId(options, previousId) || isPlanningModeId(options, currentId)) return null;
  const base = baseModeByOwner.get(ownerKey);
  baseModeByOwner.delete(ownerKey);
  const known = options.some((option) => option.id === base);
  return base && known && base !== currentId ? base : null;
}

type ToggleFeature = Extract<AgentFeature, { type: "toggle" }>;

export interface PlanToggle {
  // Set when the provider exposes plan as a feature (Codex); null when it is a planning mode.
  feature: ToggleFeature | null;
  isOn: boolean;
  turnOn(): void | Promise<void>;
  turnOff(): void | Promise<void>;
}

export function resolvePlanToggle(input: {
  ownerKey: string;
  features: readonly AgentFeature[];
  setFeature(featureId: string, value: unknown): void | Promise<void>;
  modes?: ModeSelection & { defaultModeId: string | null };
}): PlanToggle | null {
  const feature = input.features.find(
    (item): item is ToggleFeature => item.id === PLAN_MODE_FEATURE_ID && item.type === "toggle",
  );
  if (feature) {
    return {
      feature,
      isOn: feature.value,
      turnOn: () => input.setFeature(PLAN_MODE_FEATURE_ID, true),
      turnOff: () => input.setFeature(PLAN_MODE_FEATURE_ID, false),
    };
  }
  const { modes, ownerKey } = input;
  const planMode = modes?.options.find(isPlanningAgentMode);
  const defaultOffModeId = modes && resolveNonPlanningModeId(modes.options, modes.defaultModeId);
  if (!modes || !planMode || !defaultOffModeId) return null;
  return {
    feature: null,
    isOn: modes.selectedId === planMode.id,
    turnOn: () => {
      if (modes.selectedId) rememberBaseMode(ownerKey, modes.selectedId);
      return modes.select(planMode.id);
    },
    turnOff: () => {
      const base = baseModeByOwner.get(ownerKey);
      baseModeByOwner.delete(ownerKey);
      const known = modes.options.some((option) => option.id === base);
      return modes.select(base && known ? base : defaultOffModeId);
    },
  };
}
