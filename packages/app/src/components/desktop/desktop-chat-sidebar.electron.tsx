import { memo, useCallback, useMemo, useState, type Ref } from "react";
import { router } from "expo-router";
import { FolderOpen, Plus, Search, Settings2 } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { DraggableList } from "@/components/draggable-list";
import type {
  DraggableListDragHandleProps,
  DraggableRenderItemInfo,
} from "@/components/draggable-list.types";
import { HeaderToggleButton } from "@/components/headers/header-toggle-button";
import { SidebarDisplayPreferencesMenu } from "@/components/sidebar/display-preferences/menu";
import { useSidebarModel } from "@/components/sidebar/sidebar-model";
import { Button } from "@/components/ui/button";
import { useAggregatedAgents, type AggregatedAgent } from "@/hooks/use-aggregated-agents";
import type { SidebarWorkspacePlacement } from "@/hooks/use-sidebar-workspaces-list";
import { openProjectSettings } from "@/navigation/settings-navigation";
import { useKeyboardShortcutsStore } from "@/stores/keyboard-shortcuts-store";
import { navigateToWorkspace } from "@/stores/navigation-active-workspace-store";
import { useSidebarCollapsedSectionsStore } from "@/stores/sidebar-collapsed-sections-store";
import { useSidebarOrderStore } from "@/stores/sidebar-order-store";
import type { Theme } from "@/styles/theme";
import { buildNewWorkspaceRoute } from "@/utils/host-routes";
import { hasVisibleOrderChanged, mergeWithRemainder } from "@/utils/sidebar-reorder";
import {
  buildDesktopChatSidebar,
  orderSectionChats,
  orderSectionProjects,
  type ChatSectionSort,
  type DesktopChatProject,
} from "./desktop-chat-model";
import { ChatSectionHeader } from "./desktop-chat-section-header";
import { SectionChatList } from "./desktop-chat-section-list";
import { CHAT_SECTION, sectionSort, useChatSectionsStore } from "./desktop-chat-sections-store";
import { useActiveDesktopChat } from "./use-desktop-chat";
import { usesDesktopShell } from "./desktop-shell";

const SearchIcon = withUnistyles(Search);
const FolderIcon = withUnistyles(FolderOpen);
const PlusIcon = withUnistyles(Plus);
const SettingsIcon = withUnistyles(Settings2);
const mutedIcon = (theme: Theme) => ({ color: theme.colors.foregroundMuted });
const NO_ORDER: string[] = [];
function openSearch() {
  useKeyboardShortcutsStore.getState().setCommandCenterOpen(true);
}

// Electron on Windows and Linux keeps the workspace sidebar.
export function DesktopChatSidebarHeader() {
  return usesDesktopShell ? <ChatSidebarHeader /> : null;
}

export function DesktopChatSidebar(props: { onAddProject: () => void }) {
  return usesDesktopShell ? <ChatSidebarList {...props} /> : null;
}

function ChatSidebarHeader() {
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
        testID="sidebar-search"
      >
        <SearchIcon size={18} uniProps={mutedIcon} />
      </HeaderToggleButton>
    </View>
  );
}

function useSectionSort(sectionId: string) {
  const sort = useChatSectionsStore((state) => sectionSort(state, sectionId));
  const order = useChatSectionsStore((state) => state.chatOrderBySection[sectionId] ?? NO_ORDER);
  const setSortFor = useChatSectionsStore((state) => state.setSort);
  const setSort = useCallback(
    (next: ChatSectionSort) => setSortFor(sectionId, next),
    [sectionId, setSortFor],
  );
  return { sort, order, setSort };
}

