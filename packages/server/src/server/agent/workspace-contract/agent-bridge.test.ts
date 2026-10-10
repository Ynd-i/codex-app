import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pino from "pino";
import { afterEach, describe, expect, test } from "vitest";
import YAML from "yaml";
import { createTestLogger } from "../../../test-utils/test-logger.js";
import { bridgeAgentDefinitions } from "./agent-bridge.js";
import { readAgentDefinitions } from "./agent-definitions.js";

const logger = createTestLogger();
const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function createDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(dir);
  return dir;
}

function writeSource(
  home: string,
  name: string,
  lines = ["---", `name: ${name}`, `description: The ${name} agent.`, "---", `Do ${name} work.`],
): string {
  const dir = join(home, ".agents", "agents");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${name}.md`);
  writeFileSync(path, `${lines.join("\n")}\n`);
  return path;
}

async function bridge(params: { home: string; baseProviderId: string; env?: NodeJS.ProcessEnv }) {
  const agents = await readAgentDefinitions({
    home: params.home,
    onWarning: (message) => {
      throw new Error(message);
    },
  });
  await bridgeAgentDefinitions({
    home: params.home,
    baseProviderId: params.baseProviderId,
    env: params.env ?? {},
    agents,
    logger,
  });
}

function generated(home: string, vendor: string, fileName: string): string {
  return join(home, ".agents", ".generated", "agents", vendor, fileName);
}

describe("bridgeAgentDefinitions for Claude", () => {
  test("links each source file into the Claude agents dir", async () => {
    const home = createDir("agent-bridge-");
    const explorer = writeSource(home, "explorer");
    const reviewer = writeSource(home, "reviewer");

    await bridge({ home, baseProviderId: "claude" });

    const claudeAgents = join(home, ".claude", "agents");
    expect(readdirSync(claudeAgents)).toEqual(["explorer.md", "reviewer.md"]);
    expect(readlinkSync(join(claudeAgents, "explorer.md"))).toBe(explorer);
    expect(readlinkSync(join(claudeAgents, "reviewer.md"))).toBe(reviewer);
    expect(existsSync(join(home, ".agents", ".generated"))).toBe(false);
  });

  test("repoints a link into the wrong source and removes a link whose source is gone", async () => {
    const home = createDir("agent-bridge-");
    const reviewer = writeSource(home, "reviewer");
    writeSource(home, "retired");
    await bridge({ home, baseProviderId: "claude" });
    const claudeAgents = join(home, ".claude", "agents");
    rmSync(join(claudeAgents, "reviewer.md"));
    symlinkSync(join(home, ".agents", "agents", "old.md"), join(claudeAgents, "reviewer.md"));
    rmSync(join(home, ".agents", "agents", "retired.md"));

    await bridge({ home, baseProviderId: "claude" });

    expect(readdirSync(claudeAgents)).toEqual(["reviewer.md"]);
    expect(readlinkSync(join(claudeAgents, "reviewer.md"))).toBe(reviewer);
  });

  test("leaves a real file and a foreign link with the same name alone", async () => {
    const home = createDir("agent-bridge-");
    writeSource(home, "explorer");
    writeSource(home, "reviewer");
    const claudeAgents = join(home, ".claude", "agents");
    mkdirSync(claudeAgents, { recursive: true });
    writeFileSync(join(claudeAgents, "reviewer.md"), "my own reviewer\n");
    const foreign = join(home, "elsewhere.md");
    writeFileSync(foreign, "foreign\n");
    symlinkSync(foreign, join(claudeAgents, "explorer.md"));

    await bridge({ home, baseProviderId: "claude" });

    expect(lstatSync(join(claudeAgents, "reviewer.md")).isFile()).toBe(true);
    expect(readFileSync(join(claudeAgents, "reviewer.md"), "utf8")).toBe("my own reviewer\n");
    expect(readlinkSync(join(claudeAgents, "explorer.md"))).toBe(foreign);
  });

  test("links into CLAUDE_CONFIG_DIR when the launch env sets it", async () => {
    const home = createDir("agent-bridge-");
    const configDir = createDir("agent-bridge-claude-");
    const reviewer = writeSource(home, "reviewer");

    await bridge({ home, baseProviderId: "claude", env: { CLAUDE_CONFIG_DIR: configDir } });

    expect(readlinkSync(join(configDir, "agents", "reviewer.md"))).toBe(reviewer);
    expect(existsSync(join(home, ".claude"))).toBe(false);
  });
});

describe("bridgeAgentDefinitions for Codex", () => {
  test("writes a role file per definition and links it into the Codex agents dir", async () => {
    const home = createDir("agent-bridge-");
    const source = writeSource(home, "reviewer", [
      "---",
      "name: reviewer",
      String.raw`description: Reviews "diffs" \ carefully.`,
      "codex:",
      "  model: gpt-5.5",
      "  model_reasoning_effort: high",
      "  max_threads: 2",
      "  web_search: false",
      "---",
      String.raw`Say "hi" to C:\temp.`,
      'Then write """ and a DEL \u007f here.',
    ]);

    await bridge({ home, baseProviderId: "codex" });

    const role = generated(home, "codex", "reviewer.toml");
    expect(readFileSync(role, "utf8")).toBe(
      [
        `# Generated by Paseo from ${source}. Edit that file instead.`,
        'name = "reviewer"',
        String.raw`description = "Reviews \"diffs\" \\ carefully."`,
        'model = "gpt-5.5"',
        'model_reasoning_effort = "high"',
        "max_threads = 2",
        "web_search = false",
        String.raw`developer_instructions = "Say \"hi\" to C:\\temp.\nThen write \"\"\" and a DEL \u007f here."`,
        "",
      ].join("\n"),
    );
    expect(readdirSync(join(home, ".codex", "agents"))).toEqual(["reviewer.toml"]);
    expect(readlinkSync(join(home, ".codex", "agents", "reviewer.toml"))).toBe(role);
  });

  test("rewrites a role file only when its definition changed", async () => {
    const home = createDir("agent-bridge-");
    writeSource(home, "reviewer");
    await bridge({ home, baseProviderId: "codex" });
    const role = generated(home, "codex", "reviewer.toml");
    const past = new Date("2026-01-01T00:00:00Z");
    utimesSync(role, past, past);

    await bridge({ home, baseProviderId: "codex" });

    expect(statSync(role).mtimeMs).toBe(past.getTime());

    writeSource(home, "reviewer", [
      "---",
      "name: reviewer",
      "description: Reviews.",
      "---",
      "Again.",
    ]);
    await bridge({ home, baseProviderId: "codex" });

    expect(statSync(role).mtimeMs).not.toBe(past.getTime());
    expect(readFileSync(role, "utf8")).toContain('developer_instructions = "Again."');
  });

  test("a removed definition loses its role file and its link", async () => {
    const home = createDir("agent-bridge-");
    writeSource(home, "explorer");
    writeSource(home, "reviewer");
    await bridge({ home, baseProviderId: "codex" });
    const codexAgents = join(home, ".codex", "agents");
    const generatedDir = join(home, ".agents", ".generated", "agents", "codex");

    rmSync(join(home, ".agents", "agents", "explorer.md"));
    await bridge({ home, baseProviderId: "codex" });

    expect(readdirSync(generatedDir)).toEqual(["reviewer.toml"]);
    expect(readdirSync(codexAgents)).toEqual(["reviewer.toml"]);

    rmSync(join(home, ".agents", "agents", "reviewer.md"));
    await bridge({ home, baseProviderId: "codex" });

    expect(readdirSync(generatedDir)).toEqual([]);
    expect(readdirSync(codexAgents)).toEqual([]);
  });

  test("a real role file with the same name blocks the link", async () => {
    const home = createDir("agent-bridge-");
    writeSource(home, "reviewer");
    const codexAgents = join(home, ".codex", "agents");
    mkdirSync(codexAgents, { recursive: true });
    writeFileSync(join(codexAgents, "reviewer.toml"), 'name = "reviewer"\n');

    await bridge({ home, baseProviderId: "codex" });

    expect(lstatSync(join(codexAgents, "reviewer.toml")).isFile()).toBe(true);
    expect(readFileSync(join(codexAgents, "reviewer.toml"), "utf8")).toBe('name = "reviewer"\n');
  });

  test("links into CODEX_HOME when the launch env sets it", async () => {
    const home = createDir("agent-bridge-");
    const codexHome = createDir("agent-bridge-codex-");
    writeSource(home, "reviewer");

    await bridge({ home, baseProviderId: "codex", env: { CODEX_HOME: codexHome } });

    expect(readlinkSync(join(codexHome, "agents", "reviewer.toml"))).toBe(
      generated(home, "codex", "reviewer.toml"),
    );
    expect(existsSync(join(home, ".codex"))).toBe(false);
  });
});

