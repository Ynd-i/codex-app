import { readFile, realpath } from "node:fs/promises";
import { join } from "node:path";
import type { WorkspaceContract } from "./types.js";
import { type Vendor, isVendor, resolveVendorConfigDir } from "./vendor-config-dir.js";

interface VendorInstructions {
  file: string;
  /** Claude Code expands `@path` imports, so CLAUDE.md can pull the contract in itself. */
  followsImports: boolean;
}

const VENDOR_INSTRUCTIONS: Readonly<Record<Vendor, VendorInstructions>> = {
  claude: { file: "CLAUDE.md", followsImports: true },
  codex: { file: "AGENTS.md", followsImports: false },
  opencode: { file: "AGENTS.md", followsImports: false },
};

/**
 * The contract's global instructions to append for this provider, or null when
 * there are none or the provider's own global instructions file already carries them.
 */
export async function resolveContractInstructions(params: {
  contract: WorkspaceContract;
  baseProviderId: string;
  home: string;
  /** The env the provider process is launched with. */
  env: NodeJS.ProcessEnv;
}): Promise<string | null> {
  const instructions = params.contract.instructions;
  if (!instructions) return null;
  if (!isVendor(params.baseProviderId)) return instructions.text;
  const vendor = VENDOR_INSTRUCTIONS[params.baseProviderId];

  const vendorPath = join(resolveVendorConfigDir(params.baseProviderId, params), vendor.file);
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
