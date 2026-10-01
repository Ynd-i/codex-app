import { i18n } from "@/i18n/i18next";

// Preserve the sidebar copy contract while resolving the current language at render time.
export const usageCopy = {
  get title() {
    return i18n.t("usage.title");
  },
  get planUsage() {
    return i18n.t("usage.planUsage");
  },
  get refresh() {
    return i18n.t("usage.refresh");
  },
  get refreshing() {
    return i18n.t("usage.refreshing");
  },
  get refreshFailed() {
    return i18n.t("usage.refreshFailed");
  },
  get loading() {
    return i18n.t("usage.loading");
  },
  get empty() {
    return i18n.t("usage.empty");
  },
  get noHosts() {
    return i18n.t("usage.noHosts");
  },
  get errorTitle() {
    return i18n.t("usage.errorTitle");
  },
  get clientUnavailable() {
    return i18n.t("usage.clientUnavailable");
  },
  get updated() {
    return i18n.t("usage.updated", { time: "" }).trim();
  },
  hostUnavailable: (host: string) => i18n.t("usage.hostUnavailableNamed", { host }),
  hostUpgradeRequired: (host: string) => i18n.t("usage.hostUpgradeRequiredNamed", { host }),
  get retry() {
    return i18n.t("common.actions.retry");
  },
  get pin() {
    return i18n.t("usage.pin");
  },
  get displayUsed() {
    return i18n.t("usage.displayUsed");
  },
  get displayRemaining() {
    return i18n.t("usage.displayRemaining");
  },
} as const;
