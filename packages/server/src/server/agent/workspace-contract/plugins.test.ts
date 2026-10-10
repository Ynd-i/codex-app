import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { createTestLogger } from "../../../test-utils/test-logger.js";
import { discoverPlugins, linkPluginSkills } from "./plugins.js";

const logger = createTestLogger();
const homes: string[] = [];

afterEach(() => {
  for (const home of homes.splice(0)) {
    rmSync(home, { recursive: true, force: true });
  }
});

function createHome(): { home: string; plugins: string } {
  const home = mkdtempSync(join(tmpdir(), "workspace-plugins-"));
  homes.push(home);
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

describe("linkPluginSkills", () => {
  function addSkills(dir: string, ...names: string[]): string {
    for (const name of names) {
      mkdirSync(join(dir, "skills", name), { recursive: true });
      writeFileSync(join(dir, "skills", name, "SKILL.md"), `# ${name}\n`);
    }
    return join(dir, "skills");
  }

  test("links each plugin's skills directory under the plugin name", async () => {
    const { home, plugins } = createHome();
    const kitSkills = addSkills(join(plugins, "kit-repo"), "how", "tdd");
    const bare = join(plugins, "bare");
    mkdirSync(bare, { recursive: true });

    const changes = await linkPluginSkills({
      home,
      plugins: [
        { name: "kit", dir: join(plugins, "kit-repo") },
        { name: "bare", dir: bare },
      ],
      logger,
    });

    const agentsSkills = join(home, ".agents", "skills");
    expect(changes).toBe(1);
    expect(readdirSync(agentsSkills)).toEqual(["kit"]);
    expect(readlinkSync(join(agentsSkills, "kit"))).toBe(kitSkills);
  });

  test("a second run changes nothing", async () => {
    const { home, plugins } = createHome();
    addSkills(join(plugins, "kit"), "how");
    const params = { home, plugins: [{ name: "kit", dir: join(plugins, "kit") }], logger };
    await linkPluginSkills(params);
    const link = join(home, ".agents", "skills", "kit");
    const before = lstatSync(link).mtimeMs;

    expect(await linkPluginSkills(params)).toBe(0);
    expect(lstatSync(link).mtimeMs).toBe(before);
  });

  test("repoints its links and removes the ones whose plugin is gone", async () => {
    const { home, plugins } = createHome();
    const kitSkills = addSkills(join(plugins, "kit-v2"), "how");
    addSkills(join(plugins, "kit-v1"), "how");
    const agentsSkills = join(home, ".agents", "skills");
    mkdirSync(agentsSkills, { recursive: true });
    symlinkSync(join(plugins, "kit-v1", "skills"), join(agentsSkills, "kit"));
    symlinkSync(join(plugins, "removed", "skills"), join(agentsSkills, "removed"));

    const changes = await linkPluginSkills({
      home,
      plugins: [{ name: "kit", dir: join(plugins, "kit-v2") }],
      logger,
    });

    expect(changes).toBe(3);
    expect(readdirSync(agentsSkills)).toEqual(["kit"]);
    expect(readlinkSync(join(agentsSkills, "kit"))).toBe(kitSkills);
  });

  test("leaves real directories, files and other links alone", async () => {
    const { home, plugins } = createHome();
    addSkills(join(plugins, "kit"), "how");
    addSkills(join(plugins, "other"), "why");
    const pluginSkill = join(plugins, "kit", "skills", "how");
    const agentsSkills = join(home, ".agents", "skills");
    mkdirSync(join(agentsSkills, "kit"), { recursive: true });
    writeFileSync(join(agentsSkills, "kit", "SKILL.md"), "# my own kit skill\n");
    writeFileSync(join(agentsSkills, "notes.md"), "notes\n");
    const foreign = join(home, "foreign");
    mkdirSync(foreign);
    symlinkSync(foreign, join(agentsSkills, "other"));
    symlinkSync(join(foreign, "gone"), join(agentsSkills, "dangling"));
    symlinkSync(pluginSkill, join(agentsSkills, "how"));

    const changes = await linkPluginSkills({
      home,
      plugins: [
        { name: "kit", dir: join(plugins, "kit") },
        { name: "other", dir: join(plugins, "other") },
      ],
      logger,
    });

    expect(changes).toBe(0);
    expect(lstatSync(join(agentsSkills, "kit")).isDirectory()).toBe(true);
    expect(readlinkSync(join(agentsSkills, "other"))).toBe(foreign);
    expect(readlinkSync(join(agentsSkills, "dangling"))).toBe(join(foreign, "gone"));
    expect(readlinkSync(join(agentsSkills, "how"))).toBe(pluginSkill);
    expect(readdirSync(agentsSkills).sort()).toEqual([
      "dangling",
      "how",
      "kit",
      "notes.md",
      "other",
    ]);
  });
});
