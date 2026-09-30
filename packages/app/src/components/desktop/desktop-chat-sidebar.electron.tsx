import { memo, useCallback, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
} from "lucide-react-native";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { AgentStatusDot } from "@/components/agent-status-dot";
import { HeaderToggleButton } from "@/components/headers/header-toggle-button";
import { SidebarDisplayPreferencesMenu } from "@/components/sidebar/display-preferences/menu";
import { SidebarGroupToggleRow } from "@/components/sidebar/sidebar-group-toggle-row";
import { useSidebarModel } from "@/components/sidebar/sidebar-model";
import { useLimitedSidebarGroup } from "@/components/sidebar/use-limited-sidebar-group";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAggregatedAgents, type AggregatedAgent } from "@/hooks/use-aggregated-agents";
import type { SidebarWorkspacePlacement } from "@/hooks/use-sidebar-workspaces-list";
import { openProjectSettings } from "@/navigation/settings-navigation";
import { useKeyboardShortcutsStore } from "@/stores/keyboard-shortcuts-store";
import { navigateToWorkspace } from "@/stores/navigation-active-workspace-store";
import { useSidebarCollapsedSectionsStore } from "@/stores/sidebar-collapsed-sections-store";
import type { Theme } from "@/styles/theme";
import { buildNewWorkspaceRoute } from "@/utils/host-routes";
import { navigateToAgent } from "@/utils/navigate-to-agent";
import {
  buildDesktopChatSidebar,
  desktopChatKey,
  type DesktopChatProject,
} from "./desktop-chat-model";
import { useActiveDesktopChat } from "./use-desktop-chat";
import { DesktopChatMenuItems, useDesktopChatMenu } from "./desktop-chat-menu";

const SearchIcon = withUnistyles(Search);
const FolderIcon = withUnistyles(FolderOpen);
const DownIcon = withUnistyles(ChevronDown);
const RightIcon = withUnistyles(ChevronRight);
const MoreIcon = withUnistyles(MoreHorizontal);
const PlusIcon = withUnistyles(Plus);
const SettingsIcon = withUnistyles(Settings2);
const Progress = withUnistyles(ActivityIndicator);
const mutedIcon = (theme: Theme) => ({ color: theme.colors.foregroundMuted });
function openSearch() {
  useKeyboardShortcutsStore.getState().setCommandCenterOpen(true);
}

export function DesktopChatSidebarHeader() {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <Text style={styles.brand}>Paseo</Text>
      <View style={styles.spacer} />
      <SidebarDisplayPreferencesMenu chatMode />
      <HeaderToggleButton
        onPress={openSearch}
        tooltipLabel={t("sidebar.sections.search")}
        tooltipKeys={[]}
        tooltipSide="bottom"
        accessibilityRole="button"
        accessibilityLabel={t("sidebar.sections.search")}
        testID="desktop-chat-search"
      >
        <SearchIcon size={18} uniProps={mutedIcon} />
      </HeaderToggleButton>
    </View>
  );
}

const ChatRow = memo(function ChatRow({
  agent,
  selectedKey,
  indented = false,
}: {
  agent: AggregatedAgent;
  selectedKey: string | null;
  indented?: boolean;
}) {
  const { t } = useTranslation();
  const { busy, unread, markRead, menuProps, renameModal } = useDesktopChatMenu(agent);
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const key = desktopChatKey(agent);
  const selected = selectedKey === key;
  const title = agent.title || t("agentList.fallbackTitle");
  const enter = useCallback(() => setHovered(true), []);
  const leave = useCallback(() => setHovered(false), []);
  const open = useCallback(() => {
    if (unread) markRead();
    navigateToAgent({
      serverId: agent.serverId,
      agentId: agent.id,
      workspaceId: agent.workspaceId,
      pin: true,
    });
  }, [agent, unread, markRead]);
  const accessibilityState = useMemo(() => ({ selected, busy }), [selected, busy]);

  return (
    <>
      <ContextMenu open={contextOpen} onOpenChange={setContextOpen}>
        <ContextMenuTrigger contextOnly>
          <View
            onPointerEnter={enter}
            onPointerLeave={leave}
            style={[
              styles.chatRow,
              indented && styles.indented,
              (hovered || contextOpen || menuOpen) && styles.rowHovered,
              selected && styles.rowSelected,
            ]}
          >
            <Pressable
              onPress={open}
              disabled={busy}
              style={styles.chatButton}
              accessibilityRole="button"
              accessibilityLabel={`${title} — ${agent.serverLabel}`}
              accessibilityState={accessibilityState}
              testID={`desktop-chat-${key}`}
            >
              <Text numberOfLines={1} style={[styles.chatTitle, unread && styles.unreadTitle]}>
                {title}
              </Text>
              {busy ? (
                <Progress size="small" uniProps={mutedIcon} />
              ) : (
                <AgentStatusDot
                  status={agent.turn.phase === "open" ? "running" : agent.status}
                  requiresAttention={unread}
                  attentionReason={agent.attentionReason}
                  pendingPermissionCount={agent.pendingPermissionCount}
                />
              )}
            </Pressable>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger
                onFocus={enter}
                onBlur={leave}
                style={[styles.menuButton, !hovered && !menuOpen && styles.menuHidden]}
                accessibilityRole="button"
                accessibilityLabel={t("desktopChat.actions")}
                testID={`desktop-chat-menu-${key}`}
              >
                <MoreIcon size={16} uniProps={mutedIcon} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" width={210}>
                <DesktopChatMenuItems {...menuProps} />
              </DropdownMenuContent>
            </DropdownMenu>
          </View>
        </ContextMenuTrigger>
        <ContextMenuContent width={210}>
          <DesktopChatMenuItems {...menuProps} context />
        </ContextMenuContent>
      </ContextMenu>
      {renameModal}
    </>
  );
});