describe("bridgeAgentDefinitions for OpenCode", () => {
  test("writes a subagent with only a description, and links it", async () => {
    const home = createDir("agent-bridge-");
    const description = `Finds files: fast # read-only, "quoted"`;
    writeSource(home, "explorer", [
      "---",
      "name: explorer",
      `description: '${description}'`,
      "model: haiku",
      "tools: Read, Grep",
      "color: blue",
      "---",
      "Explore read-only.",
    ]);

    await bridge({ home, baseProviderId: "opencode" });

    const agentFile = generated(home, "opencode", "explorer.md");
    const [, frontmatter, body] = /^---\n([\s\S]*?)---\n([\s\S]*)$/.exec(
      readFileSync(agentFile, "utf8"),
    )!;
    expect(YAML.parse(frontmatter)).toEqual({ description, mode: "subagent" });
    expect(body).toBe("Explore read-only.\n");
    const openCodeAgents = join(home, ".config", "opencode", "agent");
    expect(readdirSync(openCodeAgents)).toEqual(["explorer.md"]);
    expect(readlinkSync(join(openCodeAgents, "explorer.md"))).toBe(agentFile);
  });
});

describe("bridgeAgentDefinitions without work", () => {
  test("writes nothing for a provider without an agents dir", async () => {
    const home = createDir("agent-bridge-");
    writeSource(home, "reviewer");

    await bridge({ home, baseProviderId: "pi" });

    expect(readdirSync(home)).toEqual([".agents"]);
    expect(readdirSync(join(home, ".agents"))).toEqual(["agents"]);
  });

  test("creates no directories without definitions", async () => {
    const home = createDir("agent-bridge-");

    for (const baseProviderId of ["claude", "codex", "opencode"]) {
      await bridge({ home, baseProviderId });
    }

    expect(readdirSync(home)).toEqual([]);
  });

  test("logs a failure as a warning instead of throwing", async () => {
    const home = createDir("agent-bridge-");
    writeSource(home, "reviewer");
    writeFileSync(join(home, ".codex"), "not a directory\n");
    const logLines: string[] = [];

    await bridgeAgentDefinitions({
      home,
      baseProviderId: "codex",
      env: {},
      agents: await readAgentDefinitions({ home, onWarning: () => {} }),
      logger: pino({ level: "warn" }, { write: (line: string) => logLines.push(line) }),
    });

    expect(logLines).toHaveLength(1);
    expect(logLines[0]).toContain("Failed to bridge ~/.agents/agents into codex");
  });
});
