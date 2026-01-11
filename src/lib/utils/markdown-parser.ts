/**
 * Markdown Custom Key Parser
 * Parses custom rendering keys from markdown content:
 * - _Table{col1:type,col2:type}
 * - _Poll{opt1,opt2,opt3}
 * - _Score{axis:opt1=N,opt2=N}
 * Also parses standard markdown tables
 */

export type TableColumnType = "string" | "number" | "boolean";

export interface ParsedTableColumn {
  name: string;
  type: TableColumnType;
}

export interface ParsedTable {
  type: "table";
  columns: ParsedTableColumn[];
  rows: Record<string, string | number>[];
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

// Regex pattern for standard markdown tables (requires header, separator, and at least one row with pipes)
const MARKDOWN_TABLE_PATTERN = /^\s*\|?.+\|.+\r?\n\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*\r?\n(?:\s*\|?.+\|.+\r?\n?)+/gm;

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
 * Parse a standard markdown table into columns and rows
 */
export function parseMarkdownTable(tableStr: string): { columns: ParsedTableColumn[]; rows: Record<string, string | number>[] } {
  const lines = tableStr.trim().split(/[\r\n]+/).filter(line => line.trim());

  if (lines.length < 2) {
    return { columns: [], rows: [] };
  }

  const normalizeRow = (line: string): string[] => {
    const trimmed = line.trim();
    if (!trimmed) return [];
    if (!trimmed.includes("|")) return [];
    const hasLeading = trimmed.startsWith("|");
    const hasTrailing = trimmed.endsWith("|");
    let content = trimmed;
    if (hasLeading) content = content.slice(1);
    if (hasTrailing) content = content.slice(0, -1);
    return content.split("|").map((cell) => cell.trim());
  };

  // Parse header row
  const headerLine = lines[0];
  const headers = normalizeRow(headerLine).filter((h) => h.length > 0);

  // Create columns - default to string, infer number as we parse rows
  const columns: ParsedTableColumn[] = headers.map((name) => ({
    name,
    type: "string" as TableColumnType,
  }));

  // Skip separator line (index 1) and parse data rows
  const rows: Record<string, string | number>[] = [];

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cells = normalizeRow(line);
    if (cells.length === 0) continue;

    const row: Record<string, string | number> = {};
    headers.forEach((header, idx) => {
      const cellValue = cells[idx] ?? "";
      const numValue = parseFloat(cellValue);
      if (!isNaN(numValue) && cellValue.match(/^-?\d+\.?\d*$/)) {
        row[header] = numValue;
        if (columns[idx]) {
          columns[idx].type = "number";
        }
      } else {
        row[header] = cellValue;
      }
    });
    rows.push(row);
  }

  return { columns, rows };
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
    type: "table" | "poll" | "score" | "md-table";
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

  // Find all standard markdown tables
  const mdTableRegex = new RegExp(MARKDOWN_TABLE_PATTERN.source, "gm");
  while ((match = mdTableRegex.exec(markdown)) !== null) {
    matches.push({
      type: "md-table",
      start: match.index,
      end: match.index + match[0].length,
      raw: match[0],
      content: match[0],
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

  // Remove overlapping matches (prefer custom _Table over md-table)
  const filteredMatches: Match[] = [];
  for (const m of matches) {
    const overlaps = filteredMatches.some(
      existing => (m.start >= existing.start && m.start < existing.end) ||
                  (m.end > existing.start && m.end <= existing.end)
    );
    if (!overlaps) {
      filteredMatches.push(m);
    }
  }

  // Build blocks array with text segments between custom keys
  let lastEnd = 0;

  for (let i = 0; i < filteredMatches.length; i++) {
    const m = filteredMatches[i];

    // Add text block before this match if there's content
    if (m.start > lastEnd) {
      const textContent = markdown.slice(lastEnd, m.start);
      if (textContent.trim()) {
        blocks.push({ type: "text", content: textContent });
      }
    }

    // Merge _Table with immediately following markdown table (if present)
    if (m.type === "table") {
      const next = filteredMatches[i + 1];
      const between = markdown.slice(m.end, next?.start ?? m.end);
      const isNextMdTable = next?.type === "md-table" && between.trim() === "";

      if (isNextMdTable && next) {
        const typedColumns = parseTableKey(m.content);
        const { columns: mdColumns, rows: mdRows } = parseMarkdownTable(next.content);

        if (mdRows.length === 0 || mdColumns.length === 0) {
          blocks.push({
            type: "table",
            columns: typedColumns,
            rows: [],
            raw: m.raw,
          });
          lastEnd = m.end;
          continue;
        }

        const mergedColumns = typedColumns.map((col, idx) => ({
          ...col,
          name: mdColumns[idx]?.name ?? col.name,
        }));

        const mergedRows = mdRows.map((row) => {
          const mergedRow: Record<string, string | number> = {};
          mergedColumns.forEach((col, idx) => {
            if (mdColumns[idx] && row[mdColumns[idx].name] !== undefined) {
              mergedRow[col.name] = row[mdColumns[idx].name];
            } else if (row[col.name] !== undefined) {
              mergedRow[col.name] = row[col.name];
            } else {
              mergedRow[col.name] = "";
            }
          });
          return mergedRow;
        });

        blocks.push({
          type: "table",
          columns: mergedColumns,
          rows: mergedRows,
          raw: m.raw + "\n" + next.raw,
        });

        lastEnd = next.end;
        i += 1;
        continue;
      }

      blocks.push({
        type: "table",
        columns: parseTableKey(m.content),
        rows: [],
        raw: m.raw,
      });
      lastEnd = m.end;
      continue;
    }

    switch (m.type) {
      case "md-table": {
        const { columns, rows } = parseMarkdownTable(m.content);
        blocks.push({
          type: "table",
          columns,
          rows,
          raw: m.raw,
        });
        break;
      }
      case "poll":
        blocks.push({
          type: "poll",
          options: parsePollKey(m.content),
          raw: m.raw,
        });
        break;
      case "score": {
        const { axis, scores } = parseScoreKey(m.content);
        blocks.push({
          type: "score",
          axis,
          scores,
          raw: m.raw,
        });
        break;
      }
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
         SCORE_PATTERN.test(markdown) ||
         MARKDOWN_TABLE_PATTERN.test(markdown);
}
