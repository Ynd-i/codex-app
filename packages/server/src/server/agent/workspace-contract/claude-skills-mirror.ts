import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Logger } from "pino";
import { ifMissing } from "./optional-file.js";
import { syncSkillLinks } from "./skill-links.js";

/**
 * Claude Code only discovers personal skills in `~/.claude/skills`, so each skill in
 * `~/.agents/skills` gets a symlink there. Real directories are never replaced:
 * Paseo's bundled skill sync and the user own those.
 *
 * @returns the number of links created or removed.
 */
export async function mirrorAgentsSkillsIntoClaude(params: {
  home: string;
  logger: Logger;
}): Promise<number> {
  const agentsSkills = join(params.home, ".agents", "skills");
  try {
    const skills = await listMirrorableSkills(agentsSkills);
    if (skills === null) return 0;
    return await syncSkillLinks({
      dir: join(params.home, ".claude", "skills"),
      ownedRoot: agentsSkills,
      wanted: skills,
      logger: params.logger,
    });
  } catch (error) {
    params.logger.warn({ err: error }, "Failed to mirror ~/.agents/skills into ~/.claude/skills");
    return 0;
  }
}

/** Skill name to absolute directory, or null when `~/.agents/skills` does not exist. */
async function listMirrorableSkills(agentsSkills: string): Promise<Map<string, string> | null> {
  const names = await readdir(agentsSkills).catch(ifMissing(null));
  if (names === null) return null;
  const skills = new Map<string, string>();
  for (const name of names.filter(isMirrorableName)) {
    const dir = join(agentsSkills, name);
    if ((await stat(join(dir, "SKILL.md")).catch(() => null))?.isFile()) skills.set(name, dir);
  }
  return skills;
}

function isMirrorableName(name: string): boolean {
  return !name.startsWith(".") && name !== "synced" && !name.startsWith("anthropic-skills");
}
