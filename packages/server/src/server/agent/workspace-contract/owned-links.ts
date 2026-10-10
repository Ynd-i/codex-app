import { mkdir, readdir, readlink, rm, stat, symlink } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import type { Logger } from "pino";
import { ifMissing } from "./optional-file.js";

/**
 * Makes `dir` hold a link `<name> -> <target>` for each entry of `wanted`, to a skill directory or
 * an agent file. Links that point inside `ownedRoot` belong to the caller: they are repointed when
 * `wanted` names another target, and removed once their target is gone. An owned link that
 * `wanted` does not name stays while its target exists. Real directories, files and other links
 * are never touched.
 *
 * @returns the number of links created or removed.
 */
export async function syncOwnedLinks(params: {
  dir: string;
  ownedRoot: string;
  wanted: ReadonlyMap<string, string>;
  logger: Logger;
}): Promise<number> {
  const { dir, ownedRoot, wanted } = params;
  const entries = await readdir(dir, { withFileTypes: true }).catch(ifMissing([]));

  let changes = 0;
  const occupied = new Set<string>();
  for (const entry of entries) {
    const linkPath = join(dir, entry.name);
    const target = entry.isSymbolicLink() ? resolve(dir, await readlink(linkPath)) : null;
    const ownedLink = target !== null && target.startsWith(ownedRoot + sep);
    const wantedTarget = wanted.get(entry.name);
    if (!ownedLink) {
      occupied.add(entry.name);
      if (wantedTarget) params.logger.debug({ path: linkPath }, "Link name is taken");
      continue;
    }
    if (target === wantedTarget || (wantedTarget === undefined && (await exists(target)))) {
      occupied.add(entry.name);
      continue;
    }
    // Another launch may have removed it first.
    await rm(linkPath, { force: true });
    changes++;
  }

  for (const [name, target] of wanted) {
    if (occupied.has(name)) continue;
    await mkdir(dir, { recursive: true });
    const created = await symlink(target, join(dir, name)).then(() => true, ifExists(false));
    if (created) changes++;
  }
  return changes;
}

async function exists(path: string): Promise<boolean> {
  return (await stat(path).catch(() => null)) !== null;
}

function ifExists<T>(fallback: T): (error: NodeJS.ErrnoException) => T {
  return (error) => {
    if (error.code === "EEXIST") return fallback;
    throw error;
  };
}
