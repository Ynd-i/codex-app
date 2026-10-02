import type { StreamItem } from "@/types/stream";
import { SPACING } from "@/styles/theme";
import type { MarkdownBlockKind } from "@/utils/split-markdown-blocks";

// Lists and code cards add their own 4px and 12px top margins; together these match
// the reference's 4px paragraph-list, 6px list-paragraph and 16px paragraph-code gaps.
function getMacMarkdownGap(before?: MarkdownBlockKind, after?: MarkdownBlockKind): number {
  if (before === "paragraph" && after === "list") return SPACING[0];
  if (before === "list" && after === "paragraph") return SPACING[1.5];
  if (before === "paragraph" && after === "code") return SPACING[1];
  return SPACING[3];
}

export function isSameAssistantBlockGroup(params: {
  item: StreamItem | null | undefined;
  other: StreamItem | null | undefined;
}): boolean {
  return (
    params.item?.kind === "assistant_message" &&
    params.other?.kind === "assistant_message" &&
    params.item.blockGroupId !== undefined &&
    params.item.blockGroupId === params.other.blockGroupId
  );
}

export function getAssistantBlockSpacing(params: {
  item: StreamItem;
  aboveItem: StreamItem | null | undefined;
  belowItem: StreamItem | null | undefined;
  hasFooterBelow?: boolean;
}): "default" | "compactTop" | "compactBottom" | "compactBoth" {
  if (params.item.kind !== "assistant_message") {
    return "default";
  }
  const compactTop = isSameAssistantBlockGroup({ item: params.item, other: params.aboveItem });
  const compactBottom =
    params.hasFooterBelow ||
    isSameAssistantBlockGroup({ item: params.item, other: params.belowItem });
  if (compactTop && compactBottom) return "compactBoth";
  if (compactTop) return "compactTop";
  if (compactBottom) return "compactBottom";
  return "default";
}

const isUserMessageItem = (item?: StreamItem | null) => item?.kind === "user_message";
const isToolSequenceItem = (item?: StreamItem | null) =>
  item?.kind === "tool_call" || item?.kind === "thought" || item?.kind === "todo_list";

export function getGapBetweenStreamItems(
  item: StreamItem | null,
  belowItem: StreamItem | null,
  isMac = false,
): number {
  if (!item || !belowItem) {
    return 0;
  }

  if (isUserMessageItem(item) && isUserMessageItem(belowItem)) {
    return SPACING[1];
  }
  if (item.kind === "user_message" && belowItem.kind === "assistant_message") {
    return 0;
  }
  if (isToolSequenceItem(item) && isToolSequenceItem(belowItem)) {
    return 0;
  }
  if (item.kind === "user_message" && isToolSequenceItem(belowItem)) {
    return SPACING[4];
  }
  if (item.kind === "assistant_message" && isToolSequenceItem(belowItem)) {
    return SPACING[1];
  }
  if (isToolSequenceItem(item) && belowItem.kind === "assistant_message") {
    return SPACING[1];
  }
  if (isSameAssistantBlockGroup({ item, other: belowItem })) {
    if (isMac && item.kind === "assistant_message" && belowItem.kind === "assistant_message") {
      return getMacMarkdownGap(item.blockKind, belowItem.blockKind);
    }
    return SPACING[3];
  }
  return SPACING[4];
}
