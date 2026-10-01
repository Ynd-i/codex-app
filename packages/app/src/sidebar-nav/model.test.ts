import { describe, expect, it } from "vitest";
import type { PluginSidebarGroup } from "@/plugins/sidebar-groups";
import {
  builtinSidebarNavShortcutAction,
  moveSidebarNavItem,
  pluginSidebarNavKey,
  resolveSidebarNavItems,
  setSidebarNavItemVisible,
  type SidebarNavItem,
  type SidebarNavPreference,
} from "./model";

function group(pluginId: string, contributionId: string): PluginSidebarGroup {
  return {
    kind: "item",
    key: `${pluginId}/sidebar/${contributionId}`,
    pluginId,
    contributionId,
    title: contributionId,
    targets: [],
  };
}

const kanban = group("kanban", "board");
const notes = group("notes", "inbox");
const kanbanKey = pluginSidebarNavKey(kanban);
const notesKey = pluginSidebarNavKey(notes);

function summarize(items: readonly SidebarNavItem[]): SidebarNavPreference[] {
  return items.map(({ key, visible }) => ({ key, visible }));
}

describe("resolveSidebarNavItems", () => {
  it("yields builtins then plugins, all visible, when nothing is stored", () => {
    const items = resolveSidebarNavItems({
      section: "header",
      compact: false,
      pluginGroups: [kanban, notes],
      preferences: [],
    });

    expect(summarize(items)).toEqual([
      { key: "new-workspace", visible: true },
      { key: "history", visible: true },
      { key: "search", visible: true },
      { key: "schedules", visible: true },
      { key: kanbanKey, visible: true },
      { key: notesKey, visible: true },
    ]);
    expect(items[4]).toEqual({ kind: "plugin", key: kanbanKey, group: kanban, visible: true });
    expect(items[0]).toEqual({
      kind: "builtin",
      key: "new-workspace",
      id: "new-workspace",
      visible: true,
    });
  });

  it("keeps the stored order and appends newly available items as visible", () => {
    const items = resolveSidebarNavItems({
      section: "header",
      compact: false,
      pluginGroups: [notes, kanban],
      preferences: [
        { key: kanbanKey, visible: false },
        { key: "schedules", visible: true },
        { key: "new-workspace", visible: false },
      ],
    });

    expect(summarize(items)).toEqual([
      { key: kanbanKey, visible: false },
      { key: "schedules", visible: true },
      { key: "new-workspace", visible: false },
      { key: "history", visible: true },
      { key: "search", visible: true },
      { key: notesKey, visible: true },
    ]);
  });

  it("skips keys that are unknown or not currently available", () => {
    const items = resolveSidebarNavItems({
      section: "header",
      compact: false,
      pluginGroups: [],
      preferences: [
        { key: notesKey, visible: false },
        { key: "bogus", visible: true },
        { key: "history", visible: true },
      ],
    });

    expect(items.map((item) => item.key)).toEqual([
      "history",
      "new-workspace",
      "search",
      "schedules",
    ]);
  });

  it("lets the first of duplicate keys win", () => {
    const items = resolveSidebarNavItems({
      section: "header",
      compact: false,
      pluginGroups: [],
      preferences: [
        { key: "history", visible: false },
        { key: "history", visible: true },
      ],
    });

    expect(summarize(items)).toEqual([
      { key: "history", visible: false },
      { key: "new-workspace", visible: true },
      { key: "search", visible: true },
      { key: "schedules", visible: true },
    ]);
  });
});

describe("resolveSidebarNavItems on compact layouts", () => {
  it("hides the Usage item until it is turned on", () => {
    const resolve = (compact: boolean, preferences: SidebarNavPreference[]) =>
      summarize(
        resolveSidebarNavItems({ section: "footer", compact, pluginGroups: [], preferences }),
      );

    expect(resolve(true, [])).toEqual([{ key: "usage", visible: false }]);
    expect(resolve(false, [])).toEqual([{ key: "usage", visible: true }]);
    expect(resolve(true, [{ key: "usage", visible: true }])).toEqual([
      { key: "usage", visible: true },
    ]);
  });
});

