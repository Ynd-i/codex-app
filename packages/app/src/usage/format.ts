import { formatTokenCount } from "@/components/context-window-meter.utils";
import type { TFunction } from "i18next";
import { i18n } from "@/i18n/i18next";
import type { UsageDisplayAs } from "./preferences";
import type { UsageBalanceUnit } from "./types";

export function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function formatPct(value: number): string {
  return `${Math.round(clampPct(value))}%`;
}

/** Formats the selected percentage without treating missing quota as zero. */
export function formatDisplayPct(
  value: number,
  displayAs: UsageDisplayAs,
  t: TFunction = i18n.t,
): string {
  return displayAs === "used"
    ? formatPct(value)
    : t("usage.remainingBalance", { amount: formatPct(value) });
}

export function formatResetLabel(iso: string | null | undefined): string | null {
  return formatUsageDeadline(iso);
}

export function formatUsageDeadline(
  iso: string | null | undefined,
  kind: "reset" | "runOut" = "reset",
  t: TFunction = i18n.t,
): string | null {
  if (!iso) return null;
  const diffMs = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(diffMs)) return null;
  if (diffMs <= 0) return t(kind === "reset" ? "usage.resetDue" : "usage.runsOutNow");
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const parts: string[] = [];
  if (diffDays > 0) parts.push(t("usage.durationDays", { count: diffDays }));
  const hours = diffHours % 24;
  if (hours > 0) parts.push(t("usage.durationHours", { count: hours }));
  const minutes = diffMinutes % 60;
  if (diffDays === 0 && minutes > 0) parts.push(t("usage.durationMinutes", { count: minutes }));
  const duration = parts.join(" ") || t("usage.lessThanMinute");
  return t(kind === "reset" ? "usage.resetsIn" : "usage.runsOutIn", { duration });
}

export function formatAmount(
  value: number,
  unit: UsageBalanceUnit,
  locale: string = i18n.resolvedLanguage ?? i18n.language,
): string {
  switch (unit) {
    case "usd":
      return new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(value);
    case "tokens":
      return formatTokenCount(value);
    default:
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  }
}
