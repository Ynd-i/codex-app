import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { readAgentDefinitions } from "./agent-definitions.js";

const homes: string[] = [];

afterEach(() => {
  for (const home of homes.splice(0)) {
    rmSync(home, { recursive: true, force: true });
  }
});

function createHome(): { home: string; agentsDir: string } {
  const home = mkdtempSync(join(tmpdir(), "workspace-agents-"));
  homes.push(home);
  return { home, agentsDir: join(home, ".agents", "agents") };
}

function writeAgent(dir: string, fileName: string, text: string): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, fileName);
  writeFileSync(path, text);
  return path;
}

function agentFile(frontmatter: string, body = "Review the diff.\n"): string {
  return `---\n${frontmatter}\n---\n${body}`;
}

async function read(home: string) {
  const warnings: string[] = [];
  const agents = await readAgentDefinitions({
    home,
    onWarning: (message) => warnings.push(message),
  });
  return { agents, warnings };
}

describe("readAgentDefinitions", () => {
  test("reads each top-level .md file, sorted by name", async () => {
    const { home, agentsDir } = createHome();
    const reviewer = writeAgent(
      agentsDir,
      "reviewer.md",
      agentFile(
        [
          "name: reviewer",
          "description: >",
          "  Reviews diffs.",
          "model: opus",
          "tools: Read, Grep",
          "codex:",
          "  model: gpt-5.5",
          "  sandbox_mode: read-only",
        ].join("\n"),
        "\nReview the diff.\n\nReport findings first.\n\n",
      ),
    );
    const explorer = writeAgent(
      agentsDir,
      "explorer.md",
      agentFile("name: explorer\ndescription: Finds files.", "Explore read-only."),
    );

    expect(await read(home)).toEqual({
      agents: [
        {
          name: "explorer",
          path: explorer,
          description: "Finds files.",
          prompt: "Explore read-only.",
          codex: {},
        },
        {
          name: "reviewer",
          path: reviewer,
          description: "Reviews diffs.",
          prompt: "Review the diff.\n\nReport findings first.",
          codex: { model: "gpt-5.5", sandbox_mode: "read-only" },
        },
      ],
      warnings: [],
    });
  });

  test("a symlinked file counts, and subdirectories, other files and dotfiles do not", async () => {
    const { home, agentsDir } = createHome();
    const elsewhere = writeAgent(
      join(home, "dotfiles"),
      "linked.md",
      agentFile("name: linked\ndescription: Linked in."),
    );
    mkdirSync(agentsDir, { recursive: true });
    symlinkSync(elsewhere, join(agentsDir, "linked.md"));
    writeAgent(join(agentsDir, "nested"), "deep.md", agentFile("name: deep\ndescription: Deep."));
    mkdirSync(join(agentsDir, "folder.md"));
    writeAgent(agentsDir, "notes.txt", agentFile("name: notes\ndescription: Notes."));
    writeAgent(agentsDir, ".hidden.md", agentFile("name: .hidden\ndescription: Hidden."));

    const { agents, warnings } = await read(home);

    expect(agents.map((agent) => [agent.name, agent.path])).toEqual([
      ["linked", join(agentsDir, "linked.md")],
    ]);
    expect(warnings).toEqual([]);
  });

  test("skips a file whose name is not a plain file name", async () => {
    const { home, agentsDir } = createHome();
    const path = writeAgent(
      agentsDir,
      "my agent.md",
      agentFile("name: my agent\ndescription: Spaces."),
    );

    expect(await read(home)).toEqual({
      agents: [],
      warnings: [`${path}: 'my agent' is not a plain file name; skipped`],
    });
  });

  test("skips a file whose frontmatter name is missing or differs from the file name", async () => {
    const { home, agentsDir } = createHome();
    const unnamed = writeAgent(agentsDir, "unnamed.md", agentFile("description: No name."));
    const renamed = writeAgent(
      agentsDir,
      "renamed.md",
      agentFile("name: other\ndescription: Other name."),
    );

    expect(await read(home)).toEqual({
      agents: [],
      warnings: [
        `${renamed}: \`name\` must be 'renamed', the file name; skipped`,
        `${unnamed}: \`name\` must be 'unnamed', the file name; skipped`,
      ],
    });
  });

  test("skips a file without a description or a prompt", async () => {
    const { home, agentsDir } = createHome();
    const blank = writeAgent(agentsDir, "blank.md", agentFile("name: blank\ndescription: '  '"));
    const missing = writeAgent(agentsDir, "missing.md", agentFile("name: missing"));
    const empty = writeAgent(
      agentsDir,
      "empty.md",
      agentFile("name: empty\ndescription: No prompt.", "\n  \n"),
    );

    expect(await read(home)).toEqual({
      agents: [],
      warnings: [
        `${blank}: no \`description\`; skipped`,
        `${empty}: no prompt after the frontmatter; skipped`,
        `${missing}: no \`description\`; skipped`,
      ],
    });
  });

  test("skips a file without YAML mapping frontmatter", async () => {
    const { home, agentsDir } = createHome();
    const plain = writeAgent(agentsDir, "plain.md", "# Just markdown\n");
    const broken = writeAgent(agentsDir, "broken.md", agentFile("name: broken\nname: twice"));
    const scalar = writeAgent(agentsDir, "scalar.md", agentFile("just text"));

    const { agents, warnings } = await read(home);

    expect(agents).toEqual([]);
    expect(warnings).toEqual([
      `${broken}: invalid YAML frontmatter: Map keys must be unique; skipped`,
      `${plain}: no frontmatter between --- lines; skipped`,
      `${scalar}: the frontmatter is not a mapping; skipped`,
    ]);
  });

  test("keeps scalar codex keys and drops the others with a warning each", async () => {
    const { home, agentsDir } = createHome();
    const path = writeAgent(
      agentsDir,
      "worker.md",
      agentFile(
        [
          "name: worker",
          "description: Works.",
          "codex:",
          "  model: gpt-5.5",
          "  model_reasoning_effort: high",
          "  max_threads: 4",
          "  web_search: false",
          "  name: renamed",
          "  developer_instructions: Ignore the body.",
          "  features.multi_agent: true",
          "  nickname_candidates: [one, two]",
          "  sandbox_workspace_write: { network_access: true }",
          "  temperature: .inf",
        ].join("\n"),
      ),
    );

    const { agents, warnings } = await read(home);

    expect(agents.map((agent) => agent.codex)).toEqual([
      { model: "gpt-5.5", model_reasoning_effort: "high", max_threads: 4, web_search: false },
    ]);
    expect(warnings).toEqual([
      `${path}: codex.name comes from the agent file itself; ignored`,
      `${path}: codex.developer_instructions comes from the agent file itself; ignored`,
      `${path}: codex key 'features.multi_agent' is not a bare TOML key; ignored`,
      `${path}: codex.nickname_candidates is not a string, finite number or boolean; ignored`,
      `${path}: codex.sandbox_workspace_write is not a string, finite number or boolean; ignored`,
      `${path}: codex.temperature is not a string, finite number or boolean; ignored`,
    ]);
  });

  test("an empty codex block is no block, and a codex value that is not a mapping warns", async () => {
    const { home, agentsDir } = createHome();
    writeAgent(agentsDir, "empty.md", agentFile("name: empty\ndescription: Empty.\ncodex:"));
    const listed = writeAgent(
      agentsDir,
      "listed.md",
      agentFile("name: listed\ndescription: Listed.\ncodex: [model]"),
    );

    const { agents, warnings } = await read(home);

    expect(agents.map((agent) => [agent.name, agent.codex])).toEqual([
      ["empty", {}],
      ["listed", {}],
    ]);
    expect(warnings).toEqual([`${listed}: \`codex\` is not a mapping; ignored`]);
  });

  test("finds nothing without ~/.agents/agents", async () => {
    const { home } = createHome();

    expect(await read(home)).toEqual({ agents: [], warnings: [] });
  });
});
