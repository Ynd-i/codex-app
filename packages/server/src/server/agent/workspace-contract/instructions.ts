import { readFile, realpath } from "node:fs/promises";
import { join } from "node:path";
import type { WorkspaceContract } from "./types.js";

interface VendorInstructions {
  path: readonly string[];
  /** Claude Code expands `@path` imports, so CLAUDE.md can pull the contract in itself. */
  followsImports: boolean;
}

// ponytail: fixed home-relative paths; honor CLAUDE_CONFIG_DIR / CODEX_HOME when a profile moves them.
const VENDOR_INSTRUCTIONS: Readonly<Record<string, VendorInstructions>> = {
  claude: { path: [".claude", "CLAUDE.md"], followsImports: true },
  codex: { path: [".codex", "AGENTS.md"], followsImports: false },
  opencode: { path: [".config", "opencode", "AGENTS.md"], followsImports: false },
};

/**
 * The contract's global instructions to append for this provider, or null when
 * there are none or the provider's own global instructions file already carries them.
 */
export async function resolveContractInstructions(params: {
  contract: WorkspaceContract;
  baseProviderId: string;
  home: string;
}): Promise<string | null> {
  const instructions = params.contract.instructions;
  if (!instructions) return null;
  const vendor = VENDOR_INSTRUCTIONS[params.baseProviderId];
  if (!vendor) return instructions.text;

  const vendorPath = join(params.home, ...vendor.path);
  const [vendorRealPath, contractRealPath] = await Promise.all(
    [vendorPath, instructions.path].map((path) => realpath(path).catch(() => null)),
  );
  if (vendorRealPath === null) return instructions.text;
  if (vendorRealPath === contractRealPath) return null;

  const vendorText = await readFile(vendorPath, "utf8").catch(() => null);
  if (vendorText === null) return instructions.text;
  if (vendorText.trim() === instructions.text.trim()) return null;
  if (vendor.followsImports) {
    const imports = new Set(["@~/.agents/AGENTS.md", `@${instructions.path}`]);
    if (vendorText.split(/\s+/).some((word) => imports.has(word))) return null;
  }
  return instructions.text;
}
