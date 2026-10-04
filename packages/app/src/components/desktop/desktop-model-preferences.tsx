import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type InputHTMLAttributes,
  type PointerEvent,
} from "react";
import { Pressable, Text, View, type PressableStateCallbackType } from "react-native";
import { ChevronRight, RotateCcw, Zap } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import type { AgentSelectOption } from "@getpaseo/protocol/agent-types";
import { HeaderToggleButton } from "@/components/headers/header-toggle-button";
import type { Theme } from "@/styles/theme";
import { getIsElectronMac } from "@/constants/platform";

export interface DesktopThinkingControl {
  options: readonly AgentSelectOption[];
  selectedId?: string;
  label: string;
  disabled: boolean;
  onSelect: (id: string) => void;
  // Present only when the agent has the fast_mode feature.
  fast?: { on: boolean; label: string; onToggle: () => void };
}

const THUMB_SIZE = 28;

// One dot per stop, centered where the thumb sits at that stop.
function buildStopDots(stops: number): string {
  if (stops < 2) return "linear-gradient(transparent, transparent)";
  return Array.from({ length: stops }, (_, index) => {
    const x = `calc(${THUMB_SIZE / 2}px + (100% - ${THUMB_SIZE}px) * ${index / (stops - 1)})`;
    return `radial-gradient(circle at ${x} 50%, var(--paseo-effort-dot) 0 2px, transparent 2.5px)`;
  }).join(", ");
}

function EffortRange({
  accentColor,
  thumbColor,
  trackColor,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  accentColor: string;
  thumbColor: string;
  trackColor: string;
}) {
  const stops = Number(props.max) + 1;
  const maximum = Number(props.max);
  const fill =
    maximum > 0 ? Math.max(0, Math.min(100, (Number(props.value) / maximum) * 100)) : 100;
  const style = useMemo<CSSProperties>(
    () =>
      ({
        width: "100%",
        height: 28,
        margin: 0,
        accentColor,
        "--paseo-effort-color": accentColor,
        "--paseo-effort-thumb": thumbColor,
        "--paseo-effort-track": trackColor,
        "--paseo-effort-fill": `${fill}%`,
        "--paseo-effort-dot": `color-mix(in srgb, ${thumbColor} 45%, transparent)`,
        "--paseo-effort-dots": buildStopDots(stops),
      }) as CSSProperties,
    [accentColor, thumbColor, trackColor, fill, stops],
  );
  return (
    <>
      <style>{RANGE_CSS}</style>
      <input {...props} className="paseo-desktop-effort-range" style={style} />
    </>
  );
}

const RANGE_CSS = `
.paseo-desktop-effort-range { appearance: none; background: transparent; cursor: pointer; border-radius: 999px; }
.paseo-desktop-effort-range::-webkit-slider-runnable-track { height: 24px; border-radius: 999px; background: var(--paseo-effort-dots), linear-gradient(to right, var(--paseo-effort-color) var(--paseo-effort-fill), var(--paseo-effort-track) var(--paseo-effort-fill)); }
.paseo-desktop-effort-range::-webkit-slider-thumb { appearance: none; width: 28px; height: 28px; margin-top: -2px; border: 0; border-radius: 50%; background: var(--paseo-effort-thumb); }
.paseo-desktop-effort-range:focus-visible { outline: 2px solid var(--paseo-effort-color); outline-offset: 3px; }
.paseo-desktop-effort-range:disabled { opacity: 0.5; cursor: default; }
`;

const CODEX_EFFORT_ACCENT = "#d97757";
const Range = withUnistyles(EffortRange, (theme, rt) => ({
  accentColor:
    getIsElectronMac() && rt.themeName === "dark"
      ? CODEX_EFFORT_ACCENT
      : theme.colors.palette.orange[500],
  thumbColor: theme.colors.foreground,
  trackColor: theme.colors.surface4,
}));
const RightIcon = withUnistyles(ChevronRight);
const ResetIcon = withUnistyles(RotateCcw);
const effortColor = (theme: Theme, rt: { themeName?: string }) =>
  getIsElectronMac() && rt.themeName === "dark"
    ? CODEX_EFFORT_ACCENT
    : theme.colors.palette.orange[500];
const FastIcon = withUnistyles(Zap, (theme, rt) => ({ color: effortColor(theme, rt) }));
const FastIconFilled = withUnistyles(Zap, (theme, rt) => ({
  color: effortColor(theme, rt),
  fill: effortColor(theme, rt),
}));
const mutedIcon = (theme: Theme) => ({ color: theme.colors.foregroundMuted });
// A sibling of the label (not inline inside Button's Text) so the row centers it vertically.
const FAST_ON_STATE = { selected: true };
const FAST_OFF_STATE = { selected: false };
const chevron = <RightIcon size={14} uniProps={mutedIcon} />;
// Effort and model are one hover target, as in Codex; hover only tints the background.
const browseStyle = ({ hovered, pressed }: PressableStateCallbackType & { hovered?: boolean }) => [
  styles.browse,
  (hovered || pressed) && styles.browseHovered,
];

