import { lstat, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { isRealpathInsideRoot } from "../../../utils/path.js";
import type { WorkspaceContractInspection } from "./types.js";

export const AGENTS_DIR = ".agents";
export const TRUSTED_ROOTS_CONFIG_KEY = "daemon.workspaceContract.trustedRoots";
const MAX_REPO_ROOT_DEPTH = 64;

/**
 * Finds the repo root for `cwd`, the project `.agents` directories that exist from that root down
 * to `cwd`, and whether `trustedRoots` lets them apply. Agent launches and the trust RPCs both use
 * it, so the app and the next launch never disagree about a repo.
 */
export async function inspectWorkspaceContract(params: {
  home: string;
  cwd: string;
  /** Absolute or `~`-prefixed directories, as written in the daemon config. */
  trustedRoots: readonly string[];
}): Promise<WorkspaceContractInspection> {
  const home = resolve(params.home);
  const repoDirs = await projectDirsFromRepoRoot(resolve(params.cwd));
  const repoRoot = repoDirs[0]!;
  const userDir = join(home, AGENTS_DIR);
  // A home inside the repo chain is read once, as the user layer.
  const candidates = repoDirs.map((dir) => join(dir, AGENTS_DIR)).filter((dir) => dir !== userDir);
  const exists = await Promise.all(candidates.map((dir) => isDirectory(dir)));
  return {
    repoRoot,
    trusted: isTrustedRepoRoot({ repoRoot, home, trustedRoots: params.trustedRoots }),
    projectLayers: candidates.filter((_, index) => exists[index]),
  };
}

export function isTrustedRepoRoot(params: {
  repoRoot: string;
  home: string;
  trustedRoots: readonly string[];
}): boolean {
  const { repoRoot, home } = params;
  return params.trustedRoots.some((root) => {
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

export async function isDirectory(path: string): Promise<boolean> {
  return (await stat(path).catch(() => null))?.isDirectory() ?? false;
}
