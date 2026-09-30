import { useCallback, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/toast-context";
import { resolveFocusedChatTarget } from "@/composer/focused-chat-target";
import { getHostRuntimeStore } from "@/runtime/host-runtime";
import { useActiveWorkspaceSelection } from "@/stores/navigation-active-workspace-store";
import { useWorkspaceFields } from "@/stores/session-store-hooks";
import {
  collectAllTabs,
  findPaneById,
  useWorkspaceLayoutStore,
  type WorkspaceLayout,
} from "@/stores/workspace-layout-store";
import {
  updateDesktopChat,
  type DesktopChatAction,
  type DesktopChatTarget,
} from "./desktop-chat-actions";

function focusedAgentId(layout: WorkspaceLayout | undefined): string | null {
  if (!layout) return null;
  const pane = findPaneById(layout.root, layout.focusedPaneId);
  const tab = collectAllTabs(layout.root).find((item) => item.tabId === pane?.focusedTabId);
  return tab?.target.kind === "agent" ? tab.target.agentId : null;
}

export function useActiveDesktopChat() {
  const selection = useActiveWorkspaceSelection();
  const serverId = selection?.serverId ?? null;
  const workspaceId = useWorkspaceFields(
    serverId,
    selection?.workspaceId ?? null,
    (workspace) => workspace.id,
  );
  const layout = useWorkspaceLayoutStore((state) =>
    serverId && workspaceId ? state.layoutByWorkspace[`${serverId}:${workspaceId}`] : undefined,
  );
  const agentId = useMemo(() => {
    if (!serverId || !layout) return null;
    const focused = resolveFocusedChatTarget({ serverId, layout });
    const tab = collectAllTabs(layout.root).find((item) => item.tabId === focused?.tabId);
    return tab?.target.kind === "agent" ? tab.target.agentId : null;
  }, [serverId, layout]);
  return useMemo(
    () => (serverId && workspaceId && agentId ? { serverId, workspaceId, agentId } : null),
    [serverId, workspaceId, agentId],
  );
}

export function useDesktopChatMutation() {
  const { t } = useTranslation();
  const toast = useToast();
  const mutation = useMutation({
    // The daemon client owns connection errors/timeouts; don't pause the rename dialog offline.
    networkMode: "always",
    mutationFn: async ({
      agent,
      action,
    }: {
      agent: DesktopChatTarget;
      action: DesktopChatAction;
    }) => {
      const client = getHostRuntimeStore().getClient(agent.serverId);
      if (!client?.isConnected) throw new Error(t("common.errors.daemonClientUnavailable"));
      const workspaceKey = `${agent.serverId}:${agent.workspaceId}`;
      const layout = useWorkspaceLayoutStore.getState();
      // Match the upstream mark-unread flow, but only unfocus the selected chat.
      const focusToken =
        action.kind === "unread" &&
        focusedAgentId(layout.layoutByWorkspace[workspaceKey]) === agent.id
          ? layout.unfocusPane(workspaceKey)
          : null;
      try {
        await updateDesktopChat(client, agent, action);
      } catch (error) {
        if (focusToken) layout.restorePaneFocus(workspaceKey, focusToken);
        throw error;
      }
    },
    onError: (error) => toast.error(error.message),
  });
  const mutateAsync = mutation.mutateAsync;
  const update = useCallback(
    (agent: DesktopChatTarget, action: DesktopChatAction) => mutateAsync({ agent, action }),
    [mutateAsync],
  );
  return { update, pendingAgent: mutation.isPending ? mutation.variables?.agent : null };
}
