import { memo, useCallback, useMemo, useState, type Ref } from "react";
import { MoreHorizontal } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { AgentStatusDot } from "@/components/agent-status-dot";
import type { DraggableListDragHandleProps } from "@/components/draggable-list.types";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AggregatedAgent } from "@/hooks/use-aggregated-agents";
import type { Theme } from "@/styles/theme";
import { navigateToAgent } from "@/utils/navigate-to-agent";
import { desktopChatKey } from "./desktop-chat-model";
import { DesktopChatMenuItems, useDesktopChatMenu } from "./desktop-chat-menu";

const MoreIcon = withUnistyles(MoreHorizontal);
const Progress = withUnistyles(ActivityIndicator);
const mutedIcon = (theme: Theme) => ({ color: theme.colors.foregroundMuted });

export const ChatRow = memo(function ChatRow({
  agent,
  selectedKey,
  indented = false,
  dragHandleProps,
}: {
  agent: AggregatedAgent;
  selectedKey: string | null;
  indented?: boolean;
  dragHandleProps?: DraggableListDragHandleProps;
}) {
  const { t } = useTranslation();
  const { busy, unread, markRead, menuProps, renameModal } = useDesktopChatMenu(agent);
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const key = desktopChatKey(agent);
  const selected = selectedKey === key;
  const title = agent.title || t("agentList.fallbackTitle");
  const enter = useCallback(() => setHovered(true), []);
  const leave = useCallback(() => setHovered(false), []);
  const open = useCallback(() => {
    if (unread) markRead();
    navigateToAgent({
      serverId: agent.serverId,
      agentId: agent.id,
      workspaceId: agent.workspaceId,
      pin: true,
    });
  }, [agent, unread, markRead]);
  const accessibilityState = useMemo(() => ({ selected, busy }), [selected, busy]);
  // The whole row starts a drag in manually ordered sections; dnd-kit's own role would
  // replace the row's button semantics.
  const {
    role: _dragRole,
    tabIndex: _dragTabIndex,
    "aria-roledescription": _dragRoleDescription,
    ...dragAttributes
  } = dragHandleProps?.attributes ?? {};

  return (
    <>
      <ContextMenu open={contextOpen} onOpenChange={setContextOpen}>
        <ContextMenuTrigger contextOnly>
          <View
            {...dragAttributes}
            {...dragHandleProps?.listeners}
            ref={dragHandleProps?.setActivatorNodeRef as unknown as Ref<View>}
            onPointerEnter={enter}
            onPointerLeave={leave}
            style={[
              styles.chatRow,
              indented && styles.indented,
              (hovered || contextOpen || menuOpen) && styles.rowHovered,
              selected && styles.rowSelected,
            ]}
          >
            <Pressable
              onPress={open}
              disabled={busy}
              style={styles.chatButton}
              accessibilityRole="button"
              accessibilityLabel={`${title} — ${agent.serverLabel}`}
              accessibilityState={accessibilityState}
              testID={`desktop-chat-${key}`}
            >
              <Text numberOfLines={1} style={[styles.chatTitle, unread && styles.unreadTitle]}>
                {title}
              </Text>
              {busy ? (
                <Progress size="small" uniProps={mutedIcon} />
              ) : (
                <AgentStatusDot
                  status={agent.turn.phase === "open" ? "running" : agent.status}
                  requiresAttention={unread}
                  attentionReason={agent.attentionReason}
                  pendingPermissionCount={agent.pendingPermissionCount}
                />
              )}
            </Pressable>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger
                onFocus={enter}
                onBlur={leave}
                style={[styles.menuButton, !hovered && !menuOpen && styles.menuHidden]}
                accessibilityRole="button"
                accessibilityLabel={t("desktopChat.actions")}
                testID={`desktop-chat-menu-${key}`}
              >
                <MoreIcon size={16} uniProps={mutedIcon} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" width={210}>
                <DesktopChatMenuItems {...menuProps} />
              </DropdownMenuContent>
            </DropdownMenu>
          </View>
        </ContextMenuTrigger>
        <ContextMenuContent width={210}>
          <DesktopChatMenuItems {...menuProps} context />
        </ContextMenuContent>
      </ContextMenu>
      {renameModal}
    </>
  );
});

const styles = StyleSheet.create((theme) => ({
  chatRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingLeft: 8,
    paddingRight: 4,
  },
  indented: { paddingLeft: 32 },
  rowHovered: { backgroundColor: theme.colors.surfaceSidebarHover },
  rowSelected: { backgroundColor: theme.colors.surfaceSidebarSelected },
  chatButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chatTitle: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    lineHeight: 20,
  },
  unreadTitle: { color: theme.colors.foreground, fontWeight: theme.fontWeight.medium },
  menuButton: {
    width: 24,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  menuHidden: { opacity: 0 },
}));
