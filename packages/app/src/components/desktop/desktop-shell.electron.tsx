import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Text, useWindowDimensions, View } from "react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { WindowSidebarMenuToggle } from "@/components/headers/menu-header";
import { HeaderToggleButton } from "@/components/headers/header-toggle-button";
import { getIsElectronMac } from "@/constants/platform";
import { useIsCompactFormFactor } from "@/constants/layout";
import {
  WindowChromeRegion,
  WindowChromeSafeArea,
  useHasWindowChromeObstruction,
} from "@/utils/desktop-window";
import { resolveDesktopSidebarWidth } from "@/components/desktop-sidebar-layout";
import { usePanelStore } from "@/stores/panel-store";
import { useSessionStore } from "@/stores/session-store";
import { useActiveWorkspaceSelection } from "@/stores/navigation-active-workspace-store";
import { useWorkspaceFields } from "@/stores/session-store-hooks";
import { inlineUnistylesStyle } from "@/styles/unistyles-inline-style";
import { TitlebarDragRegion } from "./titlebar-drag-region";
import type { Theme } from "@/styles/theme";
import { DesktopChatToolbar } from "./desktop-chat-toolbar";
import { useDesktopNavigationHistory } from "./use-desktop-navigation-history";

export const usesDesktopShell = getIsElectronMac();
export const desktopShellInset = usesDesktopShell ? 6 : 0;

const BackIcon = withUnistyles(ArrowLeft);
const ForwardIcon = withUnistyles(ArrowRight);
const iconProps = (theme: Theme) => ({ color: theme.colors.foregroundMuted });
const devLabel = process.env.EXPO_PUBLIC_PASEO_DEV_BUILD_LABEL?.trim();

const WorkspaceToolbarHostContext = createContext<HTMLDivElement | null>(null);
const workspaceToolbarHostStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  position: "relative",
  flexShrink: 0,
  marginLeft: 8,
  marginRight: 8,
};

export function DesktopWorkspaceToolbar({ children }: { children: ReactNode }) {
  const host = useContext(WorkspaceToolbarHostContext);
  // A DOM portal retains the originating workspace's routing and panel contexts.
  return host ? createPortal(children, host) : null;
}

export function DesktopShell({
  children,
  chromeEnabled,
}: {
  children: ReactNode;
  chromeEnabled: boolean;
}) {
  const { t } = useTranslation();
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null);
  const navigation = useDesktopNavigationHistory();
  const selection = useActiveWorkspaceSelection();
  const workspaceTitle = useWorkspaceFields(
    selection?.serverId ?? null,
    selection?.workspaceId ?? null,
    (workspace) => workspace.name,
  );
  const sidebarWidth = usePanelStore((state) => state.sidebarWidth);
  const sidebarOpen = usePanelStore((state) => state.desktop.agentListOpen);
  const hasTrafficLights = useHasWindowChromeObstruction("top-left");
  const chatTitle = useSessionStore((state) => {
    if (!navigation.chat) return "";
    const session = state.sessions[navigation.chat.serverId];
    return (
      (
        session?.agents.get(navigation.chat.agentId) ??
        session?.agentDetails.get(navigation.chat.agentId)
      )?.title ?? ""
    );
  });
  const isCompact = useIsCompactFormFactor();
  const { width } = useWindowDimensions();
  const controlsWidth =
    Math.max(
      190,
      sidebarOpen && chromeEnabled && !isCompact
        ? 1 +
            resolveDesktopSidebarWidth({
              requestedWidth: sidebarWidth,
              viewportWidth: width - desktopShellInset,
            })
        : 190,
    ) - (hasTrafficLights ? 78 : 0);

  if (!usesDesktopShell) return children;

  return (
    <WorkspaceToolbarHostContext.Provider value={toolbarHost}>
      <View style={styles.root} testID="desktop-shell">
        <WindowChromeSafeArea placement="inline" style={styles.titlebar}>
          <TitlebarDragRegion />
          <View style={[styles.navigationControls, inlineUnistylesStyle({ width: controlsWidth })]}>
            <HeaderToggleButton
              onPress={navigation.back}
              disabled={!navigation.canGoBack}
              tooltipLabel={t("common.actions.back")}
              accessibilityLabel={t("common.actions.back")}
              accessibilityRole="button"
              accessible
              tooltipKeys={[]}
              tooltipSide="bottom"
              testID="desktop-shell-back"
              style={styles.navigationButton}
            >
              <BackIcon size={18} uniProps={iconProps} />
            </HeaderToggleButton>
            <HeaderToggleButton
              onPress={navigation.forward}
              disabled={!navigation.canGoForward}
              tooltipLabel={t("workspace.browser.controls.forward")}
              accessibilityLabel={t("workspace.browser.controls.forward")}
              accessibilityRole="button"
              accessible
              tooltipKeys={[]}
              tooltipSide="bottom"
              testID="desktop-shell-forward"
              style={styles.navigationButton}
            >
              <ForwardIcon size={18} uniProps={iconProps} />
            </HeaderToggleButton>
            {chromeEnabled && !isCompact ? (
              <WindowSidebarMenuToggle style={styles.navigationButton} tooltipSide="bottom" />
            ) : null}
          </View>
          <View style={styles.titleFill}>
            {chatTitle || workspaceTitle ? (
              <Text style={styles.chatTitle} numberOfLines={1} testID="desktop-chat-title">
                {chatTitle || workspaceTitle}
              </Text>
            ) : null}
          </View>
          {navigation.chat ? (
            <DesktopChatToolbar
              serverId={navigation.chat.serverId}
              agentId={navigation.chat.agentId}
            />
          ) : null}
          <div
            ref={setToolbarHost}
            data-testid="desktop-workspace-toolbar"
            style={workspaceToolbarHostStyle}
          />
          {devLabel ? (
            <Text style={styles.devLabel} testID="dev-build-label" numberOfLines={1}>
              {devLabel}
            </Text>
          ) : null}
        </WindowChromeSafeArea>
        <View style={styles.body}>
          <View style={styles.content} testID="desktop-shell-content">
            <WindowChromeRegion corners="none">{children}</WindowChromeRegion>
          </View>
        </View>
      </View>
    </WorkspaceToolbarHostContext.Provider>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.surface1 },
  titlebar: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
    gap: 0,
  },
  navigationControls: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    gap: 6,
    flexShrink: 0,
  },
  navigationButton: { width: 28, height: 28, marginLeft: 0 },
  titleFill: { flex: 1, minWidth: 0, justifyContent: "center", paddingRight: 12 },
  chatTitle: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    lineHeight: 24,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    paddingLeft: 12,
  },
  body: { flex: 1, flexDirection: "row", paddingRight: 4, paddingBottom: 4 },
  content: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface0,
  },
  devLabel: { maxWidth: 200, fontSize: 11, color: theme.colors.foregroundExtraMuted },
}));
