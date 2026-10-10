import { stat } from "node:fs/promises";
import { basename, join, resolve, sep } from "node:path";
import type { Logger } from "pino";
import { z } from "zod";
import type { McpServerConfig } from "../agent-sdk-types.js";
import { type HooksByEvent, parseHooksJson } from "./hooks-json.js";
import { AGENTS_DIR, isDirectory } from "./inspect-workspace-contract.js";
import { parseMcpJson } from "./mcp-json.js";
import { listOptionalDir, parseOptionalFile } from "./optional-file.js";
import { syncOwnedLinks } from "./owned-links.js";
import type { WorkspaceContractPlugin } from "./types.js";

const PLUGIN_MANIFEST = join(".claude-plugin", "plugin.json");
const MARKETPLACE_MANIFEST = join(".claude-plugin", "marketplace.json");
const CODEX_PLUGIN_MANIFEST = join(".codex-plugin", "plugin.json");
const PLUGIN_ROOT_VARIABLE = "CLAUDE_PLUGIN_ROOT";

// A plugin's name is also its link name in ~/.agents/skills, so it must be a plain file name.
const PLUGIN_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const PLUGIN_JSON = z.object({ name: z.string() });

const MARKETPLACE_JSON = z.object({
  plugins: z.array(z.object({ name: z.string(), source: z.unknown() })),
});

const CODEX_PLUGIN_JSON = z.object({ hooks: z.string() });

export interface PluginParts {
  mcpServers: Record<string, McpServerConfig>;
  /** Hooks for providers that run them from the daemon's config, not as a plugin. */
  hooks: HooksByEvent;
}

/**
 * Lists the plugins under `~/.agents/plugins`. Each entry is a plugin root, with
 * `.claude-plugin/plugin.json`, or a Claude marketplace, with `.claude-plugin/marketplace.json`,
 * whose plugins at relative paths inside the entry are loaded. When two plugins share a name, the
 * first in entry order wins. Problems are reported through `onWarning` and skipped.
 */
export async function discoverPlugins(params: {
  home: string;
  onWarning: (message: string) => void;
}): Promise<WorkspaceContractPlugin[]> {
  const { onWarning } = params;
  const pluginsDir = join(params.home, AGENTS_DIR, "plugins");
  const entries = await listOptionalDir(pluginsDir, onWarning);

  const byName = new Map<string, WorkspaceContractPlugin>();
  for (const entry of entries) {
    for (const plugin of await resolveEntry(join(pluginsDir, entry), onWarning)) {
      const first = byName.get(plugin.name);
      if (first) {
        onWarning(`Plugin '${plugin.name}' in ${plugin.dir} repeats ${first.dir}; skipped`);
        continue;
      }
      byName.set(plugin.name, plugin);
    }
  }
  return [...byName.values()];
}

/**
 * The MCP servers and Codex hooks that a plugin declares. The daemon registers the servers for every
 * provider and sends the hooks to Codex, outside any plugin loader. Only a plugin loader sets
 * `CLAUDE_PLUGIN_ROOT`, so the servers get it resolved and each hook command exports it.
 */
export async function readPluginParts(
  plugin: WorkspaceContractPlugin,
  onWarning: (message: string) => void,
): Promise<PluginParts> {
  const servers = await parseOptionalFile(join(plugin.dir, ".mcp.json"), parseMcpJson, onWarning);
  const hooksPath = await resolveCodexHooksPath(plugin.dir, onWarning);
  const hooks = await parseOptionalFile(hooksPath, parseHooksJson, onWarning);
  return {
    mcpServers: resolvePluginRootInServers(servers ?? {}, plugin.dir),
    hooks: exportPluginRoot(hooks ?? {}, plugin.dir),
  };
}

/**
 * Codex and OpenCode read `~/.agents/skills` and the directories below it, so each plugin with a
 * `skills/` directory gets the link `~/.agents/skills/<plugin name>`. Links into
 * `~/.agents/plugins` belong to this sync, and nothing else there is touched.
 *
 * @returns the number of links created or removed.
 */
export async function linkPluginSkills(params: {
  home: string;
  plugins: readonly WorkspaceContractPlugin[];
  logger: Logger;
}): Promise<number> {
  const agentsDir = join(params.home, AGENTS_DIR);
  try {
    const wanted = new Map<string, string>();
    for (const plugin of params.plugins) {
      const skills = join(plugin.dir, "skills");
      if (await isDirectory(skills)) wanted.set(plugin.name, skills);
    }
    return await syncOwnedLinks({
      dir: join(agentsDir, "skills"),
      ownedRoot: join(agentsDir, "plugins"),
      wanted,
      logger: params.logger,
    });
  } catch (error) {
    params.logger.warn(
      { err: error },
      "Failed to link ~/.agents/plugins skills into ~/.agents/skills",
    );
    return 0;
  }
}

