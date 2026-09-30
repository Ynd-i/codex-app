import { useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react-native";
import { ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { withUnistyles } from "react-native-unistyles";
import { useShallow } from "zustand/shallow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { iconButtonChromeStyle, mutedIconColorMapping } from "@/components/ui/icon-button-chrome";
import { useSessionStore } from "@/stores/session-store";
import type { DesktopChatTarget } from "./desktop-chat-actions";
import { DesktopChatMenuItems, useDesktopChatMenu } from "./desktop-chat-menu";

const MoreIcon = withUnistyles(MoreHorizontal);
const Progress = withUnistyles(ActivityIndicator);

function ChatToolbarMenu({ agent }: { agent: DesktopChatTarget }) {
  const { t } = useTranslation();
  const { busy, menuProps, renameModal } = useDesktopChatMenu(agent);
  const [open, setOpen] = useState(false);
  const buttonStyle = useMemo(
    () =>
      ({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) =>
        iconButtonChromeStyle({ size: "large", state: { hovered, pressed, open }, disabled: busy }),
    [open, busy],
  );
  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          style={buttonStyle}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t("desktopChat.actions")}
          testID="desktop-chat-toolbar-menu"
        >
          {busy ? (
            <Progress size="small" uniProps={mutedIconColorMapping} />
          ) : (
            <MoreIcon size={18} uniProps={mutedIconColorMapping} />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" width={220}>
          <DesktopChatMenuItems {...menuProps} />
        </DropdownMenuContent>
      </DropdownMenu>
      {renameModal}
    </>
  );
}

export function DesktopChatToolbar({ serverId, agentId }: { serverId: string; agentId: string }) {
  const agent = useSessionStore(
    useShallow((state): DesktopChatTarget | null => {
      const session = state.sessions[serverId];
      const source = session?.agents.get(agentId) ?? session?.agentDetails.get(agentId);
      if (!source || source.archivedAt) return null;
      return {
        serverId,
        id: source.id,
        workspaceId: source.workspaceId,
        title: source.title,
        labels: source.labels,
        requiresAttention: source.requiresAttention,
        attentionReason: source.attentionReason,
        turn: source.turn,
      };
    }),
  );
  return agent ? <ChatToolbarMenu key={`${serverId}:${agentId}`} agent={agent} /> : null;
}
