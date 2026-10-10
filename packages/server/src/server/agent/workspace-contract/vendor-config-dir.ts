import { join } from "node:path";

interface VendorConfigDir {
  /** Env var that moves the config dir, as `claudeConfigDir` and `resolveCodexHomeDir` read it. */
  envVar: string | null;
  defaultDir: readonly string[];
}

const VENDOR_CONFIG_DIRS = {
  claude: { envVar: "CLAUDE_CONFIG_DIR", defaultDir: [".claude"] },
  codex: { envVar: "CODEX_HOME", defaultDir: [".codex"] },
  // Paseo's OpenCode provider never moves OpenCode's config dir.
  opencode: { envVar: null, defaultDir: [".config", "opencode"] },
} satisfies Record<string, VendorConfigDir>;

/** A base provider whose CLI reads its own config dir. */
export type Vendor = keyof typeof VENDOR_CONFIG_DIRS;

export function isVendor(baseProviderId: string): baseProviderId is Vendor {
  return Object.hasOwn(VENDOR_CONFIG_DIRS, baseProviderId);
}

/** The config dir that the vendor's process uses when it is launched with `env`. */
export function resolveVendorConfigDir(
  vendor: Vendor,
  params: { home: string; env: NodeJS.ProcessEnv },
): string {
  const { envVar, defaultDir } = VENDOR_CONFIG_DIRS[vendor];
  const configuredDir = envVar ? params.env[envVar] : undefined;
  return configuredDir ?? join(params.home, ...defaultDir);
}
