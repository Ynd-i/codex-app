import { useTranslation } from "react-i18next";
import { useHostUsage } from "./queries";
import { UsageSection } from "./usage-section";

/** A host's usage reports, for its settings page. */
export function HostUsageSection({ serverId }: { serverId: string }) {
  const { t } = useTranslation();
  const { view, refresh } = useHostUsage(serverId);
  return (
    <UsageSection
      serverId={serverId}
      title={t("usage.planUsage")}
      view={view}
      onRefresh={refresh}
      testID="usage-card"
    />
  );
}
