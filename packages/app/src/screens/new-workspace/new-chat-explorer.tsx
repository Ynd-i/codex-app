import { useCallback, useMemo } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { usePathname } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";
import { DesktopWorkspaceToolbar } from "@/components/desktop/desktop-shell";
import { resolveExplorerSidebarWidth } from "@/components/explorer-sidebar-layout";
import { useAnimatedDock } from "@/components/use-animated-dock";
import { useKeyboardActionHandler } from "@/hooks/use-keyboard-action-handler";
import type { KeyboardActionDefinition } from "@/keyboard/keyboard-action-dispatcher";
import { WorkspaceExplorerToggle } from "@/screens/workspace/workspace-explorer-toggle";
import { useWorkspaceLayoutStore } from "@/stores/workspace-layout-store";
import type { ShortcutKey } from "@/utils/format-shortcut";
import { buildWorkspaceTabPersistenceKey } from "@/workspace-tabs/model";

const EXPLORER_TOGGLE_KEYS: ShortcutKey[] = ["mod", "E"];
const TOGGLE_ACTIONS = ["sidebar.toggle.right"] as const;

function toggleNewChatExplorer() {
  const store = useWorkspaceLayoutStore.getState();
  store.setNewChatExplorerOpen(!store.newChatExplorerOpen);
}

/** The workspace created from the new chat screen opens with the Explorer the user toggled there. */
export function revealNewChatExplorer(serverId: string, workspaceId: string) {
  const store = useWorkspaceLayoutStore.getState();
  const workspaceKey = buildWorkspaceTabPersistenceKey({ serverId, workspaceId });
  if (store.newChatExplorerOpen && workspaceKey) store.showExplorerSidebar(workspaceKey);
}

/**
 * The new chat screen has no workspace yet, so its Explorer is a placeholder dock that keeps the
 * titlebar toggle and Cmd+E available until the chat starts.
 */
export function NewChatExplorerDock() {
  const { t } = useTranslation();
  const open = useWorkspaceLayoutStore((state) => state.newChatExplorerOpen);
  const routeFocused = usePathname() === "/new";
  const { width: windowWidth } = useWindowDimensions();
  const width = resolveExplorerSidebarWidth({ containerWidth: windowWidth });
  const dock = useAnimatedDock(open, width);
  const dockStyle = useMemo(() => [styles.dock, dock.style], [dock.style]);
  const contentStyle = useMemo(() => [styles.content, { width }], [width]);
  const accessibilityState = useMemo(() => ({ expanded: open }), [open]);
  const handleAction = useCallback((action: KeyboardActionDefinition) => {
    if (action.id !== "sidebar.toggle.right") return false;
    toggleNewChatExplorer();
    return true;
  }, []);

  useKeyboardActionHandler({
    handlerId: "new-chat-explorer",
    actions: TOGGLE_ACTIONS,
    enabled: routeFocused,
    priority: 100,
    handle: handleAction,
  });

  return (
    <>
      {routeFocused ? (
        <DesktopWorkspaceToolbar>
          <WorkspaceExplorerToggle
            onPress={toggleNewChatExplorer}
            label={
              open
                ? t("workspace.tabs.explorerSidebar.close")
                : t("workspace.tabs.explorerSidebar.open")
            }
            tooltipLabel={t("workspace.tabs.explorerSidebar.toggle")}
            tooltipKeys={EXPLORER_TOGGLE_KEYS}
            accessibilityState={accessibilityState}
            mobile={false}
          />
        </DesktopWorkspaceToolbar>
      ) : null}
      {dock.rendered ? (
        <Animated.View style={dockStyle} pointerEvents={open ? "auto" : "none"}>
          <View style={contentStyle}>
            <Text style={styles.placeholder}>{t("desktopChat.explorerAfterStart")}</Text>
          </View>
        </Animated.View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  dock: {
    flexShrink: 0,
    overflow: "hidden",
    borderLeftWidth: theme.borderWidth[1],
    borderLeftColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSidebar,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing[4],
  },
  placeholder: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
    textAlign: "center",
  },
}));
