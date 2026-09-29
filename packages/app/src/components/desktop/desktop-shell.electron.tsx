import { useMemo, type ReactNode } from "react";
import { router, usePathname, useRootNavigationState } from "expo-router";
import { ArrowLeft, CalendarClock, History, House, Settings } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text, useWindowDimensions, View } from "react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { WindowSidebarMenuToggle } from "@/components/headers/menu-header";
import { HeaderToggleButton } from "@/components/headers/header-toggle-button";
import { SidebarHelpMenu } from "@/components/sidebar/sidebar-help-menu";
import { getIsElectronMac } from "@/constants/platform";
import { SETTINGS_DESKTOP_SPLIT_MIN_WIDTH, useIsCompactFormFactor } from "@/constants/layout";
import { WindowChromeRegion, WindowChromeSafeArea } from "@/utils/desktop-window";
import {
  buildOpenProjectRoute,
  buildSchedulesRoute,
  buildSessionsRoute,
  buildSettingsRoute,
} from "@/utils/host-routes";
import { TitlebarDragRegion } from "./titlebar-drag-region";
import type { Theme } from "@/styles/theme";

export const usesDesktopShell = getIsElectronMac();
export const desktopShellInset = usesDesktopShell ? 56 : 0;

const BackIcon = withUnistyles(ArrowLeft);
const HomeIcon = withUnistyles(House);
const HistoryIcon = withUnistyles(History);
const SchedulesIcon = withUnistyles(CalendarClock);
const SettingsIcon = withUnistyles(Settings);
const iconProps = (theme: Theme) => ({ color: theme.colors.foregroundMuted });
const devLabel = process.env.EXPO_PUBLIC_PASEO_DEV_BUILD_LABEL?.trim();
function openHome() {
  router.push(buildOpenProjectRoute());
}
function openHistory() {
  router.push(buildSessionsRoute());
}
function openSchedules() {
  router.push(buildSchedulesRoute());
}
function openSettings() {
  router.push(buildSettingsRoute());
}

function RailButton({
  label,
  testID,
  onPress,
  active,
  children,
}: {
  label: string;
  testID: string;
  onPress: () => void;
  active: boolean;
  children: ReactNode;
}) {
  const style = useMemo(() => [styles.railButton, active && styles.railActive], [active]);
  const accessibilityState = useMemo(() => ({ selected: active }), [active]);
  return (
    <HeaderToggleButton
      onPress={onPress}
      tooltipLabel={label}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessible
      accessibilityState={accessibilityState}
      tooltipKeys={[]}
      tooltipSide="right"
      style={style}
      testID={testID}
    >
      {children}
    </HeaderToggleButton>
  );
}

export function DesktopShell({
  children,
  chromeEnabled,
}: {
  children: ReactNode;
  chromeEnabled: boolean;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const navigationState = useRootNavigationState();
  const canGoBack = Boolean(navigationState && router.canGoBack());
  const isCompact = useIsCompactFormFactor();
  const { width } = useWindowDimensions();
  const showRail =
    chromeEnabled ||
    (pathname.startsWith("/settings") &&
      width >= SETTINGS_DESKTOP_SPLIT_MIN_WIDTH + desktopShellInset);

  if (!usesDesktopShell) return children;

  return (
    <View style={styles.root} testID="desktop-shell">
      <WindowChromeSafeArea placement="inline" style={styles.titlebar}>
        <TitlebarDragRegion />
        <HeaderToggleButton
          onPress={router.back}
          disabled={!canGoBack}
          tooltipLabel={t("common.actions.back")}
          accessibilityLabel={t("common.actions.back")}
          accessibilityRole="button"
          accessible
          tooltipKeys={[]}
          tooltipSide="bottom"
          testID="desktop-shell-back"
        >
          <BackIcon size={18} uniProps={iconProps} />
        </HeaderToggleButton>
        {chromeEnabled && !isCompact ? <WindowSidebarMenuToggle tooltipSide="bottom" /> : null}
        <View style={styles.spacer} />
        {devLabel ? (
          <Text style={styles.devLabel} testID="dev-build-label" numberOfLines={1}>
            {devLabel}
          </Text>
        ) : null}
      </WindowChromeSafeArea>
      <View style={styles.body}>
        {!isCompact && showRail ? (
          <View style={styles.rail} testID="desktop-shell-rail">
            <RailButton
              onPress={openHome}
              label="Paseo"
              active={
                !pathname.includes("/settings") &&
                !pathname.includes("/sessions") &&
                !pathname.includes("/schedules")
              }
              testID="desktop-shell-home"
            >
              <HomeIcon size={20} uniProps={iconProps} />
            </RailButton>
            <RailButton
              onPress={openHistory}
              label={t("sidebar.sections.sessions")}
              active={pathname.includes("/sessions")}
              testID="desktop-shell-history"
            >
              <HistoryIcon size={20} uniProps={iconProps} />
            </RailButton>
            <RailButton
              onPress={openSchedules}
              label={t("sidebar.sections.schedules")}
              active={pathname.includes("/schedules")}
              testID="desktop-shell-schedules"
            >
              <SchedulesIcon size={20} uniProps={iconProps} />
            </RailButton>
            <View style={styles.spacer} />
            <SidebarHelpMenu />
            <RailButton
              onPress={openSettings}
              label={t("sidebar.actions.settings")}
              active={pathname.includes("/settings")}
              testID="desktop-shell-settings"
            >
              <SettingsIcon size={20} uniProps={iconProps} />
            </RailButton>
          </View>
        ) : null}
        <View style={styles.content} testID="desktop-shell-content">
          <WindowChromeRegion corners="none">{children}</WindowChromeRegion>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.surface1 },
  titlebar: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
    gap: 8,
  },
  body: { flex: 1, flexDirection: "row", paddingRight: 4, paddingBottom: 4 },
  rail: { width: 50, alignItems: "center", paddingTop: 8, paddingBottom: 8, gap: 8 },
  railButton: { width: 36, height: 36, borderRadius: 10 },
  railActive: { backgroundColor: theme.colors.surface3 },
  content: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface0,
  },
  spacer: { flex: 1 },
  devLabel: { maxWidth: 200, fontSize: 11, color: theme.colors.foregroundExtraMuted },
}));
