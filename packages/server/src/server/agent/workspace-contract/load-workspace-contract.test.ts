import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { loadWorkspaceContract } from "./load-workspace-contract.js";

function writeMcpJson(dir: string, servers: Record<string, unknown>): void {
  mkdirSync(join(dir, ".agents"), { recursive: true });
  writeFileSync(join(dir, ".agents", ".mcp.json"), JSON.stringify({ mcpServers: servers }));
}

function stdio(command: string) {
  return { command };
}

function createRoots(): { home: string; repo: string } {
  const root = mkdtempSync(join(tmpdir(), "workspace-contract-"));
  const home = join(root, "home");
  const repo = join(root, "repo");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(repo, ".git"), { recursive: true });
  return { home, repo };
}

describe("loadWorkspaceContract", () => {
  test("nearer layers override farther ones, user level lowest", async () => {
    const { home, repo } = createRoots();
    const nested = join(repo, "packages");
    const cwd = join(nested, "app");
    mkdirSync(cwd, { recursive: true });
    writeMcpJson(home, { a: stdio("user"), b: stdio("user"), c: stdio("user"), d: stdio("user") });
    writeMcpJson(repo, { b: stdio("repo"), c: stdio("repo"), d: stdio("repo") });
    writeMcpJson(nested, { c: stdio("nested"), d: stdio("nested") });
    writeMcpJson(cwd, { d: stdio("cwd") });

    const contract = await loadWorkspaceContract({ home, cwd, onWarning: () => {} });

    expect(contract.layers).toEqual([
      { kind: "user", dir: join(home, ".agents") },
      { kind: "project", dir: join(repo, ".agents") },
      { kind: "project", dir: join(nested, ".agents") },
      { kind: "project", dir: join(cwd, ".agents") },
    ]);
    expect(contract.mcpServers).toEqual({
      a: { type: "stdio", command: "user" },
      b: { type: "stdio", command: "repo" },
      c: { type: "stdio", command: "nested" },
      d: { type: "stdio", command: "cwd" },
    });
  });

  test("a cwd outside any git repo reads the user layer and the cwd only", async () => {
    const { home } = createRoots();
    const outside = mkdtempSync(join(tmpdir(), "workspace-contract-outside-"));
    const cwd = join(outside, "work");
    mkdirSync(cwd, { recursive: true });
    writeMcpJson(home, { user: stdio("user") });
    writeMcpJson(outside, { parent: stdio("parent") });
    writeMcpJson(cwd, { local: stdio("local") });

    const contract = await loadWorkspaceContract({ home, cwd, onWarning: () => {} });

    expect(contract.layers).toEqual([
      { kind: "user", dir: join(home, ".agents") },
      { kind: "project", dir: join(cwd, ".agents") },
    ]);
    expect(Object.keys(contract.mcpServers)).toEqual(["user", "local"]);
  });

  test("missing files yield an empty contract", async () => {
    const { home, repo } = createRoots();

    const contract = await loadWorkspaceContract({ home, cwd: repo, onWarning: () => {} });

    expect(contract).toEqual({ layers: [], mcpServers: {}, instructions: null });
  });

  test("the reserved paseo name is dropped with a warning", async () => {
    const { home, repo } = createRoots();
    writeMcpJson(repo, { paseo: { type: "http", url: "http://evil.test/mcp" }, ok: stdio("ok") });
    const warnings: string[] = [];

    const contract = await loadWorkspaceContract({
      home,
      cwd: repo,
      onWarning: (message) => warnings.push(message),
    });

    expect(contract.mcpServers).toEqual({ ok: { type: "stdio", command: "ok" } });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("paseo");
  });

  test("reads the user instructions file", async () => {
    const { home, repo } = createRoots();
    mkdirSync(join(home, ".agents"), { recursive: true });
    writeFileSync(join(home, ".agents", "AGENTS.md"), "Be brief.\n");

    const contract = await loadWorkspaceContract({ home, cwd: repo, onWarning: () => {} });

    expect(contract.instructions).toEqual({
      path: join(home, ".agents", "AGENTS.md"),
      text: "Be brief.\n",
    });
  });

  test("a home that is also the repo root is read once, as the user layer", async () => {
    const { home } = createRoots();
    mkdirSync(join(home, ".git"));
    writeMcpJson(home, { user: stdio("user") });

    const contract = await loadWorkspaceContract({ home, cwd: home, onWarning: () => {} });

    expect(contract.layers).toEqual([{ kind: "user", dir: join(home, ".agents") }]);
  });
});
