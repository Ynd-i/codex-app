import { useCallback, useState } from "react";
import { Archive, Circle, CircleCheck, Copy, List, Pencil, Pin, PinOff } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { withUnistyles } from "react-native-unistyles";
import { AdaptiveRenameModal } from "@/components/rename-modal";
import { ContextMenuItem } from "@/components/ui/context-menu";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/contexts/toast-context";
import { getIsElectronMac } from "@/constants/platform";
import { useArchiveAgent } from "@/hooks/use-archive-agent";
import type { Theme } from "@/styles/theme";
import { confirmDialog } from "@/utils/confirm-dialog";
import type { DesktopChatTarget } from "./desktop-chat-actions";
import { desktopChatKey, desktopChatPinnedAt, isDesktopChatUnread } from "./desktop-chat-model";
import { useDesktopChatMutation } from "./use-desktop-chat";

const ArchiveIcon = withUnistyles(Archive);
const RenameIcon = withUnistyles(Pencil);
const PinIcon = withUnistyles(Pin);
const UnpinIcon = withUnistyles(PinOff);
const ReadIcon = withUnistyles(CircleCheck);
const UnreadIcon = withUnistyles(Circle);
const CopyIcon = withUnistyles(Copy);
const SectionIcon = withUnistyles(List);
const mutedIcon = (theme: Theme) => ({ color: theme.colors.foregroundMuted });
const renameLeading = <RenameIcon size={16} uniProps={mutedIcon} />;
const pinLeading = <PinIcon size={16} uniProps={mutedIcon} />;
const unpinLeading = <UnpinIcon size={16} uniProps={mutedIcon} />;
const archiveLeading = <ArchiveIcon size={16} uniProps={mutedIcon} />;
const readLeading = <ReadIcon size={16} uniProps={mutedIcon} />;
const unreadLeading = <UnreadIcon size={16} uniProps={mutedIcon} />;
const copyLeading = <CopyIcon size={16} uniProps={mutedIcon} />;
const sectionLeading = <SectionIcon size={16} uniProps={mutedIcon} />;

export function DesktopChatMenuItems({
  context,
  pinned,
  unread,
  disabled,
  onPin,
  onRead,
  onRename,
  onArchive,
  copyPage,
  sectionPage,
}: {
  context?: boolean;
  pinned: boolean;
  unread: boolean;
  disabled: boolean;
  onPin: () => void;
  onRead: () => void;
  onRename: () => void;
  onArchive: () => void;
  copyPage?: string;
  /** The page id of a `Section ›` submenu the surface declares. */
  sectionPage?: string;
}) {
  const { t } = useTranslation();
  const Item = context ? ContextMenuItem : DropdownMenuItem;
  return (
    <>
      <Item onSelect={onRename} disabled={disabled} leading={renameLeading}>
        {t("renameModal.rename")}
      </Item>
      <Item onSelect={onPin} disabled={disabled} leading={pinned ? unpinLeading : pinLeading}>
        {t(pinned ? "sidebar.workspace.actions.unpin" : "sidebar.workspace.actions.pin")}
      </Item>
      {sectionPage ? (
        <DropdownMenuSubTrigger id={sectionPage} leading={sectionLeading} disabled={disabled}>
          {t("desktopChat.sections.section")}
        </DropdownMenuSubTrigger>
      ) : null}
      <Item
        onSelect={onArchive}
        disabled={disabled}
        destructive={!getIsElectronMac()}
        leading={archiveLeading}
      >
        {t("agentList.archiveSheet.archive")}
      </Item>
      <DropdownMenuSeparator />
      {copyPage ? (
        <>
          <DropdownMenuSubTrigger id={copyPage} leading={copyLeading} disabled={disabled}>
            {t("common.actions.copy")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSeparator />
        </>
      ) : null}
      <Item onSelect={onRead} disabled={disabled} leading={unread ? readLeading : unreadLeading}>
        {t(unread ? "desktopChat.markRead" : "desktopChat.markUnread")}
      </Item>
    </>
  );
}

export function useDesktopChatMenu(agent: DesktopChatTarget) {
  const { t } = useTranslation();
  const toast = useToast();
  const { update, pendingAgent } = useDesktopChatMutation();
  const { archiveAgent, isArchivingAgent } = useArchiveAgent();
  const [renaming, setRenaming] = useState(false);
  const pinned = desktopChatPinnedAt(agent) !== null;
  const unread = isDesktopChatUnread(agent);
  const busy =
    pendingAgent !== null || isArchivingAgent({ serverId: agent.serverId, agentId: agent.id });
  const markRead = useCallback(() => {
    void update(agent, { kind: "read" }).catch(() => {});
  }, [agent, update]);
  const togglePin = useCallback(() => {
    void update(
      agent,
      pinned ? { kind: "unpin" } : { kind: "pin", pinnedAt: new Date().toISOString() },
    ).catch(() => {});
  }, [agent, pinned, update]);
  const toggleRead = useCallback(() => {
    void update(agent, { kind: unread ? "read" : "unread" }).catch(() => {});
  }, [agent, unread, update]);
  const rename = useCallback(() => setRenaming(true), []);
  const closeRename = useCallback(() => setRenaming(false), []);
  const submitRename = useCallback(
    (value: string) => update(agent, { kind: "rename", title: value }),
    [agent, update],
  );
  const archive = useCallback(() => {
    void (async () => {
      if (
        agent.turn.phase === "open" &&
        !(await confirmDialog({
          title: t("workspace.tabs.confirmations.archiveRunningAgentTitle"),
          message: t("workspace.tabs.confirmations.archiveRunningAgentMessage"),
          confirmLabel: t("agentList.archiveSheet.archive"),
          cancelLabel: t("common.actions.cancel"),
          destructive: true,
        }))
      )
        return;
      await archiveAgent({ serverId: agent.serverId, agentId: agent.id });
    })().catch((error) => toast.error(error instanceof Error ? error.message : String(error)));
  }, [agent, archiveAgent, t, toast]);
  return {
    busy,
    unread,
    markRead,
    menuProps: {
      pinned,
      unread,
      disabled: busy,
      onPin: togglePin,
      onRead: toggleRead,
      onRename: rename,
      onArchive: archive,
    },
    renameModal: (
      <AdaptiveRenameModal
        visible={renaming}
        title={t("renameModal.rename")}
        initialValue={agent.title ?? ""}
        onClose={closeRename}
        onSubmit={submitRename}
        testID={`desktop-chat-rename-${desktopChatKey(agent)}`}
      />
    ),
  };
}