/** The hooks file that `.codex-plugin/plugin.json` names, else `hooks/hooks.json`. */
async function resolveCodexHooksPath(
  dir: string,
  onWarning: (message: string) => void,
): Promise<string> {
  const manifest = CODEX_PLUGIN_JSON.safeParse(
    await parseOptionalFile(join(dir, CODEX_PLUGIN_MANIFEST), parseJson, onWarning),
  );
  return manifest.success ? resolve(dir, manifest.data.hooks) : join(dir, "hooks", "hooks.json");
}

function resolvePluginRootInServers(
  servers: Record<string, McpServerConfig>,
  dir: string,
): Record<string, McpServerConfig> {
  const reference = `\${${PLUGIN_ROOT_VARIABLE}}`;
  const resolveRoot = (value: string) => value.replaceAll(reference, dir);
  const resolved: Record<string, McpServerConfig> = {};
  for (const [name, server] of Object.entries(servers)) {
    if (server.type !== "stdio") {
      resolved[name] = server;
      continue;
    }
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(server.env ?? {})) {
      env[key] = resolveRoot(value);
    }
    env[PLUGIN_ROOT_VARIABLE] = dir;
    resolved[name] = {
      ...server,
      command: resolveRoot(server.command),
      ...(server.args ? { args: server.args.map(resolveRoot) } : {}),
      env,
    };
  }
  return resolved;
}

// Rewrites the freshly parsed commands in place. The export comes first because the shell expands
// "${CLAUDE_PLUGIN_ROOT}/..." in a command before an `env CLAUDE_PLUGIN_ROOT=...` prefix would run.
function exportPluginRoot(hooks: HooksByEvent, dir: string): HooksByEvent {
  const exportRoot = `export ${PLUGIN_ROOT_VARIABLE}=${quoteShellWord(dir)}; `;
  for (const groups of Object.values(hooks)) {
    for (const handler of groups.flatMap((group) => group.hooks)) {
      handler.command = exportRoot + handler.command;
    }
  }
  return hooks;
}

function quoteShellWord(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function resolveEntry(
  root: string,
  onWarning: (message: string) => void,
): Promise<WorkspaceContractPlugin[]> {
  if (await isFile(join(root, PLUGIN_MANIFEST))) {
    return [await resolvePlugin(root, onWarning)];
  }
  const manifestPath = join(root, MARKETPLACE_MANIFEST);
  if (!(await isFile(manifestPath))) return [];
  const raw = await parseOptionalFile(manifestPath, parseJson, onWarning);
  if (raw === null) return [];
  const marketplace = MARKETPLACE_JSON.safeParse(raw);
  if (!marketplace.success) {
    onWarning(`${manifestPath}: expected a \`plugins\` list of { name, source }; skipped`);
    return [];
  }

  const plugins: WorkspaceContractPlugin[] = [];
  for (const { name, source } of marketplace.data.plugins) {
    if (typeof source !== "string") {
      onWarning(`${manifestPath}: plugin '${name}' has a remote source; skipped`);
      continue;
    }
    const dir = resolve(root, source);
    const isInsideRoot = dir === root || dir.startsWith(root + sep);
    if (!isInsideRoot || !(await isDirectory(dir))) {
      onWarning(`${manifestPath}: plugin '${name}' is not a directory inside ${root}; skipped`);
      continue;
    }
    plugins.push(await resolvePlugin(dir, onWarning));
  }
  return plugins;
}

async function resolvePlugin(
  dir: string,
  onWarning: (message: string) => void,
): Promise<WorkspaceContractPlugin> {
  const manifestPath = join(dir, PLUGIN_MANIFEST);
  const manifest = PLUGIN_JSON.safeParse(
    await parseOptionalFile(manifestPath, parseJson, onWarning),
  );
  const fallback = { name: basename(dir), dir };
  if (!manifest.success) return fallback;
  if (!PLUGIN_NAME.test(manifest.data.name)) {
    onWarning(
      `${manifestPath}: name '${manifest.data.name}' is not a plain file name; using '${fallback.name}'`,
    );
    return fallback;
  }
  return { name: manifest.data.name, dir };
}

function parseJson(text: string, options: { onWarning: (message: string) => void }): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    options.onWarning(`invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function isFile(path: string): Promise<boolean> {
  return (await stat(path).catch(() => null))?.isFile() ?? false;
}
