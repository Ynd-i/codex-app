import type {
  DaemonClient,
  WorkspaceContractInspectPayload,
} from "@getpaseo/client/internal/daemon-client";
import type { QueryClient } from "@tanstack/react-query";
import { create } from "zustand";

type WorkspaceContractInspection = Pick<
  WorkspaceContractInspectPayload,
  "repoRoot" | "trusted" | "projectLayers"
>;

export type TrustRequest =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "failed"; error: string };

export type WorkspaceContractNotice =
  | { kind: "hidden" }
  | { kind: "untrusted"; repoRoot: string; trust: TrustRequest };

export function workspaceContractQueryRoot(serverId: string) {
  return ["workspaceContract", serverId] as const;
}

export function workspaceContractQueryKey(serverId: string, cwd: string) {
  return ["workspaceContract", serverId, cwd] as const;
}

export function resolveWorkspaceContractNotice(input: {
  inspection: WorkspaceContractInspection | undefined;
  dismissed: boolean;
  trust: { pending: boolean; error: string | null };
}): WorkspaceContractNotice {
  const { inspection } = input;
  if (!inspection) {
    return { kind: "hidden" };
  }
  const skipsProjectLayers = inspection.projectLayers.length > 0 && !inspection.trusted;
  if (!skipsProjectLayers || input.dismissed) {
    return { kind: "hidden" };
  }
  return {
    kind: "untrusted",
    repoRoot: inspection.repoRoot,
    trust: resolveTrustRequest(input.trust),
  };
}

function resolveTrustRequest(input: { pending: boolean; error: string | null }): TrustRequest {
  if (input.pending) {
    return { status: "pending" };
  }
  if (input.error !== null) {
    return { status: "failed", error: input.error };
  }
  return { status: "idle" };
}

/**
 * The daemon trusts the repo before the RPC resolves, so this marks the cwd's inspection trusted
 * at once and the notice hides before the re-inspect returns.
 */
export async function trustWorkspaceContract(input: {
  client: Pick<DaemonClient, "trustWorkspaceContract">;
  queryClient: QueryClient;
  serverId: string;
  cwd: string;
}): Promise<void> {
  await input.client.trustWorkspaceContract(input.cwd);
  input.queryClient.setQueryData<WorkspaceContractInspectPayload>(
    workspaceContractQueryKey(input.serverId, input.cwd),
    (inspection) => inspection && { ...inspection, trusted: true },
  );
  void input.queryClient.invalidateQueries({
    queryKey: workspaceContractQueryRoot(input.serverId),
  });
}

interface WorkspaceContractNoticeState {
  dismissed: ReadonlySet<string>;
  dismiss: (serverId: string, repoRoot: string) => void;
}

/** "Not now" lasts until the app restarts, so the store keeps it in memory only. */
export const useWorkspaceContractNoticeStore = create<WorkspaceContractNoticeState>((set) => ({
  dismissed: new Set(),
  dismiss: (serverId, repoRoot) =>
    set((state) => ({
      dismissed: new Set(state.dismissed).add(dismissalKey(serverId, repoRoot)),
    })),
}));

export function isWorkspaceContractNoticeDismissed(
  state: WorkspaceContractNoticeState,
  serverId: string,
  repoRoot: string,
): boolean {
  return state.dismissed.has(dismissalKey(serverId, repoRoot));
}

function dismissalKey(serverId: string, repoRoot: string): string {
  return `${serverId}:${repoRoot}`;
}
