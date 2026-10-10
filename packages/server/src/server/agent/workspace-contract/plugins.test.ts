import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vitest";
import { discoverPlugins } from "./plugins.js";

function createHome(): { home: string; plugins: string } {
  const home = mkdtempSync(join(tmpdir(), "workspace-plugins-"));
  return { home, plugins: join(home, ".agents", "plugins") };
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value));
}

function addPlugin(dir: string, manifest: Record<string, unknown> = {}): string {
  writeJson(join(dir, ".claude-plugin", "plugin.json"), manifest);
  return dir;
}

function addMarketplace(dir: string, plugins: unknown[]): string {
  writeJson(join(dir, ".claude-plugin", "marketplace.json"), { name: "market", plugins });
  return dir;
}

async function discover(home: string) {
  const warnings: string[] = [];
  const plugins = await discoverPlugins({ home, onWarning: (message) => warnings.push(message) });
  return { plugins, warnings };
}

describe("discoverPlugins", () => {
  test("a plugin root is named by its manifest, or by its directory", async () => {
    const { home, plugins } = createHome();
    const alpha = addPlugin(join(plugins, "alpha-repo"), { name: "alpha" });
    const beta = addPlugin(join(plugins, "beta"));

    expect(await discover(home)).toEqual({
      plugins: [
        { name: "alpha", dir: alpha },
        { name: "beta", dir: beta },
      ],
      warnings: [],
    });
  });

  test("a marketplace root yields each plugin under a relative source", async () => {
    const { home, plugins } = createHome();
    const market = addMarketplace(join(plugins, "market"), [
      { name: "one", source: "./plugins/one" },
      { name: "two", source: "./plugins/two" },
    ]);
    const one = addPlugin(join(market, "plugins", "one"), { name: "first" });
    const two = join(market, "plugins", "two");
    mkdirSync(join(two, "skills"), { recursive: true });

    expect(await discover(home)).toEqual({
      plugins: [
        { name: "first", dir: one },
        { name: "two", dir: two },
      ],
      warnings: [],
    });
  });

  test("skips remote, escaping and missing marketplace sources with a warning each", async () => {
    const { home, plugins } = createHome();
    const market = addMarketplace(join(plugins, "market"), [
      { name: "remote", source: { source: "github", repo: "owner/remote" } },
      { name: "outside", source: "../elsewhere" },
      { name: "missing", source: "./plugins/missing" },
    ]);
    addPlugin(join(plugins, "elsewhere"), { name: "elsewhere" });

    const { plugins: found, warnings } = await discover(home);

    expect(found).toEqual([{ name: "elsewhere", dir: join(plugins, "elsewhere") }]);
    expect(warnings).toHaveLength(3);
    expect(warnings[0]).toContain("'remote'");
    expect(warnings[1]).toContain("'outside'");
    expect(warnings[2]).toContain("'missing'");
    for (const warning of warnings) {
      expect(warning).toContain(join(market, ".claude-plugin", "marketplace.json"));
    }
  });

  test("a plugin manifest wins over a marketplace in the same directory", async () => {
    const { home, plugins } = createHome();
    const both = addPlugin(join(plugins, "both"), { name: "self" });
    addMarketplace(both, [{ name: "listed", source: "./listed" }]);
    addPlugin(join(both, "listed"), { name: "listed" });

    expect(await discover(home)).toEqual({ plugins: [{ name: "self", dir: both }], warnings: [] });
  });

  test("ignores entries without a manifest, files and dot directories", async () => {
    const { home, plugins } = createHome();
    mkdirSync(join(plugins, "notes"), { recursive: true });
    writeFileSync(join(plugins, "notes", "README.md"), "# notes\n");
    writeFileSync(join(plugins, "stray.json"), "{}");
    addPlugin(join(plugins, ".cache"), { name: "cached" });

    expect(await discover(home)).toEqual({ plugins: [], warnings: [] });
  });

  test("the first plugin with a name wins, and later ones warn", async () => {
    const { home, plugins } = createHome();
    const first = addPlugin(join(plugins, "a"), { name: "dup" });
    const second = addPlugin(join(plugins, "b"), { name: "dup" });

    const { plugins: found, warnings } = await discover(home);

    expect(found).toEqual([{ name: "dup", dir: first }]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(second);
  });

  test("a manifest name that is not a plain file name falls back to the directory name", async () => {
    const { home, plugins } = createHome();
    const safe = addPlugin(join(plugins, "safe"), { name: "../escape" });

    const { plugins: found, warnings } = await discover(home);

    expect(found).toEqual([{ name: "safe", dir: safe }]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("../escape");
  });

  test("finds nothing without ~/.agents/plugins", async () => {
    const { home } = createHome();

    expect(await discover(home)).toEqual({ plugins: [], warnings: [] });
  });
});
