import { readFile, realpath } from "node:fs/promises";
import { join } from "node:path";
import type { WorkspaceContract } from "./types.js";

interface VendorInstructions {
  /** Env var that moves the config dir, as `claudeConfigDir` and `resolveCodexHomeDir` read it. */
  dirEnvVar: string | null;
  defaultDir: readonly string[];
  file: string;
  /** Claude Code expands `@path` imports, so CLAUDE.md can pull the contract in itself. */
  followsImports: boolean;
}

const VENDOR_INSTRUCTIONS: Readonly<Record<string, VendorInstructions>> = {
  claude: {
    dirEnvVar: "CLAUDE_CONFIG_DIR",
    defaultDir: [".claude"],
    file: "CLAUDE.md",
    followsImports: true,
  },
  codex: {
    dirEnvVar: "CODEX_HOME",
    defaultDir: [".codex"],
    file: "AGENTS.md",
    followsImports: false,
  },
  // Paseo's OpenCode provider never moves OpenCode's config dir.
  opencode: {
    dirEnvVar: null,
    defaultDir: [".config", "opencode"],
    file: "AGENTS.md",
    followsImports: false,
  },
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
  const vendor = VENDOR_INSTRUCTIONS[params.baseProviderId];
  if (!vendor) return instructions.text;

  const configuredDir = vendor.dirEnvVar ? params.env[vendor.dirEnvVar] : undefined;
  const vendorPath = join(configuredDir ?? join(params.home, ...vendor.defaultDir), vendor.file);
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
