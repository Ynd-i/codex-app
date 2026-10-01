import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { clampPct, formatDisplayPct, formatPct, formatUsageDeadline } from "./format";
import { displayPercent, usageWindowRowLabel } from "./model";
import type { UsageDisplayAs } from "./preferences";
import { UsageDeadline } from "./deadline";
import { windowTone } from "./tone";
import { UsageMeter } from "./meter";
import type { UsageTone, UsageWindow } from "./types";

// Pinned rows carry the pinned surface; hovering an unpinned row previews it at half strength,
// so a hover never reads as the selection. Pinned rows do not react to hover.
function highlightStyle(pinned: boolean, hovered: boolean) {
  if (pinned) return styles.highlightPinned;
  return hovered ? styles.highlightHovered : styles.highlightNone;
}

export function UsageWindowBar({
  window,
  overview = false,
  displayAs,
  pinned,
  onTogglePin,
  pinLabel,
  pinTestID,
}: {
  window: UsageWindow;
  overview?: boolean;
  displayAs: UsageDisplayAs;
  pinned: boolean;
  onTogglePin: () => void;
  /** What the row pins, naming the source and window: "Pin Claude Session". */
  pinLabel: string;
  pinTestID: string;
}) {
  const { t } = useTranslation();
  const shownPct = displayPercent(window, displayAs);
  const tone = windowTone(window);

  const fillWidth = clampPct(shownPct ?? 0);
  const isAtRisk = window.runsOutAt != null && window.shortfallPct != null;
  const deadline = isAtRisk ? window.runsOutAt : window.resetsAt;
  const deadlineKind = isAtRisk ? "runOut" : "reset";
  const trailing = formatUsageDeadline(deadline, deadlineKind, t);
  let value = "—";
  let complement: string | null = null;
  if (shownPct != null) {
    value = overview
      ? t(displayAs === "used" ? "usage.usedPercent" : "usage.remainingPercent", {
          percent: formatPct(shownPct),
        })
      : formatDisplayPct(shownPct, displayAs, t);
    if (overview) {
      const otherDisplay = displayAs === "used" ? "remaining" : "used";
      const otherPct = displayPercent(window, otherDisplay);
      if (otherPct != null)
        complement = t(otherDisplay === "used" ? "usage.usedPercent" : "usage.remainingPercent", {
          percent: formatPct(otherPct),
        });
    }
  }
  const accessibilityValue = useMemo(
    () => ({ min: 0, max: 100, now: fillWidth, text: value }),
    [fillWidth, value],
  );
  const accessibilityState = useMemo(() => ({ checked: pinned }), [pinned]);

  // The whole row pins the window to the sidebar Usage item. Pinned or not, it keeps the same
  // padding so toggling only changes the background.
  return (
    <Pressable
      onPress={onTogglePin}
      accessibilityRole="checkbox"
      accessibilityLabel={usageWindowRowLabel({ pinLabel, value, trailing })}
      accessibilityState={accessibilityState}
      aria-checked={pinned}
      style={styles.row(overview)}
      testID={pinTestID}
    >
      {({ hovered }: { hovered?: boolean }) => (
        <WindowRowContent
          highlight={highlightStyle(pinned, Boolean(hovered))}
          label={window.label}
          value={value}
          deadline={deadline}
          deadlineKind={deadlineKind}
          isAtRisk={isAtRisk}
          tone={tone}
          overview={overview}
          complement={complement}
          shownPct={shownPct}
          accessibilityValue={accessibilityValue}
        />
      )}
    </Pressable>
  );
}

function WindowRowContent({
  highlight,
  label,
  value,
  deadline,
  deadlineKind,
  isAtRisk,
  tone,
  overview,
  complement,
  shownPct,
  accessibilityValue,
}: {
  highlight: StyleProp<ViewStyle>;
  label: string;
  value: string;
  deadline: string | null | undefined;
  deadlineKind: "reset" | "runOut";
  isAtRisk: boolean;
  tone: UsageTone;
  overview: boolean;
  complement: string | null;
  shownPct: number | null;
  accessibilityValue: { min: number; max: number; now: number; text: string };
}) {
  const deadlineStyle = isAtRisk ? styles.atRisk : styles.reset;
  return (
    <>
      <View style={highlight} pointerEvents="none" />
      <View style={styles.labelRow}>
        <Text style={styles.label(overview)} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.value}>
          {value}
          {!overview ? (
            <UsageDeadline at={deadline} kind={deadlineKind} prefix=" · " style={deadlineStyle} />
          ) : null}
        </Text>
      </View>
      {overview && (complement || deadline) ? (
        <View style={styles.labelRow}>
          <View style={styles.deadlineSlot}>
            <UsageDeadline at={deadline} kind={deadlineKind} style={deadlineStyle} />
          </View>
          {complement ? <Text style={styles.value}>{complement}</Text> : null}
        </View>
      ) : null}
      {shownPct != null ? (
        <UsageMeter
          percent={shownPct}
          tone={tone}
          style={styles.meter(overview)}
          accessibilityLabel={label}
          accessibilityValue={accessibilityValue}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: (overview: boolean) => ({
    gap: overview ? 8 : 3,
    // The highlight bleeds into the card padding so the label and bar stay on the card's rail.
    marginHorizontal: -theme.spacing[2],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1.5],
    // Its own stacking context, so the highlight layer paints above the card and below the text.
    zIndex: 0,
  }),
  highlightNone: {
    display: "none",
  },
  highlightPinned: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
  },
  // The pinned surface at half strength: a separate layer, so the text keeps full opacity.
  highlightHovered: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
    opacity: theme.opacity[50],
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  label: (overview: boolean) => ({
    flex: 1,
    color: overview ? theme.colors.foreground : theme.colors.foregroundMuted,
    fontSize: overview ? theme.fontSize.base : theme.fontSize.sm,
  }),
  deadlineSlot: { flex: 1, minWidth: 0 },
  value: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  reset: {
    color: theme.colors.foregroundMuted,
    fontWeight: theme.fontWeight.normal,
  },
  atRisk: {
    color: theme.colors.statusDanger,
    fontWeight: theme.fontWeight.normal,
  },
  meter: (overview: boolean) => ({ height: overview ? 6 : 4 }),
}));
