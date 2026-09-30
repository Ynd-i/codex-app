import { expect, it } from "vitest";
import { PARENT_AGENT_ID_LABEL } from "@getpaseo/protocol/agent-labels";
import type { AggregatedAgent } from "@/hooks/use-aggregated-agents";
import type { SidebarProjectEntry } from "@/hooks/use-sidebar-workspaces-list";
import {
  buildDesktopChatSidebar,
  DESKTOP_CHAT_PINNED_AT,
  DESKTOP_CHAT_UNREAD,
  isDesktopChatUnread,
} from "./desktop-chat-model";

function chat(id: string, serverId: string, workspaceId: string): AggregatedAgent {
  return {
    id,
    serverId,
    workspaceId,
    serverLabel: serverId,
    title: id,
    provider: "codex",
    cwd: "/same-directory",
    status: "idle",
    turn: { phase: "idle", cancellationRequestId: null },
    createdAt: new Date("2026-09-30T08:00:00Z"),
    lastActivityAt: new Date("2026-09-30T09:00:00Z"),
    labels: {},
  };
}

function project(viewKey: string, serverId: string, workspaceIds: string[]): SidebarProjectEntry {
  return {
    viewKey,
    projectName: viewKey,
    projectKind: "git",
    iconWorkingDir: "/same-directory",
    hosts: [],
    workspaces: workspaceIds.map((workspaceId) => ({
      serverId,
      workspaceId,
      workspaceKey: `${serverId}:${workspaceId}`,
      projectViewKey: viewKey,
      projectName: viewKey,
      projectKind: "git",
      workspaceKind: "local_checkout",
      name: workspaceId,
    })),
  };
}

it("keeps chat and host identities distinct without losing empty workspaces", () => {
  const first = chat("same-id", "local", "one");
  const sibling = chat("sibling", "local", "one");
  sibling.lastActivityAt = new Date("2026-09-30T10:00:00Z");
  first.labels[DESKTOP_CHAT_PINNED_AT] = "2026-09-30T11:00:00Z";
  const remote = chat("same-id", "remote", "one");
  const child = chat("child", "local", "one");
  child.labels[PARENT_AGENT_ID_LABEL] = first.id;
  const crossWorkspaceChild = chat("cross-child", "local", "two");
  crossWorkspaceChild.labels[PARENT_AGENT_ID_LABEL] = first.id;
  const archived = chat("archived", "local", "one");
  archived.archivedAt = new Date("2026-09-30T11:00:00Z");
  const model = buildDesktopChatSidebar({
    projects: [
      project("local-project", "local", ["one", "two", "empty"]),
      project("remote-project", "remote", ["one"]),
    ],
    agents: [
      first,
      sibling,
      remote,
      child,
      crossWorkspaceChild,
      archived,
      chat("filtered-host", "other", "one"),
    ],
  });

  expect(model.pinned.map((agent) => `${agent.serverId}:${agent.id}`)).toEqual(["local:same-id"]);
  expect(model.recent.map((agent) => `${agent.serverId}:${agent.id}`)).toEqual([
    "local:sibling",
    "local:cross-child",
    "remote:same-id",
  ]);
  expect(model.projects[0]?.chats.map((agent) => agent.id)).toEqual([
    "sibling",
    "cross-child",
    "same-id",
  ]);
  expect(model.projects[0]?.emptyWorkspaces.map((workspace) => workspace.workspaceId)).toEqual([
    "empty",
  ]);
  expect(model.projects[1]?.chats.map((agent) => agent.serverId)).toEqual(["remote"]);

  sibling.labels[DESKTOP_CHAT_UNREAD] = "true";
  expect(isDesktopChatUnread(first)).toBe(false);
  expect(isDesktopChatUnread(sibling)).toBe(true);
  sibling.labels[DESKTOP_CHAT_UNREAD] = "false";
  expect(isDesktopChatUnread(sibling)).toBe(false);
  sibling.requiresAttention = true;
  expect(isDesktopChatUnread(sibling)).toBe(true);
});
