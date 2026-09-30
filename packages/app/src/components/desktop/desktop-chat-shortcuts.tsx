import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/toast-context";
import { useKeyboardActionHandler } from "@/hooks/use-keyboard-action-handler";
import { getHostRuntimeStore } from "@/runtime/host-runtime";
import { useSessionStore } from "@/stores/session-store";
import { updateDesktopChat } from "./desktop-chat-actions";
import { desktopChatPinnedAt } from "./desktop-chat-model";
import { useActiveDesktopChat } from "./use-desktop-chat";

export function DesktopChatShortcuts() {
  const active = useActiveDesktopChat();
  const { t } = useTranslation();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: async () => {
      if (!active) return;
      const session = useSessionStore.getState().sessions[active.serverId];
      const agent =
        session?.agents.get(active.agentId) ?? session?.agentDetails.get(active.agentId);
      const client = getHostRuntimeStore().getClient(active.serverId);
      if (!client) throw new Error(t("common.errors.daemonClientUnavailable"));
      if (!agent || agent.archivedAt) return;
      await updateDesktopChat(
        client,
        agent,
        desktopChatPinnedAt(agent) === null
          ? { kind: "pin", pinnedAt: new Date().toISOString() }
          : { kind: "unpin" },
      );
    },
    onError: (error) => toast.error(error.message),
  });
  const mutate = mutation.mutate;
  const pending = mutation.isPending;
  const handle = useCallback(() => {
    if (!active) return false;
    if (!pending) mutate();
    return true;
  }, [active, pending, mutate]);
  useKeyboardActionHandler({
    handlerId: "desktop-chat-pin",
    actions: ["workspace.pin"],
    enabled: active !== null,
    priority: 10,
    handle,
  });
  return null;
}
