import { join } from "node:path";

type ResolveConfigDir = (params: { home: string; env: NodeJS.ProcessEnv }) => string;

// `??` as in `claudeConfigDir` and `resolveCodexHomeDir`. OpenCode resolves its dir through
// xdg-basedir, which skips an empty XDG_CONFIG_HOME.
const VENDOR_CONFIG_DIRS = {
  claude: ({ home, env }) => env.CLAUDE_CONFIG_DIR ?? join(home, ".claude"),
  codex: ({ home, env }) => env.CODEX_HOME ?? join(home, ".codex"),
  opencode: ({ home, env }) => join(env.XDG_CONFIG_HOME || join(home, ".config"), "opencode"),
} satisfies Record<string, ResolveConfigDir>;

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
  return VENDOR_CONFIG_DIRS[vendor](params);
}
