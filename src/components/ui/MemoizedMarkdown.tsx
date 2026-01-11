"use client";

import React, { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import {
  parseMarkdownCustomKeys,
  ParsedBlock,
  ParsedTable,
  ParsedPoll,
  ParsedScore,
} from "@/lib/utils/markdown-parser";

import { ComparisonTable } from "./ComparisonTable";
import { PollComponent } from "./PollComponent";
import { ScoreChart } from "./ScoreChart";

interface MemoizedMarkdownProps {
  content: string;
  id: string;
  onPollAnswer?: (questionId: string, answer: string | string[]) => void;
  tableData?: Record<string, unknown>[];
}

const MarkdownBlock = memo(function MarkdownBlock({
  content,
}: {
  content: string;
}) {
  return (
    <div className="prose prose-stone prose-sm sm:prose-base max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl sm:text-2xl font-serif font-medium mt-6 mb-4 text-stone-900 border-b border-stone-200 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg sm:text-xl font-serif font-medium mt-6 mb-3 text-stone-800 flex items-center gap-2">
              <span className="w-1 h-5 bg-amber-500 rounded-full"></span>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base sm:text-lg font-serif font-medium mt-5 mb-2 text-stone-800">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm sm:text-base font-medium mt-4 mb-2 text-stone-700">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="my-3 leading-relaxed text-stone-700 text-sm sm:text-base">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-3 space-y-2 text-sm sm:text-base">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 space-y-2 list-decimal list-inside text-sm sm:text-base">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-stone-700">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0"></span>
              <span className="flex-1">{children}</span>
            </li>
          ),
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-stone-100 text-amber-700 px-1.5 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="block bg-stone-900 text-stone-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-4 overflow-hidden rounded-lg">{children}</pre>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 hover:text-amber-800 underline underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 pl-4 border-l-4 border-amber-500 bg-amber-50 py-2 pr-4 rounded-r-lg text-stone-700 italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-stone-200">
              <table className="min-w-full divide-y divide-stone-200">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-stone-50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider text-stone-600">
              {children}
            </th>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-white divide-y divide-stone-100">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-stone-50 transition-colors">
              {children}
            </tr>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-stone-700 whitespace-nowrap">
              {children}
            </td>
          ),
          hr: () => <hr className="my-8 border-stone-200" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-stone-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-stone-600">{children}</em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

const TableRenderer = memo(function TableRenderer({ block }: { block: ParsedTable }) {
  return <ComparisonTable columns={block.columns} rows={[]} />;
});

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

const ScoreRenderer = memo(function ScoreRenderer({ block }: { block: ParsedScore }) {
  const axisScore = {
    axis: block.axis,
    scores: Object.fromEntries(block.scores.map((s) => [s.option, s.score])),
  };
  const options = block.scores.map((s) => s.option);
  return <ScoreChart scores={[axisScore]} options={options} />;
});

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
        <PollRenderer block={block} onAnswer={onPollAnswer} questionId={`${id}-poll-${index}`} />
      );
    case "score":
      return <ScoreRenderer block={block} />;
    default:
      return null;
  }
});

export const MemoizedMarkdown = memo(function MemoizedMarkdown({
  content,
  id,
  onPollAnswer,
}: MemoizedMarkdownProps) {
  const blocks = useMemo(() => parseMarkdownCustomKeys(content), [content]);

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
