import { parseHostWorkspaceRouteFromPathname } from "@/utils/host-routes";

export interface DesktopNavigationEntry {
  route: string;
  chat: { serverId: string; workspaceId: string; agentId: string } | null;
}

export interface DesktopNavigationHistory {
  entries: DesktopNavigationEntry[];
  index: number;
}

export function recordDesktopNavigation(
  history: DesktopNavigationHistory,
  entry: DesktopNavigationEntry,
): DesktopNavigationHistory {
  const pathname = entry.route.split("?")[0] ?? "";
  // Bootstrap and workspace hydration are transitions, not user destinations.
  if (
    pathname === "/" ||
    /^\/h\/[^/]+(?:\/agent\/[^/]+)?$/.test(pathname) ||
    (!entry.chat && parseHostWorkspaceRouteFromPathname(pathname))
  )
    return history;
  const current = history.entries[history.index];
  if (
    current?.route === entry.route &&
    current.chat?.serverId === entry.chat?.serverId &&
    current.chat?.workspaceId === entry.chat?.workspaceId &&
    current.chat?.agentId === entry.chat?.agentId
  ) {
    return history;
  }
  const entries = [...history.entries.slice(0, history.index + 1), entry];
  return { entries, index: entries.length - 1 };
}

export function moveDesktopNavigation(
  history: DesktopNavigationHistory,
  offset: number,
): DesktopNavigationHistory {
  if (history.entries.length === 0) return history;
  const index = Math.max(0, Math.min(history.entries.length - 1, history.index + offset));
  return index === history.index ? history : { ...history, index };
}
