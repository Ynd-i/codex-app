import { describe, expect, it } from "vitest";
import {
  MutableDaemonConfigSchema,
  SessionInboundMessageSchema,
  SessionOutboundMessageSchema,
} from "./messages";
import { validateWSOutboundMessage } from "./validation/ws-outbound";

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

describe("workspace contract trust RPCs", () => {
  it.each(["workspace.contract.inspect.request", "workspace.contract.trust.request"] as const)(
    "parses %s",
    (type) => {
      const request = { type, cwd: "/repo/app", requestId: "req-1" };
      expect(SessionInboundMessageSchema.parse(request)).toEqual(request);
    },
  );

  it.each([
    {
      type: "workspace.contract.inspect.response",
      payload: {
        requestId: "req-1",
        repoRoot: "/repo",
        trusted: false,
        projectLayers: ["/repo/.agents", "/repo/app/.agents"],
      },
    },
    {
      type: "workspace.contract.trust.response",
      payload: { requestId: "req-2", repoRoot: "/repo", trustedRoots: ["~/code", "/repo"] },
    },
  ])("clients accept $type", (message) => {
    expect(SessionOutboundMessageSchema.parse(message)).toEqual(message);
    expect(validateWSOutboundMessage({ type: "session", message })).toEqual({
      success: true,
      data: { type: "session", message },
    });
  });
});
