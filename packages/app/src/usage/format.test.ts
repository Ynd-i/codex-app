import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/i18next";
import { formatAmount, formatUsageDeadline } from "./format";
import { formatUsageFreshness, remainingPercent } from "./model";

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-01T00:00:00Z"));
  await i18n.changeLanguage("en");
});

afterEach(async () => {
  await i18n.changeLanguage("en");
  vi.useRealTimers();
});

it("keeps reset and exhaustion deadlines distinct through the due time", () => {
  const deadline = "2026-10-04T17:00:00Z";
  expect(formatUsageDeadline(deadline)).toBe("resets 3d 17h");
  expect(formatUsageDeadline(deadline, "runOut")).toBe("runs out 3d 17h");
  vi.setSystemTime(new Date("2026-10-04T16:59:30Z"));
  expect(formatUsageDeadline(deadline)).toBe("resets <1m");
  vi.setSystemTime(new Date(deadline));
  expect(formatUsageDeadline(deadline)).toBe("Reset due");
  expect(formatUsageDeadline(deadline, "runOut")).toBe("Runs out now");
  expect(formatUsageDeadline(null)).toBeNull();
  expect(formatUsageDeadline("invalid")).toBeNull();
});

it("localizes relative labels and keeps credit amounts separate from dollars", async () => {
  expect(formatAmount(1234.5, "usd")).toBe("$1,234.50");
  expect(formatAmount(1234.5, "credits")).toBe("1,234.5");
  await i18n.changeLanguage("zh-CN");
  expect(formatUsageDeadline("2026-10-01T01:25:00Z")).toBe("1小时 25分钟后重置");
  expect(formatUsageFreshness("3m")).toBe("3分钟前更新");
  expect(formatUsageFreshness("now")).toBe("刚刚更新");
  expect(formatUsageFreshness("Jan 15", i18n.t, "2026-01-15T12:00:00Z")).toBe("1月15日更新");
});

it("preserves reported remaining allowance and distinguishes unknown from zero", () => {
  const window = { id: "quota", label: "Quota" };
  expect(remainingPercent(window)).toBeNull();
  expect(remainingPercent({ ...window, usedPct: 0 })).toBe(100);
  expect(remainingPercent({ ...window, remainingPct: 0 })).toBe(0);
  expect(remainingPercent({ ...window, usedPct: 20, remainingPct: 70 })).toBe(70);
});