function useSectionCollapsed(sectionId: string) {
  const collapsed = useChatSectionsStore((state) => state.collapsedSections.includes(sectionId));
  const toggleFor = useChatSectionsStore((state) => state.toggleCollapsed);
  const toggle = useCallback(() => toggleFor(sectionId), [sectionId, toggleFor]);
  return { collapsed, toggle };
}

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
      testID={`sidebar-workspace-row-${workspace.workspaceKey}`}
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
  dragHandleProps,
}: {
  entry: DesktopChatProject;
  selectedKey: string | null;
  dragHandleProps?: DraggableListDragHandleProps;
}) {
  const { t } = useTranslation();
  const { project, chats, emptyWorkspaces } = entry;
  const collapsed = useSidebarCollapsedSectionsStore((state) =>
    state.collapsedProjectKeys.has(project.viewKey),
  );
  const toggleCollapsed = useSidebarCollapsedSectionsStore((state) => state.toggleProjectCollapsed);
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
  // A manually ordered project list drags by the header; dnd-kit's role would replace its button.
  const {
    role: _dragRole,
    tabIndex: _dragTabIndex,
    "aria-roledescription": _dragRoleDescription,
    ...dragAttributes
  } = dragHandleProps?.attributes ?? {};
  return (
    <View style={styles.project}>
      <View
        {...dragAttributes}
        {...dragHandleProps?.listeners}
        ref={dragHandleProps?.setActivatorNodeRef as unknown as Ref<View>}
        style={styles.projectHeader}
        onPointerEnter={enter}
        onPointerLeave={leave}
      >
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
        <View style={[styles.projectActions, !hovered && styles.hidden]}>
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
          <SectionChatList
            sectionId={`project:${project.viewKey}`}
            chats={chats}
            sort="latest"
            selectedKey={selectedKey}
            indented
            moreTestID={`desktop-project-more-${project.viewKey}`}
          />
          {emptyWorkspaces.map((workspace) => (
            <EmptyWorkspaceRow key={workspace.workspaceKey} workspace={workspace} />
          ))}
        </>
      ) : null}
    </View>
  );
});

function PinnedSection({
  chats,
  selectedKey,
}: {
  chats: AggregatedAgent[];
  selectedKey: string | null;
}) {
  const { t } = useTranslation();
  const pinnedCollapsed = useSidebarCollapsedSectionsStore((state) => state.collapsedPinned);
  const togglePinned = useSidebarCollapsedSectionsStore((state) => state.togglePinnedCollapsed);
  const { sort, order, setSort } = useSectionSort(CHAT_SECTION.pinned);
  const ordered = useMemo(() => orderSectionChats(chats, sort, order), [chats, order, sort]);
  const collapsed = pinnedCollapsed || chats.length === 0;
  return (
    <>
      <ChatSectionHeader
        title={t("sidebar.pinned.title")}
        collapsed={collapsed}
        onToggle={chats.length > 0 ? togglePinned : undefined}
        sort={sort}
        onSortChange={setSort}
        testID="desktop-section-pinned"
      />
      {collapsed ? null : (
        <SectionChatList
          sectionId={CHAT_SECTION.pinned}
          chats={ordered}
          sort={sort}
          selectedKey={selectedKey}
          limit={Number.POSITIVE_INFINITY}
          moreTestID="desktop-pinned-more"
        />
      )}
    </>
  );
}

function RecentSection({
  chats,
  selectedKey,
}: {
  chats: AggregatedAgent[];
  selectedKey: string | null;
}) {
  const { t } = useTranslation();
  const { collapsed, toggle } = useSectionCollapsed(CHAT_SECTION.recent);
  const { sort, order, setSort } = useSectionSort(CHAT_SECTION.recent);
  const ordered = useMemo(() => orderSectionChats(chats, sort, order), [chats, order, sort]);
  return (
    <>
      <ChatSectionHeader
        title={t("agentList.dateSections.recent")}
        collapsed={collapsed}
        onToggle={toggle}
        sort={sort}
        onSortChange={setSort}
        testID="desktop-section-recent"
      />
      {collapsed ? null : (
        <SectionChatList
          sectionId={CHAT_SECTION.recent}
          chats={ordered}
          sort={sort}
          selectedKey={selectedKey}
          limit={10}
          moreTestID="desktop-recent-more"
        />
      )}
    </>
  );
}

