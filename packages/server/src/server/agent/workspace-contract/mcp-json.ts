import { z } from "zod";
import type { McpServerConfig } from "../agent-sdk-types.js";

const stringMap = z.record(z.string(), z.string());

// Unknown fields (Codex's `cwd`, `env_vars`, `startup_timeout_sec`) are stripped by z.object.
const SERVER_SHAPES = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("stdio"),
    command: z.string().min(1),
    args: z.array(z.string()).optional(),
    env: stringMap.optional(),
  }),
  z.object({ type: z.literal("http"), url: z.string().min(1), headers: stringMap.optional() }),
  z.object({ type: z.literal("sse"), url: z.string().min(1), headers: stringMap.optional() }),
]);

const MCP_JSON_FILE = z.object({ mcpServers: z.record(z.string(), z.unknown()) });

/**
 * Parses a Claude Code / Codex plugin style `.mcp.json`. Anything it cannot use is
 * reported through `onWarning` and skipped, so a broken file never blocks a launch.
 */
export function parseMcpJson(
  text: string,
  options: { onWarning: (message: string) => void },
): Record<string, McpServerConfig> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    options.onWarning(`invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
  const file = MCP_JSON_FILE.safeParse(raw);
  if (!file.success) {
    options.onWarning("expected an object with an `mcpServers` object");
    return {};
  }

  const servers: Array<[string, McpServerConfig]> = [];
  for (const [name, entry] of Object.entries(file.data.mcpServers)) {
    if (isDisabled(entry)) continue;
    // ponytail: no env expansion yet, add when a user config needs it
    const server = SERVER_SHAPES.safeParse(withImplicitStdioType(entry));
    if (server.success) {
      servers.push([name, server.data]);
    } else {
      options.onWarning(`MCP server '${name}' is not a stdio, http or sse server; skipped`);
    }
  }
  return Object.fromEntries(servers);
}

function isDisabled(entry: unknown): boolean {
  return isObject(entry) && entry.enabled === false;
}

function withImplicitStdioType(entry: unknown): unknown {
  return isObject(entry) && entry.type === undefined && "command" in entry
    ? { ...entry, type: "stdio" }
    : entry;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
