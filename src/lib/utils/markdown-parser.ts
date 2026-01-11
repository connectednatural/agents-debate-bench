/**
 * Markdown Custom Key Parser
 * Parses custom rendering keys from markdown content:
 * - _Table{col1:type,col2:type}
 * - _Poll{opt1,opt2,opt3}
 * - _Score{axis:opt1=N,opt2=N}
 */

export type TableColumnType = "string" | "number" | "boolean";

export interface ParsedTableColumn {
  name: string;
  type: TableColumnType;
}

export interface ParsedTable {
  type: "table";
  columns: ParsedTableColumn[];
  raw: string;
}

export interface ParsedPoll {
  type: "poll";
  options: string[];
  raw: string;
}

export interface ParsedScoreEntry {
  option: string;
  score: number;
}

export interface ParsedScore {
  type: "score";
  axis: string;
  scores: ParsedScoreEntry[];
  raw: string;
}

export interface ParsedText {
  type: "text";
  content: string;
}

export type ParsedBlock = ParsedTable | ParsedPoll | ParsedScore | ParsedText;

// Regex patterns for custom keys
const TABLE_PATTERN = /_Table\{([^}]+)\}/g;
const POLL_PATTERN = /_Poll\{([^}]+)\}/g;
const SCORE_PATTERN = /_Score\{([^}]+)\}/g;

/**
 * Parse a _Table{col1:type,col2:type} syntax
 */
export function parseTableKey(content: string): ParsedTableColumn[] {
  const columns: ParsedTableColumn[] = [];
  const parts = content.split(",").map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    const colonIndex = part.lastIndexOf(":");
    if (colonIndex === -1) {
      // Default to string type if no type specified
      columns.push({ name: part, type: "string" });
    } else {
      const name = part.slice(0, colonIndex).trim();
      const typeStr = part.slice(colonIndex + 1).trim().toLowerCase();
      const type: TableColumnType =
        typeStr === "number" ? "number" :
        typeStr === "boolean" ? "boolean" :
        "string";
      columns.push({ name, type });
    }
  }

  return columns;
}

/**
 * Parse a _Poll{opt1,opt2,opt3} syntax
 */
export function parsePollKey(content: string): string[] {
  return content.split(",").map((opt) => opt.trim()).filter(Boolean);
}

/**
 * Parse a _Score{axis:opt1=N,opt2=N} syntax
 */
export function parseScoreKey(content: string): { axis: string; scores: ParsedScoreEntry[] } {
  const colonIndex = content.indexOf(":");
  if (colonIndex === -1) {
    return { axis: content.trim(), scores: [] };
  }

  const axis = content.slice(0, colonIndex).trim();
  const scoresStr = content.slice(colonIndex + 1).trim();
  const scores: ParsedScoreEntry[] = [];

  const scoreParts = scoresStr.split(",").map((p) => p.trim()).filter(Boolean);
  for (const part of scoreParts) {
    const eqIndex = part.indexOf("=");
    if (eqIndex !== -1) {
      const option = part.slice(0, eqIndex).trim();
      const scoreValue = parseInt(part.slice(eqIndex + 1).trim(), 10);
      if (!isNaN(scoreValue)) {
        scores.push({ option, score: scoreValue });
      }
    }
  }

  return { axis, scores };
}

/**
 * Parse markdown content and extract all custom keys with their positions
 */
export function parseMarkdownCustomKeys(markdown: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  
  // Collect all matches with their positions
  interface Match {
    type: "table" | "poll" | "score";
    start: number;
    end: number;
    raw: string;
    content: string;
  }
  
  const matches: Match[] = [];

  // Find all _Table matches
  let match: RegExpExecArray | null;
  const tableRegex = new RegExp(TABLE_PATTERN.source, "g");
  while ((match = tableRegex.exec(markdown)) !== null) {
    matches.push({
      type: "table",
      start: match.index,
      end: match.index + match[0].length,
      raw: match[0],
      content: match[1],
    });
  }

  // Find all _Poll matches
  const pollRegex = new RegExp(POLL_PATTERN.source, "g");
  while ((match = pollRegex.exec(markdown)) !== null) {
    matches.push({
      type: "poll",
      start: match.index,
      end: match.index + match[0].length,
      raw: match[0],
      content: match[1],
    });
  }

  // Find all _Score matches
  const scoreRegex = new RegExp(SCORE_PATTERN.source, "g");
  while ((match = scoreRegex.exec(markdown)) !== null) {
    matches.push({
      type: "score",
      start: match.index,
      end: match.index + match[0].length,
      raw: match[0],
      content: match[1],
    });
  }

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);

  // Build blocks array with text segments between custom keys
  let lastEnd = 0;

  for (const m of matches) {
    // Add text block before this match if there's content
    if (m.start > lastEnd) {
      const textContent = markdown.slice(lastEnd, m.start);
      if (textContent.trim()) {
        blocks.push({ type: "text", content: textContent });
      }
    }

    // Add the parsed custom key block
    switch (m.type) {
      case "table":
        blocks.push({
          type: "table",
          columns: parseTableKey(m.content),
          raw: m.raw,
        });
        break;
      case "poll":
        blocks.push({
          type: "poll",
          options: parsePollKey(m.content),
          raw: m.raw,
        });
        break;
      case "score":
        const { axis, scores } = parseScoreKey(m.content);
        blocks.push({
          type: "score",
          axis,
          scores,
          raw: m.raw,
        });
        break;
    }

    lastEnd = m.end;
  }

  // Add remaining text after last match
  if (lastEnd < markdown.length) {
    const textContent = markdown.slice(lastEnd);
    if (textContent.trim()) {
      blocks.push({ type: "text", content: textContent });
    }
  }

  // If no custom keys found, return the whole content as text
  if (blocks.length === 0 && markdown.trim()) {
    blocks.push({ type: "text", content: markdown });
  }

  return blocks;
}

/**
 * Extract only custom key blocks (no text blocks)
 */
export function extractCustomKeys(markdown: string): (ParsedTable | ParsedPoll | ParsedScore)[] {
  return parseMarkdownCustomKeys(markdown).filter(
    (block): block is ParsedTable | ParsedPoll | ParsedScore => block.type !== "text"
  );
}

/**
 * Check if markdown contains any custom keys
 */
export function hasCustomKeys(markdown: string): boolean {
  return TABLE_PATTERN.test(markdown) || 
         POLL_PATTERN.test(markdown) || 
         SCORE_PATTERN.test(markdown);
}
