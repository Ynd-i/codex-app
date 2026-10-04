import { memo, useCallback, useMemo, useState, type Ref } from "react";
import { Archive, Pin, PinOff } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { AgentStatusDot } from "@/components/agent-status-dot";
import type { DraggableListDragHandleProps } from "@/components/draggable-list.types";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { HeaderToggleButton } from "@/components/headers/header-toggle-button";
import type { AggregatedAgent } from "@/hooks/use-aggregated-agents";
import type { Theme } from "@/styles/theme";
import { navigateToAgent } from "@/utils/navigate-to-agent";
import { deriveSidebarStateBucket } from "@/utils/sidebar-agent-state";
import { desktopChatKey } from "./desktop-chat-model";
import { DesktopChatMenuItems, useChatForkPage, useDesktopChatMenu } from "./desktop-chat-menu";
import { useSectionMovePage } from "./desktop-chat-section-menus";
import { useChatSectionsStore } from "./desktop-chat-sections-store";
import { DesktopProgressRing } from "./desktop-progress-ring";
import { DesktopSidebarTitle } from "./desktop-sidebar-title";

const ArchiveIcon = withUnistyles(Archive);
const PinIcon = withUnistyles(Pin);
const UnpinIcon = withUnistyles(PinOff);
const Progress = withUnistyles(DesktopProgressRing);
const mutedIcon = (theme: Theme) => ({ color: theme.colors.foregroundMuted });
// The width each row action covers at the right edge of the title.
// ponytail: the md+ button width; below 720pt buttons grow to 32 and the fade stops short. Measure
// the actions if the compact sidebar matters.
const ACTION_WIDTH = 26;

/** Pin and archive over the title's right edge, so the title spans the row. */
function ChatRowActions({
  agent,
  chatKey,
  status,
  running,
  unread,
  busy,
  pinned,
  revealed,
  onPin,
  onArchive,
  onFocus,
  onBlur,
}: {
  agent: AggregatedAgent;
  chatKey: string;
  status: string;
  running: boolean;
  unread: boolean;
  busy: boolean;
  pinned: boolean;
  revealed: boolean;
  onPin: () => void;
  onArchive: () => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const { t } = useTranslation();
  const pinLabel = t(pinned ? "sidebar.workspace.actions.unpin" : "sidebar.workspace.actions.pin");
  const archiveLabel = t("agentList.archiveSheet.archive");
  const actionStyle = revealed ? undefined : styles.actionHidden;
  return (
    <View style={styles.actions}>
      <HeaderToggleButton
        onPress={onPin}
        disabled={busy}
        onFocus={onFocus}
        onBlur={onBlur}
        tooltipLabel={pinLabel}
        tooltipKeys={[]}
        tooltipSide="top"
        style={actionStyle}
        accessibilityRole="button"
        accessibilityLabel={pinLabel}
        testID={`desktop-chat-pin-${chatKey}`}
      >
        {pinned ? (
          <UnpinIcon size={16} uniProps={mutedIcon} />
        ) : (
          <PinIcon size={16} uniProps={mutedIcon} />
        )}
      </HeaderToggleButton>
      <View>
        <HeaderToggleButton
          onPress={onArchive}
          disabled={busy}
          onFocus={onFocus}
          onBlur={onBlur}
          tooltipLabel={archiveLabel}
          tooltipKeys={[]}
          tooltipSide="top"
          style={actionStyle}
          accessibilityRole="button"
          accessibilityLabel={archiveLabel}
          testID={`desktop-chat-archive-${chatKey}`}
        >
          <ArchiveIcon size={16} uniProps={mutedIcon} />
        </HeaderToggleButton>
        {/* Shares the archive slot: hovering swaps the status for the row actions. */}
        {revealed ? null : (
          <View style={styles.statusSlot}>
            {running ? (
              <Progress uniProps={mutedIcon} />
            ) : (
              <AgentStatusDot
                status={status}
                requiresAttention={unread}
                attentionReason={agent.attentionReason}
                pendingPermissionCount={agent.pendingPermissionCount}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

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
  const revealed = hovered || contextOpen;
  const title = agent.title || t("agentList.fallbackTitle");
  const status = agent.turn.phase === "open" ? "running" : agent.status;
  const bucket = deriveSidebarStateBucket({
    status,
    requiresAttention: unread,
    attentionReason: agent.attentionReason,
    pendingPermissionCount: agent.pendingPermissionCount,
  });
  const running = bucket === "running";
  // Done rows show no status, so their title runs to the row's edge.
  const statusWidth = busy || bucket !== "done" ? ACTION_WIDTH : 0;
  const reserve = revealed ? 2 * ACTION_WIDTH : statusWidth;
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
              <DesktopSidebarTitle
                title={title}
                style={[styles.chatTitle, unread && styles.unreadTitle]}
                reserve={reserve}
                scrolling={revealed}
              />
            </Pressable>
            <ChatRowActions
              agent={agent}
              chatKey={key}
              status={status}
              running={busy || running}
              unread={unread}
              busy={busy}
              pinned={menuProps.pinned}
              revealed={revealed}
              onPin={menuProps.onPin}
              onArchive={menuProps.onArchive}
              onFocus={enter}
              onBlur={leave}
            />
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
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    lineHeight: 20,
  },
  unreadTitle: { color: theme.colors.foreground, fontWeight: theme.fontWeight.medium },
  actions: {
    position: "absolute",
    top: 0,
    right: 4,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  actionHidden: { opacity: 0 },
  statusSlot: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
}));
