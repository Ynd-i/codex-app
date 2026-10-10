import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isWorkspaceContractNoticeDismissed,
  resolveWorkspaceContractNotice,
  trustWorkspaceContract,
  useWorkspaceContractNoticeStore,
  workspaceContractQueryKey,
} from "./trust-notice-model";

const UNTRUSTED_WITH_LAYERS = {
  requestId: "inspect-1",
  repoRoot: "/repo",
  trusted: false,
  projectLayers: ["/repo/.agents"],
};
const NO_TRUST_REQUEST = { pending: false, error: null };

function isDismissed(serverId: string, repoRoot: string): boolean {
  return isWorkspaceContractNoticeDismissed(
    useWorkspaceContractNoticeStore.getState(),
    serverId,
    repoRoot,
  );
}

describe("workspace contract trust notice", () => {
  beforeEach(() => {
    useWorkspaceContractNoticeStore.setState({ dismissed: new Set() });
  });

  it("shows for an untrusted repo with project .agents directories", () => {
    expect(
      resolveWorkspaceContractNotice({
        inspection: UNTRUSTED_WITH_LAYERS,
        dismissed: false,
        trust: NO_TRUST_REQUEST,
      }),
    ).toEqual({ kind: "untrusted", repoRoot: "/repo", trust: { status: "idle" } });
  });

  it("hides until inspected, for a trusted repo, and for a repo without project .agents", () => {
    const inspections = [
      undefined,
      { ...UNTRUSTED_WITH_LAYERS, trusted: true },
      { ...UNTRUSTED_WITH_LAYERS, projectLayers: [] },
    ];
    for (const inspection of inspections) {
      expect(
        resolveWorkspaceContractNotice({ inspection, dismissed: false, trust: NO_TRUST_REQUEST }),
      ).toEqual({ kind: "hidden" });
    }
  });

  it("hides after Not now for that host and repo only", () => {
    useWorkspaceContractNoticeStore.getState().dismiss("server-1", "/repo");

    expect(
      resolveWorkspaceContractNotice({
        inspection: UNTRUSTED_WITH_LAYERS,
        dismissed: isDismissed("server-1", "/repo"),
        trust: NO_TRUST_REQUEST,
      }),
    ).toEqual({ kind: "hidden" });
    expect(isDismissed("server-2", "/repo")).toBe(false);
    expect(isDismissed("server-1", "/other-repo")).toBe(false);
  });

  it("reports a pending and a failed trust request", () => {
    expect(
      resolveWorkspaceContractNotice({
        inspection: UNTRUSTED_WITH_LAYERS,
        dismissed: false,
        trust: { pending: true, error: null },
      }),
    ).toEqual({ kind: "untrusted", repoRoot: "/repo", trust: { status: "pending" } });
    expect(
      resolveWorkspaceContractNotice({
        inspection: UNTRUSTED_WITH_LAYERS,
        dismissed: false,
        trust: { pending: false, error: "Session is not authorized" },
      }),
    ).toEqual({
      kind: "untrusted",
      repoRoot: "/repo",
      trust: { status: "failed", error: "Session is not authorized" },
    });
  });

  it("trusts the cwd through the RPC, hides the notice and re-inspects", async () => {
    const queryClient = new QueryClient();
    const queryKey = workspaceContractQueryKey("server-1", "/repo/app");
    queryClient.setQueryData(queryKey, UNTRUSTED_WITH_LAYERS);
    const client = {
      trustWorkspaceContract: vi.fn().mockResolvedValue({
        requestId: "trust-1",
        repoRoot: "/repo",
        trustedRoots: ["/repo"],
      }),
    };

    await trustWorkspaceContract({ client, queryClient, serverId: "server-1", cwd: "/repo/app" });

    expect(client.trustWorkspaceContract.mock.calls).toEqual([["/repo/app"]]);
    expect(
      resolveWorkspaceContractNotice({
        inspection: queryClient.getQueryData(queryKey),
        dismissed: false,
        trust: NO_TRUST_REQUEST,
      }),
    ).toEqual({ kind: "hidden" });
    expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true);
  });

  it("keeps the inspection untrusted when the trust RPC fails", async () => {
    const queryClient = new QueryClient();
    const queryKey = workspaceContractQueryKey("server-1", "/repo/app");
    queryClient.setQueryData(queryKey, UNTRUSTED_WITH_LAYERS);
    const client = {
      trustWorkspaceContract: vi.fn().mockRejectedValue(new Error("Session is not authorized")),
    };

    await expect(
      trustWorkspaceContract({ client, queryClient, serverId: "server-1", cwd: "/repo/app" }),
    ).rejects.toThrow("Session is not authorized");
    expect(queryClient.getQueryData(queryKey)).toEqual(UNTRUSTED_WITH_LAYERS);
  });
});
