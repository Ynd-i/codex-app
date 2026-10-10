import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import pino from "pino";
import { afterEach, describe, expect, test } from "vitest";
import { AgentManager } from "../agent-manager.js";
import type { AgentClient, AgentSessionConfig } from "../agent-sdk-types.js";
import { ClaudeAgentClient } from "../providers/claude/agent.js";
import { CodexAppServerAgentClient } from "../providers/codex-app-server-agent.js";

// These run against the provider logins on this machine. The contract home is a temp dir, so
// nothing is written under ~/.agents, and the vendors keep their own state where they always do.

interface HookFixture {
  home: string;
  cwd: string;
  marker: string;
}

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function createUserPromptHook(label: string): HookFixture {
  const root = mkdtempSync(join(tmpdir(), "paseo-contract-hooks-"));
  roots.push(root);
  const home = join(root, "home");
  const cwd = join(root, "workspace");
  const marker = join(root, "marker.log");
  mkdirSync(join(home, ".agents", "hooks"), { recursive: true });
  mkdirSync(cwd);
  writeFileSync(
    join(home, ".agents", "hooks", "hooks.json"),
    JSON.stringify({
      hooks: {
        UserPromptSubmit: [{ hooks: [{ type: "command", command: `echo ${label} >> ${marker}` }] }],
      },
    }),
  );
  return { home, cwd, marker };
}

async function runOnePrompt(params: {
  fixture: HookFixture;
  provider: "claude" | "codex";
  client: AgentClient;
  logger: pino.Logger;
  config: Partial<AgentSessionConfig>;
}): Promise<void> {
  const manager = new AgentManager({
    clients: { [params.provider]: params.client },
    logger: params.logger,
    workspaceContract: { home: params.fixture.home, trustedRoots: () => [] },
  });
  const agent = await manager.createAgent(
    { provider: params.provider, cwd: params.fixture.cwd, ...params.config },
    undefined,
    { workspaceId: undefined, persistSession: false },
  );
  try {
    await manager.runAgent(agent.id, "Reply with exactly OK. Do not use tools.");
  } finally {
    await manager.closeAgent(agent.id);
  }
}

describe(".agents hooks reach real provider sessions", () => {
  test("Codex trusts and runs a user-layer hook injected through the thread config", async () => {
    const fixture = createUserPromptHook("codex-user-prompt");
    const logLines: string[] = [];
    // Codex hook notifications reach Paseo only as trace-level parsed events.
    const logger = pino({ level: "trace" }, { write: (line: string) => logLines.push(line) });

    await runOnePrompt({
      fixture,
      provider: "codex",
      client: new CodexAppServerAgentClient(logger),
      logger,
      config: { model: "gpt-5.6-luna", thinkingOptionId: "low", modeId: "read-only" },
    });

    // The user's own Codex hooks and plugin hooks run as well. Only session flags come from Paseo.
    const sessionFlagRuns = logLines
      .map((line) => JSON.parse(line) as { msg?: string; method?: string; params?: unknown })
      .filter((entry) => entry.msg === "provider.codex.parsed_event")
      .filter((entry) => entry.method === "hook/started")
      .map((entry) => (entry.params as { run: { eventName: string; source: string } }).run)
      .filter((run) => run.source === "sessionFlags");
    // An untrusted hook is skipped without any notification, so this fails when Codex changes
    // the trust hash that session-hooks.ts computes.
    expect(sessionFlagRuns).toEqual([
      expect.objectContaining({
        eventName: "userPromptSubmit",
        sourcePath: "/<session-flags>/config.toml",
      }),
    ]);
    expect(readFileSync(fixture.marker, "utf8")).toBe("codex-user-prompt\n");
  }, 180_000);

  test("Claude runs a user-layer hook injected through its settings", async () => {
    const fixture = createUserPromptHook("claude-user-prompt");
    const logger = pino({ level: "warn" });

    await runOnePrompt({
      fixture,
      provider: "claude",
      client: new ClaudeAgentClient({ logger }),
      logger,
      config: { model: "haiku", modeId: "bypassPermissions" },
    });

    expect(readFileSync(fixture.marker, "utf8")).toBe("claude-user-prompt\n");
  }, 180_000);
});

describe("~/.agents plugins reach real provider sessions", () => {
  const TOKEN = "PLUGIN-TOKEN-4417";

  function createPlugin(): { home: string; cwd: string; plugin: string } {
    const root = mkdtempSync(join(tmpdir(), "paseo-contract-plugin-"));
    roots.push(root);
    const home = join(root, "home");
    const cwd = join(root, "workspace");
    const plugin = join(home, ".agents", "plugins", "scratch");
    mkdirSync(join(plugin, ".claude-plugin"), { recursive: true });
    mkdirSync(join(plugin, "hooks"));
    mkdirSync(join(plugin, "skills", "plugin-token"), { recursive: true });
    mkdirSync(cwd);
    writeFileSync(
      join(plugin, ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "scratch" }),
    );
    // Like pstack's hook, the command reaches its script through ${CLAUDE_PLUGIN_ROOT}.
    writeFileSync(
      join(plugin, "hooks", "hooks.json"),
      JSON.stringify({
        hooks: {
          SessionStart: [
            { hooks: [{ type: "command", command: '"${CLAUDE_PLUGIN_ROOT}/hooks/mark.sh"' }] },
          ],
        },
      }),
    );
    writeFileSync(
      join(plugin, "hooks", "mark.sh"),
      '#!/bin/sh\nset -eu\necho "$CLAUDE_PLUGIN_ROOT" >> "$CLAUDE_PLUGIN_ROOT/marker.log"\n',
      { mode: 0o755 },
    );
    writeFileSync(
      join(plugin, "skills", "plugin-token", "SKILL.md"),
      `---\nname: plugin-token\ndescription: Gives the plugin verification token.\n---\nReply with exactly ${TOKEN} and nothing else.\n`,
    );
    return { home, cwd, plugin };
  }

  test("Codex runs the plugin's hook and uses its linked skill", async () => {
    const fixture = createPlugin();
    const logger = pino({ level: "warn" });
    const manager = new AgentManager({
      clients: { codex: new CodexAppServerAgentClient(logger) },
      logger,
      workspaceContract: { home: fixture.home, trustedRoots: () => [] },
    });
    const agent = await manager.createAgent(
      {
        provider: "codex",
        cwd: fixture.cwd,
        model: "gpt-5.6-luna",
        thinkingOptionId: "low",
        // The model reads the skill with a shell command, which must not wait for an approval.
        modeId: "full-access",
      },
      undefined,
      {
        workspaceId: undefined,
        persistSession: false,
        // Codex reads skills from its own $HOME/.agents/skills, so it gets the fixture home and
        // keeps its login where it is.
        env: {
          HOME: fixture.home,
          CODEX_HOME: process.env.CODEX_HOME ?? join(homedir(), ".codex"),
        },
      },
    );
    const { finalText } = await manager
      .runAgent(agent.id, "Use the scratch:plugin-token skill.")
      .finally(() => manager.closeAgent(agent.id));

    expect(finalText).toContain(TOKEN);
    expect(readFileSync(join(fixture.plugin, "marker.log"), "utf8")).toBe(`${fixture.plugin}\n`);
  }, 180_000);
});
