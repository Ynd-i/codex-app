import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useFetchQuery } from "@/data/query";
import { useHostFeature } from "@/runtime/host-features";
import { useHostRuntimeClient, useHostRuntimeIsConnected } from "@/runtime/host-runtime";
import { toErrorMessage } from "@/utils/error-messages";
import {
  isWorkspaceContractNoticeDismissed,
  resolveWorkspaceContractNotice,
  trustWorkspaceContract,
  useWorkspaceContractNoticeStore,
  workspaceContractQueryKey,
  type WorkspaceContractNotice,
} from "./trust-notice-model";

interface WorkspaceContractTrustNoticeProps {
  serverId: string | null;
  cwd: string | null;
}

export function WorkspaceContractTrustNotice({ serverId, cwd }: WorkspaceContractTrustNoticeProps) {
  if (!serverId || !cwd) {
    return null;
  }
  // Keyed per workspace so a failed trust never carries over to the next workspace's notice.
  return <TrustNotice key={`${serverId}:${cwd}`} serverId={serverId} cwd={cwd} />;
}

interface TrustNoticeProps {
  serverId: string;
  cwd: string;
}

function TrustNotice({ serverId, cwd }: TrustNoticeProps) {
  const { notice, trust } = useTrustNotice(serverId, cwd);
  if (notice.kind === "hidden") {
    return null;
  }
  return <UntrustedNotice serverId={serverId} notice={notice} onTrust={trust} />;
}

interface TrustNoticeState {
  notice: WorkspaceContractNotice;
  trust: () => void;
}

function useTrustNotice(serverId: string, cwd: string): TrustNoticeState {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const client = useHostRuntimeClient(serverId);
  const isConnected = useHostRuntimeIsConnected(serverId);
  // COMPAT(workspaceContractTrust): added in Paseo Custom v0.11.2-v1-beta1, remove gate after 2027-04-10.
  const supported = useHostFeature(serverId, "workspaceContractTrust");
  const inspection = useFetchQuery({
    queryKey: workspaceContractQueryKey(serverId, cwd),
    dataShape: "value",
    staleTimeMs: 5_000,
    enabled: supported && isConnected && client !== null,
    queryFn: async () => {
      if (!client) {
        throw new Error(t("workspace.terminal.hostDisconnected"));
      }
      return client.inspectWorkspaceContract(cwd);
    },
    retry: false,
  });
  const repoRoot = inspection.data?.repoRoot ?? null;
  const dismissed = useWorkspaceContractNoticeStore(
    (state) => repoRoot !== null && isWorkspaceContractNoticeDismissed(state, serverId, repoRoot),
  );
  const trustMutation = useMutation({
    mutationFn: async () => {
      if (!client) {
        throw new Error(t("workspace.terminal.hostDisconnected"));
      }
      await trustWorkspaceContract({ client, queryClient, serverId, cwd });
    },
  });
  const { mutate } = trustMutation;
  const trust = useCallback(() => mutate(), [mutate]);
  const notice = resolveWorkspaceContractNotice({
    inspection: inspection.data,
    dismissed,
    trust: {
      pending: trustMutation.isPending,
      error: trustMutation.isError ? toErrorMessage(trustMutation.error) : null,
    },
  });
  return { notice, trust };
}

interface UntrustedNoticeProps {
  serverId: string;
  notice: Extract<WorkspaceContractNotice, { kind: "untrusted" }>;
  onTrust: () => void;
}

function UntrustedNotice({ serverId, notice, onTrust }: UntrustedNoticeProps) {
  const { t } = useTranslation();
  const dismissNotice = useWorkspaceContractNoticeStore((state) => state.dismiss);
  const dismiss = useCallback(
    () => dismissNotice(serverId, notice.repoRoot),
    [dismissNotice, notice.repoRoot, serverId],
  );
  const isTrusting = notice.trust.status === "pending";
  const error = notice.trust.status === "failed" ? notice.trust.error : null;
  const description = useMemo(
    () => (
      <>
        <Text style={styles.body}>{t("workspaceContract.trustNotice.body")}</Text>
        {error ? (
          <Text style={styles.error} testID="workspace-contract-trust-notice-error">
            {error}
          </Text>
        ) : null}
      </>
    ),
    [error, t],
  );

  return (
    <View style={styles.rail}>
      <View style={styles.content}>
        <Alert
          size="sm"
          variant="warning"
          title={t("workspaceContract.trustNotice.title")}
          description={description}
          testID="workspace-contract-trust-notice"
        >
          <Button
            variant="outline"
            size="sm"
            loading={isTrusting}
            onPress={onTrust}
            testID="workspace-contract-trust-notice-trust"
          >
            {t("workspaceContract.trustNotice.trust")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isTrusting}
            onPress={dismiss}
            testID="workspace-contract-trust-notice-dismiss"
          >
            {t("workspaceContract.trustNotice.notNow")}
          </Button>
        </Alert>
      </View>
    </View>
  );
}

// The rail matches the composer's inset and width, so the notice lines up with the input below it.
const styles = StyleSheet.create((theme) => ({
  rail: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[3],
  },
  content: {
    width: "100%",
    maxWidth: theme.contentMaxWidth,
  },
  body: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.base,
  },
  error: {
    color: theme.colors.palette.red[300],
    fontSize: theme.fontSize.sm,
  },
}));
