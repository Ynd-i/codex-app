import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import type { AgentFeature } from "@getpaseo/protocol/agent-types";
import { PlanModeIcon } from "@/agent-controls/icons";
import {
  type PlanToggle,
  adoptDraftBaseMode,
  getDisplayedModeId,
  resolvePlanToggle,
  selectPermissionMode,
  takeBaseModeOnPlanExit,
} from "@/agent-controls/policy";
import { resolveDefaultModeId } from "@/command-center/agent-control-registration";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AgentControlTrigger } from "@/composer/agent-controls/control";
import type { AgentModeControlValue } from "@/composer/agent-controls/mode-control";

// Plan is a toggle next to the permission mode: the trigger keeps showing the base permission
// mode while a mode-based plan (Claude, OpenCode, Copilot) is on, and leaving plan re-applies it.
export function useDesktopPlanMode(input: {
  enabled: boolean;
  ownerKey: string;
  modeControl: AgentModeControlValue | null | undefined;
  features: AgentFeature[] | undefined;
  onSetFeature: ((featureId: string, value: unknown) => void) | undefined;
}) {
  const { enabled, ownerKey, modeControl, features, onSetFeature } = input;
  const [version, bump] = useReducer((count: number) => count + 1, 0);
  const selectedId = modeControl?.selectedModeId ?? null;
  const previousRef = useRef({ ownerKey, selectedId });

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = { ownerKey, selectedId };
    if (!enabled || !modeControl || previous.ownerKey !== ownerKey) return;
    const restoreModeId = takeBaseModeOnPlanExit(
      ownerKey,
      modeControl.modeOptions,
      previous.selectedId,
      selectedId,
    );
    if (restoreModeId) modeControl.onSelectMode(restoreModeId);
  }, [enabled, modeControl, ownerKey, selectedId]);

  useEffect(() => {
    if (!enabled || !modeControl) return;
    if (adoptDraftBaseMode(ownerKey, modeControl.modeOptions, selectedId)) bump();
  }, [enabled, modeControl, ownerKey, selectedId]);

  const displayedModeControl = useMemo(() => {
    if (!enabled || !modeControl) return modeControl;
    const modes = {
      options: modeControl.modeOptions,
      selectedId,
      select: modeControl.onSelectMode,
    };
    return {
      ...modeControl,
      selectedModeId: getDisplayedModeId(ownerKey, modeControl.modeOptions, selectedId),
      onSelectMode: (modeId: string) => {
        const result = selectPermissionMode(ownerKey, modes, modeId);
        bump();
        return result;
      },
    };
    // version: the remembered base mode lives outside React state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, modeControl, ownerKey, selectedId, version]);

  const planToggle =
    enabled && onSetFeature
      ? resolvePlanToggle({
          ownerKey,
          features: features ?? [],
          setFeature: onSetFeature,
          modes: modeControl
            ? {
                options: modeControl.modeOptions,
                selectedId,
                defaultModeId: resolveDefaultModeId(
                  modeControl.provider,
                  modeControl.providerDefinitions,
                ),
                select: modeControl.onSelectMode,
              }
            : undefined,
        })
      : null;

  return { modeControl: displayedModeControl, planToggle };
}

export function PlanModeToggle({
  toggle,
  iconColor,
  disabled,
}: {
  toggle: PlanToggle;
  iconColor: string;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const label = t("shell.commandCenter.planModeGroupLabel");
  const handlePress = useCallback(() => {
    void (toggle.isOn ? toggle.turnOff() : toggle.turnOn());
  }, [toggle]);
  return (
    <Tooltip delayDuration={0} enabledOnDesktop enabledOnMobile={false}>
      <TooltipTrigger asChild triggerRefProp="ref">
        <AgentControlTrigger
          icon={PlanModeIcon}
          iconColor={iconColor}
          surface="toolbar"
          label={label}
          showToolbarLabel={false}
          disabled={disabled}
          onPress={handlePress}
          accessibilityLabel={label}
          testID="agent-plan-toggle"
        />
      </TooltipTrigger>
      <TooltipContent side="top" align="center" offset={8}>
        <Text style={styles.tooltipText}>{label}</Text>
      </TooltipContent>
    </Tooltip>
  );
}

const styles = StyleSheet.create((theme) => ({
  tooltipText: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    lineHeight: theme.fontSize.base * 1.4,
  },
}));
