import { Fragment } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { settingsStyles } from "@/styles/settings";
import { getIsElectronMac } from "@/constants/platform";
import { useIsCompactFormFactor } from "@/constants/layout";
import { UsageCard } from "./card";
import type { UsageReportEntry } from "./types";

export function UsageList({
  serverId,
  reports,
}: {
  serverId: string;
  reports: UsageReportEntry[];
}) {
  const isCompact = useIsCompactFormFactor();
  const overview = getIsElectronMac() && !isCompact;
  return (
    <View style={overview ? styles.overview : settingsStyles.card}>
      {reports.map((entry, index) => (
        <Fragment key={entry.id}>
          {index > 0 && !overview ? <View style={styles.divider} /> : null}
          <UsageCard serverId={serverId} entry={entry} />
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  overview: { gap: theme.spacing[4] },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
}));