function EmptyWorkspaceRow({ workspace }: { workspace: SidebarWorkspacePlacement }) {
  const open = useCallback(
    () => navigateToWorkspace({ serverId: workspace.serverId, workspaceId: workspace.workspaceId }),
    [workspace.serverId, workspace.workspaceId],
  );
  return (
    <Pressable
      onPress={open}
      style={styles.emptyWorkspace}
      accessibilityRole="button"
      accessibilityLabel={workspace.name}
    >
      <FolderIcon size={14} uniProps={mutedIcon} />
      <Text numberOfLines={1} style={styles.secondaryText}>
        {workspace.name}
      </Text>
    </Pressable>
  );
}

const ChatProject = memo(function ChatProject({
  entry,
  selectedKey,
}: {
  entry: DesktopChatProject;
  selectedKey: string | null;
}) {
  const { t } = useTranslation();
  const { project, chats, emptyWorkspaces } = entry;
  const collapsed = useSidebarCollapsedSectionsStore((state) =>
    state.collapsedProjectKeys.has(project.viewKey),
  );
  const toggleCollapsed = useSidebarCollapsedSectionsStore((state) => state.toggleProjectCollapsed);
  const { visibleItems, expanded, canToggle, toggleExpanded } = useLimitedSidebarGroup(chats);
  const [hovered, setHovered] = useState(false);
  const enter = useCallback(() => setHovered(true), []);
  const leave = useCallback(() => setHovered(false), []);
  const toggle = useCallback(
    () => toggleCollapsed(project.viewKey),
    [project.viewKey, toggleCollapsed],
  );
  const target = project.hosts[0];
  const create = useCallback(() => {
    if (target)
      router.push(
        buildNewWorkspaceRoute({
          serverId: target.serverId,
          sourceDirectory: target.iconWorkingDir,
          projectId: target.projectId,
          displayName: project.projectName,
        }),
      );
  }, [target, project.projectName]);
  const settings = useCallback(() => {
    if (target) openProjectSettings(target.serverId, target.projectId);
  }, [target]);
  const accessibilityState = useMemo(() => ({ expanded: !collapsed }), [collapsed]);
  return (
    <View style={styles.project}>
      <View style={styles.projectHeader} onPointerEnter={enter} onPointerLeave={leave}>
        <Pressable
          onPress={toggle}
          style={styles.projectButton}
          accessibilityRole="button"
          accessibilityLabel={project.projectName}
          accessibilityState={accessibilityState}
          testID={`sidebar-project-row-${project.viewKey}`}
        >
          <FolderIcon size={18} uniProps={mutedIcon} />
          <Text numberOfLines={1} style={styles.projectTitle}>
            {project.projectName}
          </Text>
        </Pressable>
        <View style={[styles.projectActions, !hovered && styles.menuHidden]}>
          <HeaderToggleButton
            onPress={create}
            onFocus={enter}
            onBlur={leave}
            disabled={!target}
            tooltipLabel={t("desktopChat.newChat")}
            tooltipKeys={[]}
            tooltipSide="top"
            accessibilityRole="button"
            accessibilityLabel={t("desktopChat.newChat")}
          >
            <PlusIcon size={16} uniProps={mutedIcon} />
          </HeaderToggleButton>
          <HeaderToggleButton
            onPress={settings}
            onFocus={enter}
            onBlur={leave}
            disabled={!target}
            tooltipLabel={t("sidebar.actions.settings")}
            tooltipKeys={[]}
            tooltipSide="top"
            accessibilityRole="button"
            accessibilityLabel={t("sidebar.actions.settings")}
          >
            <SettingsIcon size={15} uniProps={mutedIcon} />
          </HeaderToggleButton>
        </View>
      </View>
      {!collapsed ? (
        <>
          {visibleItems.map((agent) => (
            <ChatRow key={desktopChatKey(agent)} agent={agent} selectedKey={selectedKey} indented />
          ))}
          {canToggle ? (
            <SidebarGroupToggleRow
              expanded={expanded}
              onPress={toggleExpanded}
              indented
              testID={`desktop-project-more-${project.viewKey}`}
            />
          ) : null}
          {emptyWorkspaces.map((workspace) => (
            <EmptyWorkspaceRow key={workspace.workspaceKey} workspace={workspace} />
          ))}
        </>
      ) : null}
    </View>
  );
});

