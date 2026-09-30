import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { clampPct, formatPct } from "./format";
import { remainingPercent, usedPercent } from "./model";
import { UsageDeadline } from "./deadline";
import { deriveTone } from "./tone";
import type { UsageTone, UsageWindow } from "./types";

function fillToneStyle(tone: UsageTone) {
  switch (tone) {
    case "ok":
      return styles.fillOk;
    case "warning":
      return styles.fillWarning;
    case "danger":
      return styles.fillDanger;
    default:
      return styles.fillDefault;
  }
}

export function UsageWindowBar({
  window,
  overview = false,
}: {
  window: UsageWindow;
  overview?: boolean;
}) {
  const { t } = useTranslation();
  const usedPct = usedPercent(window);
  const remainingPct = remainingPercent(window);
  const tone = window.tone ?? deriveTone(usedPct);

  const fillWidth = clampPct((overview ? remainingPct : usedPct) ?? 0);
  const valueText = t(overview ? "usage.remainingPercent" : "usage.usedPercent", {
    percent: formatPct(fillWidth),
  });
  const accessibilityValue = useMemo(
    () => ({ min: 0, max: 100, now: fillWidth, text: valueText }),
    [fillWidth, valueText],
  );
  const fillStyle = useMemo<StyleProp<ViewStyle>>(
    () => [styles.fill, fillToneStyle(tone), { width: `${fillWidth}%` }],
    [fillWidth, tone],
  );

  const isAtRisk = window.runsOutAt != null && window.shortfallPct != null;
  const deadline = isAtRisk ? window.runsOutAt : window.resetsAt;
  const deadlineKind = isAtRisk ? "runOut" : "reset";
  const deadlineStyle = isAtRisk ? styles.atRisk : styles.reset;
  let usedText = "—";
  if (usedPct != null) {
    const percent = formatPct(usedPct);
    usedText = overview ? t("usage.usedPercent", { percent }) : percent;
  }

  return (
    <View style={styles.container(overview)}>
      <View style={styles.labelRow}>
        <Text style={styles.label(overview)} numberOfLines={1}>
          {window.label}
        </Text>
        <Text style={styles.value}>
          {usedText}
          {!overview ? (
            <UsageDeadline at={deadline} kind={deadlineKind} prefix=" · " style={deadlineStyle} />
          ) : null}
        </Text>
      </View>
      {overview && (remainingPct != null || deadline) ? (
        <View style={styles.labelRow}>
          <View style={styles.deadlineSlot}>
            <UsageDeadline at={deadline} kind={deadlineKind} style={deadlineStyle} />
          </View>
          {remainingPct != null ? <Text style={styles.value}>{valueText}</Text> : null}
        </View>
      ) : null}
      {usedPct != null ? (
        <View
          style={styles.track(overview)}
          accessibilityRole="progressbar"
          accessibilityLabel={window.label}
          accessibilityValue={accessibilityValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={fillWidth}
          aria-valuetext={valueText}
        >
          <View style={fillStyle} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: (overview: boolean) => ({ gap: overview ? 8 : 3 }),
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  label: (overview: boolean) => ({
    flexShrink: 1,
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
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
    fontWeight: theme.fontWeight.normal,
  },
  atRisk: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.statusDanger,
    fontWeight: theme.fontWeight.normal,
  },
  track: (overview: boolean) => ({
    height: overview ? 6 : 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surface3,
    overflow: "hidden",
  }),
  fill: {
    height: "100%",
    borderRadius: 2,
  },
  fillDefault: {
    backgroundColor: theme.colors.foregroundMuted,
  },
  fillOk: {
    backgroundColor: theme.colors.statusSuccess,
  },
  fillWarning: {
    backgroundColor: theme.colors.statusWarning,
  },
  fillDanger: {
    backgroundColor: theme.colors.statusDanger,
  },
}));
