import { useCallback, useMemo } from "react";
import { Archive, ArrowUpDown, CircleCheck, Plus, Settings2, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { withUnistyles } from "react-native-unistyles";
import { DraggableList } from "@/components/draggable-list";
import type { DraggableRenderItemInfo } from "@/components/draggable-list.types";
import { HeaderToggleButton } from "@/components/headers/header-toggle-button";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/contexts/toast-context";
import type { AggregatedAgent } from "@/hooks/use-aggregated-agents";
import { useArchiveAgent } from "@/hooks/use-archive-agent";
import { useSidebarCollapsedSectionsStore } from "@/stores/sidebar-collapsed-sections-store";
import { useSidebarOrderStore } from "@/stores/sidebar-order-store";
import type { Theme } from "@/styles/theme";
import { confirmDialog } from "@/utils/confirm-dialog";
import { hasVisibleOrderChanged, mergeWithRemainder } from "@/utils/sidebar-reorder";
import {
  isDesktopChatUnread,
  orderSectionChats,
  orderSectionProjects,
  type CustomChatSection,
  type DesktopChatProject,
} from "./desktop-chat-model";
import { ChatProject } from "./desktop-chat-project";
import { ChatSectionHeader } from "./desktop-chat-section-header";
import { SectionChatList } from "./desktop-chat-section-list";
import { useSectionDialogs } from "./desktop-chat-section-menus";
import {
  CHAT_SECTION,
  useChatSectionsStore,
  useSectionCollapsed,
  useSectionSort,
} from "./desktop-chat-sections-store";
import { useDesktopChatMutation } from "./use-desktop-chat";

const PlusIcon = withUnistyles(Plus);
const EditIcon = withUnistyles(Settings2);
const ReadIcon = withUnistyles(CircleCheck);
const ArchiveIcon = withUnistyles(Archive);
const RemoveIcon = withUnistyles(X);
const SortIcon = withUnistyles(ArrowUpDown);
const mutedIcon = (theme: Theme) => ({ color: theme.colors.foregroundMuted });
const newLeading = <PlusIcon size={16} uniProps={mutedIcon} />;
const editLeading = <EditIcon size={16} uniProps={mutedIcon} />;
const readLeading = <ReadIcon size={16} uniProps={mutedIcon} />;
const archiveLeading = <ArchiveIcon size={16} uniProps={mutedIcon} />;
const removeLeading = <RemoveIcon size={16} uniProps={mutedIcon} />;
const sortLeading = <SortIcon size={16} uniProps={mutedIcon} />;

export function PinnedSection({
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

export function RecentSection({
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
  const hideProjects = useChatSectionsStore((state) => state.hideProjects);
  const setHideProjects = useChatSectionsStore((state) => state.setHideProjects);
  const dialogs = useSectionDialogs();
  const toggleProjects = useCallback(
    () => setHideProjects(!hideProjects),
    [hideProjects, setHideProjects],
  );
  const createSection = useCallback(() => dialogs?.create(), [dialogs]);
  const sortLatest = useCallback(() => setSort("latest"), [setSort]);
  const sortManual = useCallback(() => setSort("manual"), [setSort]);
  // The right-click menu of the reference's Recent title; its Organize page has no reference yet.
  const contextMenu = useMemo(
    () => ({
      pages: [
        {
          id: "recent-chat-sort",
          title: t("desktopChat.sections.chatSort"),
          content: (
            <>
              <DropdownMenuItem selected={sort === "latest"} onSelect={sortLatest}>
                {t("desktopChat.sections.sortLatest")}
              </DropdownMenuItem>
              <DropdownMenuItem selected={sort === "manual"} onSelect={sortManual}>
                {t("desktopChat.sections.sortManual")}
              </DropdownMenuItem>
            </>
          ),
        },
      ],
      items: (
        <>
          <DropdownMenuSubTrigger id="recent-chat-sort" leading={sortLeading}>
            {t("desktopChat.sections.chatSort")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("desktopChat.sections.show")}</DropdownMenuLabel>
          <DropdownMenuItem
            selected={!hideProjects}
            showSelectedCheck
            onSelect={toggleProjects}
            testID="desktop-section-recent-show-projects"
          >
            {t("desktopChat.sections.projects")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            leading={newLeading}
            onSelect={createSection}
            testID="desktop-section-recent-new-section"
          >
            {t("desktopChat.sections.newSection")}
          </DropdownMenuItem>
        </>
      ),
    }),
    [createSection, hideProjects, sort, sortLatest, sortManual, t, toggleProjects],
  );
  return (
    <>
      <ChatSectionHeader
        title={t("agentList.dateSections.recent")}
        collapsed={collapsed}
        onToggle={toggle}
        sort={sort}
        onSortChange={setSort}
        contextMenu={contextMenu}
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

/** A user-created section: its chats, then the projects moved into it. */
export function CustomSection({
  section,
  selectedKey,
}: {
  section: CustomChatSection;
  selectedKey: string | null;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const dialogs = useSectionDialogs();
  const removeSection = useChatSectionsStore((state) => state.removeSection);
  const { collapsed, toggle } = useSectionCollapsed(section.id);
  const { sort, order, setSort } = useSectionSort(section.id);
  const chats = useMemo(
    () => orderSectionChats(section.chats, sort, order),
    [order, section.chats, sort],
  );
  const projects = useMemo(
    () => orderSectionProjects(section.projects, sort),
    [section.projects, sort],
  );
  const { update } = useDesktopChatMutation();
  const { archiveAgent } = useArchiveAgent();
  const hasUnread = section.chats.some(isDesktopChatUnread);
  const edit = useCallback(
    () => dialogs?.edit({ id: section.id, name: section.name }),
    [dialogs, section.id, section.name],
  );
  const createSection = useCallback(() => dialogs?.create(), [dialogs]);
  const remove = useCallback(() => removeSection(section.id), [removeSection, section.id]);
  const markAllRead = useCallback(() => {
    for (const agent of section.chats)
      if (isDesktopChatUnread(agent)) void update(agent, { kind: "read" }).catch(() => {});
  }, [section.chats, update]);
  const archiveChats = useCallback(() => {
    void (async () => {
      const confirmed = await confirmDialog({
        title: t("desktopChat.sections.archiveChats"),
        message: t("desktopChat.sections.archiveConfirm", { count: section.chats.length }),
        confirmLabel: t("agentList.archiveSheet.archive"),
        cancelLabel: t("common.actions.cancel"),
        destructive: true,
      });
      if (!confirmed) return;
      for (const agent of section.chats)
        await archiveAgent({ serverId: agent.serverId, agentId: agent.id });
    })().catch((error) => toast.error(error instanceof Error ? error.message : String(error)));
  }, [archiveAgent, section.chats, t, toast]);
  const contextMenu = useMemo(
    () => ({
      items: (
        <>
          <DropdownMenuItem onSelect={edit} leading={editLeading}>
            {t("desktopChat.sections.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={markAllRead} leading={readLeading} disabled={!hasUnread}>
            {t("desktopChat.sections.markAllRead")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={archiveChats}
            leading={archiveLeading}
            disabled={section.chats.length === 0}
          >
            {t("desktopChat.sections.archiveChats")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={createSection} leading={newLeading}>
            {t("desktopChat.sections.newSection")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={remove}
            leading={removeLeading}
            testID={`desktop-section-${section.id}-remove`}
          >
            {t("desktopChat.sections.removeSection")}
          </DropdownMenuItem>
        </>
      ),
    }),
    [archiveChats, createSection, edit, hasUnread, markAllRead, remove, section, t],
  );
  return (
    <>
      <ChatSectionHeader
        title={section.name}
        collapsed={collapsed}
        onToggle={toggle}
        sort={sort}
        onSortChange={setSort}
        contextMenu={contextMenu}
        testID={`desktop-section-${section.id}`}
      />
      {collapsed ? null : (
        <>
          <SectionChatList
            sectionId={section.id}
            chats={chats}
            sort={sort}
            selectedKey={selectedKey}
            limit={10}
            moreTestID={`desktop-section-${section.id}-more`}
          />
          {projects.map((entry) => (
            <ChatProject key={entry.project.viewKey} entry={entry} selectedKey={selectedKey} />
          ))}
        </>
      )}
    </>
  );
}

function projectKeyExtractor(entry: DesktopChatProject): string {
  return entry.project.viewKey;
}

export function ProjectsSection({
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
