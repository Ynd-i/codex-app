# The `.agents` workspace contract

You keep shared agent configuration in `.agents/` directories and log in to each provider. When the daemon launches an agent, it supplies the parts that a provider CLI does not read from `.agents/` itself. Code: `packages/server/src/server/agent/workspace-contract/`.

## What `.agents/` holds

| Path                            | Level   | Read natively by        | Bridged by the daemon                        |
| ------------------------------- | ------- | ----------------------- | -------------------------------------------- |
| `~/.agents/.mcp.json`           | user    | nobody                  | MCP registry, every provider                 |
| `<dir>/.agents/.mcp.json`       | project | nobody                  | MCP registry, every provider                 |
| `~/.agents/AGENTS.md`           | user    | nobody                  | Appended instructions (see below)            |
| `~/.agents/skills/<name>/`      | user    | Codex, OpenCode, Gemini | Symlinked into `~/.claude/skills` for Claude |
| `<repo>/.agents/skills/<name>/` | project | Codex, OpenCode, Gemini | Not bridged                                  |

`.mcp.json` uses the Claude Code and Codex plugin shape, `{ "mcpServers": { "<name>": { ... } } }`. An entry with `command` is stdio, and `"type": "http"` or `"type": "sse"` with `url` is remote. Entries with `"enabled": false` are skipped. Fields the launch config does not carry, such as Codex's `cwd` or `startup_timeout_sec`, are dropped. `${VAR}` references are passed through as literal text. A malformed file or entry logs a warning in `daemon.log` and is skipped. It never fails agent creation.

## Precedence

The daemon reads `~/.agents`, then every `.agents` directory from the git repo root down to the agent's cwd. A later layer overrides an earlier one by server name, so the nearest directory wins and the user level is lowest. Outside a git repo, only `~/.agents` and `<cwd>/.agents` apply. A worktree's `.git` file counts as a repo root.

Explicit `mcpServers` on the agent (from the UI, SDK, CLI, or a plugin `agent.create` hook) override registry entries with the same name. Registry servers reach the launch config only. They never appear in the stored agent record or in `paseo inspect`; the `Loaded .agents workspace contract` line in `daemon.log` lists them. Because the record does not hold them, a `toolPolicy` preapproval cannot name a registry-only server.

The name `paseo` is reserved for the daemon's own MCP server. A registry entry named `paseo` is ignored with a warning.

## Instructions

When `~/.agents/AGENTS.md` is non-empty, the daemon appends it after the daemon's own `appendSystemPrompt`. Providers that receive it: Claude (system prompt append), Codex (developer instructions), OpenCode, Pi, OMP, and plugin providers. ACP providers (Copilot, Cursor, Kimi, Kiro, Trae, generic ACP agents) take no system prompt, so they do not receive it.

The daemon skips the append when the provider already loads the same text from its own global file, so it never loads twice:

| Provider | Global file                    |
| -------- | ------------------------------ |
| Claude   | `~/.claude/CLAUDE.md`          |
| Codex    | `~/.codex/AGENTS.md`           |
| OpenCode | `~/.config/opencode/AGENTS.md` |

The file carries the contract when it resolves to `~/.agents/AGENTS.md` (a symlink), has identical content, or, for Claude only, imports it with `@~/.agents/AGENTS.md` or the absolute path. Custom profiles use their base provider's row. A profile that moves `CLAUDE_CONFIG_DIR` or `CODEX_HOME` is still checked at the default path.

## Claude skills mirror

Claude Code discovers personal skills only in `~/.claude/skills`. Before a Claude-based session opens, the daemon links `~/.claude/skills/<name>` to `~/.agents/skills/<name>` for every skill directory that has a `SKILL.md`. It skips dotfiles, `synced`, and names starting with `anthropic-skills`.

The mirror never replaces a real directory or file in `~/.claude/skills`. Paseo's bundled skill sync writes real directories there, and a skill you created by hand belongs to you. It only replaces or removes symlinks that point into `~/.agents/skills`, and removes them once their target is gone.

## What is not covered

The bridges run only when Paseo launches an agent. Running `claude`, `codex`, or `opencode` in a terminal outside Paseo gets none of them.
