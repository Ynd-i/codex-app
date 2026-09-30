import { useCallback } from "react";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { PageLayout } from "@/components/page-layout";
import type { UsageHostGroup } from "./model";
import { useUsageByHost } from "./queries";
import { UsageMessage, UsageSection } from "./usage-section";

// The screen is reachable by URL, so there may be no history to go back to.
function leaveUsage(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/");
}

export function UsageScreen() {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  return (
    <PageLayout title={t("usage.title")} onBack={leaveUsage} testID="usage-screen">
      {isFocused ? <UsageScreenContent /> : null}
    </PageLayout>
  );
}

function UsageScreenContent() {
  const { t } = useTranslation();
  const { groups, refresh } = useUsageByHost();
  return (
    <>
      {groups.length === 0 ? <UsageMessage text={t("usage.noHosts")} /> : null}
      {groups.map((group) => (
        <HostUsageGroup key={group.serverId} group={group} onRefresh={refresh} />
      ))}
    </>
  );
}

function HostUsageGroup({
  group,
  onRefresh,
}: {
  group: UsageHostGroup;
  onRefresh: (serverId: string) => void;
}) {
  const handleRefresh = useCallback(() => onRefresh(group.serverId), [group.serverId, onRefresh]);
  return (
    <UsageSection
      serverId={group.serverId}
      title={group.label}
      view={group.view}
      onRefresh={handleRefresh}
      testID={`usage-host-${group.serverId}`}
    />
  );
}
