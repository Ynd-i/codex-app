import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vitest";
import { resolveContractInstructions } from "./instructions.js";
import type { WorkspaceContract } from "./types.js";

const TEXT = "Use plain words.\n";

function createHome(): { home: string; contract: WorkspaceContract } {
  const home = mkdtempSync(join(tmpdir(), "workspace-contract-home-"));
  const path = join(home, ".agents", "AGENTS.md");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, TEXT);
  return { home, contract: { layers: [], mcpServers: {}, instructions: { path, text: TEXT } } };
}

function writeVendorFile(home: string, relativePath: string, text: string): string {
  const path = join(home, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  return path;
}

describe("resolveContractInstructions", () => {
  test("returns the contract text when the vendor file does not carry it", async () => {
    const { home, contract } = createHome();
    writeVendorFile(home, ".claude/CLAUDE.md", "Other rules.\n");

    expect(
      await resolveContractInstructions({ contract, baseProviderId: "claude", home, env: {} }),
    ).toBe(TEXT);
    expect(
      await resolveContractInstructions({ contract, baseProviderId: "pi", home, env: {} }),
    ).toBe(TEXT);
  });

  test("returns null without a contract instructions file", async () => {
    const { home, contract } = createHome();

    expect(
      await resolveContractInstructions({
        contract: { ...contract, instructions: null },
        baseProviderId: "codex",
        home,
        env: {},
      }),
    ).toBeNull();
  });

  test("skips when the vendor file is a link to the contract file", async () => {
    const { home, contract } = createHome();
    mkdirSync(join(home, ".codex"));
    symlinkSync(contract.instructions!.path, join(home, ".codex", "AGENTS.md"));

    expect(
      await resolveContractInstructions({ contract, baseProviderId: "codex", home, env: {} }),
    ).toBeNull();
  });

  test("skips when the vendor file has identical bytes", async () => {
    const { home, contract } = createHome();
    writeVendorFile(home, ".config/opencode/AGENTS.md", TEXT);

    expect(
      await resolveContractInstructions({ contract, baseProviderId: "opencode", home, env: {} }),
    ).toBeNull();
  });

  test("skips Claude when CLAUDE.md imports the contract file", async () => {
    const { home, contract } = createHome();
    writeVendorFile(home, ".claude/CLAUDE.md", "# Mine\n\n@~/.agents/AGENTS.md\n");

    expect(
      await resolveContractInstructions({ contract, baseProviderId: "claude", home, env: {} }),
    ).toBeNull();
  });

  test("skips Claude when CLAUDE.md imports the contract file by absolute path", async () => {
    const { home, contract } = createHome();
    writeVendorFile(home, ".claude/CLAUDE.md", `@${contract.instructions!.path}\n`);

    expect(
      await resolveContractInstructions({ contract, baseProviderId: "claude", home, env: {} }),
    ).toBeNull();
  });

  test("an import line only counts for Claude", async () => {
    const { home, contract } = createHome();
    writeVendorFile(home, ".codex/AGENTS.md", "@~/.agents/AGENTS.md\n");

    expect(
      await resolveContractInstructions({ contract, baseProviderId: "codex", home, env: {} }),
    ).toBe(TEXT);
  });

  test("checks the Claude file under CLAUDE_CONFIG_DIR", async () => {
    const { home, contract } = createHome();
    const configDir = mkdtempSync(join(tmpdir(), "workspace-contract-claude-"));
    writeVendorFile(configDir, "CLAUDE.md", TEXT);
    const env = { CLAUDE_CONFIG_DIR: configDir };

    expect(
      await resolveContractInstructions({ contract, baseProviderId: "claude", home, env }),
    ).toBeNull();
  });

  test("ignores the default Claude file when CLAUDE_CONFIG_DIR moves it", async () => {
    const { home, contract } = createHome();
    writeVendorFile(home, ".claude/CLAUDE.md", TEXT);
    const configDir = mkdtempSync(join(tmpdir(), "workspace-contract-claude-"));
    const env = { CLAUDE_CONFIG_DIR: configDir };

    expect(
      await resolveContractInstructions({ contract, baseProviderId: "claude", home, env }),
    ).toBe(TEXT);
  });

  test("checks the Codex file under CODEX_HOME", async () => {
    const { home, contract } = createHome();
    const codexHome = mkdtempSync(join(tmpdir(), "workspace-contract-codex-"));
    writeVendorFile(codexHome, "AGENTS.md", TEXT);
    const env = { CODEX_HOME: codexHome };

    expect(
      await resolveContractInstructions({ contract, baseProviderId: "codex", home, env }),
    ).toBeNull();
  });

  test("checks the OpenCode file under XDG_CONFIG_HOME", async () => {
    const { home, contract } = createHome();
    writeVendorFile(home, ".config/opencode/AGENTS.md", "Other rules.\n");
    const xdgConfigHome = mkdtempSync(join(tmpdir(), "workspace-contract-xdg-"));
    writeVendorFile(xdgConfigHome, "opencode/AGENTS.md", TEXT);
    const env = { XDG_CONFIG_HOME: xdgConfigHome };

    expect(
      await resolveContractInstructions({ contract, baseProviderId: "opencode", home, env }),
    ).toBeNull();
  });
});
