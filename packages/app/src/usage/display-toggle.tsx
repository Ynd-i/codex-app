import { SegmentedControl, type SegmentedControlOption } from "@/components/ui/segmented-control";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { UsageDisplay } from "./display";
import type { UsageDisplayAs } from "./preferences";

/** Switches every usage surface between the share used and the share left. */
export function UsageDisplayToggle({ display }: { display: UsageDisplay }) {
  const { t } = useTranslation();
  const options = useMemo<SegmentedControlOption<UsageDisplayAs>[]>(
    () => [
      { value: "used", label: t("usage.displayUsed"), testID: "usage-display-used" },
      { value: "remaining", label: t("usage.displayRemaining"), testID: "usage-display-remaining" },
    ],
    [t],
  );
  return (
    <SegmentedControl
      size="xs"
      options={options}
      value={display.displayAs}
      onValueChange={display.setDisplayAs}
      testID="usage-display-toggle"
    />
  );
}
