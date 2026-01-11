"use client";

import React, { memo, useMemo, Suspense, lazy } from "react";
import ReactMarkdown from "react-markdown";
import {
  parseMarkdownCustomKeys,
  ParsedBlock,
  ParsedTable,
  ParsedPoll,
  ParsedScore,
} from "@/lib/utils/markdown-parser";
import type { ClarificationQuestion } from "@/lib/types";

// Direct imports for the custom components
import { ComparisonTable } from "./ComparisonTable";
import { PollComponent } from "./PollComponent";
import { ScoreChart } from "./ScoreChart";

interface MemoizedMarkdownProps {
  content: string;
  id: string;
  onPollAnswer?: (questionId: string, answer: string | string[]) => void;
  tableData?: Record<string, unknown>[];
}

/**
 * Renders a single text block as markdown
 */
const MarkdownBlock = memo(function MarkdownBlock({
  content,
}: {
  content: string;
}) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        components={{
          // Custom heading styles
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mt-5 mb-3 text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium mt-4 mb-2 text-foreground">
              {children}
            </h3>
          ),
          // Custom paragraph
          p: ({ children }) => (
            <p className="my-2 leading-relaxed text-foreground/90">{children}</p>
          ),
          // Custom list styles
          ul: ({ children }) => (
            <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside my-2 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground/90">{children}</li>
          ),
          // Code blocks
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="block bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg text-sm font-mono overflow-x-auto">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg overflow-x-auto my-3">
              {children}
            </pre>
          ),
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {children}
            </a>
          ),
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 my-3 italic text-foreground/80">
              {children}
            </blockquote>
          ),
          // Tables (standard markdown tables)
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-zinc-200 dark:border-zinc-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-100 dark:bg-zinc-800">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">
              {children}
            </td>
          ),
          // Horizontal rule
          hr: () => (
            <hr className="my-6 border-zinc-200 dark:border-zinc-700" />
          ),
          // Strong and emphasis
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

/**
 * Renders custom table from _Table syntax
 */
const TableRenderer = memo(function TableRenderer({
  block,
}: {
  block: ParsedTable;
}) {
  return <ComparisonTable columns={block.columns} rows={[]} />;
});

/**
 * Renders custom poll from _Poll syntax
 */
const PollRenderer = memo(function PollRenderer({
  block,
  onAnswer,
  questionId,
}: {
  block: ParsedPoll;
  onAnswer?: (questionId: string, answer: string | string[]) => void;
  questionId: string;
}) {
  return (
    <PollComponent
      question={{
        id: questionId,
        question: "Select an option",
        type: "single",
        options: block.options,
        allowCustom: true,
      }}
      onAnswer={(answer: string | string[]) => onAnswer?.(questionId, answer)}
    />
  );
});

/**
 * Renders custom score chart from _Score syntax
 */
const ScoreRenderer = memo(function ScoreRenderer({
  block,
}: {
  block: ParsedScore;
}) {
  // Convert ParsedScore to AxisScore format
  const axisScore = {
    axis: block.axis,
    scores: Object.fromEntries(
      block.scores.map((s) => [s.option, s.score])
    ),
  };

  const options = block.scores.map((s) => s.option);

  return <ScoreChart scores={[axisScore]} options={options} />;
});

/**
 * Renders a single parsed block
 */
const BlockRenderer = memo(function BlockRenderer({
  block,
  index,
  id,
  onPollAnswer,
}: {
  block: ParsedBlock;
  index: number;
  id: string;
  onPollAnswer?: (questionId: string, answer: string | string[]) => void;
}) {
  switch (block.type) {
    case "text":
      return <MarkdownBlock content={block.content} />;
    case "table":
      return <TableRenderer block={block} />;
    case "poll":
      return (
        <PollRenderer
          block={block}
          onAnswer={onPollAnswer}
          questionId={`${id}-poll-${index}`}
        />
      );
    case "score":
      return <ScoreRenderer block={block} />;
    default:
      return null;
  }
});

/**
 * MemoizedMarkdown Component
 * 
 * Optimized markdown renderer with support for custom rendering keys:
 * - _Table{col1:type,col2:type} - Renders a styled comparison table
 * - _Poll{opt1,opt2,opt3} - Renders an interactive poll
 * - _Score{axis:opt1=N,opt2=N} - Renders a visual score chart
 * 
 * Uses React.memo for streaming optimization.
 */
export const MemoizedMarkdown = memo(function MemoizedMarkdown({
  content,
  id,
  onPollAnswer,
}: MemoizedMarkdownProps) {
  // Parse content into blocks using custom parser for special keys
  const blocks = useMemo(() => {
    return parseMarkdownCustomKeys(content);
  }, [content]);

  return (
    <div className="memoized-markdown" data-id={id}>
      {blocks.map((block, index) => (
        <BlockRenderer
          key={`${id}-block-${index}`}
          block={block}
          index={index}
          id={id}
          onPollAnswer={onPollAnswer}
        />
      ))}
    </div>
  );
});

export default MemoizedMarkdown;
