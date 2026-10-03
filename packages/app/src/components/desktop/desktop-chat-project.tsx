import { memo, useCallback, useMemo, useState, type ReactNode, type Ref } from "react";
import { router } from "expo-router";
import {
  Archive,
  FolderOpen,
  List,
  MoreHorizontal,
  Pin,
  PinOff,
  Settings2,
  SquarePen,
  X,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import type { DraggableListDragHandleProps } from "@/components/draggable-list.types";
import { HeaderToggleButton } from "@/components/headers/header-toggle-button";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  type MenuPageDefinition,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/contexts/toast-context";
import { useLocalDaemonServerId } from "@/hooks/use-is-local-daemon";
import type {
  SidebarProjectEntry,
  SidebarWorkspacePlacement,
} from "@/hooks/use-sidebar-workspaces-list";
import { openProjectSettings } from "@/navigation/settings-navigation";
import {
  getCurrentProjectRemoveReadiness,
  removeProjectFromHosts,
} from "@/projects/project-remove";
import { getHostRuntimeStore } from "@/runtime/host-runtime";
import { navigateToWorkspace } from "@/stores/navigation-active-workspace-store";
import { useSidebarCollapsedSectionsStore } from "@/stores/sidebar-collapsed-sections-store";
import type { Theme } from "@/styles/theme";
import { confirmDialog } from "@/utils/confirm-dialog";
import { buildNewWorkspaceRoute } from "@/utils/host-routes";
import { resolveSidebarProjectLocalPath } from "@/utils/sidebar-project-row-model";
import { OpenInFileManagerMenuItem } from "@/workspace/open-in-file-manager/menu-item";
import type { DesktopChatProject } from "./desktop-chat-model";
import { SectionChatList } from "./desktop-chat-section-list";
import { useArchiveChats, useSectionMovePage } from "./desktop-chat-section-menus";
import { useChatSectionsStore } from "./desktop-chat-sections-store";

const FolderIcon = withUnistyles(FolderOpen);
const NewChatIcon = withUnistyles(SquarePen);
const MoreIcon = withUnistyles(MoreHorizontal);
const EditIcon = withUnistyles(Settings2);
const SectionIcon = withUnistyles(List);
const PinIcon = withUnistyles(Pin);
const UnpinIcon = withUnistyles(PinOff);
const ArchiveIcon = withUnistyles(Archive);
const RemoveIcon = withUnistyles(X);
const mutedIcon = (theme: Theme) => ({ color: theme.colors.foregroundMuted });
const editLeading = <EditIcon size={16} uniProps={mutedIcon} />;
const sectionLeading = <SectionIcon size={16} uniProps={mutedIcon} />;
const pinLeading = <PinIcon size={16} uniProps={mutedIcon} />;
const unpinLeading = <UnpinIcon size={16} uniProps={mutedIcon} />;
const archiveLeading = <ArchiveIcon size={16} uniProps={mutedIcon} />;
const removeLeading = <RemoveIcon size={16} uniProps={mutedIcon} />;

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

/** Removes the project from every host it is on, after the same confirmation as the workspace sidebar. */
function useRemoveProject(project: SidebarProjectEntry) {
  const { t } = useTranslation();
  const toast = useToast();
  const [removing, setRemoving] = useState(false);
  const remove = useCallback(() => {
    if (removing) return;
    void (async () => {
      const confirmed = await confirmDialog({
        title: t("sidebar.project.confirmations.removeTitle"),
        message: t("sidebar.project.confirmations.removeMessage", {
          projectName: project.projectName,
        }),
        confirmLabel: t("sidebar.project.confirmations.removeConfirm"),
        cancelLabel: t("sidebar.project.confirmations.cancel"),
        destructive: true,
      });
      if (!confirmed) return;
      const readiness = getCurrentProjectRemoveReadiness({ hosts: project.hosts });
      if (readiness.kind === "needs_host_update") {
        toast.error(t("sidebar.project.toasts.updateHostToRemove"));
        return;
      }
      setRemoving(true);
      try {
        const outcome = await removeProjectFromHosts({
          targets: readiness.targets,
          getClient: (serverId) => getHostRuntimeStore().getClient(serverId),
        });
        if (outcome.kind === "host_disconnected")
          toast.error(t("sidebar.project.toasts.hostDisconnected"));
        else if (outcome.kind === "failed") toast.error(t("sidebar.project.toasts.removeFailed"));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("sidebar.project.toasts.removeFailed"),
        );
      } finally {
        setRemoving(false);
      }
    })();
  }, [project.hosts, project.projectName, removing, t, toast]);
  return { remove, removing };
}

