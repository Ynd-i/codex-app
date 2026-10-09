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

    expect(await resolveContractInstructions({ contract, baseProviderId: "claude", home })).toBe(
      TEXT,
    );
    expect(await resolveContractInstructions({ contract, baseProviderId: "pi", home })).toBe(TEXT);
  });

  test("returns null without a contract instructions file", async () => {
    const { home, contract } = createHome();

    expect(
      await resolveContractInstructions({
        contract: { ...contract, instructions: null },
        baseProviderId: "codex",
        home,
      }),
    ).toBeNull();
  });

  test("skips when the vendor file is a link to the contract file", async () => {
    const { home, contract } = createHome();
    mkdirSync(join(home, ".codex"));
    symlinkSync(contract.instructions!.path, join(home, ".codex", "AGENTS.md"));

    expect(
      await resolveContractInstructions({ contract, baseProviderId: "codex", home }),
    ).toBeNull();
  });

  test("skips when the vendor file has identical bytes", async () => {
    const { home, contract } = createHome();
    writeVendorFile(home, ".config/opencode/AGENTS.md", TEXT);

    expect(
      await resolveContractInstructions({ contract, baseProviderId: "opencode", home }),
    ).toBeNull();
  });

  test("skips Claude when CLAUDE.md imports the contract file", async () => {
    const { home, contract } = createHome();
    writeVendorFile(home, ".claude/CLAUDE.md", "# Mine\n\n@~/.agents/AGENTS.md\n");

    expect(
      await resolveContractInstructions({ contract, baseProviderId: "claude", home }),
    ).toBeNull();
  });

  test("skips Claude when CLAUDE.md imports the contract file by absolute path", async () => {
    const { home, contract } = createHome();
    writeVendorFile(home, ".claude/CLAUDE.md", `@${contract.instructions!.path}\n`);

    expect(
      await resolveContractInstructions({ contract, baseProviderId: "claude", home }),
    ).toBeNull();
  });

  test("an import line only counts for Claude", async () => {
    const { home, contract } = createHome();
    writeVendorFile(home, ".codex/AGENTS.md", "@~/.agents/AGENTS.md\n");

    expect(await resolveContractInstructions({ contract, baseProviderId: "codex", home })).toBe(
      TEXT,
    );
  });
});
