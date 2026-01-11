/**
 * Tests for Markdown Custom Key Parser
 */
import { describe, expect, it } from "bun:test";
import {
  parseTableKey,
  parsePollKey,
  parseScoreKey,
  parseMarkdownCustomKeys,
  extractCustomKeys,
  hasCustomKeys,
} from "../utils/markdown-parser";

describe("parseTableKey", () => {
  it("parses columns with types", () => {
    const result = parseTableKey("name:string,price:number,available:boolean");
    expect(result).toEqual([
      { name: "name", type: "string" },
      { name: "price", type: "number" },
      { name: "available", type: "boolean" },
    ]);
  });

  it("defaults to string type when not specified", () => {
    const result = parseTableKey("name,description");
    expect(result).toEqual([
      { name: "name", type: "string" },
      { name: "description", type: "string" },
    ]);
  });

  it("handles mixed typed and untyped columns", () => {
    const result = parseTableKey("name,price:number");
    expect(result).toEqual([
      { name: "name", type: "string" },
      { name: "price", type: "number" },
    ]);
  });
});

describe("parsePollKey", () => {
  it("parses comma-separated options", () => {
    const result = parsePollKey("React,Vue,Angular");
    expect(result).toEqual(["React", "Vue", "Angular"]);
  });

  it("trims whitespace from options", () => {
    const result = parsePollKey(" React , Vue , Angular ");
    expect(result).toEqual(["React", "Vue", "Angular"]);
  });

  it("filters empty options", () => {
    const result = parsePollKey("React,,Vue");
    expect(result).toEqual(["React", "Vue"]);
  });
});

describe("parseScoreKey", () => {
  it("parses axis and scores", () => {
    const result = parseScoreKey("performance:React=8,Vue=7,Angular=6");
    expect(result).toEqual({
      axis: "performance",
      scores: [
        { option: "React", score: 8 },
        { option: "Vue", score: 7 },
        { option: "Angular", score: 6 },
      ],
    });
  });

  it("handles axis without scores", () => {
    const result = parseScoreKey("performance");
    expect(result).toEqual({
      axis: "performance",
      scores: [],
    });
  });

  it("ignores invalid score values", () => {
    const result = parseScoreKey("perf:React=8,Vue=invalid");
    expect(result).toEqual({
      axis: "perf",
      scores: [{ option: "React", score: 8 }],
    });
  });
});

describe("parseMarkdownCustomKeys", () => {
  it("parses _Table syntax", () => {
    const markdown = "Here is a table: _Table{name:string,price:number}";
    const blocks = parseMarkdownCustomKeys(markdown);
    
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: "text", content: "Here is a table: " });
    expect(blocks[1]).toEqual({
      type: "table",
      columns: [
        { name: "name", type: "string" },
        { name: "price", type: "number" },
      ],
      raw: "_Table{name:string,price:number}",
    });
  });

  it("parses _Poll syntax", () => {
    const markdown = "_Poll{React,Vue,Angular}";
    const blocks = parseMarkdownCustomKeys(markdown);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: "poll",
      options: ["React", "Vue", "Angular"],
      raw: "_Poll{React,Vue,Angular}",
    });
  });

  it("parses _Score syntax", () => {
    const markdown = "_Score{performance:React=8,Vue=7}";
    const blocks = parseMarkdownCustomKeys(markdown);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: "score",
      axis: "performance",
      scores: [
        { option: "React", score: 8 },
        { option: "Vue", score: 7 },
      ],
      raw: "_Score{performance:React=8,Vue=7}",
    });
  });

  it("parses multiple custom keys in order", () => {
    const markdown = "Choose: _Poll{A,B,C}\n\nScores: _Score{perf:A=5,B=7}";
    const blocks = parseMarkdownCustomKeys(markdown);
    
    expect(blocks).toHaveLength(4);
    expect(blocks[0].type).toBe("text");
    expect(blocks[1].type).toBe("poll");
    expect(blocks[2].type).toBe("text");
    expect(blocks[3].type).toBe("score");
  });

  it("returns text block for markdown without custom keys", () => {
    const markdown = "# Hello World\n\nThis is regular markdown.";
    const blocks = parseMarkdownCustomKeys(markdown);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: "text", content: markdown });
  });
});

describe("extractCustomKeys", () => {
  it("returns only custom key blocks", () => {
    const markdown = "Text _Poll{A,B} more text _Table{col:string}";
    const keys = extractCustomKeys(markdown);
    
    expect(keys).toHaveLength(2);
    expect(keys[0].type).toBe("poll");
    expect(keys[1].type).toBe("table");
  });
});

describe("hasCustomKeys", () => {
  it("returns true when custom keys present", () => {
    expect(hasCustomKeys("_Table{a:string}")).toBe(true);
    expect(hasCustomKeys("_Poll{a,b}")).toBe(true);
    expect(hasCustomKeys("_Score{x:a=1}")).toBe(true);
  });

  it("returns false when no custom keys", () => {
    expect(hasCustomKeys("Regular markdown")).toBe(false);
  });
});