describe("responsive defaults after saving preferences", () => {
  const resolve = (compact: boolean, preferences: SidebarNavPreference[]) =>
    resolveSidebarNavItems({ section: "footer", compact, pluginGroups: [kanban], preferences });
  const roundTrip = (preferences: SidebarNavPreference[]): SidebarNavPreference[] =>
    JSON.parse(JSON.stringify(preferences));

  it("keeps Usage responsive after moving a footer plugin on compact", () => {
    const next = roundTrip(
      moveSidebarNavItem({
        items: resolve(true, []),
        key: kanbanKey,
        direction: "up",
        previous: [],
      }),
    );
    expect(next).toEqual([{ key: kanbanKey }, { key: "usage" }]);
    expect(summarize(resolve(true, next))).toEqual([
      { key: kanbanKey, visible: true },
      { key: "usage", visible: false },
    ]);
    expect(summarize(resolve(false, next))).toEqual([
      { key: kanbanKey, visible: true },
      { key: "usage", visible: true },
    ]);
  });

  it("does not freeze Usage defaults when hiding another item on either layout", () => {
    for (const compact of [true, false]) {
      const next = roundTrip(
        setSidebarNavItemVisible({
          items: resolve(compact, []),
          key: kanbanKey,
          visible: false,
          previous: [],
        }),
      );
      expect(next).toEqual([{ key: "usage" }, { key: kanbanKey, visible: false }]);
      expect(summarize(resolve(true, next))).toEqual([
        { key: "usage", visible: false },
        { key: kanbanKey, visible: false },
      ]);
      expect(summarize(resolve(false, next))).toEqual([
        { key: "usage", visible: true },
        { key: kanbanKey, visible: false },
      ]);
    }
  });

  it("preserves an explicit Usage choice through unrelated changes on both layouts", () => {
    for (const visible of [true, false]) {
      let previous = roundTrip(
        setSidebarNavItemVisible({
          items: resolve(true, []),
          key: "usage",
          visible,
          previous: [],
        }),
      );
      previous = roundTrip(
        moveSidebarNavItem({
          items: resolve(true, previous),
          key: "usage",
          direction: "down",
          previous,
        }),
      );
      previous = roundTrip(
        setSidebarNavItemVisible({
          items: resolve(true, previous),
          key: kanbanKey,
          visible: false,
          previous,
        }),
      );
      for (const compact of [true, false]) {
        expect(resolve(compact, previous).find((item) => item.key === "usage")?.visible).toBe(
          visible,
        );
      }
    }
  });

  it("retains absent plugins and first explicit overrides while defaults stay unset", () => {
    const previous: SidebarNavPreference[] = [
      { key: notesKey },
      { key: "usage", visible: false },
      { key: "usage", visible: true },
    ];
    const next = roundTrip(
      moveSidebarNavItem({
        items: resolve(true, previous),
        key: kanbanKey,
        direction: "up",
        previous,
      }),
    );
    expect(next).toEqual([{ key: notesKey }, { key: kanbanKey }, { key: "usage", visible: false }]);
    expect(
      summarize(
        resolveSidebarNavItems({
          section: "footer",
          compact: false,
          pluginGroups: [notes, kanban],
          preferences: next,
        }),
      ),
    ).toEqual([
      { key: notesKey, visible: true },
      { key: kanbanKey, visible: true },
      { key: "usage", visible: false },
    ]);
  });
});

describe("setSidebarNavItemVisible", () => {
  it("toggles one item and writes the full resolved order", () => {
    const items = resolveSidebarNavItems({
      section: "header",
      compact: false,
      pluginGroups: [kanban],
      preferences: [],
    });

    const next = setSidebarNavItemVisible({ items, key: "search", visible: false, previous: [] });

    expect(next).toEqual([
      { key: "new-workspace" },
      { key: "history" },
      { key: "search", visible: false },
      { key: "schedules" },
      { key: kanbanKey },
    ]);
  });

  it("carries preferences for unavailable plugins through an unrelated edit", () => {
    const previous: SidebarNavPreference[] = [
      { key: notesKey, visible: false },
      { key: "history", visible: true },
    ];
    const items = resolveSidebarNavItems({
      section: "header",
      compact: false,
      pluginGroups: [],
      preferences: previous,
    });

    const next = setSidebarNavItemVisible({ items, key: "history", visible: false, previous });

    expect(next).toEqual([
      { key: notesKey, visible: false },
      { key: "history", visible: false },
      { key: "new-workspace" },
      { key: "search" },
      { key: "schedules" },
    ]);
  });

  it("keeps an unavailable plugin in its configured position", () => {
    const previous: SidebarNavPreference[] = [
      { key: "new-workspace", visible: true },
      { key: notesKey, visible: false },
      { key: "history", visible: true },
      { key: "search", visible: true },
      { key: "schedules", visible: true },
    ];
    const items = resolveSidebarNavItems({
      section: "header",
      compact: false,
      pluginGroups: [],
      preferences: previous,
    });

    const next = setSidebarNavItemVisible({ items, key: "history", visible: false, previous });

    expect(next).toEqual([
      { key: "new-workspace", visible: true },
      { key: notesKey, visible: false },
      { key: "history", visible: false },
      { key: "search", visible: true },
      { key: "schedules", visible: true },
    ]);
    expect(
      summarize(
        resolveSidebarNavItems({
          section: "header",
          compact: false,
          pluginGroups: [notes],
          preferences: next,
        }),
      ),
    ).toEqual(next);
  });

  it("returns the normalized list unchanged for an unknown key", () => {
    const items = resolveSidebarNavItems({
      section: "header",
      compact: false,
      pluginGroups: [],
      preferences: [],
    });

    const next = setSidebarNavItemVisible({ items, key: "bogus", visible: false, previous: [] });

    expect(next).toEqual(items.map(({ key }) => ({ key })));
  });
});

