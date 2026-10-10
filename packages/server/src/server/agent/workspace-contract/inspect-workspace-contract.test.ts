import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vitest";
import { inspectWorkspaceContract } from "./inspect-workspace-contract.js";

function createRoots(): { home: string; repo: string } {
  const root = mkdtempSync(join(tmpdir(), "workspace-contract-inspect-"));
  const home = join(root, "home");
  const repo = join(root, "repo");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(repo, ".git"), { recursive: true });
  return { home, repo };
}

describe("inspectWorkspaceContract", () => {
  test("lists existing project .agents from the repo root down to cwd", async () => {
    const { home, repo } = createRoots();
    const cwd = join(repo, "packages", "app");
    mkdirSync(join(repo, ".agents"), { recursive: true });
    mkdirSync(join(cwd, ".agents"), { recursive: true });

    expect(await inspectWorkspaceContract({ home, cwd, trustedRoots: [] })).toEqual({
      repoRoot: repo,
      trusted: false,
      projectLayers: [join(repo, ".agents"), join(cwd, ".agents")],
    });
  });

  test("trusts a repo at or below a trusted root, never from inside the repo", async () => {
    const { home } = createRoots();
    const repo = join(home, "code", "repo");
    const cwd = join(repo, "app");
    mkdirSync(join(repo, ".git"), { recursive: true });
    mkdirSync(cwd, { recursive: true });

    async function trusted(trustedRoots: string[]) {
      return (await inspectWorkspaceContract({ home, cwd, trustedRoots })).trusted;
    }

    expect(await trusted([repo])).toBe(true);
    expect(await trusted([dirname(repo)])).toBe(true);
    expect(await trusted(["~/code"])).toBe(true);
    expect(await trusted([cwd])).toBe(false);
    expect(await trusted(["code"])).toBe(false);
  });

  test("a cwd outside any repo is its own root", async () => {
    const outside = mkdtempSync(join(tmpdir(), "workspace-contract-inspect-outside-"));
    const cwd = join(outside, "work");
    mkdirSync(join(outside, ".agents"), { recursive: true });
    mkdirSync(join(cwd, ".agents"), { recursive: true });

    expect(
      await inspectWorkspaceContract({ home: createRoots().home, cwd, trustedRoots: [] }),
    ).toEqual({ repoRoot: cwd, trusted: false, projectLayers: [join(cwd, ".agents")] });
  });

  test("a worktree's .git file marks the root, and a home there is no project layer", async () => {
    const root = mkdtempSync(join(tmpdir(), "workspace-contract-inspect-worktree-"));
    const home = join(root, "home");
    const cwd = join(home, "notes");
    mkdirSync(join(home, ".agents"), { recursive: true });
    mkdirSync(join(cwd, ".agents"), { recursive: true });
    writeFileSync(join(home, ".git"), "gitdir: /elsewhere/.git/worktrees/home\n");

    expect(await inspectWorkspaceContract({ home, cwd, trustedRoots: [] })).toEqual({
      repoRoot: home,
      trusted: false,
      projectLayers: [join(cwd, ".agents")],
    });
  });
});
