import type { TFunction } from "i18next";
import { i18n } from "@/i18n/i18next";
import { formatPct } from "./format";
import { displayPercent } from "./model";
import type { UsagePreferences } from "./preferences";
import type { UsageReportEntry } from "./types";

/** One summary window of one account, as the sidebar Usage item shows it. */
export interface PinnedUsageWindow {
  key: string;
  icon: string | null;
  /** Accessible description, including the source, account, window and percent meaning. */
  label: string;
  percentText: string;
}

function describe(entry: UsageReportEntry, windowLabel: string): string {
  const account = entry.account.label ? ` (${entry.account.label})` : "";
  return `${entry.sourceLabel}${account} ${windowLabel}`;
}

/** Pins replace defaults; without pins, summarize each account's first window with a percent. */
export function resolvePinnedUsage(
  reports: readonly UsageReportEntry[],
  preferences: UsagePreferences,
  t: TFunction = i18n.t,
): PinnedUsageWindow[] {
  const selections =
    preferences.pinned.length === 0
      ? reports.map((entry) => ({
          entry,
          window: entry.report.windows.find(
            (window) => displayPercent(window, preferences.displayAs) !== null,
          ),
        }))
      : preferences.pinned.flatMap((pin) =>
          reports
            .filter((entry) => entry.sourceId === pin.sourceId)
            .map((entry) => ({
              entry,
              window: entry.report.windows.find((window) => window.id === pin.windowId),
            })),
        );
  return selections.flatMap(({ entry, window }) => {
    if (!window) return [];
    const percent = displayPercent(window, preferences.displayAs);
    if (percent === null) return [];
    const percentText = formatPct(percent);
    const value =
      preferences.displayAs === "remaining"
        ? t("usage.remainingBalance", { amount: percentText })
        : t("usage.usedPercent", { percent: percentText });
    return [
      {
        key: `${entry.id}/${window.id}`,
        icon: entry.icon ?? null,
        label: `${describe(entry, window.label)} ${value}`,
        percentText,
      },
    ];
  });
}