/** The project menu in the reference's order, shared by the `…` button and a right click. */
function useProjectMenu(entry: DesktopChatProject, onEdit: () => void) {
  const { t } = useTranslation();
  const { project, chats } = entry;
  const section = useChatSectionsStore((state) => state.projectSection[project.viewKey]);
  const moveProject = useChatSectionsStore((state) => state.moveProject);
  const pinned = useChatSectionsStore((state) => state.pinnedProjects.includes(project.viewKey));
  const togglePinnedProject = useChatSectionsStore((state) => state.togglePinnedProject);
  const localServerId = useLocalDaemonServerId();
  const projectPath = resolveSidebarProjectLocalPath(project, localServerId);
  const move = useCallback(
    (sectionId: string | null) => moveProject(project.viewKey, sectionId),
    [moveProject, project.viewKey],
  );
  const togglePin = useCallback(
    () => togglePinnedProject(project.viewKey),
    [project.viewKey, togglePinnedProject],
  );
  const archiveChats = useArchiveChats(
    chats,
    t("desktopChat.sections.archiveProjectConfirm", { count: chats.length }),
  );
  const { remove, removing } = useRemoveProject(project);
  const sectionPage = useSectionMovePage(`project-section-${project.viewKey}`, section, move);
  const pages = useMemo(() => [sectionPage], [sectionPage]);
  const items = useMemo(
    () => (
      <>
        <DropdownMenuItem
          onSelect={togglePin}
          leading={pinned ? unpinLeading : pinLeading}
          testID={`desktop-project-pin-${project.viewKey}`}
        >
          {t(pinned ? "sidebar.workspace.actions.unpin" : "sidebar.workspace.actions.pin")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onEdit} leading={editLeading}>
          {t("desktopChat.sections.edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSubTrigger id={sectionPage.id} leading={sectionLeading}>
          {t("desktopChat.sections.section")}
        </DropdownMenuSubTrigger>
        <OpenInFileManagerMenuItem
          path={projectPath}
          label={t("desktopChat.sections.revealInFinder")}
          testID={`desktop-project-reveal-${project.viewKey}`}
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={archiveChats}
          leading={archiveLeading}
          disabled={chats.length === 0}
          testID={`desktop-project-archive-${project.viewKey}`}
        >
          {t("desktopChat.sections.archiveChats")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={remove}
          leading={removeLeading}
          status={removing ? "pending" : undefined}
          pendingLabel={t("sidebar.project.actions.removing")}
          testID={`desktop-project-remove-${project.viewKey}`}
        >
          {t("desktopChat.sections.removeProject")}
        </DropdownMenuItem>
      </>
    ),
    [
      archiveChats,
      chats.length,
      onEdit,
      pinned,
      project.viewKey,
      projectPath,
      remove,
      removing,
      sectionPage.id,
      t,
      togglePin,
    ],
  );
  return { items, pages };
}

function ProjectActions({
  viewKey,
  revealed,
  disabled,
  menuOpen,
  onMenuOpenChange,
  pages,
  menuItems,
  onCreate,
  onFocus,
  onBlur,
}: {
  viewKey: string;
  revealed: boolean;
  disabled: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  pages: MenuPageDefinition[];
  menuItems: ReactNode;
  onCreate: () => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.projectActions, !revealed && styles.hidden]}>
      <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
        <DropdownMenuTrigger
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={t("desktopChat.sections.actions")}
          testID={`desktop-project-menu-${viewKey}`}
        >
          <MoreIcon size={16} uniProps={mutedIcon} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" width={200} pages={pages}>
          {menuItems}
        </DropdownMenuContent>
      </DropdownMenu>
      <HeaderToggleButton
        onPress={onCreate}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        tooltipLabel={t("desktopChat.newChat")}
        tooltipKeys={[]}
        tooltipSide="top"
        accessibilityRole="button"
        accessibilityLabel={t("desktopChat.newChat")}
        testID={`desktop-project-new-chat-${viewKey}`}
      >
        <NewChatIcon size={15} uniProps={mutedIcon} />
      </HeaderToggleButton>
    </View>
  );
}

export const ChatProject = memo(function ChatProject({
  entry,
  selectedKey,
  dragHandleProps,
}: {
  entry: DesktopChatProject;
  selectedKey: string | null;
  dragHandleProps?: DraggableListDragHandleProps;
}) {
  const { project, chats, emptyWorkspaces } = entry;
  const collapsed = useSidebarCollapsedSectionsStore((state) =>
    state.collapsedProjectKeys.has(project.viewKey),
  );
  const toggleCollapsed = useSidebarCollapsedSectionsStore((state) => state.toggleProjectCollapsed);
  // Merged keeps every chat in Recent, so a project shows only its own row.
  const nested = useChatSectionsStore((state) => state.organize !== "merged");
  const [hovered, setHovered] = useState(false);
  // Kept apart from hover: New chat moves focus to the composer, and that blur must not hide the
  // actions while the pointer is still on the row.
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const enter = useCallback(() => setHovered(true), []);
  const leave = useCallback(() => setHovered(false), []);
  const focus = useCallback(() => setFocused(true), []);
  const blur = useCallback(() => setFocused(false), []);
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
  const edit = useCallback(() => {
    if (target) openProjectSettings(target.serverId, target.projectId);
  }, [target]);
  const { items: menuItems, pages } = useProjectMenu(entry, edit);
  const accessibilityState = useMemo(
    () => (nested ? { expanded: !collapsed } : undefined),
    [collapsed, nested],
  );
  // A manually ordered project list drags by the header; dnd-kit's role would replace its button.
  const {
    role: _dragRole,
    tabIndex: _dragTabIndex,
    "aria-roledescription": _dragRoleDescription,
    ...dragAttributes
  } = dragHandleProps?.attributes ?? {};
  const revealed = hovered || focused || menuOpen || contextOpen;
  return (
    <View style={styles.project}>
      <ContextMenu open={contextOpen} onOpenChange={setContextOpen}>
        <ContextMenuTrigger contextOnly>
          <View
            {...dragAttributes}
            {...dragHandleProps?.listeners}
            ref={dragHandleProps?.setActivatorNodeRef as unknown as Ref<View>}
            style={[styles.projectHeader, revealed && styles.headerHovered]}
            onPointerEnter={enter}
            onPointerLeave={leave}
          >
            <Pressable
              onPress={nested ? toggle : undefined}
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
            <ProjectActions
              viewKey={project.viewKey}
              revealed={revealed}
              disabled={!target}
              menuOpen={menuOpen}
              onMenuOpenChange={setMenuOpen}
              pages={pages}
              menuItems={menuItems}
              onCreate={create}
              onFocus={focus}
              onBlur={blur}
            />
          </View>
        </ContextMenuTrigger>
        <ContextMenuContent width={200} pages={pages}>
          {menuItems}
        </ContextMenuContent>
      </ContextMenu>
      {nested && !collapsed ? (
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

const styles = StyleSheet.create((theme) => ({
  hidden: { opacity: 0 },
  project: { paddingBottom: 6 },
  projectHeader: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    paddingRight: 4,
    borderRadius: 10,
  },
  headerHovered: { backgroundColor: theme.colors.surfaceSidebarHover },
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
  actionButton: {
    width: 24,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
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
}));
