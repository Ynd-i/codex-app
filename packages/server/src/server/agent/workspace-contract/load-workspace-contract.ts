import { lstat, readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { isRealpathInsideRoot } from "../../../utils/path.js";
import type { McpServerConfig } from "../agent-sdk-types.js";
import { parseMcpJson } from "./mcp-json.js";
import type { WorkspaceContract, WorkspaceContractLayer } from "./types.js";

const AGENTS_DIR = ".agents";
const RESERVED_MCP_SERVER_NAME = "paseo";
const MAX_REPO_ROOT_DEPTH = 64;
const TRUSTED_ROOTS_CONFIG_KEY = "daemon.workspaceContract.trustedRoots";

/**
 * Reads the `.agents` contract that applies to `cwd`: the user layer under `home`,
 * then every `.agents` directory from the git repo root down to `cwd`. Project layers
 * apply only when the repo root is at or below one of `trustedRoots`, because they
 * launch repo-defined commands. Unreadable or malformed files are reported through
 * `onWarning` and skipped.
 */
export async function loadWorkspaceContract(params: {
  home: string;
  cwd: string;
  /** Absolute or `~`-prefixed directories, as written in the daemon config. */
  trustedRoots: readonly string[];
  onWarning: (message: string) => void;
}): Promise<WorkspaceContract> {
  const { onWarning } = params;
  const home = resolve(params.home);
  const layers = await resolveLayers(home, resolve(params.cwd), params.trustedRoots, onWarning);

  const entries: Array<[string, McpServerConfig]> = [];
  for (const layer of layers) {
    const path = join(layer.dir, ".mcp.json");
    const text = await readOptionalFile(path, onWarning);
    if (text === null) continue;
    const servers = parseMcpJson(text, {
      onWarning: (message) => onWarning(`${path}: ${message}`),
    });
    entries.push(...Object.entries(servers));
  }
  // Later entries win, so a nearer layer overrides a farther one.
  const mcpServers = Object.fromEntries(entries);
  if (mcpServers[RESERVED_MCP_SERVER_NAME]) {
    onWarning(`MCP server name '${RESERVED_MCP_SERVER_NAME}' is reserved for Paseo; entry ignored`);
    delete mcpServers[RESERVED_MCP_SERVER_NAME];
  }

  const instructionsPath = join(home, AGENTS_DIR, "AGENTS.md");
  const instructionsText = await readOptionalFile(instructionsPath, onWarning);
  const instructions = instructionsText?.trim()
    ? { path: instructionsPath, text: instructionsText }
    : null;

  return { layers, mcpServers, instructions };
}

async function resolveLayers(
  home: string,
  cwd: string,
  trustedRoots: readonly string[],
  onWarning: (message: string) => void,
): Promise<WorkspaceContractLayer[]> {
  const userDir = join(home, AGENTS_DIR);
  const repoDirs = await projectDirsFromRepoRoot(cwd);
  const repoRoot = repoDirs[0]!;
  const projectDirs = repoDirs.map((dir) => join(dir, AGENTS_DIR)).filter((dir) => dir !== userDir);
  const candidates: WorkspaceContractLayer[] = [
    { kind: "user", dir: userDir },
    ...projectDirs.map((dir) => ({ kind: "project" as const, dir })),
  ];
  const exists = await Promise.all(candidates.map((layer) => isDirectory(layer.dir)));
  const layers = candidates.filter((_, index) => exists[index]);
  if (
    layers.some((layer) => layer.kind === "project") &&
    !isTrustedRepoRoot(repoRoot, home, trustedRoots)
  ) {
    onWarning(
      `Ignoring project .agents under untrusted repo root ${repoRoot}; add it to ${TRUSTED_ROOTS_CONFIG_KEY} to apply them`,
    );
    return layers.filter((layer) => layer.kind === "user");
  }
  return layers;
}

function isTrustedRepoRoot(
  repoRoot: string,
  home: string,
  trustedRoots: readonly string[],
): boolean {
  return trustedRoots.some((root) => {
    const expanded = root === "~" || root.startsWith("~/") ? join(home, root.slice(1)) : root;
    // A relative entry would resolve against the daemon's cwd, so it trusts nothing.
    return isAbsolute(expanded) && isRealpathInsideRoot(resolve(expanded), repoRoot);
  });
}

/** Directories from the git repo root down to `cwd`, or `cwd` alone outside a repo. */
async function projectDirsFromRepoRoot(cwd: string): Promise<string[]> {
  const chain = [cwd];
  for (let depth = 0; depth < MAX_REPO_ROOT_DEPTH; depth++) {
    const dir = chain[0]!;
    // A worktree's `.git` is a file, so any entry counts.
    if (await lstat(join(dir, ".git")).catch(() => null)) return chain;
    const parent = dirname(dir);
    if (parent === dir) break;
    chain.unshift(parent);
  }
  return [cwd];
}

async function isDirectory(path: string): Promise<boolean> {
  return (await stat(path).catch(() => null))?.isDirectory() ?? false;
}

async function readOptionalFile(
  path: string,
  onWarning: (message: string) => void,
): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      onWarning(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return null;
  }
}