export function DesktopModelPreferences({
  thinking,
  modelLabel,
  onBrowseModels,
}: {
  thinking: DesktopThinkingControl;
  modelLabel: string;
  onBrowseModels: () => void;
}) {
  const { t } = useTranslation();
  const selectedIndex = Math.max(
    0,
    thinking.options.findIndex((item) => item.id === thinking.selectedId),
  );
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const dragging = useRef(false);
  const displayedIndex = Math.min(previewIndex ?? selectedIndex, thinking.options.length - 1);
  const defaultOption = thinking.options.find((option) => option.isDefault);
  const select = useCallback(
    (index: number) => {
      const option = thinking.options[index];
      if (option && option.id !== thinking.selectedId) thinking.onSelect(option.id);
    },
    [thinking],
  );
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const index = Number(event.currentTarget.value);
      if (dragging.current) setPreviewIndex(index);
      else select(index);
    },
    [select],
  );
  const startDrag = useCallback((event: PointerEvent<HTMLInputElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);
  const finishDrag = useCallback(
    (event: PointerEvent<HTMLInputElement>) => {
      if (!dragging.current) return;
      dragging.current = false;
      select(Number(event.currentTarget.value));
      setPreviewIndex(null);
    },
    [select],
  );
  const cancelDrag = useCallback(() => {
    dragging.current = false;
    setPreviewIndex(null);
  }, []);
  const reset = useCallback(() => {
    if (defaultOption) thinking.onSelect(defaultOption.id);
  }, [defaultOption, thinking]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {thinking.fast ? (
          <HeaderToggleButton
            onPress={thinking.fast.onToggle}
            disabled={thinking.disabled}
            tooltipLabel={thinking.fast.label}
            tooltipKeys={[]}
            tooltipSide="top"
            accessibilityLabel={thinking.fast.label}
            accessibilityRole="button"
            accessibilityState={thinking.fast.on ? FAST_ON_STATE : FAST_OFF_STATE}
            testID="desktop-fast-toggle"
            style={styles.resetSpace}
          >
            {thinking.fast.on ? <FastIconFilled size={16} /> : <FastIcon size={16} />}
          </HeaderToggleButton>
        ) : (
          <View style={styles.resetSpace} />
        )}
        <View style={styles.browseSlot}>
          <Pressable
            onPress={onBrowseModels}
            style={browseStyle}
            accessibilityRole="button"
            accessibilityLabel={t("modelSelector.selectedModel", { model: modelLabel })}
            testID="desktop-model-browse"
          >
            <Text style={styles.level}>
              {thinking.options[displayedIndex]?.label ?? thinking.label}
            </Text>
            <View style={styles.modelRow}>
              <Text style={styles.modelLabel} numberOfLines={1}>
                {modelLabel}
              </Text>
              {chevron}
            </View>
          </Pressable>
        </View>
        {defaultOption ? (
          <HeaderToggleButton
            onPress={reset}
            disabled={thinking.disabled || thinking.selectedId === defaultOption.id}
            tooltipLabel={t("desktopChat.resetReasoning")}
            tooltipKeys={[]}
            tooltipSide="top"
            accessibilityLabel={t("desktopChat.resetReasoning")}
            accessibilityRole="button"
            testID="desktop-thinking-reset"
            style={styles.resetSpace}
          >
            <ResetIcon size={16} uniProps={mutedIcon} />
          </HeaderToggleButton>
        ) : (
          <View style={styles.resetSpace} />
        )}
      </View>
      <Range
        type="range"
        min={0}
        max={Math.max(0, thinking.options.length - 1)}
        step={1}
        value={displayedIndex}
        disabled={thinking.disabled || thinking.options.length < 2}
        aria-label={t("agentControls.thinking.title")}
        aria-valuetext={thinking.options[displayedIndex]?.label ?? thinking.label}
        data-testid="desktop-thinking-range"
        onChange={change}
        onPointerDown={startDrag}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { padding: theme.spacing[3] },
  // Top-aligned so the side buttons sit on the effort line.
  header: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing[2] },
  browseSlot: { flex: 1, minWidth: 0, alignItems: "center" },
  browse: {
    maxWidth: "100%",
    alignItems: "center",
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.lg,
  },
  browseHovered: { backgroundColor: theme.colors.surface2 },
  level: {
    textAlign: "center",
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color:
      getIsElectronMac() && rt.themeName === "dark"
        ? CODEX_EFFORT_ACCENT
        : theme.colors.palette.orange[500],
  },
  modelRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing[1], maxWidth: "100%" },
  modelLabel: { flexShrink: 1, fontSize: theme.fontSize.sm, color: theme.colors.foregroundMuted },
  resetSpace: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
}));
