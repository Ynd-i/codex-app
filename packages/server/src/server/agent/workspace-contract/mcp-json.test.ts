import { describe, expect, test } from "vitest";
import { parseMcpJson } from "./mcp-json.js";

function parse(value: unknown): { servers: ReturnType<typeof parseMcpJson>; warnings: string[] } {
  const warnings: string[] = [];
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const servers = parseMcpJson(text, { onWarning: (message) => warnings.push(message) });
  return { servers, warnings };
}

describe("parseMcpJson", () => {
  test("maps stdio, http and sse entries into launch configs", () => {
    const result = parse({
      mcpServers: {
        local: { command: "node", args: ["server.js"], env: { TOKEN: "x" } },
        remote: { type: "http", url: "https://example.test/mcp", headers: { A: "b" } },
        stream: { type: "sse", url: "https://example.test/sse" },
      },
    });

    expect(result).toEqual({
      servers: {
        local: { type: "stdio", command: "node", args: ["server.js"], env: { TOKEN: "x" } },
        remote: { type: "http", url: "https://example.test/mcp", headers: { A: "b" } },
        stream: { type: "sse", url: "https://example.test/sse" },
      },
      warnings: [],
    });
  });

  test("skips disabled entries without a warning", () => {
    const result = parse({
      mcpServers: { off: { command: "node", enabled: false }, on: { command: "node" } },
    });

    expect(result).toEqual({ servers: { on: { type: "stdio", command: "node" } }, warnings: [] });
  });

  test("drops fields the launch config does not carry", () => {
    const result = parse({
      mcpServers: {
        codex: {
          command: "node",
          cwd: "/tmp",
          env_vars: ["HOME"],
          startup_timeout_sec: 20,
          enabled: true,
        },
      },
    });

    expect(result).toEqual({
      servers: { codex: { type: "stdio", command: "node" } },
      warnings: [],
    });
  });

  test("skips an entry that fits no shape with one warning", () => {
    const result = parse({
      mcpServers: {
        broken: { type: "http" },
        good: { type: "sse", url: "https://example.test/sse" },
      },
    });

    expect(result.servers).toEqual({ good: { type: "sse", url: "https://example.test/sse" } });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("broken");
  });

  test("returns no servers with a warning for malformed JSON", () => {
    const result = parse("{ not json");

    expect(result.servers).toEqual({});
    expect(result.warnings).toHaveLength(1);
  });
});
