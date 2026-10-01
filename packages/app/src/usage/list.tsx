import { getIsElectronMac } from "@/constants/platform";
import { useIsCompactFormFactor } from "@/constants/layout";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { settingsStyles } from "@/styles/settings";
import { UsageCard } from "./card";
import type { UsageDisplay } from "./display";
import type { UsageReportEntry } from "./types";

/** One card per report (source + account). */
export function UsageList({
  serverId,
  reports,
  display,
}: {
  serverId: string;
  reports: UsageReportEntry[];
  display: UsageDisplay;
}) {
  const isCompact = useIsCompactFormFactor();
  const overview = getIsElectronMac() && !isCompact;
  return (
    <View style={styles.list(overview)}>
      {reports.map((entry) => (
        <View key={entry.id} style={overview ? undefined : settingsStyles.card}>
          <UsageCard serverId={serverId} entry={entry} display={display} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  list: (overview: boolean) => ({
    gap: overview ? theme.spacing[4] : theme.spacing[3],
  }),
}));