describe("moveSidebarNavItem", () => {
  const items = resolveSidebarNavItems({
    section: "header",
    compact: false,
    pluginGroups: [kanban],
    preferences: [],
  });

  it("moves an item up", () => {
    const next = moveSidebarNavItem({ items, key: "search", direction: "up", previous: [] });

    expect(next.map((preference) => preference.key)).toEqual([
      "new-workspace",
      "search",
      "history",
      "schedules",
      kanbanKey,
    ]);
  });

  it("moves an item down", () => {
    const next = moveSidebarNavItem({ items, key: "schedules", direction: "down", previous: [] });

    expect(next.map((preference) => preference.key)).toEqual([
      "new-workspace",
      "history",
      "search",
      kanbanKey,
      "schedules",
    ]);
  });

  it("leaves the order alone at the boundaries", () => {
    const first = moveSidebarNavItem({
      items,
      key: "new-workspace",
      direction: "up",
      previous: [],
    });
    const last = moveSidebarNavItem({ items, key: kanbanKey, direction: "down", previous: [] });

    expect(first).toEqual(items.map(({ key }) => ({ key })));
    expect(last).toEqual(items.map(({ key }) => ({ key })));
  });

  it("returns the normalized list unchanged for an unknown key", () => {
    const next = moveSidebarNavItem({ items, key: "bogus", direction: "down", previous: [] });

    expect(next).toEqual(items.map(({ key }) => ({ key })));
  });

  it("drops duplicate carried-over keys", () => {
    const previous: SidebarNavPreference[] = [
      { key: notesKey, visible: false },
      { key: notesKey, visible: true },
    ];

    const next = moveSidebarNavItem({ items, key: "history", direction: "up", previous });

    expect(next.filter((preference) => preference.key === notesKey)).toEqual([
      { key: notesKey, visible: false },
    ]);
  });
});

describe("builtinSidebarNavShortcutAction", () => {
  it("maps only the builtins that have a keyboard shortcut", () => {
    expect(builtinSidebarNavShortcutAction("new-workspace")).toBe("new-workspace");
    expect(builtinSidebarNavShortcutAction("search")).toBe("toggle-command-center");
    expect(builtinSidebarNavShortcutAction("history")).toBeNull();
    expect(builtinSidebarNavShortcutAction("schedules")).toBeNull();
  });
});

describe("footer section", () => {
  const sync = group("sync", "status");
  const syncKey = pluginSidebarNavKey(sync);

  it("resolves the Usage item first, then plugin rows", () => {
    const items = resolveSidebarNavItems({
      section: "footer",
      compact: false,
      pluginGroups: [sync],
      preferences: [],
    });

    expect(summarize(items)).toEqual([
      { key: "usage", visible: true },
      { key: syncKey, visible: true },
    ]);
  });

  it("ignores header built-ins stored in footer preferences", () => {
    const items = resolveSidebarNavItems({
      section: "footer",
      compact: false,
      pluginGroups: [],
      preferences: [{ key: "history", visible: false }],
    });

    expect(summarize(items)).toEqual([{ key: "usage", visible: true }]);
  });

  it("ignores the footer icon buttons, which are fixed and not items", () => {
    const items = resolveSidebarNavItems({
      section: "footer",
      compact: false,
      pluginGroups: [sync],
      preferences: [
        { key: "add-project", visible: false },
        { key: "hosts", visible: false },
        { key: "import", visible: false },
        { key: "help", visible: false },
        { key: syncKey, visible: true },
        { key: "usage", visible: false },
      ],
    });

    expect(summarize(items)).toEqual([
      { key: syncKey, visible: true },
      { key: "usage", visible: false },
    ]);
  });

  it("moves and hides footer rows while keeping an unavailable plugin's entry", () => {
    const notesPreference = { key: notesKey, visible: false };
    const previous: SidebarNavPreference[] = [notesPreference];
    const items = resolveSidebarNavItems({
      section: "footer",
      compact: false,
      pluginGroups: [sync],
      preferences: previous,
    });

    const moved = moveSidebarNavItem({ items, key: syncKey, direction: "up", previous });
    const hidden = setSidebarNavItemVisible({
      items: resolveSidebarNavItems({
        section: "footer",
        compact: false,
        pluginGroups: [sync],
        preferences: moved,
      }),
      key: "usage",
      visible: false,
      previous: moved,
    });

    expect(hidden).toEqual([notesPreference, { key: syncKey }, { key: "usage", visible: false }]);
  });
});
