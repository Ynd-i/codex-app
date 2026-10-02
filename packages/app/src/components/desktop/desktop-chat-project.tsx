import { memo, useCallback, useMemo, useState, type Ref } from "react";
import { router } from "expo-router";
import { FolderOpen, List, MoreHorizontal, Settings2, SquarePen } from "lucide-react-native";
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
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  type MenuPageDefinition,
} from "@/components/ui/dropdown-menu";
import type { SidebarWorkspacePlacement } from "@/hooks/use-sidebar-workspaces-list";
import { openProjectSettings } from "@/navigation/settings-navigation";
import { navigateToWorkspace } from "@/stores/navigation-active-workspace-store";
import { useSidebarCollapsedSectionsStore } from "@/stores/sidebar-collapsed-sections-store";
import type { Theme } from "@/styles/theme";
import { buildNewWorkspaceRoute } from "@/utils/host-routes";
import type { DesktopChatProject } from "./desktop-chat-model";
import { SectionChatList } from "./desktop-chat-section-list";
import { useSectionMovePage } from "./desktop-chat-section-menus";
import { useChatSectionsStore } from "./desktop-chat-sections-store";

const FolderIcon = withUnistyles(FolderOpen);
const NewChatIcon = withUnistyles(SquarePen);
const MoreIcon = withUnistyles(MoreHorizontal);
const EditIcon = withUnistyles(Settings2);
const SectionIcon = withUnistyles(List);
const mutedIcon = (theme: Theme) => ({ color: theme.colors.foregroundMuted });
const editLeading = <EditIcon size={16} uniProps={mutedIcon} />;
const sectionLeading = <SectionIcon size={16} uniProps={mutedIcon} />;

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

/** The project menu's items, shared by the `…` button and a right click on the project. */
function ProjectMenuItems({ onEdit, sectionPage }: { onEdit: () => void; sectionPage: string }) {
  const { t } = useTranslation();
  return (
    <>
      <DropdownMenuItem onSelect={onEdit} leading={editLeading}>
        {t("desktopChat.sections.edit")}
      </DropdownMenuItem>
      <DropdownMenuSubTrigger id={sectionPage} leading={sectionLeading}>
        {t("desktopChat.sections.section")}
      </DropdownMenuSubTrigger>
    </>
  );
}

function ProjectActions({
  viewKey,
  revealed,
  disabled,
  menuOpen,
  onMenuOpenChange,
  pages,
  sectionPage,
  onEdit,
  onCreate,
  onEnter,
  onLeave,
}: {
  viewKey: string;
  revealed: boolean;
  disabled: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  pages: MenuPageDefinition[];
  sectionPage: string;
  onEdit: () => void;
  onCreate: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.projectActions, !revealed && styles.hidden]}>
      <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
        <DropdownMenuTrigger
          onFocus={onEnter}
          onBlur={onLeave}
          disabled={disabled}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={t("desktopChat.sections.actions")}
          testID={`desktop-project-menu-${viewKey}`}
        >
          <MoreIcon size={16} uniProps={mutedIcon} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" width={200} pages={pages}>
          <ProjectMenuItems onEdit={onEdit} sectionPage={sectionPage} />
        </DropdownMenuContent>
      </DropdownMenu>
      <HeaderToggleButton
        onPress={onCreate}
        onFocus={onEnter}
        onBlur={onLeave}
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
  const section = useChatSectionsStore((state) => state.projectSection[project.viewKey]);
  const moveProject = useChatSectionsStore((state) => state.moveProject);
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const enter = useCallback(() => setHovered(true), []);
  const leave = useCallback(() => setHovered(false), []);
  const toggle = useCallback(
    () => toggleCollapsed(project.viewKey),
    [project.viewKey, toggleCollapsed],
  );
  const move = useCallback(
    (sectionId: string | null) => moveProject(project.viewKey, sectionId),
    [moveProject, project.viewKey],
  );
  const sectionPage = useSectionMovePage(`project-section-${project.viewKey}`, section, move);
  const pages = useMemo(() => [sectionPage], [sectionPage]);
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
  const accessibilityState = useMemo(() => ({ expanded: !collapsed }), [collapsed]);
  // A manually ordered project list drags by the header; dnd-kit's role would replace its button.
  const {
    role: _dragRole,
    tabIndex: _dragTabIndex,
    "aria-roledescription": _dragRoleDescription,
    ...dragAttributes
  } = dragHandleProps?.attributes ?? {};
  const revealed = hovered || menuOpen || contextOpen;
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
            <ProjectActions
              viewKey={project.viewKey}
              revealed={revealed}
              disabled={!target}
              menuOpen={menuOpen}
              onMenuOpenChange={setMenuOpen}
              pages={pages}
              sectionPage={sectionPage.id}
              onEdit={edit}
              onCreate={create}
              onEnter={enter}
              onLeave={leave}
            />
          </View>
        </ContextMenuTrigger>
        <ContextMenuContent width={200} pages={pages}>
          <ProjectMenuItems onEdit={edit} sectionPage={sectionPage.id} />
        </ContextMenuContent>
      </ContextMenu>
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
