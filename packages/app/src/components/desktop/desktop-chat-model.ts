import { getParentAgentIdFromLabels } from "@getpaseo/protocol/agent-labels";
import type { AggregatedAgent } from "@/hooks/use-aggregated-agents";
import type {
  SidebarProjectEntry,
  SidebarWorkspacePlacement,
} from "@/hooks/use-sidebar-workspaces-list";
import { isWorkspaceRootAgent } from "@/subagents/policies";
import { applyStoredOrdering } from "@/hooks/sidebar-workspaces-view-model";

// Generic agent metadata keeps these preferences synced without changing the daemon protocol.
export const DESKTOP_CHAT_PINNED_AT = "codex-ui.pinned-at";
export const DESKTOP_CHAT_UNREAD = "codex-ui.unread";

export function desktopChatKey(agent: Pick<AggregatedAgent, "serverId" | "id">): string {
  return `${agent.serverId}:${agent.id}`;
}

export function desktopChatPinnedAt(agent: Pick<AggregatedAgent, "labels">): number | null {
  const timestamp = Date.parse(agent.labels[DESKTOP_CHAT_PINNED_AT] ?? "");
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function isDesktopChatUnread(
  agent: Pick<AggregatedAgent, "labels" | "requiresAttention">,
): boolean {
  return Boolean(agent.requiresAttention || agent.labels[DESKTOP_CHAT_UNREAD] === "true");
}

export interface DesktopChatProject {
  project: SidebarProjectEntry;
  chats: AggregatedAgent[];
  emptyWorkspaces: SidebarWorkspacePlacement[];
}

export function buildDesktopChatSidebar({
  projects,
  agents,
}: {
  projects: readonly SidebarProjectEntry[];
  agents: readonly AggregatedAgent[];
}): {
  projects: DesktopChatProject[];
  pinned: AggregatedAgent[];
  recent: AggregatedAgent[];
} {
  const projectByWorkspace = new Map<string, string>();
  for (const project of projects) {
    for (const workspace of project.workspaces) {
      projectByWorkspace.set(workspace.workspaceKey, project.viewKey);
    }
  }
  const agentByKey = new Map(agents.map((agent) => [desktopChatKey(agent), agent]));
  const visible = agents
    .filter((agent) => {
      if (agent.archivedAt || !projectByWorkspace.has(`${agent.serverId}:${agent.workspaceId}`)) {
        return false;
      }
      const parentAgentId = getParentAgentIdFromLabels(agent.labels);
      return isWorkspaceRootAgent(
        { workspaceId: agent.workspaceId, parentAgentId },
        parentAgentId ? agentByKey.get(`${agent.serverId}:${parentAgentId}`) : undefined,
      );
    })
    .sort(
      (left, right) =>
        right.lastActivityAt.getTime() - left.lastActivityAt.getTime() ||
        desktopChatKey(left).localeCompare(desktopChatKey(right)),
    );
  const chatsByProject = new Map<string, AggregatedAgent[]>();
  const workspacesWithChats = new Set<string>();
  for (const agent of visible) {
    const workspaceKey = `${agent.serverId}:${agent.workspaceId}`;
    const projectKey = projectByWorkspace.get(workspaceKey)!;
    const chats = chatsByProject.get(projectKey) ?? [];
    chats.push(agent);
    chatsByProject.set(projectKey, chats);
    workspacesWithChats.add(workspaceKey);
  }
  return {
    projects: projects.map((project) => ({
      project,
      chats: chatsByProject.get(project.viewKey) ?? [],
      emptyWorkspaces: project.workspaces.filter(
        (workspace) => !workspacesWithChats.has(workspace.workspaceKey),
      ),
    })),
    pinned: visible
      .filter((agent) => desktopChatPinnedAt(agent) !== null)
      .sort((left, right) => desktopChatPinnedAt(right)! - desktopChatPinnedAt(left)!),
    recent: visible.filter((agent) => desktopChatPinnedAt(agent) === null),
  };
}

export type ChatSectionSort = "latest" | "manual";

function byLatestActivity(left: AggregatedAgent, right: AggregatedAgent): number {
  return right.lastActivityAt.getTime() - left.lastActivityAt.getTime();
}

/**
 * Latest follows activity. Manual applies the stored drag order and leaves chats it has never
 * seen where `chats` puts them, so a new chat still arrives on top of a hand-ordered section.
 */
export function orderSectionChats(
  chats: AggregatedAgent[],
  sort: ChatSectionSort,
  storedOrder: string[],
): AggregatedAgent[] {
  if (sort === "latest") return [...chats].sort(byLatestActivity);
  return applyStoredOrdering({ items: chats, storedOrder, getKey: desktopChatKey });
}

/** Manual keeps the sidebar's stored project order; latest ranks by each project's newest chat. */
export function orderSectionProjects(
  projects: DesktopChatProject[],
  sort: ChatSectionSort,
): DesktopChatProject[] {
  if (sort === "manual") return projects;
  const newest = (entry: DesktopChatProject) => entry.chats[0]?.lastActivityAt.getTime() ?? 0;
  return [...projects].sort((left, right) => newest(right) - newest(left));
}

export interface CustomChatSection {
  id: string;
  name: string;
  chats: AggregatedAgent[];
  projects: DesktopChatProject[];
}

/**
 * Moves chats and projects assigned to a custom section out of Recent and Projects. Pinned chats
 * stay pinned, and an assignment to a section that no longer exists is ignored.
 */
export function partitionChatSections({
  recent,
  projects,
  sections,
  chatSection,
  projectSection,
}: {
  recent: AggregatedAgent[];
  projects: DesktopChatProject[];
  sections: readonly { id: string; name: string }[];
  chatSection: Readonly<Record<string, string>>;
  projectSection: Readonly<Record<string, string>>;
}): { recent: AggregatedAgent[]; projects: DesktopChatProject[]; custom: CustomChatSection[] } {
  const custom = new Map<string, CustomChatSection>(
    sections.map((section) => [section.id, { ...section, chats: [], projects: [] }]),
  );
  const remainingRecent: AggregatedAgent[] = [];
  for (const agent of recent) {
    const section = custom.get(chatSection[desktopChatKey(agent)] ?? "");
    if (section) section.chats.push(agent);
    else remainingRecent.push(agent);
  }
  const remainingProjects: DesktopChatProject[] = [];
  for (const entry of projects) {
    const section = custom.get(projectSection[entry.project.viewKey] ?? "");
    if (section) section.projects.push(entry);
    else remainingProjects.push(entry);
  }
  return { recent: remainingRecent, projects: remainingProjects, custom: [...custom.values()] };
}