function ChatSections({
  pinned,
  recent,
  selectedKey,
}: {
  pinned: AggregatedAgent[];
  recent: AggregatedAgent[];
  selectedKey: string | null;
}) {
  const { t } = useTranslation();
  const pinnedCollapsed = useSidebarCollapsedSectionsStore((state) => state.collapsedPinned);
  const togglePinned = useSidebarCollapsedSectionsStore((state) => state.togglePinnedCollapsed);
  const { visibleItems, expanded, canToggle, toggleExpanded } = useLimitedSidebarGroup(recent, 10);
  const collapsed = pinnedCollapsed || pinned.length === 0;
  const accessibilityState = useMemo(() => ({ expanded: !collapsed }), [collapsed]);
  return (
    <View>
      <Pressable
        onPress={togglePinned}
        disabled={pinned.length === 0}
        style={styles.sectionHeading}
        accessibilityRole="button"
        accessibilityLabel={t("sidebar.pinned.title")}
        accessibilityState={accessibilityState}
      >
        <Text style={styles.sectionTitle}>{t("sidebar.pinned.title")}</Text>
        {collapsed ? (
          <RightIcon size={13} uniProps={mutedIcon} />
        ) : (
          <DownIcon size={13} uniProps={mutedIcon} />
        )}
      </Pressable>
      {!collapsed
        ? pinned.map((agent) => (
            <ChatRow key={desktopChatKey(agent)} agent={agent} selectedKey={selectedKey} />
          ))
        : null}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>{t("agentList.dateSections.recent")}</Text>
      </View>
      {visibleItems.map((agent) => (
        <ChatRow key={desktopChatKey(agent)} agent={agent} selectedKey={selectedKey} />
      ))}
      {canToggle ? (
        <SidebarGroupToggleRow
          expanded={expanded}
          onPress={toggleExpanded}
          testID="desktop-recent-more"
        />
      ) : null}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>{t("settings.hostSections.projects")}</Text>
      </View>
    </View>
  );
}

function projectKey(entry: DesktopChatProject) {
  return entry.project.viewKey;
}

export function DesktopChatSidebar({ onAddProject }: { onAddProject: () => void }) {
  const { t } = useTranslation();
  const { projects, allProjects } = useSidebarModel();
  const { agents } = useAggregatedAgents({ demand: false });
  const selected = useActiveDesktopChat();
  const selectedKey = selected ? `${selected.serverId}:${selected.agentId}` : null;
  const model = useMemo(() => buildDesktopChatSidebar({ projects, agents }), [projects, agents]);
  const renderProject = useCallback(
    ({ item }: { item: DesktopChatProject }) => (
      <ChatProject entry={item} selectedKey={selectedKey} />
    ),
    [selectedKey],
  );
  const header = useMemo(
    () => <ChatSections pinned={model.pinned} recent={model.recent} selectedKey={selectedKey} />,
    [model.pinned, model.recent, selectedKey],
  );
  const empty = useMemo(
    () => (
      <View style={styles.empty}>
        <Text style={styles.secondaryText}>
          {t(allProjects.length > 0 ? "sidebar.filterEmpty.description" : "sessions.empty")}
        </Text>
        {allProjects.length === 0 ? (
          <Button variant="ghost" onPress={onAddProject}>
            {t("sidebar.actions.addProject")}
          </Button>
        ) : null}
      </View>
    ),
    [allProjects.length, onAddProject, t],
  );
  return (
    <FlatList
      data={model.projects}
      renderItem={renderProject}
      keyExtractor={projectKey}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      testID="sidebar-project-list"
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  header: { height: 52, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 4 },
  brand: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground,
  },
  spacer: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 8, paddingBottom: 16 },
  sectionHeading: {
    height: 44,
    paddingTop: 12,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sectionTitle: { color: theme.colors.foregroundExtraMuted, fontSize: theme.fontSize.base },
  chatRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingLeft: 8,
    paddingRight: 4,
  },
  indented: { paddingLeft: 32 },
  rowHovered: { backgroundColor: theme.colors.surfaceSidebarHover },
  rowSelected: { backgroundColor: theme.colors.surfaceSidebarSelected },
  chatButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chatTitle: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    lineHeight: 20,
  },
  unreadTitle: { color: theme.colors.foreground, fontWeight: theme.fontWeight.medium },
  menuButton: {
    width: 24,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  menuHidden: { opacity: 0 },
  project: { paddingBottom: 6 },
  projectHeader: { minHeight: 32, flexDirection: "row", alignItems: "center", paddingLeft: 8 },
  projectButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  projectTitle: { flex: 1, color: theme.colors.foreground, fontSize: theme.fontSize.base },
  projectActions: { flexDirection: "row", alignItems: "center" },
  emptyWorkspace: {
    minHeight: 32,
    paddingLeft: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.base,
    flexShrink: 1,
  },
  empty: { padding: 8, gap: 12 },
}));