function projectKeyExtractor(entry: DesktopChatProject): string {
  return entry.project.viewKey;
}

function ProjectsSection({
  projects,
  selectedKey,
  onAddProject,
}: {
  projects: DesktopChatProject[];
  selectedKey: string | null;
  onAddProject: () => void;
}) {
  const { t } = useTranslation();
  const { collapsed, toggle } = useSectionCollapsed(CHAT_SECTION.projects);
  const { sort, setSort } = useSectionSort(CHAT_SECTION.projects);
  const ordered = useMemo(() => orderSectionProjects(projects, sort), [projects, sort]);
  const getProjectOrder = useSidebarOrderStore((state) => state.getProjectOrder);
  const setProjectOrder = useSidebarOrderStore((state) => state.setProjectOrder);
  // Manual order is the sidebar's shared project order, so both sidebars agree on it.
  const handleDragEnd = useCallback(
    (reordered: DesktopChatProject[]) => {
      const reorderedVisibleKeys = reordered.map(projectKeyExtractor);
      const currentOrder = getProjectOrder();
      if (!hasVisibleOrderChanged({ currentOrder, reorderedVisibleKeys })) return;
      setProjectOrder(mergeWithRemainder({ currentOrder, reorderedVisibleKeys }));
    },
    [getProjectOrder, setProjectOrder],
  );
  const renderProject = useCallback(
    ({ item, dragHandleProps }: DraggableRenderItemInfo<DesktopChatProject>) => (
      <ChatProject entry={item} selectedKey={selectedKey} dragHandleProps={dragHandleProps} />
    ),
    [selectedKey],
  );
  const addProject = useMemo(
    () => (
      <HeaderToggleButton
        onPress={onAddProject}
        tooltipLabel={t("sidebar.actions.addProject")}
        tooltipKeys={[]}
        tooltipSide="top"
        accessibilityRole="button"
        accessibilityLabel={t("sidebar.actions.addProject")}
        testID="desktop-section-projects-add"
      >
        <PlusIcon size={16} uniProps={mutedIcon} />
      </HeaderToggleButton>
    ),
    [onAddProject, t],
  );
  const list =
    sort === "manual" ? (
      <DraggableList
        testID="desktop-section-list-projects"
        data={ordered}
        keyExtractor={projectKeyExtractor}
        renderItem={renderProject}
        onDragEnd={handleDragEnd}
        scrollEnabled={false}
        useDragHandle
      />
    ) : (
      ordered.map((entry) => (
        <ChatProject key={entry.project.viewKey} entry={entry} selectedKey={selectedKey} />
      ))
    );
  return (
    <>
      <ChatSectionHeader
        title={t("desktopChat.sections.projects")}
        collapsed={collapsed}
        onToggle={toggle}
        sort={sort}
        onSortChange={setSort}
        actions={addProject}
        testID="desktop-section-projects"
      />
      {collapsed ? null : list}
    </>
  );
}

function ChatSidebarList({ onAddProject }: { onAddProject: () => void }) {
  const { t } = useTranslation();
  const { projects, allProjects } = useSidebarModel();
  const { agents } = useAggregatedAgents({ demand: false });
  const selected = useActiveDesktopChat();
  const selectedKey = selected ? `${selected.serverId}:${selected.agentId}` : null;
  const model = useMemo(() => buildDesktopChatSidebar({ projects, agents }), [projects, agents]);
  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={styles.listContent}
      testID="sidebar-project-list"
    >
      <PinnedSection chats={model.pinned} selectedKey={selectedKey} />
      <RecentSection chats={model.recent} selectedKey={selectedKey} />
      <ProjectsSection
        projects={model.projects}
        selectedKey={selectedKey}
        onAddProject={onAddProject}
      />
      {model.projects.length === 0 ? (
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
      ) : null}
    </ScrollView>
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
  hidden: { opacity: 0 },
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
