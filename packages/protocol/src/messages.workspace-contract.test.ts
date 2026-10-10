import { describe, expect, it } from "vitest";
import { MutableDaemonConfigSchema } from "./messages";

// Older daemons send no workspaceContract; newer ones carry the live trusted roots.
describe("MutableDaemonConfig workspaceContract", () => {
  const base = { mcp: { injectIntoAgents: false } };

  it("stays absent for an older daemon", () => {
    expect(MutableDaemonConfigSchema.parse(base).workspaceContract).toBeUndefined();
  });

  it("keeps trusted roots as written", () => {
    const workspaceContract = { trustedRoots: ["~/code", "/Volumes/work/client-repo"] };
    expect(
      MutableDaemonConfigSchema.parse({ ...base, workspaceContract }).workspaceContract,
    ).toEqual(workspaceContract);
  });
});
