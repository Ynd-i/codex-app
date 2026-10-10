import { stat } from "node:fs/promises";
import { basename, join } from "node:path";
import YAML from "yaml";
import { AGENTS_DIR } from "./inspect-workspace-contract.js";
import { listOptionalDir, readOptionalFile } from "./optional-file.js";

/** An agent type from `~/.agents/agents/<name>.md`, in the Claude Code subagent format. */
export interface AgentDefinition {
  /** File stem, equal to frontmatter `name`. Link name and role name. */
  name: string;
  path: string;
  description: string;
  prompt: string;
  /** Scalar keys of the optional `codex:` block, written into the role file as TOML keys. */
  codex: Record<string, string | number | boolean>;
}

// The name is also the file name in every vendor's agents dir.
const AGENT_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
// The capture keeps the last line break, so a CRLF line keeps its `\r` in the retry below and,
// as in Claude Code, is never quoted.
const FRONTMATTER = /^---[ \t]*\r?\n([\s\S]*?\r?\n)---[ \t]*(?:\r?\n|$)/;
const TOP_LEVEL_VALUE = /^([a-zA-Z_-]+):\s+(\S.*)$/;
const YAML_SPECIAL = /[{}[\]*&#!|>%@`]|: /;
// Claude Code parses with Bun.YAML, which keeps the last of duplicate keys.
const YAML_OPTIONS = { prettyErrors: false, uniqueKeys: false };
// Codex block keys are written unquoted, so each must be a bare TOML key.
const TOML_BARE_KEY = /^[A-Za-z0-9_-]+$/;
const RESERVED_CODEX_KEYS = new Set(["name", "description", "developer_instructions"]);

/**
 * Reads the top-level `.md` files in `~/.agents/agents`, sorted by name. A file that breaks a rule
 * is reported through `onWarning` and skipped, so a broken file never blocks a launch.
 */
export async function readAgentDefinitions(params: {
  home: string;
  onWarning: (message: string) => void;
}): Promise<AgentDefinition[]> {
  const { onWarning } = params;
  const dir = join(params.home, AGENTS_DIR, "agents");
  const names = (await listOptionalDir(dir, onWarning))
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => basename(fileName, ".md"))
    .sort();

  const agents: AgentDefinition[] = [];
  for (const name of names) {
    const path = join(dir, `${name}.md`);
    // Subdirectories are not bridged. A symlinked file counts.
    if (!(await stat(path).catch(() => null))?.isFile()) continue;
    const text = await readOptionalFile(path, onWarning);
    if (text === null) continue;
    const agent = parseAgentDefinition({ name, path, text }, (message) =>
      onWarning(`${path}: ${message}`),
    );
    if (agent) agents.push(agent);
  }
  return agents;
}

function parseAgentDefinition(
  file: { name: string; path: string; text: string },
  onWarning: (message: string) => void,
): AgentDefinition | null {
  const { name, path } = file;
  const skip = (reason: string): null => {
    onWarning(`${reason}; skipped`);
    return null;
  };
  if (!AGENT_NAME.test(name)) return skip(`'${name}' is not a plain file name`);
  // Claude Code drops a byte order mark before it looks for the frontmatter.
  const text = file.text.replace(/^\uFEFF/, "");
  const match = FRONTMATTER.exec(text);
  if (!match) return skip("no frontmatter between --- lines");
  let frontmatter: unknown;
  try {
    frontmatter = parseFrontmatter(match[1]);
  } catch (error) {
    return skip(
      `invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!isMapping(frontmatter)) return skip("the frontmatter is not a mapping");
  // Claude Code drops an agent file without `name`, and names the agent by it.
  if (frontmatter.name !== name) return skip(`\`name\` must be '${name}', the file name`);
  const { description } = frontmatter;
  if (typeof description !== "string" || !description.trim()) return skip("no `description`");
  const prompt = text.slice(match[0].length).trim();
  if (!prompt) return skip("no prompt after the frontmatter");
  return {
    name,
    path,
    // Claude Code reads a literal `\n` in the description as a line break.
    description: description.replaceAll("\\n", "\n").trim(),
    prompt,
    codex: parseCodexBlock(frontmatter.codex, onWarning),
  };
}

/**
 * Runs Claude Code 2.1.290's fallback. On invalid YAML it retries with special-character values
 * quoted and tab indents as spaces, so `description: Use it when: ...` loads.
 */
function parseFrontmatter(yaml: string): unknown {
  try {
    return YAML.parse(yaml, YAML_OPTIONS);
  } catch (error) {
    const lines = yaml.split("\n").map((line) => {
      const [, key, value] = TOP_LEVEL_VALUE.exec(line) ?? [];
      if (!key || !value || isQuoted(value) || isFlowList(value) || !YAML_SPECIAL.test(value)) {
        return line;
      }
      return `${key}: "${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
    });
    const retry = lines.join("\n").replace(/^\t+/gm, (tabs) => "  ".repeat(tabs.length));
    try {
      return YAML.parse(retry, YAML_OPTIONS);
    } catch {
      throw error;
    }
  }
}

function isQuoted(value: string): boolean {
  return ['"', "'"].some((quote) => value.startsWith(quote) && value.endsWith(quote));
}

function isFlowList(value: string): boolean {
  if (!value.startsWith("[") || !value.endsWith("]")) return false;
  try {
    return Array.isArray(YAML.parse(value, YAML_OPTIONS));
  } catch {
    return false;
  }
}

function parseCodexBlock(
  block: unknown,
  onWarning: (message: string) => void,
): AgentDefinition["codex"] {
  // A `codex:` line with nothing below it parses as null.
  if (block === undefined || block === null) return {};
  if (!isMapping(block)) {
    onWarning("`codex` is not a mapping; ignored");
    return {};
  }
  const codex: AgentDefinition["codex"] = {};
  for (const [key, value] of Object.entries(block)) {
    if (RESERVED_CODEX_KEYS.has(key)) {
      onWarning(`codex.${key} comes from the agent file itself; ignored`);
    } else if (!TOML_BARE_KEY.test(key)) {
      onWarning(`codex key '${key}' is not a bare TOML key; ignored`);
    } else if (isTomlScalar(value)) {
      codex[key] = value;
    } else {
      onWarning(`codex.${key} is not a string, finite number or boolean; ignored`);
    }
  }
  return codex;
}

function isTomlScalar(value: unknown): value is string | number | boolean {
  // String(Infinity) and String(NaN), from YAML's .inf and .nan, are not TOML.
  const isFiniteNumber = typeof value === "number" && Number.isFinite(value);
  return typeof value === "string" || typeof value === "boolean" || isFiniteNumber;
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
