import { memo, useCallback, useMemo, useState, type Ref } from "react";
import { Archive, Pin, PinOff } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { AgentStatusDot } from "@/components/agent-status-dot";
import type { DraggableListDragHandleProps } from "@/components/draggable-list.types";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { HeaderToggleButton } from "@/components/headers/header-toggle-button";
import type { AggregatedAgent } from "@/hooks/use-aggregated-agents";
import type { Theme } from "@/styles/theme";
import { navigateToAgent } from "@/utils/navigate-to-agent";
import { desktopChatKey } from "./desktop-chat-model";
import { DesktopChatMenuItems, useChatForkPage, useDesktopChatMenu } from "./desktop-chat-menu";
import { useSectionMovePage } from "./desktop-chat-section-menus";
import { useChatSectionsStore } from "./desktop-chat-sections-store";

const ArchiveIcon = withUnistyles(Archive);
const PinIcon = withUnistyles(Pin);
const UnpinIcon = withUnistyles(PinOff);
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
  const [contextOpen, setContextOpen] = useState(false);
  const key = desktopChatKey(agent);
  const selected = selectedKey === key;
  const section = useChatSectionsStore((state) => state.chatSection[key]);
  const moveChat = useChatSectionsStore((state) => state.moveChat);
  const move = useCallback((sectionId: string | null) => moveChat(key, sectionId), [key, moveChat]);
  const sectionPage = useSectionMovePage(`chat-section-${key}`, section, move);
  const forkPage = useChatForkPage(agent);
  const pages = useMemo(
    () => (forkPage ? [sectionPage, forkPage] : [sectionPage]),
    [forkPage, sectionPage],
  );
  const pinLabel = t(
    menuProps.pinned ? "sidebar.workspace.actions.unpin" : "sidebar.workspace.actions.pin",
  );
  const revealed = hovered || contextOpen;
  const actionStyle = revealed ? undefined : styles.actionHidden;
  const archiveLabel = t("agentList.archiveSheet.archive");
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
              revealed && styles.rowHovered,
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
            <HeaderToggleButton
              onPress={menuProps.onPin}
              disabled={busy}
              onFocus={enter}
              onBlur={leave}
              tooltipLabel={pinLabel}
              tooltipKeys={[]}
              tooltipSide="top"
              style={actionStyle}
              accessibilityRole="button"
              accessibilityLabel={pinLabel}
              testID={`desktop-chat-pin-${key}`}
            >
              {menuProps.pinned ? (
                <UnpinIcon size={16} uniProps={mutedIcon} />
              ) : (
                <PinIcon size={16} uniProps={mutedIcon} />
              )}
            </HeaderToggleButton>
            <HeaderToggleButton
              onPress={menuProps.onArchive}
              disabled={busy}
              onFocus={enter}
              onBlur={leave}
              tooltipLabel={archiveLabel}
              tooltipKeys={[]}
              tooltipSide="top"
              style={actionStyle}
              accessibilityRole="button"
              accessibilityLabel={archiveLabel}
              testID={`desktop-chat-archive-${key}`}
            >
              <ArchiveIcon size={16} uniProps={mutedIcon} />
            </HeaderToggleButton>
          </View>
        </ContextMenuTrigger>
        <ContextMenuContent width={210} pages={pages}>
          <DesktopChatMenuItems
            {...menuProps}
            context
            sectionPage={sectionPage.id}
            forkPage={forkPage?.id}
          />
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
  actionHidden: { opacity: 0 },
}));
