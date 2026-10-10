# The `.agents` workspace contract

You keep shared agent configuration in `.agents/` directories and log in to each provider. When the daemon launches an agent, it supplies the parts that a provider CLI does not read from `.agents/` itself. Code: `packages/server/src/server/agent/workspace-contract/`.

## What `.agents/` holds

| Path                              | Level   | Read natively by        | Bridged by the daemon                                                           |
| --------------------------------- | ------- | ----------------------- | ------------------------------------------------------------------------------- |
| `~/.agents/.mcp.json`             | user    | nobody                  | MCP registry, every provider                                                    |
| `<dir>/.agents/.mcp.json`         | project | nobody                  | MCP registry, trusted repos only                                                |
| `~/.agents/AGENTS.md`             | user    | nobody                  | Appended instructions (see below)                                               |
| `~/.agents/hooks/hooks.json`      | user    | nobody                  | Claude and Codex hooks (see [Hooks](#hooks))                                    |
| `<dir>/.agents/hooks/hooks.json`  | project | nobody                  | Claude and Codex hooks, trusted repos only                                      |
| `~/.agents/skills/<name>/`        | user    | Codex, OpenCode, Gemini | Symlinked into `~/.claude/skills` for Claude                                    |
| `<repo>/.agents/skills/<name>/`   | project | Codex, OpenCode, Gemini | Claude plugin, trusted repos only (see [Project skills](#project-skills))       |
| `~/.agents/plugins/<name>/`       | user    | nobody                  | Every provider (see [Plugins](#plugins))                                        |
| `~/.agents/agents/<name>.md`      | user    | nobody                  | Claude link, Codex role, OpenCode subagent (see [Agents](#agents))              |
| `<repo>/.agents/agents/<name>.md` | project | nobody                  | Claude only, as `.agents:<name>` through the project plugin, trusted repos only |

`.mcp.json` uses the Claude Code and Codex plugin shape, `{ "mcpServers": { "<name>": { ... } } }`. An entry with `command` is stdio, and `"type": "http"` or `"type": "sse"` with `url` is remote. Entries with `"enabled": false` are skipped. Fields the launch config does not carry, such as Codex's `cwd` or `startup_timeout_sec`, are dropped. `${VAR}` references are passed through as literal text. A malformed file or entry logs a warning in `daemon.log` and is skipped. It never fails agent creation.

## Precedence

The daemon reads `~/.agents`, then every `.agents` directory from the git repo root down to the agent's cwd. A later layer overrides an earlier one by server name, so the nearest directory wins and the user level is lowest. Servers from [plugins](#plugins) rank below the user level. Outside a git repo, only `~/.agents` and `<cwd>/.agents` apply. A worktree's `.git` file counts as a repo root.

Explicit `mcpServers` on the agent (from the UI, SDK, CLI, or a plugin `agent.create` hook) override registry entries with the same name. Registry servers reach the launch config only. They are not in the agent's stored config or in `paseo inspect`; the `Loaded .agents workspace contract` line in `daemon.log` lists them. Codex copies its launch servers into the record's provider persistence metadata, the same way it copies the runtime `paseo` server. Because the stored config does not hold them, a `toolPolicy` preapproval cannot name a registry-only server.

The name `paseo` is reserved for the daemon's own MCP server. A registry entry named `paseo` is ignored with a warning.

## Trusted repo roots

A project `.mcp.json` starts commands that the repo defines, so project layers apply only to repos you trust. List trusted directories in `$PASEO_HOME/config.json`:

```json
{
  "daemon": {
    "workspaceContract": {
      "trustedRoots": ["~/code", "/Volumes/work/client-repo"]
    }
  }
}
```

A repo is trusted when its root is one of these directories or below one. The repo root is the directory holding `.git`, or the cwd itself outside a repo. Entries are absolute or start with `~/`. A relative entry trusts nothing. Paths match as written or after resolving symlinks, so `/var/...` and `/private/var/...` on macOS match.

`~/.agents` always applies. When a repo is not trusted and has a project `.agents` directory, the daemon skips every project layer and logs one warning per launch in `daemon.log` that names the repo root and `daemon.workspaceContract.trustedRoots`. Agent creation still succeeds.

The daemon reads the list at every agent launch. After you edit it, run `paseo reload`, and the next launch uses the new list without a daemon restart. To untrust a repo, remove its entry and reload.

### Trust from a client

Two RPCs let a client show a repo's trust state and trust it. Gate both on `server_info.features.workspaceContractTrust`.

| RPC                          | Permission       | Result                                                                                                |
| ---------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| `workspace.contract.inspect` | `workspace.read` | The repo root for a cwd, whether it is trusted, and its existing project `.agents` directories        |
| `workspace.contract.trust`   | `daemon.manage`  | Appends the repo root to `trustedRoots` in `config.json`, reloads the daemon config, returns the list |

Trust writes the repo root as an absolute path and keeps existing entries as written. When a listed root already covers the repo, it writes nothing. It saves through the same editor as `paseo daemon config set`, which rewrites the whole file in schema key order. Inspect, trust, and agent launches share one function, `inspectWorkspaceContract`, for the repo root and the trust check, so the app and the next launch agree.

When inspect reports project `.agents` directories in an untrusted repo, the app shows a warning above the composer, on the new chat screen and in that workspace's chats. **Trust project** calls the trust RPC and hides the warning. **Not now** hides it for that repo until you restart the app. The app re-inspects open workspaces on every `daemon_config_changed`, so an edit followed by `paseo reload` updates the warning too. Code: `packages/app/src/workspace-contract/`.

## Instructions

When `~/.agents/AGENTS.md` is non-empty, the daemon appends it after the daemon's own `appendSystemPrompt`. Providers that receive it: Claude (system prompt append), Codex (developer instructions), OpenCode, Pi, OMP, and plugin providers. ACP providers (Copilot, Cursor, Kimi, Kiro, Trae, generic ACP agents) take no system prompt, so they do not receive it.

The daemon skips the append when the provider already loads the same text from its own global file, so it never loads twice:

| Provider | Global file                    |
| -------- | ------------------------------ |
| Claude   | `~/.claude/CLAUDE.md`          |
| Codex    | `~/.codex/AGENTS.md`           |
| OpenCode | `~/.config/opencode/AGENTS.md` |

The file carries the contract when it resolves to `~/.agents/AGENTS.md` (a symlink), has identical content, or, for Claude only, imports it with `@~/.agents/AGENTS.md` or the absolute path. Custom profiles use their base provider's row.

The daemon reads the file from the directory the provider process uses. `CLAUDE_CONFIG_DIR` replaces `~/.claude`, `CODEX_HOME` replaces `~/.codex`, and a non-empty `XDG_CONFIG_HOME` replaces `~/.config` when the launch env sets them: the daemon's own env, then `agents.providers.<id>.env` (a profile's env merged over its base provider's), then per-agent env. A plugin `agent.session_open` hook that changes the env is not seen.

## Claude skills mirror

Claude Code discovers personal skills only in `~/.claude/skills`. Before a Claude-based session opens, the daemon links `~/.claude/skills/<name>` to `~/.agents/skills/<name>` for every skill directory that has a `SKILL.md`. It skips dotfiles, `synced`, and names starting with `anthropic-skills`.

The mirror never replaces a real directory or file in `~/.claude/skills`. Paseo's bundled skill sync writes real directories there, and a skill you created by hand belongs to you. It only replaces or removes symlinks that point into `~/.agents/skills`, and removes them once their target is gone.

## Project skills

Codex reads `<repo>/.agents/skills` itself. For Claude, the daemon passes every trusted project `.agents` directory to the Claude Agent SDK as a local plugin. Claude then loads that directory's `skills/`, `hooks/hooks.json`, `agents/` and `commands/`. It does not read the plugin's `.mcp.json`, because the daemon already registers those servers.

- Claude names a project skill `.agents:<name>`, so the composer lists `/.agents:<name>`. Typing `/<name>` also works. A `name` in `.agents/.claude-plugin/plugin.json` replaces the `.agents` prefix.
- Every layer becomes a plugin named `.agents`. When a repo has `.agents` directories at the root and below it, Claude loads the skills of all of them but runs the hooks of the repo root's only, and logs `Skipping duplicate hook registration for plugin ".agents"`. Codex runs the hooks of every layer.
- A repo that also links a skill into `.claude/skills` lists it twice, as `/<name>` and `/.agents:<name>`.

## Hooks

Keep hooks in `~/.agents/hooks/hooks.json` and `<dir>/.agents/hooks/hooks.json`, in the Claude Code hooks format:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "^(Bash|shell|functions.exec_command)$",
        "hooks": [{ "type": "command", "command": "$HOME/.agents/hooks/check.sh", "timeout": 30 }]
      }
    ]
  }
}
```

The file must use this wrapped form. The daemon keeps `command` handlers with their `command`, `timeout`, `async` and `statusMessage`. It drops other handler types, such as `prompt` and `agent`, and other fields, because those differ between vendors. A malformed file, group or handler logs a warning in `daemon.log` and is skipped. Hooks from all layers and [plugins](#plugins) add up. Project files apply only to trusted repos, and internal agents, such as the one that names a branch, get no hooks.

| Provider | User layer                                    | Project layers                                                    | Plugins                                 |
| -------- | --------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| Claude   | Merged into the `--settings` the daemon sends | Run by the layer's plugin (see [Project skills](#project-skills)) | Run by the plugin                       |
| Codex    | Thread config                                 | Thread config                                                     | Thread config, `CLAUDE_PLUGIN_ROOT` set |

Codex runs a hook only when it is trusted. The daemon sends each bridged hook together with the trust hash Codex computes for it, so trusting a repo in Paseo also trusts its hooks in Codex, without Codex's own review. Codex does not document that hash. The formula in `providers/codex/session-hooks.ts` matches Codex 0.159.0, and if a release changes it, Codex skips the bridged hooks without a message. `workspace-contract/hooks.real.e2e.test.ts` fails in that case, so run it after a Codex upgrade.

When you write a hook for both vendors:

- Match tool names for both. Claude calls its shell tool `Bash`, and Codex calls it `shell` or `functions.exec_command`, so use a matcher such as `^(Bash|shell|functions.exec_command)$`. The daemon passes matchers through unchanged.
- An event that one vendor does not know runs only in the other. Codex ignores `Notification`, and Claude ignores `Interrupt`. Neither reports it.
- Handle both stdin shapes. The JSON a hook receives, and the output it may print, differ between vendors.
- In `.agents` hooks, do not rely on `${CLAUDE_PLUGIN_ROOT}`. Claude sets it only for project hooks, and Codex does not set it. Commands run in the session's cwd, so use absolute paths, `$HOME/...` or `$(git rev-parse --show-toplevel)/.agents/...`. Plugin hooks get the variable from both vendors.
- Keep `SessionEnd` and `Interrupt` hooks short. Codex gives them a 1 second default and a 3 second limit.
- A hook that you also keep in `~/.claude/settings.json` or `~/.codex/hooks.json` runs twice. The daemon does not compare them.

## Plugins

Install a third-party plugin once, by cloning it into `~/.agents/plugins/`, and every provider Paseo launches gets it. Each entry there is a plugin root, with `.claude-plugin/plugin.json`, or a Claude marketplace, with `.claude-plugin/marketplace.json`. From a marketplace the daemon loads each plugin whose `source` is a relative path inside the entry, and skips other sources with a warning in `daemon.log`. Entries with neither manifest are ignored. Plugins are user level only, so a repo cannot add one.

A plugin is named by `name` in its `.claude-plugin/plugin.json`, or by its directory. When two plugins have the same name, the entry that sorts first wins, and the daemon logs a warning for the other.

| Part                | Claude              | Codex              | OpenCode      |
| ------------------- | ------------------- | ------------------ | ------------- |
| Skills              | `/<plugin>:<skill>` | `<plugin>:<skill>` | `<skill>`     |
| Agents and commands | `<plugin>:<name>`   | Not available      | Not available |
| Hooks               | Run by Claude       | Thread config      | Not bridged   |
| `.mcp.json`         | MCP registry        | MCP registry       | MCP registry  |

Other providers, such as Pi, Copilot and the other ACP providers, get the plugin's MCP servers where they support MCP. Whether they find its skills was not measured.

Claude gets each plugin through the Agent SDK `plugins` option, before the trusted project layers and with `skipMcpDiscovery`. Claude loads the plugin's skills, agents, commands and hooks itself, and sets `CLAUDE_PLUGIN_ROOT` for its hooks. A plugin passed this way replaces a marketplace install of the same name, so the `~/.agents/plugins` copy of pstack wins over `pstack@pstack-claude`.

Codex and OpenCode read `~/.agents/skills` and the directories below it. At every launch the daemon links `~/.agents/skills/<plugin>` to the plugin's `skills/` directory. It creates and repoints only links that point into `~/.agents/plugins`, removes them once their target is gone, and never touches real directories, files or other links. Codex prefixes a skill with the name from the manifest above the skill's real path, and `.codex-plugin/plugin.json` wins over `.claude-plugin/plugin.json`. OpenCode uses bare names, so a plugin's `tdd` and your own `~/.agents/skills/tdd` both appear as `tdd`. Gemini CLI reads `~/.agents/skills` too, but whether it looks below a link was not measured. The Claude mirror passes over these links, because they hold no `SKILL.md` at their root.

Codex takes a plugin's hooks from the file that `hooks` names in `.codex-plugin/plugin.json`, else from `hooks/hooks.json`. Codex sets `CLAUDE_PLUGIN_ROOT` only for plugins it installed itself, so the daemon starts each command with `export CLAUDE_PLUGIN_ROOT='<plugin dir>'; `. An `env CLAUDE_PLUGIN_ROOT=...` prefix would come too late, because the shell expands `"${CLAUDE_PLUGIN_ROOT}/..."` in the command before `env` runs. The trust hash covers the command with the prefix. The prefix is POSIX shell syntax, and Windows was not tested.

The servers in a plugin's `.mcp.json` join the registry for every provider, below `~/.agents/.mcp.json` and the project layers. The daemon replaces `${CLAUDE_PLUGIN_ROOT}` in a stdio server's `command`, `args` and `env`, and adds the variable to its `env`. Claude does not start them a second time.

### Install and update pstack

```sh
git clone https://github.com/michael-denyer/pstack-claude ~/.agents/plugins/pstack-claude
```

The repo root is a marketplace that lists `./plugins/pstack`. To update, run `git -C ~/.agents/plugins/pstack-claude pull`. The next launch uses the new files, because Claude loads the clone in place and the Codex link points into it.

### Remove vendor copies

A plugin that you also installed in a vendor can appear twice there.

- Codex lists every pstack skill twice, once from its plugin cache and once from `~/.agents/skills/pstack`. Run `codex plugin remove pstack@pstack-claude`.
- Claude needs no change, because the `~/.agents/plugins` copy replaces the marketplace install in Paseo sessions. If you no longer use pstack in Claude Code outside Paseo, run `claude plugin uninstall pstack@pstack-claude`.

## Agents

Keep the agent types you want in every vendor in `~/.agents/agents/<name>.md`, in the Claude Code subagent format:

```markdown
---
name: reviewer
description: Read-only reviewer for correctness, regressions and missing tests.
model: opus
disallowedTools: Edit, Write
codex:
  model: gpt-5.5
  model_reasoning_effort: xhigh
  sandbox_mode: read-only
---

You are a critical read-only code reviewer.
```

- `name` is required and must equal the file name without `.md`. Claude Code skips an agent file without `name`. The name is also the file name in each vendor's agents directory, so it starts with a letter or digit and uses only letters, digits, `.`, `_` and `-`.
- `description` and the prompt below the frontmatter are required.
- An agent named after a built-in OpenCode agent reaches Claude and Codex but not OpenCode, and the daemon logs a warning. In OpenCode 1.18.32 those names are `build`, `compaction`, `explore`, `general`, `plan`, `summary` and `title`. OpenCode merges an agent file into the built-in agent with the same name: your prompt would replace the built-in one, including the hidden compaction, summary and title prompts, under the built-in's permissions, and a bridged `plan.md` would turn Plan into a subagent that Paseo no longer offers as a mode.
- The `codex:` block holds Codex config keys for this role, such as `model`, `model_reasoning_effort` and `sandbox_mode`. The daemon copies each string, number or boolean into the role file. It drops lists, maps, keys that are not bare TOML keys, and `name`, `description` or `developer_instructions`, with a warning each. Claude Code ignores the block.
- Only files at the top of `~/.agents/agents` count. The daemon ignores subdirectories and dotfiles. A file that breaks a rule, or whose frontmatter does not parse, logs a warning in `daemon.log` and is skipped. Like Claude Code 2.1.290, the daemon accepts an unquoted value with `: ` or another YAML special character, such as `description: Use it when: ...`, keeps the last of duplicate keys, and reads `\n` in a description as a line break.

At every launch, the daemon links each agent into the personal agents directory of the vendor it launches:

| Vendor   | Link                                 | Target                                                               |
| -------- | ------------------------------------ | -------------------------------------------------------------------- |
| Claude   | `~/.claude/agents/<name>.md`         | The source file                                                      |
| Codex    | `~/.codex/agents/<name>.toml`        | A role file generated in `~/.agents/.generated/agents/codex/`        |
| OpenCode | `~/.config/opencode/agent/<name>.md` | A subagent file generated in `~/.agents/.generated/agents/opencode/` |

`CLAUDE_CONFIG_DIR`, `CODEX_HOME` and `XDG_CONFIG_HOME` move the Claude, Codex and OpenCode links, read from the launch env as for [instructions](#instructions). Claude reads the source file itself. The Codex role file holds `name`, `description`, the `codex:` keys and the prompt as `developer_instructions`. The OpenCode file holds `description`, `mode: subagent` and the prompt, and `mode: subagent` keeps the agent out of the modes Paseo offers for OpenCode.

The daemon maps nothing else, so `model`, `tools`, `disallowedTools` and `color` apply in Claude only. One value that OpenCode reads differently, such as `tools: Read, Grep` or `color: blue`, makes OpenCode reject its whole config. Codex has no tool list. Limit a Codex role with `sandbox_mode` instead.

Do not edit the generated files. The daemon rewrites a generated file when its source changes, and deletes it and its link when the source is gone. A Claude link stays while its source file exists, even after the file starts breaking a rule.

### Which copy wins

A repo's own agent with the same name wins over yours: `.claude/agents` for Claude, `.codex/agents` in a trusted Codex project, and `.opencode/agent` for OpenCode. Each vendor ranks project agents above personal ones, and the links go into the personal directory.

A real file, or a link the daemon did not make, with the same name in the vendor's directory blocks the link. The daemon leaves it alone, and logs it at debug level only.

Project `<repo>/.agents/agents/*.md` files reach Claude only, as `.agents:<name>`, through the [project plugin](#project-skills). Codex and OpenCode do not read them.

### OpenCode sessions

An OpenCode server reads the agents of a directory once, when it first serves that directory. A session whose launch config has MCP servers, such as registry servers or Paseo's own tools, runs its own server and sees the current agents. Sessions without MCP servers or extra env share one `opencode serve`, which shows an added or edited agent only after it restarts.

### Move existing agents

When an agent moves into `~/.agents/agents`, delete its old copies, `~/.claude/agents/<name>.md` and `~/.codex/agents/<name>.toml`. Otherwise each vendor keeps reading its own copy, because a real file blocks the link. Move the Codex keys of the old role file, such as `model` and `sandbox_mode`, into the `codex:` block first. After the next launch of each vendor, `ls -l ~/.claude/agents ~/.codex/agents` shows the agent as a link into `~/.agents`.

## What is not covered

The bridges run only when Paseo launches an agent. Running `claude`, `codex`, or `opencode` in a terminal outside Paseo gets no registry MCP servers, appended instructions or bridged hooks. It does see the links the daemon leaves in place: the Claude skills mirror, plugin skills and bridged agents, as the last Paseo launch that synced them left them.
