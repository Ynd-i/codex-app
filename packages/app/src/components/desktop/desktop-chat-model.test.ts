import { expect, it } from "vitest";
import { PARENT_AGENT_ID_LABEL } from "@getpaseo/protocol/agent-labels";
import type { AggregatedAgent } from "@/hooks/use-aggregated-agents";
import type { SidebarProjectEntry } from "@/hooks/use-sidebar-workspaces-list";
import {
  buildDesktopChatSidebar,
  DESKTOP_CHAT_PINNED_AT,
  DESKTOP_CHAT_UNREAD,
  isDesktopChatUnread,
  orderSectionChats,
  orderSectionProjects,
  partitionChatSections,
  type DesktopChatProject,
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

it("keeps new chats on top of a manually ordered section", () => {
  const older = chat("older", "local", "one");
  const middle = chat("middle", "local", "one");
  const fresh = chat("fresh", "local", "one");
  older.lastActivityAt = new Date("2026-09-30T08:00:00Z");
  middle.lastActivityAt = new Date("2026-09-30T09:00:00Z");
  fresh.lastActivityAt = new Date("2026-09-30T10:00:00Z");
  const byActivity = [fresh, middle, older];
  const keys = (chats: AggregatedAgent[]) => chats.map((entry) => entry.id);
  expect(keys(orderSectionChats(byActivity, "manual", ["local:older", "local:middle"]))).toEqual([
    "fresh",
    "older",
    "middle",
  ]);
  expect(keys(orderSectionChats([older, fresh, middle], "latest", ["local:older"]))).toEqual([
    "fresh",
    "middle",
    "older",
  ]);
});

it("ranks projects by their newest chat only in latest order", () => {
  const quiet: DesktopChatProject = {
    project: project("quiet", "local", []),
    chats: [],
    emptyWorkspaces: [],
  };
  const busyChat = chat("busy", "local", "one");
  const busy: DesktopChatProject = {
    project: project("busy", "local", ["one"]),
    chats: [busyChat],
    emptyWorkspaces: [],
  };
  const names = (entries: DesktopChatProject[]) => entries.map((entry) => entry.project.viewKey);
  expect(names(orderSectionProjects([quiet, busy], "manual"))).toEqual(["quiet", "busy"]);
  expect(names(orderSectionProjects([quiet, busy], "latest"))).toEqual(["busy", "quiet"]);
});

it("moves assigned chats and projects into existing custom sections only", () => {
  const kept = chat("kept", "local", "one");
  const moved = chat("moved", "local", "one");
  const orphaned = chat("orphaned", "local", "one");
  const app: DesktopChatProject = {
    project: project("app", "local", ["one"]),
    chats: [],
    emptyWorkspaces: [],
  };
  const docs: DesktopChatProject = {
    project: project("docs", "local", []),
    chats: [],
    emptyWorkspaces: [],
  };
  const result = partitionChatSections({
    recent: [kept, moved, orphaned],
    projects: [app, docs],
    sections: [{ id: "work", name: "Work" }],
    chatSection: { "local:moved": "work", "local:orphaned": "removed-section" },
    projectSection: { docs: "work" },
  });
  expect(result.recent.map((entry) => entry.id)).toEqual(["kept", "orphaned"]);
  expect(result.projects.map((entry) => entry.project.viewKey)).toEqual(["app"]);
  expect(result.custom).toEqual([{ id: "work", name: "Work", chats: [moved], projects: [docs] }]);
});
