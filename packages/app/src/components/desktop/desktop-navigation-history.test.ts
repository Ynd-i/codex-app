import { expect, it } from "vitest";
import { recordDesktopNavigation, moveDesktopNavigation } from "./desktop-navigation-history";

it("omits bootstrap and agent-resolution routes from user navigation history", () => {
  const empty = { entries: [], index: -1 };
  expect(recordDesktopNavigation(empty, { route: "/", chat: null })).toBe(empty);
  expect(recordDesktopNavigation(empty, { route: "/h/host/agent/agent", chat: null })).toBe(empty);
  expect(recordDesktopNavigation(empty, { route: "/h/host/workspace/workspace", chat: null })).toBe(
    empty,
  );
});

it("keeps sibling chats distinct and replaces forward history after a new selection", () => {
  const a = {
    route: "/workspace",
    chat: { serverId: "host", workspaceId: "workspace", agentId: "a" },
  };
  const b = { ...a, chat: { ...a.chat, agentId: "b" } };
  const c = { route: "/settings/general", chat: null };
  const initial = { entries: [a], index: 0 };
  const visited = recordDesktopNavigation(initial, b);
  expect(visited).toEqual({ entries: [a, b], index: 1 });
  const back = moveDesktopNavigation(visited, -1);
  expect(back.index).toBe(0);
  expect(moveDesktopNavigation(back, 1)).toEqual(visited);
  expect(moveDesktopNavigation(back, -1)).toBe(back);
  const branched = recordDesktopNavigation(back, c);
  expect(branched).toEqual({ entries: [a, c], index: 1 });
  expect(recordDesktopNavigation(branched, { ...c })).toBe(branched);
});
