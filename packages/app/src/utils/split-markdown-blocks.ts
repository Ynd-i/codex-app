import MarkdownIt from "markdown-it";

// Only block maps are needed here; inline parsing belongs to each rendered block.
const markdownBlockParser = new MarkdownIt();
markdownBlockParser.core.ruler.disable("inline");

export type MarkdownBlockKind = "paragraph" | "list" | "code" | "other";
interface MarkdownBlock {
  text: string;
  kind: MarkdownBlockKind;
}

/**
 * Definitions render nothing and resolve nothing on their own, so a block made only of
 * them would paint an empty row and break every reference that pointed at it. Fold it
 * into the block it belongs to: the one above, or the one below when it leads.
 */
function foldLinkReferenceDefinitions(blocks: string[]): MarkdownBlock[] {
  const folded: MarkdownBlock[] = [];
  let leading: string[] = [];
  for (const block of blocks) {
    // Reuse the definition parse for layout metadata; do not reparse display rows.
    const env: { references?: Record<string, unknown> } = {};
    const tokens = markdownBlockParser.parse(block, env);
    if (tokens.length === 0 && Object.keys(env.references ?? {}).length > 0) {
      const previous = folded.at(-1);
      if (previous) previous.text += `\n\n${block}`;
      else leading.push(block);
      continue;
    }
    const roots = tokens.filter((token) => token.level === 0 && token.nesting !== -1);
    const type = roots.length === 1 ? roots[0]?.type : undefined;
    let kind: MarkdownBlockKind = "other";
    if (type === "paragraph_open") kind = "paragraph";
    else if (type === "bullet_list_open" || type === "ordered_list_open") kind = "list";
    else if (type === "fence" || type === "code_block") kind = "code";
    folded.push({ text: [...leading, block].join("\n\n"), kind });
    leading = [];
  }
  if (leading.length > 0) folded.push({ text: leading.join("\n\n"), kind: "other" });
  return folded;
}

export function splitMarkdownBlocks(text: string): string[] {
  return splitMarkdownBlocksWithKinds(text).map((block) => block.text);
}

export function splitMarkdownBlocksWithKinds(text: string): MarkdownBlock[] {
  if (text.length === 0) {
    return [];
  }

  const blocks: string[] = [];
  let currentLines: string[] = [];
  let sawBlockSeparator = false;
  const lines = text.split("\n");
  const structuralBlankLines = getStructuralBlankLines(text, lines);

  for (const [index, line] of lines.entries()) {
    const isBlankLine = line.trim().length === 0;

    if (isBlankLine && structuralBlankLines.has(index)) {
      currentLines.push(line);
      continue;
    }

    if (isBlankLine) {
      if (currentLines.length > 0) {
        sawBlockSeparator = true;
      }
      continue;
    }

    if (sawBlockSeparator) {
      blocks.push(currentLines.join("\n"));
      currentLines = [];
      sawBlockSeparator = false;
    }

    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    blocks.push(currentLines.join("\n"));
  }

  return foldLinkReferenceDefinitions(blocks.filter((block) => block.length > 0));
}

function getStructuralBlankLines(text: string, lines: string[]): Set<number> {
  const blankLines = new Set<number>();
  for (const token of markdownBlockParser.parse(text, {})) {
    if (token.level !== 0 || !token.map) {
      continue;
    }
    const [start, end] = token.map;
    for (let index = start; index < end - 1; index += 1) {
      if (lines[index]?.trim().length === 0) {
        blankLines.add(index);
      }
    }
  }
  return blankLines;
}
