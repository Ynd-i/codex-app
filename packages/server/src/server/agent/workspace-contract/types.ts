import type { McpServerConfig } from "../agent-sdk-types.js";
import type { AgentDefinition } from "./agent-definitions.js";
import type { HooksByEvent } from "./hooks-json.js";

/** An existing `.agents` directory. Layers are ordered from lowest to highest precedence. */
export interface WorkspaceContractLayer {
  kind: "user" | "project";
  dir: string;
}

/** A plugin under `~/.agents/plugins`, named by its `.claude-plugin/plugin.json`. */
export interface WorkspaceContractPlugin {
  name: string;
  /** The plugin root, which holds `.claude-plugin/plugin.json` or is listed by a marketplace. */
  dir: string;
}

/**
 * The hooks that a layer's `hooks/hooks.json` declares, or that a plugin declares for Codex. A
 * plugin's commands export `CLAUDE_PLUGIN_ROOT` first, because only a plugin loader sets it.
 */
export interface WorkspaceContractLayerHooks {
  kind: WorkspaceContractLayer["kind"] | "plugin";
  /** The `.agents` directory, or the plugin root. */
  dir: string;
  hooks: HooksByEvent;
}

export interface WorkspaceContract {
  layers: readonly WorkspaceContractLayer[];
  plugins: WorkspaceContractPlugin[];
  /** Plugin servers rank below every layer. */
  mcpServers: Record<string, McpServerConfig>;
  instructions: { path: string; text: string } | null;
  /** Plugins, then layers, each only when it declares at least one hook. */
  hooks: WorkspaceContractLayerHooks[];
  /** User level only. The daemon bridges them into vendor files, never into the launch config. */
  agents: AgentDefinition[];
}

/**
 * The contract parts that each provider maps itself. The daemon computes them at every launch,
 * and they never reach the stored agent record.
 */
export interface LaunchWorkspaceContract {
  /** Trusted project `.agents` directories, repo root first. */
  projectLayers: string[];
  plugins: WorkspaceContractPlugin[];
  hooks: WorkspaceContractLayerHooks[];
}

export interface WorkspaceContractInspection {
  /** The directory holding `.git`, or the cwd itself outside a repo. */
  repoRoot: string;
  trusted: boolean;
  /** Existing project `.agents` directories, repo root first. */
  projectLayers: string[];
}
