import { RefreshCw } from "lucide-react-native";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { settingsStyles } from "@/styles/settings";
import { SettingsSection } from "@/components/settings/headings/settings-section";
import { UsageList } from "./list";
import type { UsageView } from "./types";

export function UsageSection({
  serverId,
  title,
  view,
  onRefresh,
  testID,
}: {
  serverId: string;
  title: string;
  view: UsageView;
  onRefresh: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const busy = view.kind === "loading" || (view.kind === "ready" && view.isRefreshing);

  const refreshButton = useMemo(
    () =>
      view.kind === "unavailable" ? null : (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={RefreshCw}
          loading={busy}
          onPress={onRefresh}
          accessibilityLabel={t("usage.refresh")}
        >
          {busy ? t("usage.refreshing") : t("usage.refresh")}
        </Button>
      ),
    [busy, onRefresh, t, view.kind],
  );

  return (
    <SettingsSection title={title} testID={testID} trailing={refreshButton}>
      <UsageBody serverId={serverId} view={view} onRefresh={onRefresh} />
    </SettingsSection>
  );
}

function UsageBody({
  serverId,
  view,
  onRefresh,
}: {
  serverId: string;
  view: UsageView;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  if (view.kind === "unavailable") {
    return <UsageMessage text={view.message} />;
  }

  if (view.kind === "loading") {
    return <UsageMessage text={t("usage.loading")} />;
  }

  if (view.kind === "error") {
    return (
      <Alert size="sm" variant="error" title={t("usage.errorTitle")} description={view.message}>
        <Button variant="outline" size="sm" onPress={onRefresh}>
          {t("common.actions.retry")}
        </Button>
      </Alert>
    );
  }

  if (view.reports.length === 0) {
    return <UsageMessage text={t("usage.empty")} />;
  }

  return <UsageList serverId={serverId} reports={view.reports} />;
}

export function UsageMessage({ text }: { text: string }) {
  return (
    <View style={[settingsStyles.card, styles.emptyCard]}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  emptyCard: {
    padding: theme.spacing[4],
    alignItems: "center",
  },
  emptyText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.base,
  },
}));
